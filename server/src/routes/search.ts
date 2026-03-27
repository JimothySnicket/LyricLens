import { Hono } from "hono";
import { parseQuery } from "../lib/query-parser";
import { checkRateLimit, sanitizeInput, callDeepSeek } from "../lib/deepseek";
import { getSongs } from "../lib/data";
import { keywordSearch } from "../search/keyword";
import { semanticSearch } from "../search/semantic";
import { hybridSearch } from "../search/hybrid";
import type { SearchMode, SearchResponse, ParsedQuery } from "../lib/types";

// ---------------------------------------------------------------------------
// Orchestrator prompt — LLM interprets intent and picks search mode
// ---------------------------------------------------------------------------
const ORCHESTRATOR_PROMPT = `You interpret music search queries. Your job is to understand what the user is actually looking for, choose the best search strategy, and express their intent as structured search parameters.

Return a JSON object. Only include fields when you can reasonably infer them — leave null/empty otherwise:

{"mode":"hybrid","decades":[],"genres":[],"mood":null,"artist":null,"semantic":""}

mode (required) — choose the search approach:
- "keyword": the user wants something specific — a title, exact phrase, or named artist. The words themselves matter.
- "semantic": the user is describing a vibe, feeling, or scenario with NO structural filters. Only use if decades, genres, and artist are all empty.
- "hybrid": the query has ANY structural element (decade, genre, artist, era) combined with meaning. If you set decades, genres, or artist, you must use hybrid or keyword — never semantic.
- "both_merge": genuinely ambiguous — run both and merge. Use sparingly.

Understanding references vs requests:
- "something like [song/artist]" or "similar to [song/artist]" = the user wants to DISCOVER new songs, not find that specific one. Do NOT set artist. Think about what makes that song distinctive and describe it.
- "songs by [artist]" or "[artist] songs" = the user wants songs BY that artist. Set artist.

Other fields — only set when the intent is clear:
- decades: decade numbers (1950-2020). Set when a time period is mentioned OR implied by temporal language. "old"/"classic"/"vintage"/"retro" → [1950,1960,1970]. "early 2000s" → [2000]. "before the 80s" → [1950,1960,1970]. "modern"/"recent"/"new" → [2010,2020]. Always translate temporal words into decades.
- genres: from [pop, rock, jazz, blues, country, reggae, soul, funk, disco, hip-hop, r&b, electronic, folk, punk, metal, alternative, indie, grunge, latin]. Only if named or strongly implied.
- mood: one of "sadness", "joy", "anger", "fear", "surprise". Only if emotional intent is clear.
- artist: lowercase name. Only if the user wants songs BY that artist.
- semantic: ALWAYS filled. This is the most important field — it gets matched against song lyrics and descriptions.
  If the query is abstract or situational, think about what the lyrics of ideal matching songs would actually say. "dive bar at 2am" → lyrics about drinking, heartbreak, being alone, regret. "grandma dancing" → lyrics about joy, love, dancing, good times.
  If the query references a known song, describe the qualities that make it distinctive.

Return ONLY JSON, no markdown.`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const MOOD_TO_FILTER: Record<string, string> = {
  sadness: "emotions.sadness",
  joy: "emotions.joy",
  anger: "emotions.anger",
  fear: "emotions.fear",
  surprise: "emotions.surprise",
};

const VALID_MOODS = new Set(Object.keys(MOOD_TO_FILTER));

function parseOrchestratorResponse(
  raw: string,
  cleanQuery: string,
): { mode: string; parsed: ParsedQuery } | null {
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  let data: any;
  try {
    data = JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }

  if (typeof data !== "object" || data === null) return null;

  const mode = typeof data.mode === "string" ? data.mode : "hybrid";
  const decades = Array.isArray(data.decades)
    ? data.decades.filter((d: any) => typeof d === "number" && d >= 1950 && d <= 2020 && d % 10 === 0)
    : [];
  const genres = Array.isArray(data.genres)
    ? data.genres.filter((g: any) => typeof g === "string")
    : [];
  const mood = typeof data.mood === "string" && VALID_MOODS.has(data.mood) ? data.mood : null;
  const artist = typeof data.artist === "string" ? data.artist : null;
  const semantic = typeof data.semantic === "string" && data.semantic.trim()
    ? data.semantic
    : cleanQuery;

  const moods: ParsedQuery["filters"]["moods"] = [];
  if (mood) {
    moods.push({ key: MOOD_TO_FILTER[mood], label: mood, min: 0.2 });
  }

  const parsed: ParsedQuery = {
    scopeTitle: false,
    scopeLyrics: false,
    scopeArtist: !!artist,
    filters: {
      decades,
      genres,
      moods,
      audioFeatures: [],
      artistHint: artist ? artist.split(/\s+/) : [],
    },
    searchPhrase: cleanQuery.toLowerCase().trim(),
    semanticText: semantic,
    terms: semantic.split(/\s+/).filter((t: string) => t.length > 1),
    interpretations: [],
  };

  // Build interpretations for UI
  for (const d of decades) parsed.interpretations.push({ type: "decade", label: `${d}s` });
  for (const g of genres) parsed.interpretations.push({ type: "genre", label: g });
  if (mood) parsed.interpretations.push({ type: "mood", label: mood });
  if (artist) parsed.interpretations.push({ type: "artist", label: artist });
  parsed.interpretations.push({ type: "mode", label: mode });
  parsed.interpretations.push({ type: "parser", label: "AI-powered" });

  return { mode, parsed };
}

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------
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
  const timing: Record<string, number> = {};
  let parsed: ParsedQuery;
  let results;
  let totalFiltered = 2742;

  if (mode === "natural") {
    // Pipeline 4: LLM orchestrator — understands intent, picks search mode
    const ip = c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown";
    const rateCheck = checkRateLimit(ip);
    if (!rateCheck.allowed) {
      return c.json({ error: rateCheck.reason }, 429);
    }

    const clean = sanitizeInput(query);
    if (!clean) {
      return c.json({ error: "Invalid query" }, 400);
    }

    let orchestratorResult: { mode: string; parsed: ParsedQuery } | null = null;
    try {
      const t0 = performance.now();
      const raw = await callDeepSeek(ORCHESTRATOR_PROMPT, clean, 150);
      timing.orchestratorMs = Math.round(performance.now() - t0);
      orchestratorResult = parseOrchestratorResponse(raw, clean);
    } catch {}

    if (orchestratorResult) {
      parsed = orchestratorResult.parsed;
      const songs = getSongs();
      timing.chosenMode = orchestratorResult.mode as any;

      const tSearch = performance.now();
      switch (orchestratorResult.mode) {
        case "keyword":
          results = keywordSearch(songs, parsed);
          totalFiltered = songs.length;
          break;

        case "semantic": {
          const semResult = await semanticSearch(parsed, parsed.semanticText);
          results = semResult.results;
          totalFiltered = semResult.totalFiltered;
          if (semResult.timing) Object.assign(timing, semResult.timing);
          break;
        }

        case "both_merge": {
          const kw = keywordSearch(songs, parsed);
          const sem = await semanticSearch(parsed, parsed.semanticText);
          if (sem.timing) Object.assign(timing, sem.timing);
          const merged = new Map<string, (typeof kw)[0]>();
          for (const r of kw) merged.set(r.song.id, r);
          for (const r of sem.results) {
            const existing = merged.get(r.song.id);
            if (!existing || r.score > existing.score) {
              merged.set(r.song.id, r);
            }
          }
          results = [...merged.values()].sort((a, b) => b.score - a.score).slice(0, 20);
          totalFiltered = songs.length;
          break;
        }

        case "hybrid":
        default: {
          const hybridResult = await hybridSearch(parsed, parsed.semanticText, songs);
          results = hybridResult.results;
          totalFiltered = hybridResult.totalFiltered;
          break;
        }
      }
      timing.searchMs = Math.round(performance.now() - tSearch);
    } else {
      // LLM failed — fall back to regex parser + hybrid
      parsed = parseQuery(query);
      parsed.interpretations.push({ type: "parser", label: "fallback (regex)" });
      const songs = getSongs();
      const hybridResult = await hybridSearch(parsed, query, songs);
      results = hybridResult.results;
      totalFiltered = hybridResult.totalFiltered;
    }
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
      if (semanticResult.timing) Object.assign(timing, semanticResult.timing);
    } else {
      const songs = getSongs();
      const hybridResult = await hybridSearch(parsed, query, songs);
      results = hybridResult.results;
      totalFiltered = hybridResult.totalFiltered;
    }
  }

  const totalMs = Math.round(performance.now() - start);
  timing.totalMs = totalMs;

  console.log(`[${mode}] ${query} — ${JSON.stringify(timing)}`);

  const response: SearchResponse = {
    results,
    mode: mode as SearchMode,
    query,
    parsedQuery: parsed,
    totalFiltered,
    searchTimeMs: totalMs,
  };

  return c.json(response);
});

export { searchRoutes };
