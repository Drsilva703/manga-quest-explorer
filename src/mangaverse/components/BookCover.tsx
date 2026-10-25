import type { Book } from "../types/book";

export function BookCover({ book, className = "" }: { book: Book; className?: string }) {
  return (
    <img
      key={book.coverUrl || book.id}
      src={book.coverUrl || "/book-placeholder.svg"}
      alt={`Capa de ${book.title}`}
      loading="lazy"
      referrerPolicy="no-referrer"
      className={className}
      style={{
        backgroundImage: 'url("/book-placeholder.svg")',
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
      onError={(event) => {
        const image = event.currentTarget;
        if (!image.dataset.fallback) {
          image.dataset.fallback = "true";
          image.src = "/book-placeholder.svg";
        }
      }}
    />
  );
}
