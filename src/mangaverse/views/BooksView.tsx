import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, BookText, Search, ArrowRight } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { searchBooks } from "../services/bookService";
import { BookCover } from "../components/BookCover";
import type { Book } from "../types/book";

const sourceName = (source: Book["source"]) =>
  source === "google" ? "Google Books" : "Open Library";

export function BooksView({
  query,
  onSearch,
}: {
  query: string;
  onSearch: (query: string) => void;
}) {
  const [input, setInput] = useState(query);
  const [selected, setSelected] = useState<Book | null>(null);
  const result = useQuery({
    queryKey: ["books", query.trim()],
    queryFn: ({ signal }) =>
      searchBooks(query, { signal, apiKey: import.meta.env.VITE_GOOGLE_BOOKS_API_KEY }),
    enabled: !!query.trim(),
    staleTime: 5 * 60_000,
    retry: false,
  });
  const books = result.data?.books || [];
  const submit = (term: string) => {
    if (term.trim()) {
      setInput(term.trim());
      setSelected(null);
      onSearch(term.trim());
    }
  };
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-7 sm:py-10">
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-[.25em] text-indigo-400 mb-3">
          Uma nova história começa aqui
        </p>
        <h1 className="text-3xl sm:text-5xl font-black text-white flex items-center gap-3">
          <BookText className="text-indigo-400" aria-hidden="true" />
          Livros
        </h1>
        <p className="mt-3 text-sm text-zinc-400 max-w-xl leading-relaxed">
          Dos clássicos às próximas descobertas. Busque por título ou autor e encontre sua próxima
          leitura.
        </p>
      </div>
      <form
        role="search"
        aria-label="Buscar livros"
        onSubmit={(event) => {
          event.preventDefault();
          submit(input);
        }}
        className="flex gap-2 mb-5 max-w-2xl"
      >
        <label className="sr-only" htmlFor="books-query">
          Título ou autor
        </label>
        <input
          id="books-query"
          type="search"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          maxLength={200}
          placeholder="Busque um título ou autor…"
          required
          className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white focus:border-indigo-400 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 px-4 py-3 font-bold text-sm text-white flex gap-2 items-center"
        >
          <Search size={16} aria-hidden="true" />
          <span>Buscar</span>
        </button>
      </form>
      <div className="flex flex-wrap gap-2 mb-8" aria-label="Sugestões de busca">
        {["Machado de Assis", "Fantasia", "Literatura brasileira", "Ciência"].map((term) => (
          <button
            key={term}
            onClick={() => submit(term)}
            className="rounded-full border border-zinc-800 bg-zinc-900 hover:border-indigo-500 px-3 py-2 text-xs text-zinc-300"
          >
            {term}
          </button>
        ))}
      </div>
      {!query.trim() && (
        <section className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-br from-indigo-950/60 via-zinc-900 to-zinc-950 p-7 sm:p-12">
          <BookOpen
            className="absolute right-6 top-8 h-32 w-32 sm:h-48 sm:w-48 text-indigo-400/10 -rotate-12"
            aria-hidden="true"
          />
          <div className="relative max-w-lg">
            <p className="text-xs text-indigo-300 font-bold tracking-widest mb-3">
              SUA ESTANTE DE DESCOBERTAS
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              Qual será o próximo livro que vai te surpreender?
            </h2>
            <p className="text-sm leading-relaxed text-zinc-400 mt-4">
              Pesquise um nome, explore um autor ou escolha uma sugestão acima para começar.
            </p>
          </div>
        </section>
      )}
      {query.trim() && result.isPending && (
        <section aria-label="Carregando livros" aria-busy="true">
          <p role="status" className="text-indigo-300 text-sm mb-5 flex gap-2 items-center">
            <span
              className="h-4 w-4 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin"
              aria-hidden="true"
            />
            Buscando livros…
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Array.from({ length: 12 }, (_, index) => (
              <div key={index} className="animate-pulse" aria-hidden="true">
                <div className="aspect-[2/3] rounded-xl bg-zinc-800" />
                <div className="h-3 rounded bg-zinc-800 mt-3 w-4/5" />
                <div className="h-3 rounded bg-zinc-800 mt-2 w-3/5" />
              </div>
            ))}
          </div>
        </section>
      )}
      {query.trim() && result.isError && (
        <div
          role="alert"
          className="rounded-2xl border border-amber-500/20 bg-zinc-900 p-8 text-center"
        >
          <BookOpen className="mx-auto mb-3 text-zinc-500" size={32} />
          <p className="text-zinc-200 text-sm">{result.error.message}</p>
          <button
            onClick={() => result.refetch()}
            className="mt-4 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-bold text-white"
          >
            Tentar novamente
          </button>
        </div>
      )}
      {query.trim() && result.data && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <h2 className="text-lg font-bold text-white">Resultados para “{query}”</h2>
            <p role="status" aria-live="polite" className="text-xs text-zinc-400">
              {books.length} {books.length === 1 ? "livro" : "livros"} ·{" "}
              {sourceName(result.data.source)}
            </p>
          </div>
          {books.length === 0 ? (
            <div className="text-center py-16 rounded-2xl border border-zinc-800 bg-zinc-900/40">
              <BookOpen size={38} className="mx-auto text-zinc-600 mb-4" />
              <h3 className="text-lg font-bold text-white">Nenhum livro encontrado</h3>
              <p className="text-sm text-zinc-400 mt-2">
                Tente outro título, o nome do autor ou uma busca mais curta.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-7">
              {books.map((book) => (
                <button
                  key={book.id}
                  onClick={() => setSelected(book)}
                  aria-label={`Ver detalhes de ${book.title}`}
                  className="group text-left min-w-0 flex flex-col"
                >
                  <div className="w-full aspect-[2/3] rounded-xl border border-zinc-800 group-hover:border-indigo-400 overflow-hidden bg-zinc-900 transition-colors">
                    <BookCover
                      book={book}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 line-clamp-2 mt-3">
                    {book.title}
                  </h3>
                  <p className="text-xs text-zinc-400 line-clamp-2 mt-1">
                    {book.authors.join(", ") || "Autor não informado"}
                  </p>
                  <span className="mt-2 text-xs text-indigo-300 inline-flex items-center gap-1">
                    Ver detalhes <ArrowRight size={12} aria-hidden="true" />
                  </span>
                </button>
              ))}
            </div>
          )}
        </>
      )}
      <p className="mt-10 text-xs text-zinc-500 text-center">
        Catálogo: Google Books e Open Library · Informações e disponibilidade de capas variam por
        edição.
      </p>
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        {selected && (
          <DialogContent className="w-[calc(100%-1rem)] max-w-3xl max-h-[90dvh] overflow-y-auto bg-zinc-950 border-zinc-800 text-zinc-100 rounded-2xl">
            <div className="flex flex-col sm:flex-row gap-6">
              <BookCover
                book={selected}
                className="w-32 sm:w-44 aspect-[2/3] object-cover self-center sm:self-start rounded-xl shrink-0"
              />
              <div className="min-w-0 flex-1 pr-5">
                <p className="text-xs text-indigo-300 font-bold tracking-widest mb-2">
                  {sourceName(selected.source)}
                </p>
                <DialogTitle className="text-xl sm:text-2xl leading-tight">
                  {selected.title}
                </DialogTitle>
                <DialogDescription className="text-sm text-zinc-400 mt-3">
                  {selected.authors.join(", ") || "Autor não informado"}
                </DialogDescription>
                <dl className="mt-5 text-xs text-zinc-400 space-y-2">
                  {selected.identifiers.length ? (
                    selected.identifiers.map((identifier) => (
                      <div key={`${identifier.type}:${identifier.identifier}`}>
                        <dt className="font-semibold text-zinc-300">
                          {identifier.type.replace("_", " ")}
                        </dt>
                        <dd className="break-all font-mono mt-1">{identifier.identifier}</dd>
                      </div>
                    ))
                  ) : (
                    <div>
                      <dt className="font-semibold text-zinc-300">ISBN</dt>
                      <dd>Não informado</dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>
            <section>
              <h3 className="text-base font-bold text-white mb-2">Sinopse</h3>
              <p className="text-sm leading-relaxed text-zinc-300 whitespace-pre-line">
                {selected.description || "Sinopse não disponível nesta fonte."}
              </p>
            </section>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
