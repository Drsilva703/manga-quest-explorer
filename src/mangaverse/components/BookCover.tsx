import { useState } from "react";
import type { Book } from "../types/book";

export function BookCover({ book, className = "" }: { book: Book; className?: string }) {
  const candidates = [
    ...new Set(
      [...(book.coverUrls || []), book.coverUrl, "/book-placeholder.svg"].filter(
        (url): url is string => !!url,
      ),
    ),
  ];
  const [failed, setFailed] = useState<string[]>([]);
  const src = candidates.find((url) => !failed.includes(url)) || "/book-placeholder.svg";
  return (
    <img
      key={src}
      src={src}
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
        if (image.getAttribute("src") !== "/book-placeholder.svg")
          setFailed((value) => [...value, src]);
      }}
    />
  );
}
