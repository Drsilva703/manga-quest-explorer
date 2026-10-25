import { z } from "zod";
import { fetchWithTimeout } from "../../lib/fetch-with-timeout";
import type { Book, BookSearchResult } from "../types/book";

const object = z.record(z.unknown());
const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");
const names = (value: unknown) =>
  Array.isArray(value)
    ? value.filter((name): name is string => typeof name === "string" && !!name.trim())
    : [];

// Cover links returned by Google sometimes use HTTP. Always upgrade to HTTPS.
function coverUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    if (url.protocol === "http:") url.protocol = "https:";
    return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

// Keep API descriptions as plain text: no remote HTML is inserted into the DOM.
function description(value: unknown): string {
  return text(value)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseGoogleBooks(value: unknown): Book[] {
  const body = object.parse(value);
  if (body.error) throw new Error("Google Books request failed");
  if (body.items === undefined && body.totalItems === 0) return [];
  const items = z.array(object).parse(body.items);
  return items.flatMap((item) => {
    const info = object.safeParse(item.volumeInfo);
    if (!info.success || !text(info.data.title) || !text(item.id)) return [];
    const images = object.safeParse(info.data.imageLinks);
    const identifiers = Array.isArray(info.data.industryIdentifiers)
      ? info.data.industryIdentifiers.flatMap((value) => {
          const id = object.safeParse(value);
          return id.success && text(id.data.identifier)
            ? [
                {
                  type: text(id.data.type) || "Identificador",
                  identifier: text(id.data.identifier),
                },
              ]
            : [];
        })
      : [];
    return [
      {
        id: `google:${text(item.id)}`,
        title: text(info.data.title),
        authors: names(info.data.authors),
        description: description(info.data.description),
        coverUrl: coverUrl(images.success ? images.data.thumbnail : null),
        identifiers,
        source: "google" as const,
      },
    ];
  });
}

export function parseOpenLibrary(value: unknown): Book[] {
  const docs = z.array(object).parse(object.parse(value).docs);
  return docs.flatMap((item) => {
    if (!text(item.title) || !text(item.key)) return [];
    const isbn = names(item.isbn)[0];
    const cover = z.number().int().positive().safeParse(item.cover_i);
    return [
      {
        id: `openlibrary:${text(item.key)}`,
        title: text(item.title),
        authors: names(item.author_name),
        description: "",
        coverUrl: cover.success ? `https://covers.openlibrary.org/b/id/${cover.data}-M.jpg` : null,
        identifiers: isbn
          ? [{ type: isbn.length === 13 ? "ISBN_13" : "ISBN_10", identifier: isbn }]
          : [],
        source: "openlibrary" as const,
      },
    ];
  });
}

async function json(url: string, signal?: AbortSignal): Promise<unknown> {
  const response = await fetchWithTimeout(
    url,
    { signal, headers: { Accept: "application/json" }, credentials: "omit" },
    12_000,
  );
  if (!response.ok) throw new Error(`Book provider HTTP ${response.status}`);
  return response.json();
}

/** Search Google first; consult only Open Library if it fails or has no books. */
export async function searchBooks(
  query: string,
  options: { signal?: AbortSignal; apiKey?: string } = {},
): Promise<BookSearchResult> {
  const term = query.trim();
  if (!term || term.length > 200)
    throw new Error("Digite um título ou autor com até 200 caracteres.");
  const { signal } = options;
  const abortIfCancelled = () => {
    if (signal?.aborted) throw new DOMException("Search cancelled", "AbortError");
  };
  abortIfCancelled();
  const params = new URLSearchParams({ q: term, maxResults: "24", printType: "books" });
  // Optional browser-restricted Google Books key; basic public searches need none.
  if (options.apiKey?.trim()) params.set("key", options.apiKey.trim());
  let fallbackReason: "empty" | "error" = "empty";
  try {
    const books = parseGoogleBooks(
      await json(`https://www.googleapis.com/books/v1/volumes?${params}`, signal),
    );
    abortIfCancelled();
    if (books.length) return { books, source: "google" };
  } catch {
    abortIfCancelled();
    fallbackReason = "error";
  }
  try {
    abortIfCancelled();
    // Open Library's default fields may omit ISBN: request the needed fields explicitly.
    const fallback = new URLSearchParams({
      q: term,
      limit: "24",
      fields: "key,title,author_name,cover_i,isbn",
    });
    const books = parseOpenLibrary(
      await json(`https://openlibrary.org/search.json?${fallback}`, signal),
    );
    abortIfCancelled();
    return { books, source: "openlibrary", fallbackReason };
  } catch {
    abortIfCancelled();
    throw new Error("Não foi possível concluir a busca de livros. Tente novamente em instantes.");
  }
}
