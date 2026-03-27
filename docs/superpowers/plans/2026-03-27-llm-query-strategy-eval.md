# LLM Query Strategy Evaluation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone TypeScript eval harness that tests four LLM query strategies across two models (DeepSeek V3, Gemini Flash) against 32 baseline + 10-15 hard queries, measuring P@5, P@10, MRR, and latency.

**Architecture:** Each strategy is a function conforming to a shared interface. Strategies import the real search functions from `server/src/search/`. Two thin LLM clients (DeepSeek, Gemini) expose the same `callLLM` interface. A runner loops over all combinations and computes metrics.

**Tech Stack:** Bun, TypeScript, DeepSeek API, Gemini API, Qdrant (via existing client)

---

## File Structure

```
server/src/eval/
├── run.ts                  # Entry point + metrics + console output
├── curate.ts               # Utility to collect candidates for hard query curation
├── llm/
│   ├── types.ts            # LLMProvider type + callLLM interface
│   ├── deepseek.ts         # DeepSeek V3 client
│   └── gemini.ts           # Gemini Flash client
├── strategies/
│   ├── types.ts            # Strategy interface
│   ├── helpers.ts          # Shared: build ParsedQuery from LLM JSON output
│   ├── decomposer.ts       # Strategy A
│   ├── orchestrator.ts     # Strategy B
│   ├── agentic.ts          # Strategy C
│   └── reranker.ts         # Strategy D
├── queries/
│   ├── baseline.ts         # 32 existing queries ported from evaluate.py
│   └── hard.ts             # 10-15 hard queries (expected IDs added after curation)
└── results/                # Output dir (gitignored)
```

**Existing files touched:**
- `.gitignore` — add `server/src/eval/results/`

---

## Task 1: LLM Client Layer

**Files:**
- Create: `server/src/eval/llm/types.ts`
- Create: `server/src/eval/llm/deepseek.ts`
- Create: `server/src/eval/llm/gemini.ts`

- [ ] **Step 1: Create LLM types**

```typescript
// server/src/eval/llm/types.ts
export type LLMProvider = "deepseek" | "gemini";

export interface LLMClient {
  name: LLMProvider;
  call(systemPrompt: string, userMessage: string, maxTokens?: number): Promise<string>;
  callMultiTurn(messages: { role: "system" | "user" | "assistant"; content: string }[], maxTokens?: number): Promise<string>;
}
```

- [ ] **Step 2: Create DeepSeek client**

```typescript
// server/src/eval/llm/deepseek.ts
import type { LLMClient } from "./types";
import { readFileSync } from "fs";
import { resolve } from "path";

const envPath = resolve(import.meta.dir, "../../../../.env");
try {
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const match = line.match(/^(\w+)=(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].trim();
    }
  }
} catch {}

const API_URL = "https://api.deepseek.com/chat/completions";
const API_KEY = process.env.DEEPSEEK_API_KEY || "";

export const deepseekClient: LLMClient = {
  name: "deepseek",

  async call(systemPrompt, userMessage, maxTokens = 200) {
    return this.callMultiTurn([
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ], maxTokens);
  },

  async callMultiTurn(messages, maxTokens = 200) {
    const resp = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages,
        max_tokens: maxTokens,
        temperature: 0.3,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!resp.ok) throw new Error(`DeepSeek API error: ${resp.status}`);
    const data = await resp.json() as any;
    return (data.choices?.[0]?.message?.content ?? "").trim();
  },
};
```

- [ ] **Step 3: Create Gemini client**

```typescript
// server/src/eval/llm/gemini.ts
import type { LLMClient } from "./types";
import { readFileSync } from "fs";
import { resolve } from "path";

const envPath = resolve(import.meta.dir, "../../../../.env");
try {
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const match = line.match(/^(\w+)=(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].trim();
    }
  }
} catch {}

const API_KEY = process.env.GEMINI_API_KEY || "";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

export const geminiClient: LLMClient = {
  name: "gemini",

  async call(systemPrompt, userMessage, maxTokens = 200) {
    return this.callMultiTurn([
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ], maxTokens);
  },

  async callMultiTurn(messages, maxTokens = 200) {
    // Gemini uses system_instruction + contents format
    const systemMsg = messages.find(m => m.role === "system");
    const contents = messages
      .filter(m => m.role !== "system")
      .map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    const resp = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: systemMsg
          ? { parts: [{ text: systemMsg.content }] }
          : undefined,
        contents,
        generationConfig: {
          maxOutputTokens: maxTokens,
          temperature: 0.3,
        },
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Gemini API error: ${resp.status} — ${text}`);
    }
    const data = await resp.json() as any;
    return (data.candidates?.[0]?.content?.parts?.[0]?.text ?? "").trim();
  },
};
```

- [ ] **Step 4: Smoke test both clients**

Run:
```bash
cd "c:/Users/Jamie/Documents/Ai Dev Tools/Portfolio/Lyric-Lens"
bun -e "
import { deepseekClient } from './server/src/eval/llm/deepseek';
import { geminiClient } from './server/src/eval/llm/gemini';
const ds = await deepseekClient.call('Reply with just OK', 'test');
console.log('DeepSeek:', ds);
const gm = await geminiClient.call('Reply with just OK', 'test');
console.log('Gemini:', gm);
"
```
Expected: Both print a response containing "OK".

- [ ] **Step 5: Commit**

```bash
git add server/src/eval/llm/
git commit -m "feat(eval): add DeepSeek and Gemini LLM clients for strategy evaluation"
```

---

## Task 2: Strategy Types & Helpers

**Files:**
- Create: `server/src/eval/strategies/types.ts`
- Create: `server/src/eval/strategies/helpers.ts`

- [ ] **Step 1: Create strategy types**

```typescript
// server/src/eval/strategies/types.ts
import type { SearchResult, Song } from "../../lib/types";
import type { LLMClient } from "../llm/types";

export interface Strategy {
  name: string;
  run(query: string, songs: Song[], llm: LLMClient): Promise<SearchResult[]>;
}

export interface DecomposedQuery {
  decades: number[];
  genres: string[];
  mood: string | null;
  artist: string | null;
  semantic: string;
}
```

- [ ] **Step 2: Create helpers — build ParsedQuery from LLM output**

This converts the LLM's decomposed JSON into the `ParsedQuery` shape that `keywordSearch`, `semanticSearch`, and `hybridSearch` expect.

```typescript
// server/src/eval/strategies/helpers.ts
import type { ParsedQuery } from "../../lib/types";
import type { DecomposedQuery } from "./types";

const MOOD_TO_FILTER: Record<string, string> = {
  sadness: "emotions.sadness",
  joy: "emotions.joy",
  anger: "emotions.anger",
  fear: "emotions.fear",
  surprise: "emotions.surprise",
};

export function buildParsedQuery(raw: string, decomposed: DecomposedQuery): ParsedQuery {
  const moods: ParsedQuery["filters"]["moods"] = [];
  if (decomposed.mood && MOOD_TO_FILTER[decomposed.mood]) {
    moods.push({
      key: MOOD_TO_FILTER[decomposed.mood],
      label: decomposed.mood,
      min: 0.2,
    });
  }

  return {
    scopeTitle: false,
    scopeLyrics: false,
    scopeArtist: !!decomposed.artist,
    filters: {
      decades: decomposed.decades,
      genres: decomposed.genres,
      moods,
      audioFeatures: [],
      artistHint: decomposed.artist ? decomposed.artist.split(/\s+/) : [],
    },
    searchPhrase: raw.toLowerCase().trim(),
    semanticText: decomposed.semantic || raw,
    terms: (decomposed.semantic || raw).split(/\s+/).filter(t => t.length > 1),
    interpretations: [],
  };
}

export function extractJSON(text: string): any | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

export function validateDecomposed(parsed: any, fallbackQuery: string): DecomposedQuery {
  if (typeof parsed !== "object" || parsed === null) {
    return { decades: [], genres: [], mood: null, artist: null, semantic: fallbackQuery };
  }

  const validMoods = ["sadness", "joy", "anger", "fear", "surprise"];
  const validDecade = (d: any) => typeof d === "number" && d >= 1950 && d <= 2020 && d % 10 === 0;

  return {
    decades: Array.isArray(parsed.decades) ? parsed.decades.filter(validDecade) : [],
    genres: Array.isArray(parsed.genres) ? parsed.genres.filter((g: any) => typeof g === "string") : [],
    mood: typeof parsed.mood === "string" && validMoods.includes(parsed.mood) ? parsed.mood : null,
    artist: typeof parsed.artist === "string" ? parsed.artist : null,
    semantic: typeof parsed.semantic === "string" && parsed.semantic.trim() ? parsed.semantic : fallbackQuery,
  };
}
```

- [ ] **Step 3: Commit**

```bash
git add server/src/eval/strategies/types.ts server/src/eval/strategies/helpers.ts
git commit -m "feat(eval): add strategy types and ParsedQuery builder helpers"
```

---

## Task 3: Strategy A — Decomposer

**Files:**
- Create: `server/src/eval/strategies/decomposer.ts`

- [ ] **Step 1: Write Strategy A**

This is the baseline — mirrors what the current "natural" mode does.

```typescript
// server/src/eval/strategies/decomposer.ts
import type { Strategy } from "./types";
import type { SearchResult, Song } from "../../lib/types";
import type { LLMClient } from "../llm/types";
import { hybridSearch } from "../../search/hybrid";
import { buildParsedQuery, extractJSON, validateDecomposed } from "./helpers";

const SYSTEM_PROMPT = `You parse music search queries into structured JSON. Return ONLY valid JSON matching this exact schema, nothing else:

{"decades":[1960],"genres":["rock"],"mood":"sadness","artist":"elvis presley","semantic":"song about heartbreak"}

Rules:
- decades: array of decade numbers (1950-2020), or empty array. Interpret time hints: "old"/"classic"/"vintage" = [1950,1960,1970], "recent"/"new"/"modern" = [2000,2010,2020], "retro" = [1970,1980]
- genres: array of genre strings, or empty array. Valid: pop, rock, jazz, blues, country, reggae, soul, funk, disco, hip-hop, r&b, electronic, folk, punk, metal, alternative, indie, grunge, latin
- mood: one of "sadness", "joy", "anger", "fear", "surprise", or null. Interpret emotional hints: "chill"/"relaxing" = "joy", "moody"/"lonely" = "sadness", "intense"/"aggressive" = "anger", "eerie"/"haunting" = "fear"
- artist: lowercase artist name string, or null
- semantic: the core meaning/vibe of the search in plain words, always filled. Strip filler words but keep the emotional and topical intent.

Return ONLY the JSON object. No markdown, no explanation.`;

export const decomposer: Strategy = {
  name: "A-decomposer",

  async run(query: string, songs: Song[], llm: LLMClient): Promise<SearchResult[]> {
    const raw = await llm.call(SYSTEM_PROMPT, query, 150);
    const parsed = extractJSON(raw);
    const decomposed = validateDecomposed(parsed, query);
    const pq = buildParsedQuery(query, decomposed);
    const result = await hybridSearch(pq, decomposed.semantic, songs);
    return result.results;
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add server/src/eval/strategies/decomposer.ts
git commit -m "feat(eval): add Strategy A — decomposer (baseline)"
```

---

## Task 4: Strategy B — Orchestrator

**Files:**
- Create: `server/src/eval/strategies/orchestrator.ts`

- [ ] **Step 1: Write Strategy B**

Same decomposition as A, but the LLM also picks which search mode to run.

```typescript
// server/src/eval/strategies/orchestrator.ts
import type { Strategy } from "./types";
import type { SearchResult, Song } from "../../lib/types";
import type { LLMClient } from "../llm/types";
import { keywordSearch } from "../../search/keyword";
import { semanticSearch } from "../../search/semantic";
import { hybridSearch } from "../../search/hybrid";
import { buildParsedQuery, extractJSON, validateDecomposed } from "./helpers";

const SYSTEM_PROMPT = `You parse music search queries and decide the best search strategy. Return ONLY valid JSON matching this schema:

{"mode":"hybrid","decades":[1960],"genres":["rock"],"mood":"sadness","artist":"elvis presley","semantic":"song about heartbreak"}

The "mode" field is critical. Choose:
- "keyword": for specific title lookups, exact lyric phrases, or known artist names. Best when the user quotes something specific.
- "semantic": for vibes, themes, abstract descriptions, emotional scenarios. Best when the user describes a feeling or situation rather than naming something.
- "hybrid": for queries mixing specific terms (a genre, a decade) with a mood or theme. Best general-purpose choice.
- "both_merge": when genuinely unsure — runs keyword and semantic independently and merges results. Use sparingly.

Other field rules:
- decades: array of decade numbers (1950-2020), or empty. "old"/"classic"/"vintage" = [1950,1960,1970], "recent"/"modern" = [2000,2010,2020]
- genres: array of genre strings, or empty. Valid: pop, rock, jazz, blues, country, reggae, soul, funk, disco, hip-hop, r&b, electronic, folk, punk, metal, alternative, indie, grunge, latin
- mood: one of "sadness", "joy", "anger", "fear", "surprise", or null
- artist: lowercase artist name, or null
- semantic: the core meaning/vibe in plain words, always filled

Return ONLY JSON. No markdown, no explanation.`;

export const orchestrator: Strategy = {
  name: "B-orchestrator",

  async run(query: string, songs: Song[], llm: LLMClient): Promise<SearchResult[]> {
    const raw = await llm.call(SYSTEM_PROMPT, query, 150);
    const parsed = extractJSON(raw);
    if (!parsed) {
      // Fallback to hybrid with raw query
      const pq = buildParsedQuery(query, { decades: [], genres: [], mood: null, artist: null, semantic: query });
      return (await hybridSearch(pq, query, songs)).results;
    }

    const mode = typeof parsed.mode === "string" ? parsed.mode : "hybrid";
    const decomposed = validateDecomposed(parsed, query);
    const pq = buildParsedQuery(query, decomposed);

    switch (mode) {
      case "keyword":
        return keywordSearch(songs, pq);

      case "semantic":
        return (await semanticSearch(pq, decomposed.semantic)).results;

      case "both_merge": {
        const kw = keywordSearch(songs, pq);
        const sem = await semanticSearch(pq, decomposed.semantic);
        // Merge by union, prefer higher score, deduplicate by song ID
        const merged = new Map<string, SearchResult>();
        for (const r of kw) merged.set(r.song.id, r);
        for (const r of sem.results) {
          const existing = merged.get(r.song.id);
          if (!existing || r.score > existing.score) {
            merged.set(r.song.id, r);
          }
        }
        return [...merged.values()].sort((a, b) => b.score - a.score).slice(0, 20);
      }

      case "hybrid":
      default:
        return (await hybridSearch(pq, decomposed.semantic, songs)).results;
    }
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add server/src/eval/strategies/orchestrator.ts
git commit -m "feat(eval): add Strategy B — orchestrator (mode selection)"
```

---

## Task 5: Strategy C — Agentic

**Files:**
- Create: `server/src/eval/strategies/agentic.ts`

- [ ] **Step 1: Write Strategy C**

The LLM gets tools and can iterate. Simulated tool use via JSON — no native function calling needed, works with both models.

```typescript
// server/src/eval/strategies/agentic.ts
import type { Strategy } from "./types";
import type { SearchResult, Song } from "../../lib/types";
import type { LLMClient } from "../llm/types";
import { keywordSearch } from "../../search/keyword";
import { semanticSearch } from "../../search/semantic";
import { hybridSearch } from "../../search/hybrid";
import { buildParsedQuery, extractJSON, validateDecomposed } from "./helpers";

const MAX_TOOL_CALLS = 3;

const SYSTEM_PROMPT = `You are a music search agent with access to a database of 2,742 Billboard chart hits (1950-2019). Your job is to find the songs that best match the user's search intent.

You have three search tools. To call one, return a JSON object:

{"tool":"keyword_search","params":{"decades":[],"genres":[],"mood":null,"artist":null,"semantic":"search terms"}}
{"tool":"semantic_search","params":{"decades":[],"genres":[],"mood":null,"artist":null,"semantic":"descriptive vibe text"}}
{"tool":"hybrid_search","params":{"decades":[],"genres":[],"mood":null,"artist":null,"semantic":"mixed query"}}

Tool strengths:
- keyword_search: Best for specific titles, exact phrases, known artist names. Scores by word sequence matches.
- semantic_search: Best for abstract vibes, moods, thematic descriptions. Uses vector similarity on lyrics.
- hybrid_search: Combines both. Good general-purpose choice.

Param rules:
- decades: array of decade numbers 1950-2020, or empty
- genres: array from [pop, rock, jazz, blues, country, reggae, soul, funk, disco, hip-hop, r&b, electronic, folk, punk, metal, alternative, indie, grunge, latin], or empty
- mood: one of "sadness", "joy", "anger", "fear", "surprise", or null
- artist: lowercase artist name, or null
- semantic: the search text/vibe, always filled

After receiving results, you can:
1. Call another tool with refined params (up to 3 total calls)
2. Finish by returning: {"done":true}

When you finish, the last set of search results will be used. If you want to combine results from multiple searches, that happens automatically — all results are merged.

Return ONLY JSON. No markdown, no explanation.`;

export const agentic: Strategy = {
  name: "C-agentic",

  async run(query: string, songs: Song[], llm: LLMClient): Promise<SearchResult[]> {
    const allResults = new Map<string, SearchResult>();
    const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: query },
    ];

    for (let i = 0; i < MAX_TOOL_CALLS; i++) {
      const raw = await llm.callMultiTurn(messages, 200);
      messages.push({ role: "assistant", content: raw });

      const parsed = extractJSON(raw);
      if (!parsed) break;
      if (parsed.done) break;

      const tool = parsed.tool;
      const params = parsed.params;
      if (!tool || !params) break;

      const decomposed = validateDecomposed(params, query);
      const pq = buildParsedQuery(query, decomposed);

      let results: SearchResult[] = [];
      switch (tool) {
        case "keyword_search":
          results = keywordSearch(songs, pq);
          break;
        case "semantic_search":
          results = (await semanticSearch(pq, decomposed.semantic)).results;
          break;
        case "hybrid_search":
          results = (await hybridSearch(pq, decomposed.semantic, songs)).results;
          break;
        default:
          break;
      }

      // Accumulate results — later searches can replace lower-scored entries
      for (const r of results) {
        const existing = allResults.get(r.song.id);
        if (!existing || r.score > existing.score) {
          allResults.set(r.song.id, r);
        }
      }

      // Feed top 5 back to the LLM
      const summary = results.slice(0, 5).map((r, idx) =>
        `${idx + 1}. "${r.song.title}" by ${r.song.artist} (${r.song.year}, ${r.song.genre}) [score: ${r.score.toFixed(2)}]`
      ).join("\n");
      messages.push({
        role: "user",
        content: `Results from ${tool}:\n${summary}\n\nCall another tool with different params, or return {"done":true} if satisfied.`,
      });
    }

    return [...allResults.values()].sort((a, b) => b.score - a.score).slice(0, 20);
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add server/src/eval/strategies/agentic.ts
git commit -m "feat(eval): add Strategy C — agentic (multi-turn tool use)"
```

---

## Task 6: Strategy D — Reranker

**Files:**
- Create: `server/src/eval/strategies/reranker.ts`

- [ ] **Step 1: Write Strategy D**

Two LLM calls: decompose, then re-rank results.

```typescript
// server/src/eval/strategies/reranker.ts
import type { Strategy } from "./types";
import type { SearchResult, Song } from "../../lib/types";
import type { LLMClient } from "../llm/types";
import { hybridSearch } from "../../search/hybrid";
import { buildParsedQuery, extractJSON, validateDecomposed } from "./helpers";

const DECOMPOSE_PROMPT = `You parse music search queries into structured JSON. Return ONLY valid JSON matching this exact schema, nothing else:

{"decades":[1960],"genres":["rock"],"mood":"sadness","artist":"elvis presley","semantic":"song about heartbreak"}

Rules:
- decades: array of decade numbers (1950-2020), or empty array. Interpret time hints: "old"/"classic"/"vintage" = [1950,1960,1970], "recent"/"new"/"modern" = [2000,2010,2020], "retro" = [1970,1980]
- genres: array of genre strings, or empty array. Valid: pop, rock, jazz, blues, country, reggae, soul, funk, disco, hip-hop, r&b, electronic, folk, punk, metal, alternative, indie, grunge, latin
- mood: one of "sadness", "joy", "anger", "fear", "surprise", or null. Interpret emotional hints: "chill"/"relaxing" = "joy", "moody"/"lonely" = "sadness", "intense"/"aggressive" = "anger", "eerie"/"haunting" = "fear"
- artist: lowercase artist name string, or null
- semantic: the core meaning/vibe of the search in plain words, always filled. Strip filler words but keep the emotional and topical intent.

Return ONLY the JSON object. No markdown, no explanation.`;

const RERANK_PROMPT = `You are re-ranking music search results for relevance. Given the user's original search intent and a list of candidate songs, return a JSON array of song IDs ordered from best match to worst.

Rules:
- Only include songs that genuinely match the user's intent
- It's fine to return fewer songs than provided if some don't fit
- Consider the mood, theme, era, and genre the user is looking for
- Return ONLY a JSON array of ID strings, e.g. ["id-1", "id-2", "id-3"]
- No markdown, no explanation`;

export const reranker: Strategy = {
  name: "D-reranker",

  async run(query: string, songs: Song[], llm: LLMClient): Promise<SearchResult[]> {
    // --- Pass 1: Decompose ---
    const raw = await llm.call(DECOMPOSE_PROMPT, query, 150);
    const parsed = extractJSON(raw);
    const decomposed = validateDecomposed(parsed, query);
    const pq = buildParsedQuery(query, decomposed);

    const hybridResult = await hybridSearch(pq, decomposed.semantic, songs, 15);
    const candidates = hybridResult.results;

    if (candidates.length === 0) return [];

    // --- Pass 2: Re-rank ---
    const candidateList = candidates.map((r, idx) =>
      `${idx + 1}. [${r.song.id}] "${r.song.title}" by ${r.song.artist} (${r.song.year}, ${r.song.genre})`
    ).join("\n");

    const rerankerInput = `User searched for: "${query}"\n\nCandidate songs:\n${candidateList}`;
    const reranked = await llm.call(RERANK_PROMPT, rerankerInput, 300);

    // Parse the re-ranked ID list
    const idArray = extractJSON(reranked);
    if (!Array.isArray(idArray)) {
      // If re-ranking fails, return original order
      return candidates;
    }

    // Build result in re-ranked order
    const resultMap = new Map(candidates.map(r => [r.song.id, r]));
    const ordered: SearchResult[] = [];
    for (const id of idArray) {
      const r = resultMap.get(id);
      if (r) ordered.push(r);
    }

    // Append any candidates the LLM dropped (at the end, lower priority)
    for (const r of candidates) {
      if (!ordered.some(o => o.song.id === r.song.id)) {
        ordered.push(r);
      }
    }

    return ordered.slice(0, 20);
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add server/src/eval/strategies/reranker.ts
git commit -m "feat(eval): add Strategy D — reranker (decompose + re-rank)"
```

---

## Task 7: Query Sets

**Files:**
- Create: `server/src/eval/queries/baseline.ts`
- Create: `server/src/eval/queries/hard.ts`

- [ ] **Step 1: Create baseline queries**

Port the 32 queries from `pipeline/evaluate.py`. The expected results there use `(title, artist)` tuples — we need to convert those to song IDs by matching against `merged_songs.json`. Some expected songs may not match (different title casing, etc.), so we match case-insensitively.

```typescript
// server/src/eval/queries/baseline.ts
export interface EvalQuery {
  query: string;
  category: string;
  /** Song IDs that count as correct results */
  expected: string[];
}

// Expected results use (title_substring, artist_substring) for matching.
// The run.ts script resolves these to IDs at startup.
export interface RawEvalQuery {
  query: string;
  category: string;
  expected: [title: string, artist: string][];
}

export const baselineQueriesRaw: RawEvalQuery[] = [
  // --- Specific title lookups ---
  {
    query: "songs with love in the title",
    category: "specific_lookup",
    expected: [
      ["Love Me Tender", "Elvis"],
      ["Baby Love", "Supremes"],
      ["All You Need Is Love", "Beatles"],
      ["Everlasting Love", ""],
      ["Where Did Our Love Go", "Supremes"],
    ],
  },
  {
    query: "songs with heart in the title",
    category: "specific_lookup",
    expected: [
      ["Cold, Cold Heart", "Tony Bennett"],
      ["Heartbreak Hotel", "Elvis"],
      ["Broken Hearted Melody", ""],
      ["Heart of Gold", "Neil Young"],
    ],
  },
  {
    query: "songs with moon in the title",
    category: "specific_lookup",
    expected: [
      ["Blue Moon", "Elvis"],
      ["Walking On The Moon", "The Police"],
      ["Fly Me to the Moon", ""],
    ],
  },
  {
    query: "songs with night in the title",
    category: "specific_lookup",
    expected: [
      ["Let's Spend The Night Together", "Rolling Stones"],
      ["All Night Long", ""],
      ["Goodnight", ""],
    ],
  },
  // --- Artist lookups ---
  {
    query: "songs by Elvis Presley",
    category: "artist_lookup",
    expected: [
      ["Heartbreak Hotel", "Elvis"],
      ["Jailhouse Rock", "Elvis"],
      ["Blue Suede Shoes", "Elvis"],
      ["Love Me Tender", "Elvis"],
      ["Suspicious Minds", "Elvis"],
    ],
  },
  {
    query: "songs by Michael Jackson",
    category: "artist_lookup",
    expected: [
      ["Black Or White", "Michael Jackson"],
      ["Heal The World", "Michael Jackson"],
      ["Off The Wall", "Michael Jackson"],
      ["Dirty Diana", "Michael Jackson"],
    ],
  },
  {
    query: "songs by ABBA",
    category: "artist_lookup",
    expected: [
      ["Waterloo", "ABBA"],
      ["The Winner Takes It All", "ABBA"],
      ["Chiquitita", "ABBA"],
      ["Money, Money, Money", "ABBA"],
    ],
  },
  {
    query: "songs by Queen",
    category: "artist_lookup",
    expected: [
      ["Somebody To Love", "Queen"],
      ["We Are The Champions", "Queen"],
      ["Radio Ga Ga", "Queen"],
      ["You're My Best Friend", "Queen"],
    ],
  },
  {
    query: "songs by The Rolling Stones",
    category: "artist_lookup",
    expected: [
      ["Start Me Up", "Rolling Stones"],
      ["Let's Spend The Night Together", "Rolling Stones"],
      ["The Last Time", "Rolling Stones"],
    ],
  },
  // --- Conceptual / thematic ---
  {
    query: "songs about heartbreak",
    category: "conceptual",
    expected: [
      ["Heartbreak Hotel", "Elvis"],
      ["Broken Hearted Melody", ""],
      ["How Can You Mend A Broken Heart", "Bee Gees"],
      ["It's A Heartache", "Bonnie Tyler"],
      ["Cold, Cold Heart", "Tony Bennett"],
    ],
  },
  {
    query: "sad songs",
    category: "conceptual",
    expected: [
      ["Hello", "Lionel Richie"],
      ["Skyfall", "Adele"],
      ["Jar Of Hearts", "Christina Perri"],
      ["Three Times A Lady", "Commodores"],
      ["The Reason", "Hoobastank"],
    ],
  },
  {
    query: "songs about loneliness and missing someone",
    category: "conceptual",
    expected: [
      ["Only The Lonely", "Roy Orbison"],
      ["So Lonely", "The Police"],
      ["Hello", "Lionel Richie"],
      ["Missing You", ""],
    ],
  },
  {
    query: "songs about freedom and rebellion",
    category: "conceptual",
    expected: [
      ["American Idiot", "Green Day"],
      ["Born To Run", ""],
      ["Jailhouse Rock", "Elvis"],
      ["Roll With It", "Oasis"],
    ],
  },
  {
    query: "songs about faith and hope",
    category: "conceptual",
    expected: [
      ["Heal The World", "Michael Jackson"],
      ["Spirit In The Sky", "Norman Greenbaum"],
      ["I Have A Dream", "ABBA"],
      ["Let It Be", "Beatles"],
    ],
  },
  {
    query: "songs about war and conflict",
    category: "conceptual",
    expected: [
      ["Buffalo Soldier", "Bob Marley"],
      ["Two Minutes To Midnight", "Iron Maiden"],
      ["Invisible Sun", "The Police"],
      ["American Idiot", "Green Day"],
    ],
  },
  // --- Decade-specific ---
  {
    query: "rock from the 80s",
    category: "decade_specific",
    expected: [
      ["Don't Stand So Close To Me", "The Police"],
      ["Start Me Up", "Rolling Stones"],
      ["Radio Ga Ga", "Queen"],
      ["Goody Two Shoes", "Adam Ant"],
      ["You Better You Bet", "The Who"],
    ],
  },
  {
    query: "jazz from the 50s",
    category: "decade_specific",
    expected: [
      ["Cold, Cold Heart", "Tony Bennett"],
      ["Pretend", "Nat King Cole"],
      ["Kiss", "Dean Martin"],
      ["Memories Are Made Of This", "Dean Martin"],
    ],
  },
  {
    query: "pop from the 90s",
    category: "decade_specific",
    expected: [
      ["Fantasy", "Mariah Carey"],
      ["Black Or White", "Michael Jackson"],
      ["Blue Savannah", "Erasure"],
      ["The Shoop Shoop Song", "Cher"],
    ],
  },
  {
    query: "rock from the 70s",
    category: "decade_specific",
    expected: [
      ["Let It Be", "Beatles"],
      ["Spirit In The Sky", "Norman Greenbaum"],
      ["Heart Of Gold", "Neil Young"],
      ["25 Or 6 To 4", "Chicago"],
    ],
  },
  {
    query: "pop songs from the 60s",
    category: "decade_specific",
    expected: [
      ["All You Need Is Love", "Beatles"],
      ["Baby Love", "Supremes"],
      ["Stop! In The Name Of Love", "Supremes"],
      ["Mr Tambourine Man", "The Byrds"],
    ],
  },
  {
    query: "music from the 2000s",
    category: "decade_specific",
    expected: [
      ["American Idiot", "Green Day"],
      ["Hollaback Girl", "Gwen Stefani"],
      ["The Reason", "Hoobastank"],
      ["Milkshake", "Kelis"],
    ],
  },
  // --- Mood-based ---
  {
    query: "upbeat dance music",
    category: "mood_based",
    expected: [
      ["Buffalo Soldier", "Bob Marley"],
      ["Hollaback Girl", "Gwen Stefani"],
      ["Milkshake", "Kelis"],
      ["Disco Inferno", "50 Cent"],
    ],
  },
  {
    query: "romantic songs",
    category: "mood_based",
    expected: [
      ["Have You Ever Really Loved A Woman?", "Bryan Adams"],
      ["When A Man Loves A Woman", ""],
      ["Fantasy", "Mariah Carey"],
      ["I'll Be Loving You (Forever)", "New Kids"],
    ],
  },
  {
    query: "energetic rock songs",
    category: "mood_based",
    expected: [
      ["American Idiot", "Green Day"],
      ["You Could Be Mine", "Guns N' Roses"],
      ["Holy Smoke", "Iron Maiden"],
      ["Roll With It", "Oasis"],
    ],
  },
  {
    query: "slow acoustic songs",
    category: "mood_based",
    expected: [
      ["Hello", "Lionel Richie"],
      ["Three Times A Lady", "Commodores"],
      ["Jar Of Hearts", "Christina Perri"],
      ["Bedshaped", "Keane"],
    ],
  },
  // --- Atmosphere ---
  {
    query: "driving at night music",
    category: "atmosphere",
    expected: [
      ["All Night Long", ""],
      ["Let's Spend The Night Together", "Rolling Stones"],
      ["Suspicious Minds", "Elvis"],
      ["Running Up That Hill", ""],
    ],
  },
  {
    query: "summer party music",
    category: "atmosphere",
    expected: [
      ["Hollaback Girl", "Gwen Stefani"],
      ["Waterloo", "ABBA"],
      ["Buffalo Soldier", "Bob Marley"],
      ["Disco Inferno", "50 Cent"],
    ],
  },
  // --- Genre-specific ---
  {
    query: "reggae songs",
    category: "genre_specific",
    expected: [
      ["Buffalo Soldier", "Bob Marley"],
      ["Everything I Own", "Ken Boothe"],
      ["Don't Break My Heart", "UB40"],
      ["Please Don't Make Me Cry", "UB40"],
    ],
  },
  {
    query: "blues songs",
    category: "genre_specific",
    expected: [
      ["Heartbreak Hotel", "Elvis"],
      ["Blue Suede Shoes", "Elvis"],
      ["Blue Moon", "Elvis"],
    ],
  },
  // --- Mixed / compound ---
  {
    query: "romantic pop from the 90s",
    category: "mixed",
    expected: [
      ["Have You Ever Really Loved A Woman?", "Bryan Adams"],
      ["Fantasy", "Mariah Carey"],
      ["The Shoop Shoop Song", "Cher"],
      ["When A Man Loves A Woman", "Michael Bolton"],
    ],
  },
  {
    query: "sad rock songs",
    category: "mixed",
    expected: [
      ["Stop Crying Your Heart Out", "Oasis"],
      ["Bedshaped", "Keane"],
      ["The Reason", "Hoobastank"],
      ["It's A Heartache", "Bonnie Tyler"],
    ],
  },
  {
    query: "upbeat pop from the 80s",
    category: "mixed",
    expected: [
      ["You Came", "Kim Wilde"],
      ["Suedehead", "Morrissey"],
      ["Goody Two Shoes", "Adam Ant"],
      ["The Winner Takes It All", "ABBA"],
    ],
  },
];
```

- [ ] **Step 2: Create hard queries (empty expected, filled after curation)**

```typescript
// server/src/eval/queries/hard.ts
import type { EvalQuery } from "./baseline";

export const hardQueries: EvalQuery[] = [
  { query: "songs you'd hear at a dive bar at 2am", category: "vibes", expected: [] },
  { query: "something my grandma would dance to", category: "vibes", expected: [] },
  { query: "driving down the highway with the windows down", category: "vibes", expected: [] },
  { query: "the kind of song that plays when the villain walks in", category: "vibes", expected: [] },
  { query: "breakup songs that don't make you cry, they make you angry", category: "vibes", expected: [] },
  { query: "a song to slow dance to at a wedding", category: "vibes", expected: [] },
  { query: "music for staring out a rainy window", category: "vibes", expected: [] },
  { query: "songs that sound like summer in the 90s", category: "vibes", expected: [] },
  { query: "what would play in a montage of someone getting their life together", category: "vibes", expected: [] },
  { query: "songs that feel like 3am alone in a city", category: "vibes", expected: [] },
];
```

- [ ] **Step 3: Commit**

```bash
git add server/src/eval/queries/
git commit -m "feat(eval): add baseline (32) and hard (10) query sets"
```

---

## Task 8: Runner & Metrics

**Files:**
- Create: `server/src/eval/run.ts`
- Modify: `.gitignore` — add eval results dir

- [ ] **Step 1: Add eval results to gitignore**

Add to `.gitignore`:
```
server/src/eval/results/
```

- [ ] **Step 2: Write the runner**

```typescript
// server/src/eval/run.ts
import { readFileSync, mkdirSync, writeFileSync } from "fs";
import { resolve } from "path";
import { getSongs } from "../lib/data";
import type { Song, SearchResult } from "../lib/types";
import type { LLMClient } from "./llm/types";
import { deepseekClient } from "./llm/deepseek";
import { geminiClient } from "./llm/gemini";
import type { Strategy } from "./strategies/types";
import { decomposer } from "./strategies/decomposer";
import { orchestrator } from "./strategies/orchestrator";
import { agentic } from "./strategies/agentic";
import { reranker } from "./strategies/reranker";
import { baselineQueriesRaw, type EvalQuery, type RawEvalQuery } from "./queries/baseline";
import { hardQueries } from "./queries/hard";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const strategies: Strategy[] = [decomposer, orchestrator, agentic, reranker];
const llms: LLMClient[] = [deepseekClient, geminiClient];

// ---------------------------------------------------------------------------
// Resolve raw (title, artist) expected results to song IDs
// ---------------------------------------------------------------------------
function resolveExpected(raw: RawEvalQuery[], songs: Song[]): EvalQuery[] {
  return raw.map(rq => {
    const ids: string[] = [];
    for (const [titleHint, artistHint] of rq.expected) {
      const tLower = titleHint.toLowerCase();
      const aLower = artistHint.toLowerCase();
      const match = songs.find(s => {
        const titleMatch = s.title.toLowerCase().includes(tLower);
        const artistMatch = !aLower || s.artist.toLowerCase().includes(aLower);
        return titleMatch && artistMatch;
      });
      if (match) ids.push(match.id);
    }
    return { query: rq.query, category: rq.category, expected: ids };
  });
}

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------
function precisionAtK(returned: string[], expected: string[], k: number): number {
  const topK = returned.slice(0, k);
  if (topK.length === 0 || expected.length === 0) return 0;
  const hits = topK.filter(id => expected.includes(id)).length;
  return hits / Math.min(k, expected.length);
}

function mrr(returned: string[], expected: string[]): number {
  for (let i = 0; i < returned.length; i++) {
    if (expected.includes(returned[i])) {
      return 1 / (i + 1);
    }
  }
  return 0;
}

// ---------------------------------------------------------------------------
// Run one strategy+model against one query set
// ---------------------------------------------------------------------------
interface QueryResult {
  query: string;
  category: string;
  expected: string[];
  returned: string[];
  p5: number;
  p10: number;
  mrr: number;
  timeMs: number;
  llmCalls: number;
}

interface ComboResult {
  strategy: string;
  model: string;
  metrics: { p5: number; p10: number; mrr: number; avgTime: number; avgCalls: number };
  queries: QueryResult[];
}

async function runCombo(
  strategy: Strategy,
  llm: LLMClient,
  queries: EvalQuery[],
  songs: Song[],
): Promise<ComboResult> {
  const queryResults: QueryResult[] = [];

  for (const q of queries) {
    const start = performance.now();
    let results: SearchResult[] = [];

    try {
      results = await strategy.run(q.query, songs, llm);
    } catch (err) {
      console.error(`  ERROR: ${strategy.name}/${llm.name} on "${q.query}": ${err}`);
    }

    const elapsed = performance.now() - start;
    const returned = results.map(r => r.song.id);

    queryResults.push({
      query: q.query,
      category: q.category,
      expected: q.expected,
      returned: returned.slice(0, 20),
      p5: precisionAtK(returned, q.expected, 5),
      p10: precisionAtK(returned, q.expected, 10),
      mrr: mrr(returned, q.expected),
      timeMs: Math.round(elapsed),
      llmCalls: 0, // TODO: track via LLM client wrapper if needed
    });

    // Rate limiting — avoid hammering APIs
    await new Promise(r => setTimeout(r, 500));
  }

  const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  return {
    strategy: strategy.name,
    model: llm.name,
    metrics: {
      p5: Number(avg(queryResults.map(q => q.p5)).toFixed(4)),
      p10: Number(avg(queryResults.map(q => q.p10)).toFixed(4)),
      mrr: Number(avg(queryResults.map(q => q.mrr)).toFixed(4)),
      avgTime: Number((avg(queryResults.map(q => q.timeMs)) / 1000).toFixed(2)),
      avgCalls: 0,
    },
    queries: queryResults,
  };
}

// ---------------------------------------------------------------------------
// Console output
// ---------------------------------------------------------------------------
function printTable(title: string, results: ComboResult[]) {
  console.log();
  console.log(`  ${title}`);
  console.log("  " + "─".repeat(65));
  console.log(
    "  " +
    "Strategy".padEnd(20) +
    "Model".padEnd(12) +
    "P@5".padStart(7) +
    "P@10".padStart(7) +
    "MRR".padStart(7) +
    "Time".padStart(7)
  );
  console.log("  " + "─".repeat(65));

  // Sort by MRR descending
  const sorted = [...results].sort((a, b) => b.metrics.mrr - a.metrics.mrr);
  for (const r of sorted) {
    console.log(
      "  " +
      r.strategy.padEnd(20) +
      r.model.padEnd(12) +
      r.metrics.p5.toFixed(3).padStart(7) +
      r.metrics.p10.toFixed(3).padStart(7) +
      r.metrics.mrr.toFixed(3).padStart(7) +
      `${r.metrics.avgTime}s`.padStart(7)
    );
  }
  console.log("  " + "─".repeat(65));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log("LLM Query Strategy Evaluation");
  console.log("=============================\n");

  const songs = getSongs();
  console.log(`Loaded ${songs.length} songs.\n`);

  // Resolve baseline expected → IDs
  const baseline = resolveExpected(baselineQueriesRaw, songs);
  const unresolved = baseline.filter(q => q.expected.length === 0);
  if (unresolved.length > 0) {
    console.warn(`Warning: ${unresolved.length} baseline queries have 0 resolved expected IDs`);
  }

  // Filter hard queries to only those with curated expected results
  const hard = hardQueries.filter(q => q.expected.length > 0);

  console.log(`Baseline queries: ${baseline.length}`);
  console.log(`Hard queries: ${hard.length} (${hardQueries.length - hard.length} awaiting curation)\n`);

  const allBaselineResults: ComboResult[] = [];
  const allHardResults: ComboResult[] = [];

  for (const llm of llms) {
    for (const strategy of strategies) {
      console.log(`Running ${strategy.name} / ${llm.name} ...`);

      // Baseline
      const baselineResult = await runCombo(strategy, llm, baseline, songs);
      allBaselineResults.push(baselineResult);
      console.log(
        `  baseline: P@5=${baselineResult.metrics.p5.toFixed(3)} ` +
        `MRR=${baselineResult.metrics.mrr.toFixed(3)} ` +
        `(${baselineResult.metrics.avgTime}s avg)`
      );

      // Hard (if any curated)
      if (hard.length > 0) {
        const hardResult = await runCombo(strategy, llm, hard, songs);
        allHardResults.push(hardResult);
        console.log(
          `  hard:     P@5=${hardResult.metrics.p5.toFixed(3)} ` +
          `MRR=${hardResult.metrics.mrr.toFixed(3)} ` +
          `(${hardResult.metrics.avgTime}s avg)`
        );
      }
    }
  }

  // Print summary tables
  printTable("BASELINE RESULTS", allBaselineResults);
  if (allHardResults.length > 0) {
    printTable("HARD QUERY RESULTS", allHardResults);
  }

  // Save detailed JSON
  const resultsDir = resolve(import.meta.dir, "results");
  mkdirSync(resultsDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 16);
  const outPath = resolve(resultsDir, `${timestamp}.json`);
  const output = {
    timestamp: new Date().toISOString(),
    results: {
      baseline: Object.fromEntries(allBaselineResults.map(r => [`${r.strategy}-${r.model}`, r])),
      hard: Object.fromEntries(allHardResults.map(r => [`${r.strategy}-${r.model}`, r])),
    },
  };
  writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`\nDetailed results saved to: ${outPath}`);
}

main().catch(console.error);
```

- [ ] **Step 3: Commit**

```bash
git add server/src/eval/run.ts .gitignore
git commit -m "feat(eval): add runner with metrics, console output, and JSON export"
```

---

## Task 9: Curation Utility

**Files:**
- Create: `server/src/eval/curate.ts`

- [ ] **Step 1: Write the curation script**

Runs each hard query through all strategy+model combos, collects unique songs, and writes a JSON file for Jamie to mark as relevant/irrelevant.

```typescript
// server/src/eval/curate.ts
import { mkdirSync, writeFileSync } from "fs";
import { resolve } from "path";
import { getSongs } from "../lib/data";
import type { LLMClient } from "./llm/types";
import { deepseekClient } from "./llm/deepseek";
import { geminiClient } from "./llm/gemini";
import type { Strategy } from "./strategies/types";
import { decomposer } from "./strategies/decomposer";
import { orchestrator } from "./strategies/orchestrator";
import { agentic } from "./strategies/agentic";
import { reranker } from "./strategies/reranker";
import { hardQueries } from "./queries/hard";

const strategies: Strategy[] = [decomposer, orchestrator, agentic, reranker];
const llms: LLMClient[] = [deepseekClient, geminiClient];

async function main() {
  console.log("Hard Query Curation — Collecting Candidates\n");

  const songs = getSongs();
  const curationData: Record<string, {
    query: string;
    candidates: { id: string; title: string; artist: string; year: number; genre: string; foundBy: string[] }[];
  }> = {};

  for (const q of hardQueries) {
    console.log(`\nQuery: "${q.query}"`);
    const candidateMap = new Map<string, {
      id: string; title: string; artist: string; year: number; genre: string; foundBy: string[];
    }>();

    for (const llm of llms) {
      for (const strategy of strategies) {
        const label = `${strategy.name}/${llm.name}`;
        console.log(`  Running ${label} ...`);

        try {
          const results = await strategy.run(q.query, songs, llm);
          for (const r of results.slice(0, 10)) {
            const existing = candidateMap.get(r.song.id);
            if (existing) {
              existing.foundBy.push(label);
            } else {
              candidateMap.set(r.song.id, {
                id: r.song.id,
                title: r.song.title,
                artist: r.song.artist,
                year: r.song.year,
                genre: r.song.genre,
                foundBy: [label],
              });
            }
          }
        } catch (err) {
          console.error(`    ERROR: ${err}`);
        }

        // Rate limiting
        await new Promise(r => setTimeout(r, 500));
      }
    }

    // Sort by how many strategies found them (consensus = likely relevant)
    const candidates = [...candidateMap.values()]
      .sort((a, b) => b.foundBy.length - a.foundBy.length);

    curationData[q.query] = { query: q.query, candidates };
    console.log(`  ${candidates.length} unique candidates collected`);
  }

  // Write curation file
  const resultsDir = resolve(import.meta.dir, "results");
  mkdirSync(resultsDir, { recursive: true });
  const outPath = resolve(resultsDir, "curation-candidates.json");
  writeFileSync(outPath, JSON.stringify(curationData, null, 2));
  console.log(`\nCuration candidates saved to: ${outPath}`);
  console.log("Review the file and mark which songs fit each query.");
  console.log("Then copy the approved IDs into server/src/eval/queries/hard.ts");
}

main().catch(console.error);
```

- [ ] **Step 2: Commit**

```bash
git add server/src/eval/curate.ts
git commit -m "feat(eval): add curation utility for hard query expected results"
```

---

## Task 10: Smoke Test & First Run

- [ ] **Step 1: Verify the eval harness compiles**

Run:
```bash
cd "c:/Users/Jamie/Documents/Ai Dev Tools/Portfolio/Lyric-Lens"
bun build server/src/eval/run.ts --target bun 2>&1 | head -20
```
Expected: No type errors.

- [ ] **Step 2: Run the eval on a small subset to verify end-to-end**

Temporarily test with just one strategy and one model to verify the pipeline works:

```bash
cd "c:/Users/Jamie/Documents/Ai Dev Tools/Portfolio/Lyric-Lens"
bun run server/src/eval/run.ts 2>&1 | tail -30
```

Expected: Console output showing strategy results with P@5, P@10, MRR metrics and a JSON file written to `server/src/eval/results/`.

- [ ] **Step 3: Fix any issues found in smoke test**

Address any compilation errors, API failures, or incorrect metric calculations.

- [ ] **Step 4: Commit any fixes**

```bash
git add server/src/eval/
git commit -m "fix(eval): address issues from smoke test"
```

---

## Task 11: Run Curation Utility

- [ ] **Step 1: Run the curation script**

```bash
cd "c:/Users/Jamie/Documents/Ai Dev Tools/Portfolio/Lyric-Lens"
bun run server/src/eval/curate.ts
```

Expected: `server/src/eval/results/curation-candidates.json` created with candidates per hard query.

- [ ] **Step 2: Present candidates to Jamie for approval**

Open `curation-candidates.json` and present each hard query with its candidates sorted by consensus (how many strategy+model combos found each song). Jamie marks which songs genuinely fit.

- [ ] **Step 3: Update hard.ts with curated expected IDs**

Add the approved song IDs to each hard query's `expected` array in `server/src/eval/queries/hard.ts`.

- [ ] **Step 4: Commit curated queries**

```bash
git add server/src/eval/queries/hard.ts
git commit -m "feat(eval): add curated expected results for hard queries"
```

---

## Task 12: Full Evaluation Run

- [ ] **Step 1: Run the full eval**

```bash
cd "c:/Users/Jamie/Documents/Ai Dev Tools/Portfolio/Lyric-Lens"
bun run server/src/eval/run.ts
```

Expected: All 8 combinations (4 strategies x 2 models) run against baseline + hard queries. Console tables printed, JSON saved.

- [ ] **Step 2: Review results and identify winner**

Examine the output tables. Key questions:
- Which strategy has the best MRR on hard queries? (This is where LLM adds value)
- Does any strategy regress on baseline vs the others?
- Is there a meaningful model difference (DeepSeek vs Gemini)?
- Is the latency of C (agentic) worth the improvement, if any?

- [ ] **Step 3: Commit results**

```bash
git add server/src/eval/results/
git commit -m "docs(eval): add first full evaluation run results"
```
