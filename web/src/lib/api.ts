import type { SearchResponse, SearchMode, VizData } from "./types";

const BASE = "/api";

export async function search(query: string, mode: SearchMode): Promise<SearchResponse> {
  const res = await fetch(`${BASE}/search/${mode}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`Search failed: ${res.status}`);
  return res.json();
}

export async function searchAll(query: string): Promise<Record<SearchMode, SearchResponse>> {
  const [keyword, semantic, hybrid, natural] = await Promise.all([
    search(query, "keyword"),
    search(query, "semantic"),
    search(query, "hybrid"),
    search(query, "natural"),
  ]);
  return { keyword, semantic, hybrid, natural };
}

export async function getFilters(): Promise<{ decades: number[]; genres: string[] }> {
  const res = await fetch(`${BASE}/filters`);
  if (!res.ok) throw new Error(`Filters failed: ${res.status}`);
  return res.json();
}

export async function getVizData(): Promise<VizData["points"]> {
  const res = await fetch(`${BASE}/viz/data`);
  if (!res.ok) throw new Error("Viz data failed");
  return res.json();
}
