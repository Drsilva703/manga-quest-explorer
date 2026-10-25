import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { BookCover } from "./BookCover";
import { fetchBookDetails } from "../services/bookDetailsService";
import type { Book, BookReadingOption } from "../types/book";

export function BookDetailsDialog({ book, onClose }: { book: Book; onClose: () => void }) {
  const [reader, setReader] = useState<BookReadingOption | null>(null);
  const details = useQuery({
    queryKey: ["book-details", book.id],
    queryFn: ({ signal }) =>
      fetchBookDetails(book, { signal, apiKey: import.meta.env.VITE_GOOGLE_BOOKS_API_KEY }),
    staleTime: 60 * 60_000,
    retry: false,
  });
  const current = details.data || book;
  const reading = details.data?.readingOptions || book.readingOptions || [];
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        className={`w-[calc(100%-1rem)] ${reader ? "max-w-6xl" : "max-w-3xl"} max-h-[94dvh] overflow-y-auto bg-zinc-950 border-zinc-800 text-zinc-100 rounded-2xl`}
      >
        {reader ? (
          <>
            <DialogTitle className="pr-6">{book.title}</DialogTitle>
            <DialogDescription className="text-zinc-400">
              {reader.otherEdition && "Leitura em outra edição da mesma obra. "}
              {reader.kind === "full"
                ? "Edição disponibilizada para leitura completa pela fonte."
                : "Prévia disponibilizada pela fonte; pode conter páginas limitadas."}
            </DialogDescription>
            <div className="flex flex-wrap justify-between gap-3 text-sm">
              <button onClick={() => setReader(null)} className="text-indigo-300">
                ← Voltar aos detalhes
              </button>
              <a
                href={reader.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-300 underline"
              >
                Abrir na fonte
              </a>
            </div>
            <iframe
              title={`Leitor de ${book.title}`}
              src={reader.embedUrl}
              className="w-full h-[70dvh] min-h-80 rounded-xl bg-white border-0"
              allow="fullscreen"
              allowFullScreen
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
            <p className="text-xs text-zinc-400">
              Se o leitor não carregar, use “Abrir na fonte”. A disponibilidade é controlada pela
              biblioteca ou editora.
            </p>
          </>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row gap-6">
              <BookCover
                book={current}
                className="w-40 sm:w-52 aspect-[2/3] object-contain self-center sm:self-start rounded-xl shrink-0"
              />
              <div className="min-w-0 flex-1 pr-5">
                <p className="text-xs text-indigo-300 font-bold tracking-widest mb-2">
                  {book.source === "google" ? "Google Books" : "Open Library"}
                </p>
                <DialogTitle className="text-xl sm:text-2xl leading-tight">
                  {book.title}
                </DialogTitle>
                <DialogDescription className="text-sm text-zinc-400 mt-3">
                  {book.authors.join(", ") || "Autor não informado"}
                </DialogDescription>
                <dl className="mt-5 text-xs text-zinc-400 space-y-2">
                  {book.identifiers.length ? (
                    book.identifiers.map((id) => (
                      <div key={`${id.type}:${id.identifier}`}>
                        <dt className="font-semibold text-zinc-300">{id.type.replace("_", " ")}</dt>
                        <dd className="break-all font-mono mt-1">{id.identifier}</dd>
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
            {details.isPending && (
              <p role="status" className="text-sm text-indigo-300">
                Carregando sinopse e opções de leitura…
              </p>
            )}
            <section>
              <h3 className="text-base font-bold text-white mb-2">Sinopse</h3>
              <p className="text-sm leading-relaxed text-zinc-300 whitespace-pre-line">
                {current.description ||
                  (details.isPending
                    ? "Consultando a ficha da obra…"
                    : "Sinopse não disponível nas fontes consultadas.")}
              </p>
            </section>
            <section className="border-t border-zinc-800 pt-4">
              <h3 className="font-bold mb-3">Ler este livro</h3>
              <div className="flex flex-wrap gap-2">
                {reading.map((option, index) =>
                  option.embedUrl && option.kind !== "borrow" ? (
                    <button
                      key={`${option.url}-${index}`}
                      onClick={() => setReader(option)}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm px-4 py-3 rounded-xl"
                    >
                      {option.kind === "full" ? "Ler gratuitamente" : "Ler prévia"}
                    </button>
                  ) : (
                    <a
                      key={`${option.url}-${index}`}
                      href={option.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm px-4 py-3 rounded-xl"
                    >
                      {option.kind === "borrow"
                        ? "Consultar empréstimo na fonte"
                        : option.kind === "full"
                          ? "Ler na fonte"
                          : "Abrir prévia"}
                    </a>
                  ),
                )}
              </div>
              {!details.isPending && !reading.length && (
                <p className="text-sm text-zinc-400">
                  {details.data?.accessChecked
                    ? "Esta edição não tem leitura online liberada nas fontes consultadas. Use o filtro de leitura gratuita para encontrar livros disponíveis."
                    : "Não foi possível confirmar uma edição para leitura online."}
                </p>
              )}
              {details.data?.externalLinks.length ? (
                <div className="mt-4">
                  <p className="text-xs text-zinc-400 mb-2">
                    Outras fontes indicadas pela Open Library:
                  </p>
                  {details.data.externalLinks.map((link) => (
                    <a
                      key={link.url}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-sm text-indigo-300 underline mb-2"
                    >
                      {link.title}
                    </a>
                  ))}
                </div>
              ) : null}
              {!details.isPending && (!details.data?.accessChecked || !current.description) && (
                <button
                  onClick={() => details.refetch()}
                  className="text-xs text-indigo-300 underline mt-3"
                >
                  Consultar informações novamente
                </button>
              )}
            </section>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
