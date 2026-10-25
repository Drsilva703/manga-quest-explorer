export interface Book {
  id: string;
  title: string;
  authors: string[];
  description: string;
  coverUrl: string | null;
  identifiers: { type: string; identifier: string }[];
  source: "google" | "openlibrary";
}

export interface BookSearchResult {
  books: Book[];
  source: Book["source"];
  fallbackReason?: "empty" | "error";
}
