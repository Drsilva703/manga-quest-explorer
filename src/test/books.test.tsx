import { afterEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { searchBooks } from "../mangaverse/services/bookService";
import { BooksView } from "../mangaverse/views/BooksView";

const google = {
  items: [
    {
      id: "dom-casmurro",
      volumeInfo: {
        title: "Dom Casmurro",
        authors: ["Machado de Assis"],
        description: "<p>Uma <b>história</b> &amp; suas memórias.</p>",
        imageLinks: { thumbnail: "http://books.google.com/cover.jpg" },
        industryIdentifiers: [{ type: "ISBN_13", identifier: "9788535914849" }],
      },
    },
  ],
};
const open = {
  docs: [
    {
      key: "/works/OL1W",
      title: "Dom Casmurro",
      author_name: ["Machado de Assis"],
      cover_i: 42,
      isbn: ["9788535914849", "8535914846"],
    },
  ],
};
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function mount() {
  function Harness() {
    const [query, setQuery] = useState("");
    return <BooksView key={query} query={query} onSearch={setQuery} />;
  }
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <Harness />
    </QueryClientProvider>,
  );
}
function search() {
  fireEvent.change(screen.getByLabelText("Título ou autor"), { target: { value: "Dom Casmurro" } });
  fireEvent.submit(screen.getByRole("search", { name: "Buscar livros" }));
}

describe("book API fallback", () => {
  it("extracts Google fields, normalizes HTTPS, and adds an optional key only to Google", async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json(google));
    vi.stubGlobal("fetch", fetch);
    const result = await searchBooks("Dom Casmurro & Machado", { apiKey: "test-key" });
    expect(result.source).toBe("google");
    expect(result.books[0]).toMatchObject({
      title: "Dom Casmurro",
      authors: ["Machado de Assis"],
      description: "Uma história & suas memórias.",
      coverUrl: "https://books.google.com/cover.jpg",
      identifiers: [{ type: "ISBN_13", identifier: "9788535914849" }],
    });
    const url = new URL(fetch.mock.calls[0][0]);
    expect(url.origin + url.pathname).toBe("https://www.googleapis.com/books/v1/volumes");
    expect(url.searchParams.get("q")).toBe("Dom Casmurro & Machado");
    expect(url.searchParams.get("key")).toBe("test-key");
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it.each(["empty", "http-error", "network-error", "invalid-json"])(
    "uses Open Library after Google %s",
    async (failure) => {
      const fetch = vi.fn();
      if (failure === "empty") fetch.mockResolvedValueOnce(Response.json({ totalItems: 0 }));
      else if (failure === "http-error")
        fetch.mockResolvedValueOnce(new Response(null, { status: 429 }));
      else if (failure === "network-error")
        fetch.mockRejectedValueOnce(new TypeError("Network error"));
      else fetch.mockResolvedValueOnce(new Response("invalid json"));
      fetch.mockResolvedValueOnce(Response.json(open));
      vi.stubGlobal("fetch", fetch);
      const result = await searchBooks("Dom Casmurro", { apiKey: "test-key" });
      expect(result).toMatchObject({
        source: "openlibrary",
        fallbackReason: failure === "empty" ? "empty" : "error",
        books: [
          {
            coverUrl: "https://covers.openlibrary.org/b/id/42-L.jpg",
            authors: ["Machado de Assis"],
            identifiers: [{ identifier: "9788535914849" }],
          },
        ],
      });
      const fallback = new URL(fetch.mock.calls[1][0]);
      expect(fallback.origin + fallback.pathname).toBe("https://openlibrary.org/search.json");
      expect(fallback.searchParams.get("fields")).toContain("isbn");
      expect(fallback.searchParams.has("key")).toBe(false);
    },
  );
  it("distinguishes no books from unavailable providers", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ totalItems: 0 }))
      .mockResolvedValueOnce(Response.json({ docs: [] }));
    vi.stubGlobal("fetch", fetch);
    expect((await searchBooks("nothing")).books).toEqual([]);
    fetch.mockResolvedValue(new Response(null, { status: 503 }));
    await expect(searchBooks("nothing")).rejects.toThrow("Não foi possível concluir");
  });
  it("does not fall back when the user cancels a search", async () => {
    const controller = new AbortController();
    const fetch = vi.fn().mockImplementation(() => {
      controller.abort();
      throw new DOMException("Cancelled", "AbortError");
    });
    vi.stubGlobal("fetch", fetch);
    await expect(searchBooks("Dom", { signal: controller.signal })).rejects.toMatchObject({
      name: "AbortError",
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

describe("books interface", () => {
  it("shows loading, results and book details without fetching before the user searches", async () => {
    let resolve!: (value: Response) => void;
    const fetch = vi.fn().mockImplementation(
      () =>
        new Promise<Response>((done) => {
          resolve = done;
        }),
    );
    vi.stubGlobal("fetch", fetch);
    mount();
    expect(fetch).not.toHaveBeenCalled();
    search();
    expect(await screen.findByText("Buscando livros…")).toBeInTheDocument();
    resolve(Response.json(google));
    fireEvent.click(await screen.findByRole("button", { name: "Ver detalhes de Dom Casmurro" }));
    expect(await screen.findByRole("dialog")).toHaveTextContent("Machado de Assis");
    expect(screen.getByRole("dialog")).toHaveTextContent("9788535914849");
    expect(screen.getByRole("dialog")).toHaveTextContent("Uma história & suas memórias.");
  });
  it("uses the placeholder for missing or broken covers and handles missing authors/ISBN", async () => {
    const data = { items: [{ id: "missing", volumeInfo: { title: "Livro sem capa" } }] };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(data)));
    mount();
    search();
    const cover = await screen.findByAltText("Capa de Livro sem capa");
    expect(cover).toHaveAttribute("src", "/book-placeholder.svg");
    fireEvent.error(cover);
    expect(cover).toHaveAttribute("src", "/book-placeholder.svg");
    fireEvent.click(screen.getByRole("button", { name: "Ver detalhes de Livro sem capa" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("Autor não informado");
    expect(screen.getByRole("dialog")).toHaveTextContent("Não informado");
    expect(
      await screen.findByText("Sinopse não disponível nas fontes consultadas."),
    ).toBeInTheDocument();
  });
  it("shows an empty state after both providers return no results", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ totalItems: 0 }))
      .mockResolvedValueOnce(Response.json({ docs: [] }));
    vi.stubGlobal("fetch", fetch);
    mount();
    search();
    expect(await screen.findByText("Nenhum livro encontrado")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it("offers retry when both providers fail", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() => Promise.resolve(new Response(null, { status: 503 }))),
    );
    mount();
    search();
    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível concluir");
    expect(screen.getByRole("button", { name: "Tentar novamente" })).toBeInTheDocument();
  });
});
