import { Hono } from "hono";
import { parseQuery } from "../lib/query-parser";
import { parseWithDeepSeek, checkRateLimit, sanitizeInput } from "../lib/deepseek";
import { getSongs } from "../lib/data";
import { keywordSearch } from "../search/keyword";
import { semanticSearch } from "../search/semantic";
import { hybridSearch } from "../search/hybrid";
import type { SearchMode, SearchResponse, ParsedQuery } from "../lib/types";

const searchRoutes = new Hono();

searchRoutes.post("/:mode", async (c) => {
  const mode = c.req.param("mode") as SearchMode;
  const { query } = await c.req.json<{ query: string }>();

  if (!query?.trim()) {
    return c.json({ error: "Query required" }, 400);
  }

  if (!["keyword", "semantic", "hybrid", "natural"].includes(mode)) {
    return c.json({ error: "Invalid mode" }, 400);
  }

  const start = performance.now();
  let parsed: ParsedQuery;
  let results;
  let totalFiltered = 2742;

  if (mode === "natural") {
    // Pipeline 4: DeepSeek-powered query parsing
    const ip = c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown";
    const rateCheck = checkRateLimit(ip);
    if (!rateCheck.allowed) {
      return c.json({ error: rateCheck.reason }, 429);
    }

    const clean = sanitizeInput(query);
    if (!clean) {
      return c.json({ error: "Invalid query" }, 400);
    }

    const deepseekResult = await parseWithDeepSeek(clean);

    if (deepseekResult) {
      // Convert DeepSeek result to ParsedQuery format
      parsed = {
        scopeTitle: false,
        scopeLyrics: false,
        scopeArtist: !!deepseekResult.artist,
        filters: {
          decades: deepseekResult.decades,
          genres: deepseekResult.genres,
          moods: [],
          audioFeatures: [],
          artistHint: deepseekResult.artist
            ? deepseekResult.artist.split(/\s+/)
            : [],
        },
        searchPhrase: clean.toLowerCase().trim(),
        semanticText: deepseekResult.semantic,
        terms: deepseekResult.semantic.split(/\s+/).filter(t => t.length > 1),
        interpretations: [],
      };

      // Add mood as emotion filter
      const moodToFilter: Record<string, string> = {
        sadness: "emotions.sadness",
        joy: "emotions.joy",
        anger: "emotions.anger",
        fear: "emotions.fear",
        surprise: "emotions.surprise",
      };
      if (deepseekResult.mood && moodToFilter[deepseekResult.mood]) {
        parsed.filters.moods.push({
          key: moodToFilter[deepseekResult.mood],
          label: deepseekResult.mood,
          min: 0.2,
        });
      }

      // Build interpretations for UI
      for (const d of parsed.filters.decades) {
        parsed.interpretations.push({ type: "decade", label: `${d}s` });
      }
      for (const g of parsed.filters.genres) {
        parsed.interpretations.push({ type: "genre", label: g });
      }
      if (deepseekResult.mood) {
        parsed.interpretations.push({ type: "mood", label: deepseekResult.mood });
      }
      if (deepseekResult.artist) {
        parsed.interpretations.push({ type: "artist", label: deepseekResult.artist });
      }
      parsed.interpretations.push({ type: "parser", label: "AI-powered" });
    } else {
      // DeepSeek failed — fall back to regex parser
      parsed = parseQuery(query);
      parsed.interpretations.push({ type: "parser", label: "fallback (regex)" });
    }

    // Natural mode uses hybrid search (filters + vector)
    const hybridResult = await hybridSearch(parsed, query);
    results = hybridResult.results;
    totalFiltered = hybridResult.totalFiltered;
  } else {
    // Pipelines 1-3: regex parser
    parsed = parseQuery(query);

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
  }

  const response: SearchResponse = {
    results,
    mode: mode as SearchMode,
    query,
    parsedQuery: parsed,
    totalFiltered,
    searchTimeMs: Math.round(performance.now() - start),
  };

  return c.json(response);
});

export { searchRoutes };
