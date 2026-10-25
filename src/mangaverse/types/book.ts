export interface Book {
  id: string;
  title: string;
  authors: string[];
  description: string;
  coverUrl: string | null;
  identifiers: { type: string; identifier: string }[];
  source: "google" | "openlibrary";
  workKey?: string;
  editionKey?: string;
  editionKeys?: string[];
  publicAccessHint?: boolean;
  coverUrls?: string[];
  readingOptions?: BookReadingOption[];
}

export interface BookReadingOption {
  kind: "full" | "preview" | "borrow";
  url: string;
  embedUrl?: string;
  otherEdition?: boolean;
}

export interface BookDetails extends Book {
  readingOptions: BookReadingOption[];
  externalLinks: { title: string; url: string }[];
  accessChecked: boolean;
}

export interface BookSearchResult {
  books: Book[];
  source: Book["source"];
  fallbackReason?: "empty" | "error";
}
