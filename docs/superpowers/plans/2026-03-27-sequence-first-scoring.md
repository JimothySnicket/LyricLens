# Sequence-First Scoring Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the individual-term-counting search scorer with a sequence-based model where score = n² per field, making contiguous phrase matches the dominant ranking signal.

**Architecture:** The `longestSequence()` function finds the longest contiguous window of query words in a text field and returns its length + matched phrase. Keyword mode scores each song as `(titleLen² × 2) + (lyricsLen² × 1.5) + (artistLen² × 2) + filter bonuses`. Hybrid mode uses the same model scaled to the 0–1 vector score range. The parser stops stripping classified words from search terms, and a new `searchPhrase` field carries the raw query with stop words preserved for phrase matching.

**Tech Stack:** Bun, TypeScript, bun:test

---

### Task 1: Add `searchPhrase` to ParsedQuery type

**Files:**
- Modify: `server/src/lib/types.ts:33-47`
- Modify: `web/src/lib/types.ts:33-47`

- [ ] **Step 1: Add `searchPhrase` to server types**

In `server/src/lib/types.ts`, add `searchPhrase` to the `ParsedQuery` interface:

```typescript
export interface ParsedQuery {
  scopeTitle: boolean;
  scopeLyrics: boolean;
  scopeArtist: boolean;
  filters: {
    decades: number[];
    genres: string[];
    moods: { key: string; label: string; min?: number; max?: number }[];
    audioFeatures: { key: string; label: string; min?: number; max?: number }[];
    artistHint: string[];
  };
  searchPhrase: string;
  semanticText: string;
  terms: string[];
  interpretations: { type: string; label: string }[];
}
```

- [ ] **Step 2: Mirror change in frontend types**

In `web/src/lib/types.ts`, add the same `searchPhrase: string;` field to `ParsedQuery` in the same position (after `artistHint` closing brace, before `semanticText`).

- [ ] **Step 3: Commit**

```bash
git add server/src/lib/types.ts web/src/lib/types.ts
git commit -m "feat: add searchPhrase field to ParsedQuery type"
```

---

### Task 2: Add `longestSequence` function with tests

**Files:**
- Modify: `server/src/search/utils.ts`
- Create: `server/src/__tests__/sequence.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `server/src/__tests__/sequence.test.ts`:

```typescript
import { describe, test, expect } from "bun:test";
import { longestSequence } from "../search/utils";

describe("longestSequence", () => {
  test("finds exact full phrase match", () => {
    const result = longestSequence(
      ["dancing", "in", "the", "dark"],
      "I was dancing in the dark all night",
    );
    expect(result.length).toBe(4);
    expect(result.phrase).toBe("dancing in the dark");
  });

  test("finds longest sub-phrase when full doesn't match", () => {
    const result = longestSequence(
      ["sad", "rock", "love", "songs"],
      "These are love songs for everyone",
    );
    expect(result.length).toBe(2);
    expect(result.phrase).toBe("love songs");
  });

  test("returns single word match when no multi-word sequence found", () => {
    const result = longestSequence(
      ["dancing", "summer"],
      "The summer breeze was warm",
    );
    expect(result.length).toBe(1);
    expect(result.phrase).toBe("summer");
  });

  test("returns length 0 when nothing matches", () => {
    const result = longestSequence(
      ["xyz", "abc"],
      "nothing matches here",
    );
    expect(result.length).toBe(0);
    expect(result.phrase).toBe("");
  });

  test("is case insensitive against the text", () => {
    const result = longestSequence(
      ["rock", "me", "amadeus"],
      "Rock Me Amadeus was a hit",
    );
    expect(result.length).toBe(3);
    expect(result.phrase).toBe("rock me amadeus");
  });

  test("handles empty query words", () => {
    const result = longestSequence([], "any text here");
    expect(result.length).toBe(0);
    expect(result.phrase).toBe("");
  });

  test("handles empty text", () => {
    const result = longestSequence(["hello"], "");
    expect(result.length).toBe(0);
    expect(result.phrase).toBe("");
  });

  test("stops at first longest match found", () => {
    const result = longestSequence(
      ["love", "me", "tender"],
      "Love me tender, love me sweet",
    );
    expect(result.length).toBe(3);
    expect(result.phrase).toBe("love me tender");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test server/src/__tests__/sequence.test.ts`
Expected: FAIL — `longestSequence` is not exported from `../search/utils`

- [ ] **Step 3: Implement `longestSequence`**

Add to the bottom of `server/src/search/utils.ts`:

```typescript
export interface SequenceMatch {
  length: number;
  phrase: string;
}

export function longestSequence(
  queryWords: string[],
  text: string,
): SequenceMatch {
  if (queryWords.length === 0 || !text) return { length: 0, phrase: "" };
  const lower = text.toLowerCase();
  for (let len = queryWords.length; len >= 1; len--) {
    for (let start = 0; start <= queryWords.length - len; start++) {
      const phrase = queryWords.slice(start, start + len).join(" ");
      if (lower.includes(phrase)) {
        return { length: len, phrase };
      }
    }
  }
  return { length: 0, phrase: "" };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test server/src/__tests__/sequence.test.ts`
Expected: 8 pass, 0 fail

- [ ] **Step 5: Commit**

```bash
git add server/src/search/utils.ts server/src/__tests__/sequence.test.ts
git commit -m "feat: add longestSequence function for phrase matching"
```

---

### Task 3: Update parser — stop stripping classified words, add searchPhrase

**Files:**
- Modify: `server/src/lib/query-parser.ts:106-207`
- Modify: `server/src/__tests__/query-parser.test.ts`

- [ ] **Step 1: Update existing tests and add new ones for the new behavior**

Replace the full contents of `server/src/__tests__/query-parser.test.ts`:

```typescript
import { describe, test, expect } from "bun:test";
import { parseQuery } from "../lib/query-parser";

describe("parseQuery", () => {
  test("extracts decade from 'from the 80s'", () => {
    const result = parseQuery("love songs from the 80s");
    expect(result.filters.decades).toContain(1980);
  });

  test("extracts decade from 'in the 1960s'", () => {
    const result = parseQuery("songs in the 1960s");
    expect(result.filters.decades).toContain(1960);
  });

  test("extracts artist from 'by Michael Jackson'", () => {
    const result = parseQuery("songs by Michael Jackson");
    expect(result.filters.artistHint).toEqual(["michael", "jackson"]);
    expect(result.scopeArtist).toBe(true);
  });

  test("extracts genre", () => {
    const result = parseQuery("sad rock songs");
    expect(result.filters.genres).toContain("rock");
  });

  test("handles genre aliases", () => {
    const result = parseQuery("hip hop songs");
    expect(result.filters.genres).toContain("hip-hop");
  });

  test("detects title scope", () => {
    const result = parseQuery("baby in the title");
    expect(result.scopeTitle).toBe(true);
    expect(result.terms).toContain("baby");
  });

  test("detects lyrics scope from 'in the lyrics'", () => {
    const result = parseQuery("rain in the lyrics");
    expect(result.scopeLyrics).toBe(true);
  });

  test("detects lyrics scope from 'about'", () => {
    const result = parseQuery("songs about heartbreak");
    expect(result.scopeLyrics).toBe(true);
  });

  test("extracts mood hints", () => {
    const result = parseQuery("sad romantic songs");
    const moodKeys = result.filters.moods.map(m => m.key);
    expect(moodKeys).toContain("emotions.sadness");
    expect(moodKeys).toContain("emotions.joy");
  });

  test("produces semantic text", () => {
    const result = parseQuery("songs about loneliness and rain from the 80s");
    expect(result.semanticText).toContain("loneliness");
    expect(result.semanticText).toContain("rain");
    expect(result.filters.decades).toContain(1980);
  });

  test("handles empty query", () => {
    const result = parseQuery("");
    expect(result.terms).toEqual([]);
    expect(result.semanticText).toBe("");
    expect(result.searchPhrase).toBe("");
  });

  test("handles query with only stop words", () => {
    const result = parseQuery("songs with the");
    expect(result.terms).toEqual([]);
  });

  test("generates interpretations array", () => {
    const result = parseQuery("sad rock from the 80s");
    const types = result.interpretations.map(i => i.type);
    expect(types).toContain("mood");
    expect(types).toContain("genre");
    expect(types).toContain("decade");
  });

  // --- New tests for sequence-first model ---

  test("searchPhrase preserves raw query with stop words", () => {
    const result = parseQuery("dancing in the dark");
    expect(result.searchPhrase).toBe("dancing in the dark");
  });

  test("searchPhrase is lowercased and trimmed", () => {
    const result = parseQuery("  Rock Me Amadeus  ");
    expect(result.searchPhrase).toBe("rock me amadeus");
  });

  test("mood words stay in terms (not consumed)", () => {
    const result = parseQuery("sad love songs");
    expect(result.filters.moods.some(m => m.label === "sadness")).toBe(true);
    expect(result.terms).toContain("sad");
    expect(result.terms).toContain("love");
  });

  test("genre words stay in terms (not consumed)", () => {
    const result = parseQuery("rock love songs");
    expect(result.filters.genres).toContain("rock");
    expect(result.terms).toContain("rock");
    expect(result.terms).toContain("love");
  });
});
```

- [ ] **Step 2: Run tests to verify the new tests fail**

Run: `bun test server/src/__tests__/query-parser.test.ts`
Expected: The new tests (`searchPhrase preserves...`, `mood words stay...`, `genre words stay...`) should FAIL. The fixed `extracts mood hints` and `handles genre aliases` tests may also fail until the parser is updated.

- [ ] **Step 3: Update the parser**

In `server/src/lib/query-parser.ts`, make three changes:

**Change 1 — Initialize `searchPhrase` in the result object (line 107-121):**

Add `searchPhrase: "",` to the initial result:

```typescript
export function parseQuery(raw: string): ParsedQuery {
  const result: ParsedQuery = {
    scopeTitle: false,
    scopeLyrics: false,
    scopeArtist: false,
    filters: {
      decades: [],
      genres: [],
      moods: [],
      audioFeatures: [],
      artistHint: [],
    },
    searchPhrase: "",
    semanticText: "",
    terms: [],
    interpretations: [],
  };

  if (!raw || !raw.trim()) return result;

  const lower = raw.toLowerCase().trim();
  result.searchPhrase = lower;
```

**Change 2 — Stop stripping mood and genre words from terms (lines 187-196):**

Replace the terms section:

```typescript
  // ── 6. Terms — for keyword matching (stop words removed, classified words KEPT) ──
  const allWords = lower.split(/\s+/).filter(w => w.length > 1);
  const meaningful = allWords.filter(w => {
    const clean = w.replace(/[^a-z-]/g, "");
    return clean.length > 1 && !STOP_WORDS.has(clean);
  });
  result.terms = meaningful;
```

**Change 3 — Use raw query for semanticText (lines 198-204):**

Replace the semantic text section:

```typescript
  // ── 7. Semantic text — raw query for natural embedding (stop words preserved) ──
  result.semanticText = lower;
```

- [ ] **Step 4: Run tests to verify they all pass**

Run: `bun test server/src/__tests__/query-parser.test.ts`
Expected: All tests pass (the old broken tests for audio features and wrong mood keys have been removed and replaced with correct ones)

- [ ] **Step 5: Commit**

```bash
git add server/src/lib/query-parser.ts server/src/__tests__/query-parser.test.ts
git commit -m "feat: parser keeps classified words in terms, adds searchPhrase"
```

---

### Task 4: Rewrite keyword scoring with sequence model

**Files:**
- Modify: `server/src/search/keyword.ts` (full rewrite)
- Create: `server/src/__tests__/keyword.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `server/src/__tests__/keyword.test.ts`:

```typescript
import { describe, test, expect } from "bun:test";
import { keywordSearch } from "../search/keyword";
import type { Song, ParsedQuery } from "../lib/types";

const makeSong = (overrides: Partial<Song>): Song => ({
  id: "0",
  title: "",
  artist: "Unknown",
  year: 2000,
  decade: 2000,
  genre: "Pop",
  chartPosition: 0,
  lyrics: "",
  album: "",
  writers: "",
  emotions: {},
  ...overrides,
});

const makeParsed = (overrides: Partial<ParsedQuery>): ParsedQuery => ({
  scopeTitle: false,
  scopeLyrics: false,
  scopeArtist: false,
  filters: { decades: [], genres: [], moods: [], audioFeatures: [], artistHint: [] },
  searchPhrase: "",
  semanticText: "",
  terms: [],
  interpretations: [],
  ...overrides,
});

describe("keywordSearch — sequence scoring", () => {
  test("4-word title phrase scores n²×2 = 32", () => {
    const songs = [
      makeSong({ id: "1", title: "Dancing in the Dark" }),
    ];
    const parsed = makeParsed({ searchPhrase: "dancing in the dark" });
    const results = keywordSearch(songs, parsed);
    expect(results.length).toBe(1);
    // titleLen=4 → 16×2 = 32
    expect(results[0].score).toBe(32);
  });

  test("exact title phrase beats scattered single-word matches", () => {
    const songs = [
      makeSong({ id: "exact", title: "Dancing in the Dark", lyrics: "verse one" }),
      makeSong({ id: "scatter", title: "Dark Night", lyrics: "she was dancing alone" }),
    ];
    const parsed = makeParsed({ searchPhrase: "dancing in the dark" });
    const results = keywordSearch(songs, parsed);
    expect(results[0].song.id).toBe("exact");
    expect(results[0].score).toBeGreaterThan(results[1].score * 3);
  });

  test("longer lyrics sequence beats shorter title sequence", () => {
    const songs = [
      makeSong({
        id: "long-lyrics",
        title: "Untitled",
        lyrics: "we played sad rock love songs by the fire all night",
      }),
      makeSong({
        id: "short-title",
        title: "Sad Rock",
        lyrics: "no matching words here",
      }),
    ];
    const parsed = makeParsed({ searchPhrase: "sad rock love songs" });
    const results = keywordSearch(songs, parsed);
    // long-lyrics: lyricsLen=4 → 16×1.5=24
    // short-title: titleLen=2 → 4×2=8
    expect(results[0].song.id).toBe("long-lyrics");
  });

  test("genre is a soft boost, not a hard filter", () => {
    const songs = [
      makeSong({ id: "synth", title: "Rock Me Amadeus", genre: "Synth-Pop" }),
      makeSong({ id: "rock", title: "Rock Anthem", genre: "Rock" }),
    ];
    const parsed = makeParsed({
      searchPhrase: "rock me amadeus",
      filters: { decades: [], genres: ["rock"], moods: [], audioFeatures: [], artistHint: [] },
    });
    const results = keywordSearch(songs, parsed);
    // synth-pop song NOT excluded — phrase match dominates
    expect(results[0].song.id).toBe("synth");
  });

  test("chart position has no effect on score", () => {
    const songs = [
      makeSong({ id: "chart1", title: "Love", chartPosition: 1 }),
      makeSong({ id: "chart99", title: "Love", chartPosition: 99 }),
    ];
    const parsed = makeParsed({ searchPhrase: "love" });
    const results = keywordSearch(songs, parsed);
    expect(results[0].score).toBe(results[1].score);
  });

  test("decade hard filter still excludes non-matching decades", () => {
    const songs = [
      makeSong({ id: "80s", title: "Love Song", decade: 1980 }),
      makeSong({ id: "90s", title: "Love Song", decade: 1990 }),
    ];
    const parsed = makeParsed({
      searchPhrase: "love song",
      filters: { decades: [1980], genres: [], moods: [], audioFeatures: [], artistHint: [] },
    });
    const results = keywordSearch(songs, parsed);
    expect(results.length).toBe(1);
    expect(results[0].song.id).toBe("80s");
  });

  test("artist hard filter still excludes non-matching artists", () => {
    const songs = [
      makeSong({ id: "ej", title: "Sad Songs", artist: "Elton John" }),
      makeSong({ id: "other", title: "Sad Songs", artist: "Someone Else" }),
    ];
    const parsed = makeParsed({
      searchPhrase: "sad songs by elton john",
      scopeArtist: true,
      filters: { decades: [], genres: [], moods: [], audioFeatures: [], artistHint: ["elton", "john"] },
    });
    const results = keywordSearch(songs, parsed);
    expect(results.length).toBe(1);
    expect(results[0].song.id).toBe("ej");
  });

  test("decade match adds +2 bonus", () => {
    const songs = [
      makeSong({ id: "1", title: "Love", decade: 1980 }),
    ];
    const parsed = makeParsed({
      searchPhrase: "love",
      filters: { decades: [1980], genres: [], moods: [], audioFeatures: [], artistHint: [] },
    });
    const results = keywordSearch(songs, parsed);
    // titleLen=1 → 1×2=2, plus decade bonus +2 = 4
    expect(results[0].score).toBe(4);
  });

  test("genre match adds +2 bonus", () => {
    const songs = [
      makeSong({ id: "1", title: "Love", genre: "Rock" }),
    ];
    const parsed = makeParsed({
      searchPhrase: "love",
      filters: { decades: [], genres: ["rock"], moods: [], audioFeatures: [], artistHint: [] },
    });
    const results = keywordSearch(songs, parsed);
    // titleLen=1 → 1×2=2, plus genre bonus +2 = 4
    expect(results[0].score).toBe(4);
  });

  test("songs with score 0 are excluded from results", () => {
    const songs = [
      makeSong({ id: "1", title: "Completely Unrelated", lyrics: "nothing here" }),
    ];
    const parsed = makeParsed({ searchPhrase: "dancing in the dark" });
    const results = keywordSearch(songs, parsed);
    expect(results.length).toBe(0);
  });

  test("match reason includes sequence info", () => {
    const songs = [
      makeSong({ id: "1", title: "Love Song", lyrics: "love is all around" }),
    ];
    const parsed = makeParsed({ searchPhrase: "love song" });
    const results = keywordSearch(songs, parsed);
    expect(results[0].matchReason).toContain("title");
    expect(results[0].matchReason).toContain("love song");
  });

  test("scope enforcement still works — scopeTitle excludes lyrics-only matches", () => {
    const songs = [
      makeSong({ id: "title-hit", title: "Rain Song", lyrics: "sunny day" }),
      makeSong({ id: "lyrics-only", title: "Sunny Day", lyrics: "walking in the rain" }),
    ];
    const parsed = makeParsed({
      searchPhrase: "rain",
      scopeTitle: true,
    });
    const results = keywordSearch(songs, parsed);
    expect(results.length).toBe(1);
    expect(results[0].song.id).toBe("title-hit");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test server/src/__tests__/keyword.test.ts`
Expected: FAIL — the current `keywordSearch` function doesn't accept `searchPhrase` or use sequence scoring.

- [ ] **Step 3: Rewrite keyword.ts**

Replace the full contents of `server/src/search/keyword.ts`:

```typescript
import { longestSequence } from "./utils";
import type { Song, ParsedQuery, SearchResult } from "../lib/types";

const TITLE_WEIGHT = 2;
const LYRICS_WEIGHT = 1.5;
const ARTIST_WEIGHT = 2;
const DECADE_BONUS = 2;
const GENRE_BONUS = 2;

const MAX_RESULTS = 30;

export function keywordSearch(
  songs: Song[],
  parsed: ParsedQuery,
): SearchResult[] {
  const { scopeTitle, scopeLyrics, scopeArtist, filters } = parsed;
  const { decades, genres, artistHint } = filters;
  const queryWords = parsed.searchPhrase
    ? parsed.searchPhrase.split(/\s+/)
    : [];

  if (queryWords.length === 0 && decades.length === 0 && genres.length === 0 && artistHint.length === 0) {
    return [];
  }

  const results: SearchResult[] = [];

  for (const song of songs) {
    // --- Hard filters: artist and decade only ---
    if (artistHint.length > 0) {
      const lowerArtist = song.artist.toLowerCase();
      if (!artistHint.every((token) => lowerArtist.includes(token))) continue;
    }

    if (decades.length > 0 && !decades.includes(song.decade)) {
      continue;
    }

    // --- Sequence scoring ---
    const titleMatch = longestSequence(queryWords, song.title);
    const lyricsMatch = longestSequence(queryWords, song.lyrics);
    const artistMatch = longestSequence(queryWords, song.artist);

    let score =
      (titleMatch.length ** 2) * TITLE_WEIGHT +
      (lyricsMatch.length ** 2) * LYRICS_WEIGHT +
      (artistMatch.length ** 2) * ARTIST_WEIGHT;

    // --- Scope enforcement ---
    if (scopeTitle && titleMatch.length === 0) continue;
    if (scopeLyrics && lyricsMatch.length === 0) continue;
    if (scopeArtist && artistHint.length === 0 && artistMatch.length === 0) continue;

    // --- Filter bonuses (tiebreakers) ---
    if (decades.length > 0 && decades.includes(song.decade)) {
      score += DECADE_BONUS;
    }
    if (genres.length > 0) {
      const songGenre = song.genre.toLowerCase();
      if (genres.some((g) => songGenre.includes(g.toLowerCase()))) {
        score += GENRE_BONUS;
      }
    }

    // Skip zero-score songs
    if (score <= 0) continue;

    // --- Build match reason ---
    const reasons: string[] = [];
    if (titleMatch.length > 0) {
      reasons.push(`title: "${titleMatch.phrase}" (${titleMatch.length}w)`);
    }
    if (lyricsMatch.length > 0) {
      reasons.push(`lyrics: "${lyricsMatch.phrase}" (${lyricsMatch.length}w)`);
    }
    if (artistMatch.length > 0) {
      reasons.push(`artist: "${artistMatch.phrase}" (${artistMatch.length}w)`);
    }
    if (decades.length > 0 && decades.includes(song.decade)) {
      reasons.push(`decade: ${song.decade}s`);
    }
    if (genres.length > 0) {
      const songGenre = song.genre.toLowerCase();
      if (genres.some((g) => songGenre.includes(g.toLowerCase()))) {
        reasons.push(`genre: ${song.genre}`);
      }
    }

    results.push({
      song,
      score,
      matchReason: reasons.join(" · ") || "match",
      mode: "keyword",
    });
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, MAX_RESULTS);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test server/src/__tests__/keyword.test.ts`
Expected: All pass

- [ ] **Step 5: Commit**

```bash
git add server/src/search/keyword.ts server/src/__tests__/keyword.test.ts
git commit -m "feat: rewrite keyword scoring with sequence-first n² model"
```

---

### Task 5: Rewrite hybrid re-ranking with sequence scoring

**Files:**
- Modify: `server/src/search/hybrid.ts:79-107`

- [ ] **Step 1: Update the re-ranking section**

In `server/src/search/hybrid.ts`, add the import for `longestSequence` at the top:

```typescript
import { getQdrantClient, COLLECTION_NAME } from "../lib/qdrant";
import { embedQuery } from "../lib/embedder";
import { payloadToSong, buildMatchReason, longestSequence } from "./utils";
import { GENRE_TO_QDRANT } from "../lib/nlp-helpers";
import type { ParsedQuery, SearchResult } from "../lib/types";
```

Then replace the embedding input line (line ~46):

```typescript
  // Use raw query for embedding — natural language embeds better than keyword soup
  const queryText = originalQuery || parsed.semanticText;
```

Then replace the re-ranking block (lines 79–107) with:

```typescript
  const queryWords = parsed.searchPhrase
    ? parsed.searchPhrase.split(/\s+/)
    : [];

  const results = response.points.map((point) => {
    const song = payloadToSong(point.id, point.payload);
    const vectorScore = point.score ?? 0;

    // Sequence-based keyword bonus (n² scaled to vector range)
    const titleMatch = longestSequence(queryWords, song.title);
    const lyricsMatch = longestSequence(queryWords, song.lyrics);
    const keywordBonus =
      (titleMatch.length ** 2) * 0.015 +
      (lyricsMatch.length ** 2) * 0.01;

    const blendedScore = vectorScore + keywordBonus;

    // Build match reason
    const reasons: string[] = [];
    if (titleMatch.length > 0) {
      reasons.push(`"${titleMatch.phrase}" in title (${titleMatch.length}w)`);
    }
    if (lyricsMatch.length > 0) {
      reasons.push(`"${lyricsMatch.phrase}" in lyrics (${lyricsMatch.length}w)`);
    }
    const matchReason = buildMatchReason("hybrid", parsed, vectorScore) +
      (reasons.length > 0 ? " · " + reasons.join(", ") : "");

    return {
      song,
      score: blendedScore,
      matchReason,
      mode: "hybrid" as const,
    };
  });
```

- [ ] **Step 2: Run typecheck**

Run: `cd server && npx tsc --noEmit 2>&1 | head -30`
Expected: No errors related to hybrid.ts

- [ ] **Step 3: Commit**

```bash
git add server/src/search/hybrid.ts
git commit -m "feat: hybrid re-ranking uses sequence-based n² keyword bonus"
```

---

### Task 6: Update semantic embedding input

**Files:**
- Modify: `server/src/search/semantic.ts:44-45`

- [ ] **Step 1: Use raw query for embedding**

In `server/src/search/semantic.ts`, change line 45 from:

```typescript
  const queryText = parsed.semanticText || originalQuery;
```

to:

```typescript
  // Use raw query for embedding — MiniLM embeds natural sentences better than keyword lists
  const queryText = originalQuery || parsed.semanticText;
```

This prefers the raw query (natural language with stop words) over the processed semanticText for the embedding model.

- [ ] **Step 2: Commit**

```bash
git add server/src/search/semantic.ts
git commit -m "feat: semantic search embeds raw query instead of stripped text"
```

---

### Task 7: Update search route — natural mode sets searchPhrase

**Files:**
- Modify: `server/src/routes/search.ts:46-62` and `94-98`

- [ ] **Step 1: Add `searchPhrase` to the natural mode ParsedQuery**

In `server/src/routes/search.ts`, when building the ParsedQuery for natural mode (the `if (deepseekResult)` block starting at line 46), add `searchPhrase` set to the raw user query (lowercased). This ensures hybrid re-ranking uses the user's actual words for phrase matching, not the LLM's rephrased text.

Change the ParsedQuery construction (line 46-62) to:

```typescript
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
```

- [ ] **Step 2: Verify the fallback path also gets searchPhrase**

In the fallback branch (line 94-98), `parseQuery(query)` is called, which now sets `searchPhrase` automatically. No change needed here — just confirm `parseQuery` is called with the raw `query` string (it is, at line 96).

- [ ] **Step 3: Commit**

```bash
git add server/src/routes/search.ts
git commit -m "feat: natural mode sets searchPhrase from raw user query"
```

---

### Task 8: Typecheck and run all tests

- [ ] **Step 1: Run full typecheck**

Run: `bun run typecheck` (from project root — typechecks both server and web)
Expected: No errors. If there are errors, fix them — likely missed `searchPhrase` initializations.

- [ ] **Step 2: Run all server tests**

Run: `bun test server/src/__tests__/`
Expected: All tests pass across `query-parser.test.ts`, `sequence.test.ts`, `keyword.test.ts`.

- [ ] **Step 3: Start the dev server and smoke test**

Run: `bun run dev`
Then test with curl:

```bash
# Keyword: should find Springsteen's song at #1
curl -s http://localhost:5201/api/search/keyword -H "Content-Type: application/json" -d '{"query":"dancing in the dark"}' | jq '.results[0].song.title, .results[0].score, .results[0].matchReason'

# Keyword: genre should be soft boost (Falco's synth-pop song should appear)
curl -s http://localhost:5201/api/search/keyword -H "Content-Type: application/json" -d '{"query":"rock me amadeus"}' | jq '.results[0].song.title, .results[0].score'

# Hybrid: check that sequence bonus moves results
curl -s http://localhost:5201/api/search/hybrid -H "Content-Type: application/json" -d '{"query":"dancing in the dark"}' | jq '.results[0].song.title, .results[0].score, .results[0].matchReason'
```

- [ ] **Step 4: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: address typecheck and integration issues from scoring rewrite"
```
