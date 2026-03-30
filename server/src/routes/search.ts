import { Hono } from "hono";
import { parseQuery } from "../lib/query-parser";
import { checkRateLimit, checkGeneralRateLimit, sanitizeInput, callDeepSeek, callDeepSeekReasoner } from "../lib/deepseek";
import { getSongs } from "../lib/data";
import { keywordSearch } from "../search/keyword";
import { semanticSearch } from "../search/semantic";
import { hybridSearch } from "../search/hybrid";
import { songKey } from "../search/utils";
import type { SearchMode, SearchResponse, SearchResult, ParsedQuery, Song } from "../lib/types";

// ---------------------------------------------------------------------------
// Orchestrator prompt — LLM interprets intent and picks search mode
// ---------------------------------------------------------------------------
const ORCHESTRATOR_PROMPT = `You route music search queries to the right search strategy. Database: 2,742 Billboard hits, 1950–2019.

WHAT YOU CAN FILTER ON (these are hard filters — results MUST match):
- decades: [1950,1960,1970,1980,1990,2000,2010]. Use these for ANY time reference.
  "old"/"classic"/"vintage"/"retro" → [1950,1960,1970]
  "new"/"modern"/"recent"/"contemporary" → [2000,2010]
  "80s" → [1980]. "early 2000s" → [2000]. "mid-century" → [1950,1960]
  "before the 80s" → [1950,1960,1970]. "post-2000" → [2000,2010]
- genres: [pop,rock,jazz,blues,country,reggae,soul,funk,disco,hip-hop,r&b,electronic,folk,punk,metal,alternative,indie,grunge,latin]
- mood: "sadness","joy","anger","fear","surprise" (filters on emotion scores)
  "upbeat"/"happy"/"fun"/"party"/"cheerful" → "joy"
  "sad"/"heartbreak"/"lonely"/"melancholy" → "sadness"
  "angry"/"aggressive"/"intense" → "anger"
  "dark"/"eerie"/"haunting" → "fear"
- artist: exact artist name (lowercase). Only when user wants songs BY that artist.
- titleContains: word in the song title. ONLY when user says "in the title"/"called"/"named".

WHAT YOU CAN SEARCH (semantic — finds songs by meaning, not exact words):
- semantic: text matched against song lyrics and AI summaries via vector similarity.
  This is your most powerful tool for concepts, themes, vibes, and abstract queries.
  ALWAYS fill this field. Write what ideal matching songs' lyrics would contain.

HOW TO DECOMPOSE A QUERY — split into knowables + concepts:
1. Extract every knowable fact into a filter (decade, genre, mood, artist, title).
2. Everything left becomes the semantic text.
3. If the query is ALL facts/filters and no concept → use "keyword" mode.
4. If the query is ALL concept and no filters → use "semantic" mode.
5. If it has BOTH facts and concepts → use "hybrid" mode.

DISCOVERY QUERIES — "songs like X" / "similar to X":
Do NOT set artist. Translate the reference into what makes it distinctive.
"songs like Tupac" → decades:[1990], genres:["hip-hop"], semantic:"socially conscious rap, street life, inequality, West Coast"
"something like Bohemian Rhapsody" → genres:["rock"], semantic:"epic theatrical rock, operatic, genre-bending, dramatic structure"

Return ONLY a JSON object:
{"mode":"hybrid","decades":[],"genres":[],"mood":null,"artist":null,"titleContains":null,"semantic":""}

mode: "keyword" | "semantic" | "hybrid" | "both_merge"
Return ONLY JSON, no markdown.`;

// ---------------------------------------------------------------------------
// Judge — DeepSeek Reasoner picks the best result set
// ---------------------------------------------------------------------------
async function judgeResults(
  userQuery: string,
  options: { mode: string; results: SearchResult[] }[],
): Promise<number> {
  const comparison = options.map((r, i) => {
    const top5 = r.results.slice(0, 5).map(s =>
      `"${s.song.title}" — ${s.song.artist} (${s.song.year}, ${s.song.genre})`
    ).join("\n    ");
    return `Option ${i + 1} [${r.mode}]:\n    ${top5}`;
  }).join("\n\n");

  const judgePrompt = `A user searched a music database for: "${userQuery}"

Three different search strategies returned these results:

${comparison}

Which option best matches what the user was looking for? Consider:
- Does the result set match the user's intent (theme, mood, era, genre)?
- Are the songs actually relevant, or just keyword coincidences?
- Would the user be satisfied seeing these results?

Reply with ONLY the option number (1, 2, or 3).`;

  try {
    const raw = await callDeepSeekReasoner(judgePrompt, 20);
    const pickNum = parseInt(raw.replace(/\D/g, "")) || 1;
    return Math.max(0, Math.min(pickNum - 1, options.length - 1));
  } catch {
    // Reasoner failed — fall back to deepseek-chat
    try {
      const raw = await callDeepSeek(
        `Pick the option that best matches the query "${userQuery}". Return ONLY the number.`,
        comparison,
        10,
      );
      const pickNum = parseInt(raw.replace(/\D/g, "")) || 1;
      return Math.max(0, Math.min(pickNum - 1, options.length - 1));
    } catch {
      return 0;
    }
  }
}

// ---------------------------------------------------------------------------
// Shared search executor — runs a parsed config through the right pipeline
// ---------------------------------------------------------------------------
async function executeSearchConfig(
  mode: string,
  parsed: ParsedQuery,
  songs: Song[],
): Promise<SearchResult[]> {
  switch (mode) {
    case "keyword":
      return keywordSearch(songs, parsed);
    case "semantic":
      return (await semanticSearch(parsed, parsed.semanticText)).results;
    case "both_merge": {
      const kw = keywordSearch(songs, parsed);
      const sem = await semanticSearch(parsed, parsed.semanticText);
      const merged = new Map<string, SearchResult>();
      for (const r of kw) merged.set(songKey(r.song.title, r.song.artist), r);
      for (const r of sem.results) {
        const key = songKey(r.song.title, r.song.artist);
        const e = merged.get(key);
        if (!e || r.score > e.score) merged.set(key, r);
      }
      return [...merged.values()].sort((a, b) => b.score - a.score).slice(0, 20);
    }
    case "hybrid":
    default:
      return (await hybridSearch(parsed, parsed.semanticText, songs)).results;
  }
}

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
  // Only honor titleContains if the query actually has title-intent language
  const TITLE_INTENT = /\b(in\s+the\s+title|titled|called|named)\b/i;
  const rawTitleContains = typeof data.titleContains === "string" && data.titleContains.trim()
    ? data.titleContains.trim().toLowerCase()
    : null;
  const titleContains = rawTitleContains && TITLE_INTENT.test(cleanQuery)
    ? rawTitleContains
    : null;
  const semantic = typeof data.semantic === "string" && data.semantic.trim()
    ? data.semantic
    : cleanQuery;

  const moods: ParsedQuery["filters"]["moods"] = [];
  if (mood) {
    moods.push({ key: MOOD_TO_FILTER[mood], label: mood, min: 0.2 });
  }

  const parsed: ParsedQuery = {
    scopeTitle: !!titleContains,
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
    terms: titleContains
      ? titleContains.split(/\s+/).filter((t: string) => t.length > 1)
      : semantic.split(/\s+/).filter((t: string) => t.length > 1),
    termsUnfiltered: cleanQuery.toLowerCase().trim().split(/\s+/).filter((t: string) => t.length > 1),
    interpretations: [],
  };

  // Build interpretations for UI
  for (const d of decades) parsed.interpretations.push({ type: "decade", label: `${d}s` });
  for (const g of genres) parsed.interpretations.push({ type: "genre", label: g });
  if (mood) parsed.interpretations.push({ type: "mood", label: mood });
  if (artist) parsed.interpretations.push({ type: "artist", label: artist });
  if (titleContains) parsed.interpretations.push({ type: "scope", label: `title contains "${titleContains}"` });
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

  if (!["keyword", "semantic", "hybrid", "natural", "deep"].includes(mode)) {
    return c.json({ error: "Invalid mode" }, 400);
  }

  // General rate limit — all modes (60/min per IP)
  const ip = c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown";
  const generalCheck = checkGeneralRateLimit(ip);
  if (!generalCheck.allowed) {
    return c.json({ error: generalCheck.reason }, 429);
  }

  const start = performance.now();
  const timing: Record<string, number> = {};
  let parsed: ParsedQuery = parseQuery(query);
  let results;
  let totalFiltered = 2742;

  if (mode === "natural") {
    // Pipeline 4: Multi-query strategy — generate 3 search configs, run all, LLM picks best
    const rateCheck = checkRateLimit(ip);
    if (!rateCheck.allowed) {
      return c.json({ error: rateCheck.reason }, 429);
    }

    const clean = sanitizeInput(query);
    if (!clean) {
      return c.json({ error: "Invalid query" }, 400);
    }

    const songs = getSongs();

    // Step 1: Ask LLM to generate 3 different search configurations
    const multiPrompt = ORCHESTRATOR_PROMPT + `\n\nGenerate exactly 3 DIFFERENT search configurations for this query, each taking a different approach.\nReturn a JSON array of 3 objects: [{"mode":...,"decades":...,"genres":...,"mood":...,"artist":...,"semantic":...}, ...]\nVary the mode, filters, and semantic text across the 3. One should be more literal, one more conceptual, one balanced.\nReturn ONLY the JSON array.`;

    type ConfigWithParsed = { mode: string; parsed: ParsedQuery };
    let configs: ConfigWithParsed[] = [];

    try {
      const t0 = performance.now();
      const raw = await callDeepSeek(multiPrompt, clean, 500);
      timing.orchestratorMs = Math.round(performance.now() - t0);

      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const arr = JSON.parse(jsonMatch[0]);
        if (Array.isArray(arr)) {
          for (const item of arr.slice(0, 3)) {
            const result = parseOrchestratorResponse(JSON.stringify(item), clean);
            if (result) configs.push(result);
          }
        }
      }
    } catch (e) { console.warn("[search]", e instanceof Error ? e.message : e); }

    if (configs.length === 0) {
      // Fallback: try single-shot parse
      try {
        const raw = await callDeepSeek(ORCHESTRATOR_PROMPT, clean, 150);
        const result = parseOrchestratorResponse(raw, clean);
        if (result) configs.push(result);
      } catch (e) { console.warn("[search]", e instanceof Error ? e.message : e); }
    }

    if (configs.length > 0) {
      // Step 2: Run all configs
      const tSearch = performance.now();
      const allResults: { mode: string; parsed: ParsedQuery; results: SearchResult[] }[] = [];

      for (const cfg of configs) {
        const cfgResults = await executeSearchConfig(cfg.mode, cfg.parsed, songs);
        allResults.push({ mode: cfg.mode, parsed: cfg.parsed, results: cfgResults });
      }

      // Step 3: Reasoner judge picks the best result set
      const tJudge = performance.now();
      const bestIdx = await judgeResults(clean, allResults);
      timing.judgeMs = Math.round(performance.now() - tJudge);

      timing.searchMs = Math.round(performance.now() - tSearch);
      timing.configsGenerated = configs.length as any;
      timing.chosenOption = (bestIdx + 1) as any;
      timing.chosenMode = allResults[bestIdx].mode as any;

      const best = allResults[bestIdx];
      parsed = best.parsed;
      results = best.results;
      totalFiltered = songs.length;
      parsed.interpretations.push({ type: "mode", label: best.mode });
      parsed.interpretations.push({ type: "parser", label: "AI multi-query" });
    } else {
      // All LLM calls failed — fall back to regex parser + hybrid
      parsed = parseQuery(query);
      parsed.interpretations.push({ type: "parser", label: "fallback (regex)" });
      const hybridResult = await hybridSearch(parsed, query, songs);
      results = hybridResult.results;
      totalFiltered = hybridResult.totalFiltered;
    }
  } else if (mode === "deep") {
    // Pipeline 5: Full-agent — reason, 3 configs, see results, pick/refine
    const rateCheck = checkRateLimit(ip);
    if (!rateCheck.allowed) {
      return c.json({ error: rateCheck.reason }, 429);
    }

    const clean = sanitizeInput(query);
    if (!clean) {
      return c.json({ error: "Invalid query" }, 400);
    }

    const songs = getSongs();

    // Step 1: Reason about the query
    const REASON_PROMPT = `You are analysing a music search query for a database of 2,742 Billboard chart hits (1950–2019). Think about: what is the user looking for, which search approach works best, what structural filters apply, and what matching lyrics would say. Be specific.`;
    let reasoning = "";
    try {
      const t0 = performance.now();
      reasoning = await callDeepSeek(REASON_PROMPT, clean, 300);
      timing.reasonMs = Math.round(performance.now() - t0);
    } catch (e) { console.warn("[search]", e instanceof Error ? e.message : e); }

    // Step 2: Generate 3 configs informed by reasoning
    type ConfigWithParsed = { mode: string; parsed: ParsedQuery };
    let configs: ConfigWithParsed[] = [];
    try {
      const t0 = performance.now();
      const configPrompt = reasoning
        ? `${REASON_PROMPT}\n\nYour analysis of "${clean}":\n${reasoning}\n\nBased on this analysis, generate 3 different search configurations as a JSON array: [{"mode":...,"decades":...,"genres":...,"mood":...,"artist":...,"titleContains":...,"semantic":...}, ...]\nVary mode, filters, and semantic text. Return ONLY the JSON array.`
        : `${ORCHESTRATOR_PROMPT}\n\nGenerate 3 different search configurations as a JSON array.`;

      const raw = await callDeepSeek(configPrompt, clean, 500);
      timing.configMs = Math.round(performance.now() - t0);

      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const arr = JSON.parse(jsonMatch[0]);
        if (Array.isArray(arr)) {
          for (const item of arr.slice(0, 3)) {
            const result = parseOrchestratorResponse(JSON.stringify(item), clean);
            if (result) configs.push(result);
          }
        }
      }
    } catch (e) { console.warn("[search]", e instanceof Error ? e.message : e); }

    if (configs.length === 0) {
      // Fallback: single hybrid
      parsed = parseQuery(query);
      parsed.interpretations.push({ type: "parser", label: "fallback (regex)" });
      const hybridResult = await hybridSearch(parsed, query, songs);
      results = hybridResult.results;
      totalFiltered = hybridResult.totalFiltered;
    } else {
      // Step 3: Run all configs
      const tSearch = performance.now();
      const allResults: { mode: string; parsed: ParsedQuery; results: SearchResult[] }[] = [];

      for (const cfg of configs) {
        const cfgResults = await executeSearchConfig(cfg.mode, cfg.parsed, songs);
        allResults.push({ mode: cfg.mode, parsed: cfg.parsed, results: cfgResults });
      }

      // Step 4: Reasoner judge picks the best result set
      const tJudge = performance.now();
      let bestIdx = await judgeResults(clean, allResults);
      timing.judgeMs = Math.round(performance.now() - tJudge);

      // Step 5: Reflect — ask deepseek-chat if refinement would help
      let refinedResults: SearchResult[] | null = null;
      try {
        const bestTop5 = allResults[bestIdx].results.slice(0, 5).map(s =>
          `"${s.song.title}" — ${s.song.artist} (${s.song.year}, ${s.song.genre})`
        ).join("\n");
        const reflectRaw = await callDeepSeek(
          `You analysed the query "${clean}" and the best results were:\n\n${bestTop5}\n\nAre these good results? If yes, respond "GOOD". If not, provide a refined JSON config: {"mode":...,"decades":...,"genres":...,"mood":...,"artist":...,"titleContains":...,"semantic":...}`,
          "Should we refine?",
          300,
        );

        if (!reflectRaw.toUpperCase().includes("GOOD")) {
          const refinedConfig = parseOrchestratorResponse(reflectRaw, clean);
          if (refinedConfig) {
            refinedResults = await executeSearchConfig(refinedConfig.mode, refinedConfig.parsed, songs);
            parsed = refinedConfig.parsed;
          }
        }
      } catch (e) { console.warn("[search]", e instanceof Error ? e.message : e); }

      timing.searchMs = Math.round(performance.now() - tSearch);
      timing.chosenMode = (refinedResults ? "refined" : allResults[bestIdx].mode) as any;

      if (refinedResults) {
        results = refinedResults;
        // parsed was already set in the refined config path above
      } else {
        const best = allResults[bestIdx];
        parsed = best.parsed;
        results = best.results;
      }
      totalFiltered = songs.length;
      if (parsed) parsed.interpretations.push({ type: "parser", label: "AI deep search" });
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
