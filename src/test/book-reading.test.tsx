import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  googleReadingOptions,
  parseGoogleBooks,
  parseOpenLibrary,
  searchBooks,
} from "../mangaverse/services/bookService";
import {
  fetchBookDetails,
  openLibraryReadingOptions,
} from "../mangaverse/services/bookDetailsService";
import { BookDetailsDialog } from "../mangaverse/components/BookDetailsDialog";
import { BookCover } from "../mangaverse/components/BookCover";
import type { Book } from "../mangaverse/types/book";

const book: Book = {
  id: "openlibrary:/works/OL1W",
  title: "Um livro",
  authors: ["Uma autora"],
  description: "",
  coverUrl: "https://covers.openlibrary.org/b/id/42-L.jpg",
  source: "openlibrary",
  identifiers: [],
  workKey: "/works/OL1W",
  editionKey: "OL1M",
};
const full = {
  title: "Um livro",
  ebooks: [{ availability: "full", read_url: "https://archive.org/stream/public-book" }],
};
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
function mockDetails(edition = full) {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockImplementation((url: string) =>
        Promise.resolve(
          Response.json(
            url.includes("/works/")
              ? { description: { value: "Sinopse completa da obra." } }
              : { "OLID:OL1M": edition },
          ),
        ),
      ),
  );
}

describe("book descriptions, covers and verified access", () => {
  it("loads the work synopsis and a confirmed full reader on demand", async () => {
    mockDetails();
    const details = await fetchBookDetails(book);
    expect(details.description).toBe("Sinopse completa da obra.");
    expect(details.readingOptions).toEqual([
      {
        kind: "full",
        url: "https://archive.org/stream/public-book",
        embedUrl: "https://archive.org/embed/public-book?ui=embed",
      },
    ]);
  });
  it("does not offer full reading for borrowable, restricted, or unknown editions", () => {
    expect(
      openLibraryReadingOptions({
        ebooks: [
          { availability: "borrow", borrow_url: "https://openlibrary.org/books/OL1M/borrow" },
        ],
      }),
    ).toEqual([{ kind: "borrow", url: "https://openlibrary.org/books/OL1M/borrow" }]);
    expect(
      openLibraryReadingOptions({
        ebooks: [{ availability: "noview", preview_url: "https://archive.org/details/restricted" }],
      }),
    ).toEqual([]);
    expect(
      openLibraryReadingOptions({
        ebooks: [{ availability: "full", read_url: "https://archive.org.evil.test/stream/book" }],
      }),
    ).toEqual([]);
  });
  it("labels Google previews separately and only embeds when the provider allows it", () => {
    const item = {
      id: "volume",
      accessInfo: {
        viewability: "PARTIAL",
        embeddable: true,
        webReaderLink: "https://books.google.com/books?id=volume",
      },
    };
    expect(googleReadingOptions(item)[0]).toMatchObject({
      kind: "preview",
      embedUrl: expect.stringContaining("output=embed"),
    });
    expect(
      googleReadingOptions({ ...item, accessInfo: { ...item.accessInfo, embeddable: false } })[0],
    ).not.toHaveProperty("embedUrl", expect.any(String));
    expect(
      googleReadingOptions({
        ...item,
        accessInfo: { ...item.accessInfo, viewability: "NO_PAGES" },
      }),
    ).toEqual([]);
  });
  it("prefers high-resolution Google images and requests large Open Library covers", () => {
    expect(
      parseGoogleBooks({
        items: [
          {
            id: "volume",
            volumeInfo: {
              title: "Livro",
              imageLinks: {
                thumbnail: "http://books.google.com/small.jpg",
                extraLarge: "http://books.google.com/large.jpg",
              },
            },
          },
        ],
      })[0].coverUrls?.[0],
    ).toBe("https://books.google.com/large.jpg");
    expect(
      parseOpenLibrary({ docs: [{ key: "/works/OL1W", title: "Livro", cover_i: 42 }] })[0].coverUrl,
    ).toBe("https://covers.openlibrary.org/b/id/42-L.jpg");
  });
  it("tries alternate covers before using the placeholder", () => {
    render(
      <BookCover
        book={{
          ...book,
          coverUrl: "https://covers.example/small.jpg",
          coverUrls: ["https://covers.example/large.jpg", "https://covers.example/small.jpg"],
        }}
      />,
    );
    expect(screen.getByAltText("Capa de Um livro")).toHaveAttribute(
      "src",
      "https://covers.example/large.jpg",
    );
    fireEvent.error(screen.getByAltText("Capa de Um livro"));
    expect(screen.getByAltText("Capa de Um livro")).toHaveAttribute(
      "src",
      "https://covers.example/small.jpg",
    );
    fireEvent.error(screen.getByAltText("Capa de Um livro"));
    expect(screen.getByAltText("Capa de Um livro")).toHaveAttribute("src", "/book-placeholder.svg");
  });
  it("applies the free-reading filter to both search providers", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 429 }))
      .mockResolvedValueOnce(Response.json({ docs: [] }));
    vi.stubGlobal("fetch", fetch);
    await searchBooks("Alice", { freeOnly: true });
    expect(new URL(fetch.mock.calls[0][0]).searchParams.get("filter")).toBe("free-ebooks");
    expect(new URL(fetch.mock.calls[1][0]).searchParams.get("q")).toBe("Alice ebook_access:public");
  });
  it("checks another edition when a public work's first edition is borrowable", async () => {
    const fetch = vi.fn().mockImplementation((url: string) =>
      Promise.resolve(
        Response.json(
          url.includes("/works/")
            ? { description: "Sinopse" }
            : url.includes("OL2M")
              ? { "OLID:OL2M": full }
              : {
                  "OLID:OL1M": {
                    key: "/books/OL1M",
                    ebooks: [
                      {
                        availability: "borrow",
                        preview_url: "https://openlibrary.org/books/OL1M/borrow",
                      },
                    ],
                  },
                },
        ),
      ),
    );
    vi.stubGlobal("fetch", fetch);
    const result = await fetchBookDetails({
      ...book,
      publicAccessHint: true,
      editionKeys: ["OL1M", "OL2M"],
    });
    expect(result.readingOptions.find((option) => option.kind === "full")).toMatchObject({
      otherEdition: true,
    });
  });
  it("retains search metadata when detail providers are unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
    const result = await fetchBookDetails({ ...book, description: "Sinopse já disponível" });
    expect(result.description).toBe("Sinopse já disponível");
    expect(result.accessChecked).toBe(false);
    expect(result.readingOptions).toEqual([]);
  });
});

describe("embedded book reader", () => {
  it("opens a confirmed public edition inside the site and provides a source link", async () => {
    mockDetails();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    render(
      <QueryClientProvider client={client}>
        <BookDetailsDialog book={book} onClose={vi.fn()} />
      </QueryClientProvider>,
    );
    expect(await screen.findByText("Sinopse completa da obra.")).toBeInTheDocument();
    fireEvent.click(await screen.findByRole("button", { name: "Ler gratuitamente" }));
    expect(screen.getByTitle("Leitor de Um livro")).toHaveAttribute(
      "src",
      "https://archive.org/embed/public-book?ui=embed",
    );
    expect(screen.getByRole("link", { name: "Abrir na fonte" })).toHaveAttribute(
      "href",
      "https://archive.org/stream/public-book",
    );
    fireEvent.click(screen.getByRole("button", { name: "← Voltar aos detalhes" }));
    expect(screen.getByText("Sinopse completa da obra.")).toBeInTheDocument();
  });
});
