export type AnimeCollection = "popular" | "seasonal" | "ranking";

export function animeCatalogPath(collection: AnimeCollection, query: string, page: number) {
  const params = new URLSearchParams({ page: String(page), limit: "24", sfw: "true" });
  let path = "/v1/anime";
  if (query.trim()) params.set("q", query.trim());
  else if (collection === "seasonal") {
    path = "/v1/seasons/now";
    params.set("order_by", "members");
    params.set("sort", "desc");
  } else {
    path = "/v1/top/anime";
    if (collection === "popular") params.set("filter", "bypopularity");
  }
  return `${path}?${params}`;
}
