import { z } from "zod";
import { fetchWithTimeout } from "../../lib/fetch-with-timeout";
import type { Book, BookSearchResult, BookReadingOption } from "../types/book";

const object = z.record(z.unknown());
const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");
const names = (value: unknown) =>
  Array.isArray(value)
    ? value.filter((name): name is string => typeof name === "string" && !!name.trim())
    : [];

// Cover links returned by Google sometimes use HTTP. Always upgrade to HTTPS.
export function safeBookUrl(value: unknown): string | null {
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
export function plainBookDescription(value: unknown): string {
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

export function googleReadingOptions(value: unknown): BookReadingOption[] {
  const item = object.parse(value);
  const access = object.safeParse(item.accessInfo);
  if (!access.success || !["ALL_PAGES", "PARTIAL"].includes(text(access.data.viewability)))
    return [];
  const url = safeBookUrl(access.data.webReaderLink);
  if (
    !url ||
    !["books.google.com", "books.google.com.br", "play.google.com"].includes(new URL(url).hostname)
  )
    return [];
  const embedUrl =
    access.data.embeddable === true && text(item.id)
      ? `https://books.google.com/books?${new URLSearchParams({ id: text(item.id), printsec: "frontcover", output: "embed" })}`
      : undefined;
  return [{ kind: access.data.viewability === "ALL_PAGES" ? "full" : "preview", url, embedUrl }];
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
    const image = images.success ? images.data : {};
    const highRes = safeBookUrl(image.extraLarge || image.large || image.medium || image.small);
    const thumbnail = safeBookUrl(image.thumbnail);
    const isbn = identifiers.find(
      (item) => /^ISBN/.test(item.type) && /^\d{9}[\dXx]$|^\d{13}$/.test(item.identifier),
    )?.identifier;
    const covers = [
      highRes,
      isbn ? `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false` : null,
      thumbnail,
    ].filter((url): url is string => !!url);
    return [
      {
        id: `google:${text(item.id)}`,
        title: text(info.data.title),
        authors: names(info.data.authors),
        description: plainBookDescription(info.data.description),
        coverUrl: highRes || thumbnail,
        coverUrls: [...new Set(covers)],
        readingOptions: googleReadingOptions(item),
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
        coverUrl: cover.success ? `https://covers.openlibrary.org/b/id/${cover.data}-L.jpg` : null,
        workKey: /^\/works\/OL\d+W$/.test(text(item.key)) ? text(item.key) : undefined,
        editionKey: names(item.edition_key).find((key) => /^OL\d+M$/.test(key)),
        editionKeys: names(item.edition_key)
          .filter((key) => /^OL\d+M$/.test(key))
          .slice(0, 4),
        publicAccessHint: item.ebook_access === "public",
        identifiers: isbn
          ? [{ type: isbn.length === 13 ? "ISBN_13" : "ISBN_10", identifier: isbn }]
          : [],
        source: "openlibrary" as const,
      },
    ];
  });
}

export async function fetchBookJson(url: string, signal?: AbortSignal): Promise<unknown> {
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
  options: { signal?: AbortSignal; apiKey?: string; freeOnly?: boolean } = {},
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
  if (options.freeOnly) params.set("filter", "free-ebooks");
  // Optional browser-restricted Google Books key; basic public searches need none.
  if (options.apiKey?.trim()) params.set("key", options.apiKey.trim());
  let fallbackReason: "empty" | "error" = "empty";
  try {
    const books = parseGoogleBooks(
      await fetchBookJson(`https://www.googleapis.com/books/v1/volumes?${params}`, signal),
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
      q: options.freeOnly ? `${term} ebook_access:public` : term,
      limit: "24",
      fields: "key,title,author_name,cover_i,isbn,edition_key,ebook_access",
    });
    const books = parseOpenLibrary(
      await fetchBookJson(`https://openlibrary.org/search.json?${fallback}`, signal),
    );
    abortIfCancelled();
    return { books, source: "openlibrary", fallbackReason };
  } catch {
    abortIfCancelled();
    throw new Error("Não foi possível concluir a busca de livros. Tente novamente em instantes.");
  }
}
