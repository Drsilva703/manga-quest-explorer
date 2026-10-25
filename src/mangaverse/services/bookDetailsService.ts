import { z } from "zod";
import { fetchBookJson, parseGoogleBooks, plainBookDescription, safeBookUrl } from "./bookService";
import type { Book, BookDetails, BookReadingOption } from "../types/book";

const object = z.record(z.unknown());
const summary = (value: unknown) =>
  plainBookDescription(
    typeof value === "string"
      ? value
      : object.safeParse(value).success
        ? (value as Record<string, unknown>).value
        : "",
  );

// Only confirmed public access may become an embedded full reader. A scan ID
// alone, or a borrowable edition, never implies a freely readable book.
export function openLibraryReadingOptions(value: unknown): BookReadingOption[] {
  const data = object.parse(value);
  if (!Array.isArray(data.ebooks)) return [];
  return data.ebooks.flatMap((value) => {
    const parsed = object.safeParse(value);
    if (!parsed.success) return [];
    const ebook = parsed.data;
    const url = safeBookUrl(
      ebook.availability === "borrow"
        ? ebook.borrow_url || ebook.preview_url
        : ebook.read_url || ebook.preview_url,
    );
    if (
      !url ||
      !["archive.org", "www.archive.org", "openlibrary.org"].includes(new URL(url).hostname)
    )
      return [];
    const kind =
      ebook.availability === "full"
        ? "full"
        : ebook.availability === "partial"
          ? "preview"
          : ["borrow", "borrowable", "lendable"].includes(String(ebook.availability))
            ? "borrow"
            : undefined;
    if (!kind) return [];
    const archive = new URL(url);
    const id = archive.hostname.endsWith("archive.org")
      ? archive.pathname.match(/^\/(?:details|stream)\/([a-zA-Z0-9_.-]{1,200})(?:\/|$)/)?.[1]
      : undefined;
    return [
      {
        kind,
        url,
        ...(kind === "full" && id ? { embedUrl: `https://archive.org/embed/${id}?ui=embed` } : {}),
      },
    ];
  });
}

/** Load rich information on demand, rather than issuing requests for every card. */
export async function fetchBookDetails(
  book: Book,
  options: { signal?: AbortSignal; apiKey?: string } = {},
): Promise<BookDetails> {
  const { signal } = options;
  const result: BookDetails = {
    ...book,
    readingOptions: [...(book.readingOptions || [])],
    externalLinks: [],
    accessChecked: !!book.readingOptions?.length,
  };
  const isbn = book.identifiers
    .find(
      (id) =>
        /^ISBN/.test(id.type) && /^\d{9}[\dXx]$|^\d{13}$/.test(id.identifier.replace(/[\s-]/g, "")),
    )
    ?.identifier.replace(/[\s-]/g, "");
  const edition = book.editionKey && /^OL\d+M$/.test(book.editionKey) ? book.editionKey : undefined;
  const bibkey = isbn ? `ISBN:${isbn}` : edition ? `OLID:${edition}` : undefined;
  const workKey = book.workKey && /^\/works\/OL\d+W$/.test(book.workKey) ? book.workKey : undefined;
  const jobs: { kind: string; promise: Promise<unknown> }[] = [];
  if (book.source === "google") {
    const id = book.id.slice("google:".length);
    const key = options.apiKey ? `?${new URLSearchParams({ key: options.apiKey })}` : "";
    jobs.push({
      kind: "google",
      promise: fetchBookJson(
        `https://www.googleapis.com/books/v1/volumes/${encodeURIComponent(id)}${key}`,
        signal,
      ),
    });
  }
  if (workKey)
    jobs.push({
      kind: "work",
      promise: fetchBookJson(`https://openlibrary.org${workKey}.json`, signal),
    });
  if (bibkey)
    jobs.push({
      kind: "edition",
      promise: fetchBookJson(
        `https://openlibrary.org/api/books?${new URLSearchParams({ bibkeys: bibkey, format: "json", jscmd: "data" })}`,
        signal,
      ),
    });
  const settled = await Promise.allSettled(jobs.map((job) => job.promise));
  let editionKey: string | undefined;
  for (const [index, response] of settled.entries()) {
    if (response.status !== "fulfilled") continue;
    const parsed = object.safeParse(response.value);
    if (!parsed.success) continue;
    const data = parsed.data;
    if (jobs[index].kind === "google") {
      const details = parseGoogleBooks({ items: [data] })[0];
      if (details) {
        result.description = details.description || result.description;
        result.coverUrl = details.coverUrl || result.coverUrl;
        result.coverUrls = [
          ...new Set([...(details.coverUrls || []), ...(result.coverUrls || [])]),
        ];
        result.readingOptions = details.readingOptions || [];
        result.accessChecked = !!data.accessInfo;
      }
    } else if (jobs[index].kind === "work") {
      result.description ||= summary(data.description);
      if (!result.coverUrl && Array.isArray(data.covers)) {
        const id = data.covers.find((id) => typeof id === "number" && id > 0);
        if (id) result.coverUrl = `https://covers.openlibrary.org/b/id/${id}-L.jpg`;
      }
    } else if (bibkey) {
      const record = object.safeParse(data[bibkey]);
      if (!record.success) continue;
      const entry = record.data;
      result.accessChecked = true;
      result.readingOptions.push(...openLibraryReadingOptions(entry));
      result.description ||= summary(entry.description);
      const covers = object.safeParse(entry.cover);
      const large = safeBookUrl(covers.success ? covers.data.large : null);
      if (large) {
        result.coverUrl = large;
        result.coverUrls = [large, ...(result.coverUrls || [])];
      }
      if (typeof entry.key === "string" && /^\/books\/OL\d+M$/.test(entry.key))
        editionKey = entry.key;
      if (Array.isArray(entry.links))
        result.externalLinks = entry.links.flatMap((value) => {
          const link = object.safeParse(value);
          const url = link.success ? safeBookUrl(link.data.url) : null;
          return url && link.success && typeof link.data.title === "string"
            ? [{ title: link.data.title, url }]
            : [];
        });
    }
  }
  // Google editions can be matched to an Open Library work via an exact ISBN.
  if (!result.description && !workKey && editionKey) {
    try {
      const entry = object.parse(
        await fetchBookJson(`https://openlibrary.org${editionKey}.json`, signal),
      );
      result.description = summary(entry.description);
      const works = Array.isArray(entry.works) ? entry.works : [];
      const work = works
        .map((value) => object.safeParse(value))
        .find(
          (value) =>
            value.success &&
            typeof value.data.key === "string" &&
            /^\/works\/OL\d+W$/.test(value.data.key),
        );
      if (!result.description && work?.success)
        result.description = summary(
          object.parse(await fetchBookJson(`https://openlibrary.org${work.data.key}.json`, signal))
            .description,
        );
    } catch {
      /* Keep verified search metadata when enrichment is unavailable. */
    }
  }
  // A search result groups editions: its first edition can be lendable while
  // another edition is public. Check a bounded number, and label the distinction.
  if (book.publicAccessHint && !result.readingOptions.some((option) => option.kind === "full")) {
    const alternatives = (book.editionKeys || [])
      .filter(
        (key) =>
          /^OL\d+M$/.test(key) && `/books/${key}` !== editionKey && !(bibkey === `OLID:${key}`),
      )
      .slice(0, 2);
    for (const key of alternatives) {
      if (signal?.aborted) throw new DOMException("Details cancelled", "AbortError");
      try {
        const keyName = `OLID:${key}`;
        const response = object.parse(
          await fetchBookJson(
            `https://openlibrary.org/api/books?${new URLSearchParams({ bibkeys: keyName, format: "json", jscmd: "data" })}`,
            signal,
          ),
        );
        const entry = object.parse(response[keyName]);
        const available = openLibraryReadingOptions(entry).filter(
          (option) => option.kind === "full",
        );
        if (available.length) {
          result.readingOptions.push(
            ...available.map((option) => ({ ...option, otherEdition: true })),
          );
          result.accessChecked = true;
          break;
        }
      } catch {
        /* Never infer access from the work-level search hint alone. */
      }
    }
  }
  if (signal?.aborted) throw new DOMException("Details cancelled", "AbortError");
  result.readingOptions = result.readingOptions.filter(
    (option, index, all) =>
      all.findIndex((other) => other.url === option.url && other.kind === option.kind) === index,
  );
  return result;
}
