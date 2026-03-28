# Unfiltered Vector Search + True Merge Hybrid Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove pre-filtering from semantic search (let the vector rank the full corpus) and rewrite hybrid as a true merge of independent keyword + vector searches.

**Architecture:** Semantic search drops all Qdrant `must[]` filters except artist — the embedding already captures genre/mood/era semantically. Hybrid runs keyword search (full 2,742-song scan with n² sequence scoring) and vector search (unfiltered) as two independent legs, unions the candidate pools by song ID, and scores each song using a normalized blend of both signals. Songs found by both legs get the strongest combined scores.

**Tech Stack:** Bun, TypeScript, Qdrant, bun:test

---

### Task 1: Strip filters from semantic search

**Files:**
- Modify: `server/src/search/semantic.ts`

- [ ] **Step 1: Rewrite semantic.ts**

Replace the full contents of `server/src/search/semantic.ts` with:

```typescript
import { getQdrantClient, COLLECTION_NAME } from "../lib/qdrant";
import { embedQuery } from "../lib/embedder";
import { payloadToSong } from "./utils";
import type { ParsedQuery, SearchResult } from "../lib/types";

export async function semanticSearch(
  parsed: ParsedQuery,
  originalQuery: string,
  limit = 20
): Promise<{ results: SearchResult[]; totalFiltered: number }> {
  const client = getQdrantClient();

  // Only filter on artist — "by prince" is unambiguous intent.
  // Everything else (decade, genre, mood) the vector handles semantically.
  const must: any[] = [];
  if (parsed.filters.artistHint.length > 0) {
    must.push({ key: "artist", match: { text: parsed.filters.artistHint.join(" ") } });
  }
  const filter = must.length > 0 ? { must } : undefined;

  const queryText = originalQuery || parsed.semanticText;

  if (!queryText.trim()) {
    return { results: [], totalFiltered: 2742 };
  }

  const vector = await embedQuery(queryText);

  const response = await client.query(COLLECTION_NAME, {
    query: vector,
    using: "summary",
    filter,
    limit,
    with_payload: true,
  });

  return {
    results: response.points.map((point) => ({
      song: payloadToSong(point.id, point.payload),
      score: point.score ?? 0,
      matchReason: `similarity: ${(point.score ?? 0).toFixed(3)}`,
      mode: "semantic" as const,
    })),
    totalFiltered: 2742,
  };
}
```

Key changes from current:
- Removed decade, genre, mood filter construction (was lines 15–41)
- Removed the `GENRE_TO_QDRANT` import (no longer needed)
- Removed `buildMatchReason` import (inline the simple similarity string)
- Removed the empty-query scroll fallback (no filters to scroll with)
- Removed the `client.count()` call (always searching full corpus, so totalFiltered=2742)
- Kept only artist filter

- [ ] **Step 2: Run typecheck**

Run: `cd server && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add server/src/search/semantic.ts
git commit -m "feat: semantic search runs unfiltered — let the vector do its job"
```

---

### Task 2: Rewrite hybrid as true merge

**Files:**
- Modify: `server/src/search/hybrid.ts` (full rewrite)

This is the core change. The new hybrid:
1. Runs keyword search on all songs (full scan, sequence scoring)
2. Runs vector search on all songs (unfiltered, only artist filter)
3. Merges both result pools by song ID
4. Normalizes keyword scores to 0–1 range
5. Blends: `0.4 × normalizedKeyword + 0.6 × vectorScore` (weight vector slightly higher since it captures meaning beyond literal text)
6. Songs found by BOTH legs get scores from both; songs found by only one leg get 0 for the missing signal

- [ ] **Step 1: Rewrite hybrid.ts**

Replace the full contents of `server/src/search/hybrid.ts` with:

```typescript
import { getQdrantClient, COLLECTION_NAME } from "../lib/qdrant";
import { embedQuery } from "../lib/embedder";
import { payloadToSong } from "./utils";
import { keywordSearch } from "./keyword";
import type { Song, ParsedQuery, SearchResult } from "../lib/types";

const KEYWORD_WEIGHT = 0.4;
const VECTOR_WEIGHT = 0.6;
const VECTOR_LIMIT = 50;

export async function hybridSearch(
  parsed: ParsedQuery,
  originalQuery: string,
  songs: Song[],
  limit = 20,
): Promise<{ results: SearchResult[]; totalFiltered: number }> {
  // --- Leg 1: Keyword search (full scan, sequence scoring) ---
  const keywordResults = keywordSearch(songs, parsed);

  // --- Leg 2: Vector search (unfiltered except artist) ---
  const client = getQdrantClient();
  const must: any[] = [];
  if (parsed.filters.artistHint.length > 0) {
    must.push({ key: "artist", match: { text: parsed.filters.artistHint.join(" ") } });
  }
  const filter = must.length > 0 ? { must } : undefined;

  const queryText = originalQuery || parsed.semanticText;
  let vectorResults: { song: Song; score: number }[] = [];

  if (queryText.trim()) {
    const vector = await embedQuery(queryText);
    const response = await client.query(COLLECTION_NAME, {
      query: vector,
      using: "summary",
      filter,
      limit: VECTOR_LIMIT,
      with_payload: true,
    });
    vectorResults = response.points.map((point) => ({
      song: payloadToSong(point.id, point.payload),
      score: point.score ?? 0,
    }));
  }

  // --- Merge: union by song ID ---
  const merged = new Map<string, {
    song: Song;
    keywordScore: number;
    vectorScore: number;
    keywordReason: string;
  }>();

  // Normalize keyword scores to 0–1 range
  const maxKeyword = keywordResults.length > 0
    ? keywordResults[0].score
    : 1;

  for (const kr of keywordResults) {
    merged.set(kr.song.id, {
      song: kr.song,
      keywordScore: kr.score / maxKeyword,
      vectorScore: 0,
      keywordReason: kr.matchReason,
    });
  }

  for (const vr of vectorResults) {
    const existing = merged.get(vr.song.id);
    if (existing) {
      // Song found by BOTH legs — strongest signal
      existing.vectorScore = vr.score;
    } else {
      merged.set(vr.song.id, {
        song: vr.song,
        keywordScore: 0,
        vectorScore: vr.score,
        keywordReason: "",
      });
    }
  }

  // --- Score and rank ---
  const results: SearchResult[] = [];

  for (const entry of merged.values()) {
    const blended =
      entry.keywordScore * KEYWORD_WEIGHT +
      entry.vectorScore * VECTOR_WEIGHT;

    const reasons: string[] = [];
    if (entry.keywordScore > 0) {
      reasons.push(entry.keywordReason);
    }
    if (entry.vectorScore > 0) {
      reasons.push(`similarity: ${entry.vectorScore.toFixed(3)}`);
    }

    results.push({
      song: entry.song,
      score: blended,
      matchReason: reasons.join(" · ") || "hybrid match",
      mode: "hybrid",
    });
  }

  results.sort((a, b) => b.score - a.score);

  return {
    results: results.slice(0, limit),
    totalFiltered: songs.length,
  };
}
```

Key design decisions:
- `VECTOR_LIMIT = 50` — fetch top 50 from vector search. Combined with keyword's 30, the merge pool is up to 80 unique songs.
- Keyword scores normalized by dividing by the max keyword score (the #1 result becomes 1.0). This maps the keyword range into 0–1 to blend with vector's 0–1 cosine similarity.
- `0.4 keyword + 0.6 vector` — vector weighted slightly higher because it captures conceptual meaning, not just literal words. A song semantically perfect for "songs about heartbreak" should rank above one that just contains the word "heartbreak" once.
- Songs found by both legs naturally score highest (they get contributions from both signals).
- The `songs` array is now passed as a parameter (previously hybrid didn't need it).

- [ ] **Step 2: Run typecheck**

Run: `cd server && npx tsc --noEmit 2>&1 | head -20`
Expected: Error — `hybridSearch` now takes 3 args (`parsed`, `originalQuery`, `songs`) but callers pass 2. This is expected; we fix callers in Task 3.

- [ ] **Step 3: Commit (WIP — callers updated in next task)**

```bash
git add server/src/search/hybrid.ts
git commit -m "feat: hybrid search as true merge of keyword + vector legs"
```

---

### Task 3: Update callers — pass songs to hybridSearch

**Files:**
- Modify: `server/src/routes/search.ts`

The `hybridSearch` function now requires a `songs: Song[]` parameter. Two call sites need updating: the `hybrid` mode branch and the `natural` mode branch.

- [ ] **Step 1: Update both call sites in search.ts**

In `server/src/routes/search.ts`, the songs array is already available via `getSongs()` (used for keyword mode). Update the two `hybridSearch` calls:

**Change 1 — Natural mode (line 101-103):**

Replace:
```typescript
    const hybridResult = await hybridSearch(parsed, query);
```
with:
```typescript
    const hybridResult = await hybridSearch(parsed, query, getSongs());
```

**Change 2 — Hybrid mode (line 117-120):**

Replace:
```typescript
      const hybridResult = await hybridSearch(parsed, query);
      results = hybridResult.results;
      totalFiltered = hybridResult.totalFiltered;
```
with:
```typescript
      const songs = getSongs();
      const hybridResult = await hybridSearch(parsed, query, songs);
      results = hybridResult.results;
      totalFiltered = hybridResult.totalFiltered;
```

- [ ] **Step 2: Run typecheck**

Run: `cd server && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Run all tests**

Run: `bun test server/src/__tests__/`
Expected: All pass (existing keyword, sequence, parser tests unaffected)

- [ ] **Step 4: Commit**

```bash
git add server/src/routes/search.ts
git commit -m "feat: pass songs array to hybridSearch for keyword leg"
```

---

### Task 4: Smoke test all endpoints

- [ ] **Step 1: Run typecheck**

Run: `bun run typecheck` (from project root)
Expected: Server clean. Web may have pre-existing `topic` errors (unrelated).

- [ ] **Step 2: Test keyword (should be unchanged)**

```bash
curl -s http://localhost:5201/api/search/keyword \
  -H "Content-Type: application/json" \
  -d '{"query":"dancing in the dark"}' | python -c "
import json,sys; data=json.load(sys.stdin)
for r in data['results'][:3]:
    print(f'{r[\"score\"]:>6.1f}  {r[\"song\"][\"title\"]} — {r[\"song\"][\"artist\"]}')
    print(f'       {r[\"matchReason\"]}')
"
```
Expected: Springsteen's "Dancing in the Dark" at #1 with high sequence score.

- [ ] **Step 3: Test semantic (now unfiltered)**

```bash
curl -s http://localhost:5201/api/search/semantic \
  -H "Content-Type: application/json" \
  -d '{"query":"sad rock love songs"}' | python -c "
import json,sys; data=json.load(sys.stdin)
print(f'Total filtered: {data[\"totalFiltered\"]}')
for r in data['results'][:5]:
    print(f'{r[\"score\"]:>6.3f}  {r[\"song\"][\"title\"]} — {r[\"song\"][\"artist\"]} ({r[\"song\"][\"genre\"]})')
"
```
Expected: `totalFiltered: 2742` (full corpus, not a filtered subset). Results should include songs from various genres that are semantically about sad love — not restricted to songs tagged "rock".

- [ ] **Step 4: Test hybrid (true merge)**

```bash
curl -s http://localhost:5201/api/search/hybrid \
  -H "Content-Type: application/json" \
  -d '{"query":"dancing in the dark"}' | python -c "
import json,sys; data=json.load(sys.stdin)
for r in data['results'][:5]:
    print(f'{r[\"score\"]:>6.3f}  {r[\"song\"][\"title\"]} — {r[\"song\"][\"artist\"]}')
    print(f'       {r[\"matchReason\"]}')
"
```
Expected: Songs should appear with BOTH keyword and similarity reasons. Springsteen should be #1 (found by both legs). Results should include a mix of keyword-matched and semantically-matched songs.

- [ ] **Step 5: Test hybrid with conceptual query (no exact keywords)**

```bash
curl -s http://localhost:5201/api/search/hybrid \
  -H "Content-Type: application/json" \
  -d '{"query":"songs about heartbreak in the rain"}' | python -c "
import json,sys; data=json.load(sys.stdin)
for r in data['results'][:5]:
    print(f'{r[\"score\"]:>6.3f}  {r[\"song\"][\"title\"]} — {r[\"song\"][\"artist\"]}')
    print(f'       {r[\"matchReason\"]}')
"
```
Expected: Mix of results — some from vector leg (semantically about heartbreak/rain) and some from keyword leg (containing the words "heartbreak" or "rain").
