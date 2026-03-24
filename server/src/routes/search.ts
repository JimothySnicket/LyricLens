import { Hono } from "hono";
import { parseQuery } from "../lib/query-parser";
import { getSongs } from "../lib/data";
import { keywordSearch } from "../search/keyword";
import { semanticSearch } from "../search/semantic";
import { hybridSearch } from "../search/hybrid";
import type { SearchMode, SearchResponse } from "../lib/types";

const searchRoutes = new Hono();

searchRoutes.post("/:mode", async (c) => {
  const mode = c.req.param("mode") as SearchMode;
  const { query } = await c.req.json<{ query: string }>();

  if (!query?.trim()) {
    return c.json({ error: "Query required" }, 400);
  }

  if (!["keyword", "semantic", "hybrid"].includes(mode)) {
    return c.json({ error: "Invalid mode" }, 400);
  }

  const start = performance.now();
  const parsed = parseQuery(query);

  let results;
  let totalFiltered = 819;

  if (mode === "keyword") {
    const songs = getSongs();
    results = keywordSearch(songs, parsed);
    totalFiltered = songs.length;
  } else if (mode === "semantic") {
    const semanticResult = await semanticSearch(parsed, query);
    results = semanticResult.results;
    totalFiltered = semanticResult.totalFiltered;
  } else {
    const hybridResult = await hybridSearch(parsed, query);
    results = hybridResult.results;
    totalFiltered = hybridResult.totalFiltered;
  }

  const response: SearchResponse = {
    results,
    mode,
    query,
    parsedQuery: parsed,
    totalFiltered,
    searchTimeMs: Math.round(performance.now() - start),
  };

  return c.json(response);
});

export { searchRoutes };
