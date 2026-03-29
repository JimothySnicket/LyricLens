/**
 * LLM Strategy Experiment Runner
 *
 * Tests 9 strategies for the "natural" search mode and outputs
 * structured results for an Opus judge to evaluate.
 *
 * Usage: bun run src/eval/experiment.ts
 */
import { deepseekClient } from "./llm/deepseek";
import { getSongs } from "../lib/data";
import { keywordSearch } from "../search/keyword";
import { semanticSearch } from "../search/semantic";
import { hybridSearch } from "../search/hybrid";
import { buildParsedQuery, extractJSON, validateDecomposed } from "./strategies/helpers";
import type { LLMClient } from "./llm/types";
import type { SearchResult, Song } from "../lib/types";
import type { DecomposedQuery } from "./strategies/types";
import { writeFileSync } from "fs";
import { resolve } from "path";

// ---------------------------------------------------------------------------
// Test queries — 12 across key categories
// ---------------------------------------------------------------------------
const TEST_QUERIES = [
  // UI suggested searches
  { query: "baby in the title from the 60s", category: "structural" },
  { query: "songs about heartbreak", category: "conceptual" },
  { query: "heartbreak 90s r&b", category: "mixed" },
  { query: "dive bar at 2am", category: "atmosphere" },
  // Structural
  { query: "songs by Michael Jackson", category: "artist" },
  { query: "rock from the 80s", category: "decade_genre" },
  // Vibes / scenarios
  { query: "songs that feel like driving at night", category: "atmosphere" },
  { query: "grandma dancing at a wedding", category: "atmosphere" },
  // Conceptual
  { query: "sad rock songs", category: "mixed" },
  { query: "upbeat party music from the 80s", category: "mixed" },
  // Tricky
  { query: "something like Bohemian Rhapsody", category: "reference" },
  { query: "summer vibes", category: "mood" },
];

// ---------------------------------------------------------------------------
// Shared prompts
// ---------------------------------------------------------------------------
const EXTRACT_PROMPT = `You interpret music search queries for a database of 2,742 Billboard chart hits (1950–2019).
Return a JSON object:
{"mode":"hybrid","decades":[],"genres":[],"mood":null,"artist":null,"semantic":""}

mode: "keyword" (exact words matter), "semantic" (vibe/feeling, no structural filters), "hybrid" (structural + meaning), "both_merge" (ambiguous).
decades: [1950..2020] in 10-year increments. Translate "old"→[1950,1960,1970], "modern"→[2010,2020], etc.
genres: from [pop,rock,jazz,blues,country,reggae,soul,funk,disco,hip-hop,r&b,electronic,folk,punk,metal,alternative,indie,grunge,latin].
mood: one of "sadness","joy","anger","fear","surprise" if clear.
artist: lowercase. Only if user wants songs BY that artist.
semantic: ALWAYS filled. Rewrite the query as what matching lyrics would say. For references like "something like X", describe the qualities.
Return ONLY JSON.`;

const REASON_PROMPT = `You are analysing a music search query for a database of 2,742 Billboard chart hits (1950–2019).

Think about:
1. What is the user ACTUALLY looking for? (specific songs? a vibe? a combination?)
2. Which search approach would work best? (keyword for exact words, semantic for meaning/vibe, hybrid for both)
3. What structural filters apply? (decade, genre, artist, mood)
4. What would the ideal matching songs' lyrics actually say?

Be specific and concrete. This analysis will be used to build search parameters.`;

const REFINE_PROMPT = `Review your analysis. Consider:
- Could you be misinterpreting the query? What alternative readings are there?
- Are your structural filters too narrow or too broad?
- Is your semantic description specific enough to find the right songs?
Refine your analysis.`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

type SearchConfig = DecomposedQuery & { mode: string };

async function runSearch(
  config: SearchConfig,
  rawQuery: string,
  songs: Song[],
): Promise<SearchResult[]> {
  const pq = buildParsedQuery(rawQuery, config);
  switch (config.mode) {
    case "keyword":
      return keywordSearch(songs, pq);
    case "semantic":
      return (await semanticSearch(pq, config.semantic)).results;
    case "both_merge": {
      const kw = keywordSearch(songs, pq);
      const sem = await semanticSearch(pq, config.semantic);
      const merged = new Map<string, SearchResult>();
      for (const r of kw) merged.set(r.song.id, r);
      for (const r of sem.results) {
        const e = merged.get(r.song.id);
        if (!e || r.score > e.score) merged.set(r.song.id, r);
      }
      return [...merged.values()].sort((a, b) => b.score - a.score).slice(0, 20);
    }
    case "hybrid":
    default:
      return (await hybridSearch(pq, config.semantic, songs)).results;
  }
}

function parseConfig(raw: string, fallbackQuery: string): SearchConfig | null {
  const parsed = extractJSON(raw);
  if (!parsed) return null;
  const decomposed = validateDecomposed(parsed, fallbackQuery);
  return {
    ...decomposed,
    mode: typeof parsed.mode === "string" ? parsed.mode : "hybrid",
  };
}

function resultSummary(results: SearchResult[], n = 10) {
  return results.slice(0, n).map((r, i) => ({
    rank: i + 1,
    title: r.song.title,
    artist: r.song.artist,
    year: r.song.year,
    genre: r.song.genre,
    score: Math.round(r.score * 1000) / 1000,
    reason: r.matchReason,
  }));
}

// ---------------------------------------------------------------------------
// Strategy implementations
// ---------------------------------------------------------------------------
type StrategyResult = {
  results: SearchResult[];
  llmCalls: number;
  searchCalls: number;
  timeMs: number;
  mode: string;
  trace: string[]; // conversation trace for debugging
};

type StrategyFn = (
  query: string,
  songs: Song[],
  llm: LLMClient,
) => Promise<StrategyResult>;

// --- 1. baseline: single-shot JSON extraction ---
const baseline: StrategyFn = async (query, songs, llm) => {
  const t0 = performance.now();
  const trace: string[] = [];

  const raw = await llm.call(EXTRACT_PROMPT, query, 200);
  trace.push(`[LLM] ${raw}`);

  const config = parseConfig(raw, query);
  if (!config) {
    const pq = buildParsedQuery(query, { decades: [], genres: [], mood: null, artist: null, semantic: query });
    const results = (await hybridSearch(pq, query, songs)).results;
    return { results, llmCalls: 1, searchCalls: 1, timeMs: Math.round(performance.now() - t0), mode: "hybrid-fallback", trace };
  }

  const results = await runSearch(config, query, songs);
  return { results, llmCalls: 1, searchCalls: 1, timeMs: Math.round(performance.now() - t0), mode: config.mode, trace };
};

// --- 2. cot: chain-of-thought in single call ---
const cot: StrategyFn = async (query, songs, llm) => {
  const t0 = performance.now();
  const trace: string[] = [];

  const cotPrompt = EXTRACT_PROMPT + `\n\nBefore outputting JSON, briefly reason about what the user actually wants (2-3 sentences). Then output the JSON on its own line.`;
  const raw = await llm.call(cotPrompt, query, 350);
  trace.push(`[LLM] ${raw}`);

  const config = parseConfig(raw, query);
  if (!config) {
    const pq = buildParsedQuery(query, { decades: [], genres: [], mood: null, artist: null, semantic: query });
    const results = (await hybridSearch(pq, query, songs)).results;
    return { results, llmCalls: 1, searchCalls: 1, timeMs: Math.round(performance.now() - t0), mode: "hybrid-fallback", trace };
  }

  const results = await runSearch(config, query, songs);
  return { results, llmCalls: 1, searchCalls: 1, timeMs: Math.round(performance.now() - t0), mode: config.mode, trace };
};

// --- 3. reason-2: 2-turn reasoning then extraction ---
const reason2: StrategyFn = async (query, songs, llm) => {
  const t0 = performance.now();
  const trace: string[] = [];

  const reasoning = await llm.callMultiTurn([
    { role: "system", content: REASON_PROMPT },
    { role: "user", content: query },
  ], 300);
  trace.push(`[REASON] ${reasoning}`);

  await delay(500);

  const raw = await llm.callMultiTurn([
    { role: "system", content: REASON_PROMPT },
    { role: "user", content: query },
    { role: "assistant", content: reasoning },
    { role: "user", content: `Based on your analysis, output the search parameters as JSON.\n\n${EXTRACT_PROMPT}` },
  ], 200);
  trace.push(`[EXTRACT] ${raw}`);

  const config = parseConfig(raw, query);
  if (!config) {
    const pq = buildParsedQuery(query, { decades: [], genres: [], mood: null, artist: null, semantic: query });
    const results = (await hybridSearch(pq, query, songs)).results;
    return { results, llmCalls: 2, searchCalls: 1, timeMs: Math.round(performance.now() - t0), mode: "hybrid-fallback", trace };
  }

  const results = await runSearch(config, query, songs);
  return { results, llmCalls: 2, searchCalls: 1, timeMs: Math.round(performance.now() - t0), mode: config.mode, trace };
};

// --- 4. reason-3: 3-turn reasoning ---
const reason3: StrategyFn = async (query, songs, llm) => {
  const t0 = performance.now();
  const trace: string[] = [];

  const reasoning = await llm.callMultiTurn([
    { role: "system", content: REASON_PROMPT },
    { role: "user", content: query },
  ], 300);
  trace.push(`[REASON] ${reasoning}`);
  await delay(500);

  const refined = await llm.callMultiTurn([
    { role: "system", content: REASON_PROMPT },
    { role: "user", content: query },
    { role: "assistant", content: reasoning },
    { role: "user", content: REFINE_PROMPT },
  ], 300);
  trace.push(`[REFINE] ${refined}`);
  await delay(500);

  const raw = await llm.callMultiTurn([
    { role: "system", content: REASON_PROMPT },
    { role: "user", content: query },
    { role: "assistant", content: reasoning },
    { role: "user", content: REFINE_PROMPT },
    { role: "assistant", content: refined },
    { role: "user", content: `Now output the final search parameters as JSON.\n\n${EXTRACT_PROMPT}` },
  ], 200);
  trace.push(`[EXTRACT] ${raw}`);

  const config = parseConfig(raw, query);
  if (!config) {
    const pq = buildParsedQuery(query, { decades: [], genres: [], mood: null, artist: null, semantic: query });
    const results = (await hybridSearch(pq, query, songs)).results;
    return { results, llmCalls: 3, searchCalls: 1, timeMs: Math.round(performance.now() - t0), mode: "hybrid-fallback", trace };
  }

  const results = await runSearch(config, query, songs);
  return { results, llmCalls: 3, searchCalls: 1, timeMs: Math.round(performance.now() - t0), mode: config.mode, trace };
};

// --- 5. multi-query: generate 3 configs, run all, LLM picks best ---
const multiQuery: StrategyFn = async (query, songs, llm) => {
  const t0 = performance.now();
  const trace: string[] = [];

  const multiPrompt = `${EXTRACT_PROMPT}

Generate exactly 3 DIFFERENT search configurations for this query, each taking a different approach.
Return a JSON array of 3 objects: [{"mode":...,"decades":...,"genres":...,"mood":...,"artist":...,"semantic":...}, ...]
Vary the mode, filters, and semantic text across the 3. One should be more literal, one more conceptual, one balanced.
Return ONLY the JSON array.`;

  const raw = await llm.call(multiPrompt, query, 500);
  trace.push(`[MULTI] ${raw}`);

  const parsed = extractJSON(raw);
  const configs: SearchConfig[] = [];
  if (Array.isArray(parsed)) {
    for (const item of parsed.slice(0, 3)) {
      const decomposed = validateDecomposed(item, query);
      configs.push({ ...decomposed, mode: typeof item.mode === "string" ? item.mode : "hybrid" });
    }
  }

  if (configs.length === 0) {
    // Fallback: single hybrid
    const pq = buildParsedQuery(query, { decades: [], genres: [], mood: null, artist: null, semantic: query });
    const results = (await hybridSearch(pq, query, songs)).results;
    return { results, llmCalls: 1, searchCalls: 1, timeMs: Math.round(performance.now() - t0), mode: "hybrid-fallback", trace };
  }

  // Run all configs
  const allResults: { config: SearchConfig; results: SearchResult[] }[] = [];
  for (const config of configs) {
    const results = await runSearch(config, query, songs);
    allResults.push({ config, results });
  }

  // Have LLM pick the best set
  await delay(500);
  const comparison = allResults.map((r, i) => {
    const top5 = r.results.slice(0, 5).map(s => `${s.song.title} — ${s.song.artist} (${s.song.year})`).join("\n  ");
    return `Option ${i + 1} [${r.config.mode}]:\n  ${top5}`;
  }).join("\n\n");

  const pickRaw = await llm.call(
    `You are evaluating search results for the query: "${query}"\nPick the option that best matches what the user is looking for. Return ONLY the number (1, 2, or 3).`,
    comparison,
    10,
  );
  trace.push(`[PICK] ${pickRaw}`);

  const pickNum = parseInt(pickRaw.replace(/\D/g, "")) || 1;
  const bestIdx = Math.max(0, Math.min(pickNum - 1, allResults.length - 1));
  const best = allResults[bestIdx];

  return {
    results: best.results,
    llmCalls: 2,
    searchCalls: configs.length,
    timeMs: Math.round(performance.now() - t0),
    mode: best.config.mode,
    trace,
  };
};

// --- 6. reflect: search, show results to LLM, refine ---
const reflect: StrategyFn = async (query, songs, llm) => {
  const t0 = performance.now();
  const trace: string[] = [];

  // Initial search
  const raw = await llm.call(EXTRACT_PROMPT, query, 200);
  trace.push(`[LLM] ${raw}`);
  const config = parseConfig(raw, query);
  if (!config) {
    const pq = buildParsedQuery(query, { decades: [], genres: [], mood: null, artist: null, semantic: query });
    const results = (await hybridSearch(pq, query, songs)).results;
    return { results, llmCalls: 1, searchCalls: 1, timeMs: Math.round(performance.now() - t0), mode: "hybrid-fallback", trace };
  }

  const firstResults = await runSearch(config, query, songs);

  // Show results to LLM
  await delay(500);
  const resultsList = firstResults.slice(0, 10).map((r, i) =>
    `${i + 1}. "${r.song.title}" — ${r.song.artist} (${r.song.year}, ${r.song.genre})`
  ).join("\n");

  const reflectRaw = await llm.callMultiTurn([
    { role: "system", content: `You evaluated the search query "${query}" and got these results:\n\n${resultsList}\n\nAre these good results for what the user is looking for? If not, explain what's wrong and provide a refined JSON search config. If the results are good, respond with just "GOOD".` },
    { role: "user", content: `Should we refine the search for "${query}"?` },
  ], 300);
  trace.push(`[REFLECT] ${reflectRaw}`);

  if (reflectRaw.toUpperCase().includes("GOOD")) {
    return { results: firstResults, llmCalls: 2, searchCalls: 1, timeMs: Math.round(performance.now() - t0), mode: config.mode, trace };
  }

  // Try to extract refined config
  const refined = parseConfig(reflectRaw, query);
  if (!refined) {
    return { results: firstResults, llmCalls: 2, searchCalls: 1, timeMs: Math.round(performance.now() - t0), mode: config.mode, trace };
  }

  const refinedResults = await runSearch(refined, query, songs);
  return {
    results: refinedResults,
    llmCalls: 2,
    searchCalls: 2,
    timeMs: Math.round(performance.now() - t0),
    mode: refined.mode,
    trace,
  };
};

// --- 7. reason+multi: 2-turn reasoning then 3 queries ---
const reasonMulti: StrategyFn = async (query, songs, llm) => {
  const t0 = performance.now();
  const trace: string[] = [];

  // Reason first
  const reasoning = await llm.callMultiTurn([
    { role: "system", content: REASON_PROMPT },
    { role: "user", content: query },
  ], 300);
  trace.push(`[REASON] ${reasoning}`);
  await delay(500);

  // Generate 3 configs informed by reasoning
  const multiRaw = await llm.callMultiTurn([
    { role: "system", content: REASON_PROMPT },
    { role: "user", content: query },
    { role: "assistant", content: reasoning },
    { role: "user", content: `Based on your analysis, generate 3 different search configurations, each taking a different approach.\nReturn a JSON array: [{"mode":...,"decades":...,"genres":...,"mood":...,"artist":...,"semantic":...}, ...]\nVary mode, filters, and semantic text. Return ONLY the JSON array.` },
  ], 500);
  trace.push(`[MULTI] ${multiRaw}`);

  const parsed = extractJSON(multiRaw);
  const configs: SearchConfig[] = [];
  if (Array.isArray(parsed)) {
    for (const item of parsed.slice(0, 3)) {
      const decomposed = validateDecomposed(item, query);
      configs.push({ ...decomposed, mode: typeof item.mode === "string" ? item.mode : "hybrid" });
    }
  }

  if (configs.length === 0) {
    const pq = buildParsedQuery(query, { decades: [], genres: [], mood: null, artist: null, semantic: query });
    const results = (await hybridSearch(pq, query, songs)).results;
    return { results, llmCalls: 2, searchCalls: 1, timeMs: Math.round(performance.now() - t0), mode: "hybrid-fallback", trace };
  }

  const allResults: { config: SearchConfig; results: SearchResult[] }[] = [];
  for (const config of configs) {
    const results = await runSearch(config, query, songs);
    allResults.push({ config, results });
  }

  await delay(500);
  const comparison = allResults.map((r, i) => {
    const top5 = r.results.slice(0, 5).map(s => `${s.song.title} — ${s.song.artist} (${s.song.year})`).join("\n  ");
    return `Option ${i + 1} [${r.config.mode}]:\n  ${top5}`;
  }).join("\n\n");

  const pickRaw = await llm.call(
    `You are evaluating search results for the query: "${query}"\nPick the option that best matches. Return ONLY the number (1, 2, or 3).`,
    comparison,
    10,
  );
  trace.push(`[PICK] ${pickRaw}`);

  const pickNum = parseInt(pickRaw.replace(/\D/g, "")) || 1;
  const bestIdx = Math.max(0, Math.min(pickNum - 1, allResults.length - 1));

  return {
    results: allResults[bestIdx].results,
    llmCalls: 3,
    searchCalls: configs.length,
    timeMs: Math.round(performance.now() - t0),
    mode: allResults[bestIdx].config.mode,
    trace,
  };
};

// --- 8. reason+reflect: reason, search, show results, refine ---
const reasonReflect: StrategyFn = async (query, songs, llm) => {
  const t0 = performance.now();
  const trace: string[] = [];

  // Reason
  const reasoning = await llm.callMultiTurn([
    { role: "system", content: REASON_PROMPT },
    { role: "user", content: query },
  ], 300);
  trace.push(`[REASON] ${reasoning}`);
  await delay(500);

  // Extract
  const raw = await llm.callMultiTurn([
    { role: "system", content: REASON_PROMPT },
    { role: "user", content: query },
    { role: "assistant", content: reasoning },
    { role: "user", content: `Based on your analysis, output search parameters as JSON.\n\n${EXTRACT_PROMPT}` },
  ], 200);
  trace.push(`[EXTRACT] ${raw}`);

  const config = parseConfig(raw, query);
  if (!config) {
    const pq = buildParsedQuery(query, { decades: [], genres: [], mood: null, artist: null, semantic: query });
    const results = (await hybridSearch(pq, query, songs)).results;
    return { results, llmCalls: 2, searchCalls: 1, timeMs: Math.round(performance.now() - t0), mode: "hybrid-fallback", trace };
  }

  const firstResults = await runSearch(config, query, songs);

  // Reflect
  await delay(500);
  const resultsList = firstResults.slice(0, 10).map((r, i) =>
    `${i + 1}. "${r.song.title}" — ${r.song.artist} (${r.song.year}, ${r.song.genre})`
  ).join("\n");

  const reflectRaw = await llm.callMultiTurn([
    { role: "system", content: REASON_PROMPT },
    { role: "user", content: query },
    { role: "assistant", content: reasoning },
    { role: "user", content: `Your search returned these results:\n\n${resultsList}\n\nAre these good results? If not, provide a refined JSON config. If good, say "GOOD".` },
  ], 300);
  trace.push(`[REFLECT] ${reflectRaw}`);

  if (reflectRaw.toUpperCase().includes("GOOD")) {
    return { results: firstResults, llmCalls: 3, searchCalls: 1, timeMs: Math.round(performance.now() - t0), mode: config.mode, trace };
  }

  const refined = parseConfig(reflectRaw, query);
  if (!refined) {
    return { results: firstResults, llmCalls: 3, searchCalls: 1, timeMs: Math.round(performance.now() - t0), mode: config.mode, trace };
  }

  const refinedResults = await runSearch(refined, query, songs);
  return {
    results: refinedResults,
    llmCalls: 3,
    searchCalls: 2,
    timeMs: Math.round(performance.now() - t0),
    mode: refined.mode,
    trace,
  };
};

// --- 9. full-agent: reason → 3 queries → see results → optional refine ---
const fullAgent: StrategyFn = async (query, songs, llm) => {
  const t0 = performance.now();
  const trace: string[] = [];

  // Reason
  const reasoning = await llm.callMultiTurn([
    { role: "system", content: REASON_PROMPT },
    { role: "user", content: query },
  ], 300);
  trace.push(`[REASON] ${reasoning}`);
  await delay(500);

  // Generate 3 configs
  const multiRaw = await llm.callMultiTurn([
    { role: "system", content: REASON_PROMPT },
    { role: "user", content: query },
    { role: "assistant", content: reasoning },
    { role: "user", content: `Generate 3 different search configurations.\nReturn a JSON array: [{"mode":...,"decades":...,"genres":...,"mood":...,"artist":...,"semantic":...}, ...]\nReturn ONLY the JSON array.` },
  ], 500);
  trace.push(`[MULTI] ${multiRaw}`);

  const parsed = extractJSON(multiRaw);
  const configs: SearchConfig[] = [];
  if (Array.isArray(parsed)) {
    for (const item of parsed.slice(0, 3)) {
      const decomposed = validateDecomposed(item, query);
      configs.push({ ...decomposed, mode: typeof item.mode === "string" ? item.mode : "hybrid" });
    }
  }

  if (configs.length === 0) {
    const pq = buildParsedQuery(query, { decades: [], genres: [], mood: null, artist: null, semantic: query });
    const results = (await hybridSearch(pq, query, songs)).results;
    return { results, llmCalls: 2, searchCalls: 1, timeMs: Math.round(performance.now() - t0), mode: "hybrid-fallback", trace };
  }

  // Run all configs
  const allResults: { config: SearchConfig; results: SearchResult[] }[] = [];
  for (const config of configs) {
    const results = await runSearch(config, query, songs);
    allResults.push({ config, results });
  }

  // Show ALL results to LLM, let it pick best + optionally refine
  await delay(500);
  const comparison = allResults.map((r, i) => {
    const top5 = r.results.slice(0, 5).map(s =>
      `"${s.song.title}" — ${s.song.artist} (${s.song.year}, ${s.song.genre})`
    ).join("\n    ");
    return `Option ${i + 1} [${r.config.mode}, semantic="${r.config.semantic.slice(0, 60)}"]:\n    ${top5}`;
  }).join("\n\n");

  const reflectRaw = await llm.callMultiTurn([
    { role: "system", content: REASON_PROMPT },
    { role: "user", content: query },
    { role: "assistant", content: reasoning },
    { role: "user", content: `Here are results from 3 different search approaches:\n\n${comparison}\n\nWhich option best answers "${query}"? Pick by number. If NONE are good enough, provide a refined JSON config to try. Format: "PICK N" or a JSON config.` },
  ], 300);
  trace.push(`[REFLECT] ${reflectRaw}`);

  // Check if LLM wants to refine
  const refined = parseConfig(reflectRaw, query);
  if (refined && !reflectRaw.toUpperCase().includes("PICK")) {
    const refinedResults = await runSearch(refined, query, songs);
    return {
      results: refinedResults,
      llmCalls: 3,
      searchCalls: configs.length + 1,
      timeMs: Math.round(performance.now() - t0),
      mode: refined.mode,
      trace,
    };
  }

  // Pick from existing
  const pickMatch = reflectRaw.match(/PICK\s*(\d)/i) || reflectRaw.match(/(\d)/);
  const pickNum = parseInt(pickMatch?.[1] || "1") || 1;
  const bestIdx = Math.max(0, Math.min(pickNum - 1, allResults.length - 1));

  return {
    results: allResults[bestIdx].results,
    llmCalls: 3,
    searchCalls: configs.length,
    timeMs: Math.round(performance.now() - t0),
    mode: allResults[bestIdx].config.mode,
    trace,
  };
};

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------
const STRATEGIES: Record<string, StrategyFn> = {
  "1-baseline": baseline,
  "2-cot": cot,
  "3-reason2": reason2,
  "4-reason3": reason3,
  "5-multi-query": multiQuery,
  "6-reflect": reflect,
  "7-reason+multi": reasonMulti,
  "8-reason+reflect": reasonReflect,
  "9-full-agent": fullAgent,
};

async function main() {
  const songs = getSongs();
  console.log(`Loaded ${songs.length} songs`);
  console.log(`Testing ${Object.keys(STRATEGIES).length} strategies × ${TEST_QUERIES.length} queries\n`);

  const output: any = {
    timestamp: new Date().toISOString(),
    queries: [] as any[],
  };

  for (const { query, category } of TEST_QUERIES) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`Query: "${query}" [${category}]`);
    console.log("=".repeat(60));

    const queryResult: any = {
      query,
      category,
      strategies: {} as any,
    };

    for (const [name, fn] of Object.entries(STRATEGIES)) {
      process.stdout.write(`  ${name}...`);
      try {
        const result = await fn(query, songs, deepseekClient);
        queryResult.strategies[name] = {
          mode: result.mode,
          llmCalls: result.llmCalls,
          searchCalls: result.searchCalls,
          timeMs: result.timeMs,
          top10: resultSummary(result.results, 10),
          trace: result.trace,
        };
        const topTitle = result.results[0]?.song.title ?? "(none)";
        console.log(` ${result.mode} | ${result.timeMs}ms | #1: ${topTitle}`);
      } catch (err: any) {
        console.log(` ERROR: ${err.message}`);
        queryResult.strategies[name] = { error: err.message };
      }

      // Rate limit buffer between strategies
      await delay(1500);
    }

    output.queries.push(queryResult);
  }

  // Save results
  const outPath = resolve(import.meta.dir, "results", `experiment-${Date.now()}.json`);
  writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`\nResults saved to: ${outPath}`);
}

main().catch(console.error);
