# Search Dedup, Keyword Scoring & Semantic Filters — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix three search bugs: broken hybrid dedup (ID mismatch), keyword noise from structural words, and overly aggressive semantic hard-filters.

**Architecture:** Four targeted edits to server search files. No schema changes, no re-uploads, no UI changes. Each fix is independent and testable in isolation.

**Tech Stack:** Bun, TypeScript, Qdrant JS client, `bun:test`

**Spec:** `docs/superpowers/specs/2026-03-30-search-dedup-scoring-filters-design.md`

---

## File Map

| File | Responsibility | Change |
|------|---------------|--------|
| `server/src/search/utils.ts` | Shared helpers: `payloadToSong`, `longestSequence`, `songKey` | Add `songKey()` function for consistent identity |
| `server/src/search/hybrid.ts` | Blends keyword + semantic by song ID | Use `songKey()` instead of `song.id` for Map key |
| `server/src/search/keyword.ts` | Sequence-based scoring on in-memory songs | Add noise floor: unfiltered path needs 5+ word sequence to win |
| `server/src/search/semantic.ts` | Vector search via Qdrant | Remove decade/genre/mood from `must` filter |
| `server/src/__tests__/keyword.test.ts` | Keyword scoring tests | Add test for noise floor behaviour |
| `server/src/__tests__/hybrid.test.ts` | New — hybrid dedup tests | Verify dedup by title+artist, dual-leg boost |

---

### Task 1: Add `songKey()` helper and fix `payloadToSong` ID

**Files:**
- Modify: `server/src/search/utils.ts`
- Test: `server/src/__tests__/sequence.test.ts` (existing, add cases)

- [ ] **Step 1: Write tests for `songKey`**

Add to the bottom of `server/src/__tests__/sequence.test.ts`:

```ts
import { songKey } from "../search/utils";

describe("songKey", () => {
  test("produces consistent key from title + artist", () => {
    expect(songKey("Hey! Baby", "Bruce Channel"))
      .toBe("hey! baby::bruce channel");
  });

  test("trims whitespace", () => {
    expect(songKey("  Love Song  ", "  Artist  "))
      .toBe("love song::artist");
  });

  test("identical songs produce identical keys", () => {
    const a = songKey("Take Good Care Of My Baby", "Bobby Vee");
    const b = songKey("Take Good Care Of My Baby", "Bobby Vee");
    expect(a).toBe(b);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd server && bun test src/__tests__/sequence.test.ts`
Expected: FAIL — `songKey` is not exported from `utils.ts`

- [ ] **Step 3: Implement `songKey` and update `payloadToSong`**

In `server/src/search/utils.ts`, add the `songKey` function after the existing imports and before `payloadToSong`:

```ts
/** Stable identity for dedup — both keyword (slug IDs) and semantic (Qdrant int IDs) have title + artist. */
export function songKey(title: string, artist: string): string {
  return `${title.toLowerCase().trim()}::${artist.toLowerCase().trim()}`;
}
```

Then update `payloadToSong` to use a consistent ID derived from title + artist instead of the raw Qdrant point ID:

```ts
export function payloadToSong(id: any, payload: any): Song {
  const title = payload.title ?? "";
  const artist = payload.artist ?? "";
  return {
    id: songKey(title, artist),
    title,
    artist,
    year: payload.year ?? 0,
    decade: payload.decade ?? 0,
    genre: payload.genre ?? "",
    chartPosition: payload.chart_position ?? 0,
    lyrics: payload.lyrics ?? "",
    album: payload.album ?? "",
    writers: payload.writers ?? "",
    emotions: payload.emotions ?? {},
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd server && bun test src/__tests__/sequence.test.ts`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add server/src/search/utils.ts server/src/__tests__/sequence.test.ts
git commit -m "feat: add songKey() for consistent song identity across search legs"
```

---

### Task 2: Fix hybrid dedup to use `songKey`

**Files:**
- Modify: `server/src/search/hybrid.ts`
- Create: `server/src/__tests__/hybrid.test.ts`

- [ ] **Step 1: Write tests for hybrid dedup**

Create `server/src/__tests__/hybrid.test.ts`. These test the merge logic directly by mocking the keyword and semantic search functions:

```ts
import { describe, test, expect, mock } from "bun:test";
import type { Song, SearchResult } from "../lib/types";

// We need to test the merge logic. Import after mocking.
const makeSong = (title: string, artist: string, overrides?: Partial<Song>): Song => ({
  id: `${artist.toLowerCase().replace(/\s+/g, "-")}-${title.toLowerCase().replace(/\s+/g, "-")}`,
  title,
  artist,
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

const makeResult = (song: Song, score: number, mode: "keyword" | "semantic", reason: string): SearchResult => ({
  song,
  score,
  matchReason: reason,
  mode,
});

describe("hybrid dedup", () => {
  test("same song from both legs should appear once, not twice", async () => {
    // Songs with different IDs but same title+artist (the real bug)
    const kwSong = makeSong("Hey! Baby", "Bruce Channel");
    kwSong.id = "bruce-channel-hey-baby"; // slug ID from JSON
    const semSong = makeSong("Hey! Baby", "Bruce Channel");
    semSong.id = "60"; // Qdrant integer ID

    // Mock keywordSearch and semanticSearch
    const keywordMod = mock.module("../search/keyword", () => ({
      keywordSearch: () => [makeResult(kwSong, 5.5, "keyword", 'title: "baby" (1w)')],
    }));

    const semanticMod = mock.module("../search/semantic", () => ({
      semanticSearch: async () => ({
        results: [makeResult(semSong, 0.55, "semantic", "lyrics: 0.55")],
        totalFiltered: 100,
      }),
    }));

    // Re-import to pick up mocks
    const { hybridSearch } = await import("../search/hybrid");
    const parsed = {
      scopeTitle: false, scopeLyrics: false, scopeArtist: false,
      filters: { decades: [], genres: [], moods: [], audioFeatures: [], artistHint: [] },
      searchPhrase: "baby", semanticText: "baby",
      terms: ["baby"], termsUnfiltered: ["baby"], interpretations: [],
    };

    const result = await hybridSearch(parsed, "baby", [kwSong]);

    // Should be 1 result, not 2
    const heyBabyResults = result.results.filter(r => r.song.title === "Hey! Baby");
    expect(heyBabyResults.length).toBe(1);
    // Should have combined score > either individual score's contribution
    expect(heyBabyResults[0].score).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && bun test src/__tests__/hybrid.test.ts`
Expected: FAIL — `heyBabyResults.length` will be 2 (the current bug)

- [ ] **Step 3: Update hybrid.ts to use `songKey`**

In `server/src/search/hybrid.ts`, add the import at the top:

```ts
import { songKey } from "./utils";
```

Then replace the three places where `song.id` is used as a Map key.

Change the keyword loop (line 62-69):

```ts
  for (const kr of keywordResults) {
    merged.set(songKey(kr.song.title, kr.song.artist), {
      song: kr.song,
      keywordScore: kr.score / maxKeyword,
      vectorScore: 0,
      keywordReason: kr.matchReason,
      vectorReason: "",
    });
  }
```

Change the semantic loop (line 72-86):

```ts
  for (const vr of vectorResults) {
    const key = songKey(vr.song.title, vr.song.artist);
    const existing = merged.get(key);
    if (existing) {
      existing.vectorScore = vr.score;
      existing.vectorReason = vr.matchReason;
    } else {
      merged.set(key, {
        song: vr.song,
        keywordScore: 0,
        vectorScore: vr.score,
        keywordReason: "",
        vectorReason: vr.matchReason,
      });
    }
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && bun test src/__tests__/hybrid.test.ts`
Expected: PASS

- [ ] **Step 5: Run all existing tests to check for regressions**

Run: `cd server && bun test`
Expected: All PASS

- [ ] **Step 6: Commit**

```bash
git add server/src/search/hybrid.ts server/src/__tests__/hybrid.test.ts
git commit -m "fix: hybrid dedup uses title+artist instead of mismatched IDs"
```

---

### Task 3: Keyword noise floor on `testBoth`

**Files:**
- Modify: `server/src/search/keyword.ts`
- Modify: `server/src/__tests__/keyword.test.ts`

- [ ] **Step 1: Write test for noise floor**

Add to `server/src/__tests__/keyword.test.ts`:

```ts
  test("testBoth: 2-word unfiltered match does not beat stripped score (noise floor)", () => {
    // Simulates "baby in the title from the 60s" — parser strips to ["baby"],
    // unfiltered includes structural words. A song with "baby in" in lyrics
    // should NOT outscore a 1960s song with "baby" in the title.
    const songs = [
      makeSong({
        id: "noise-hit",
        title: "Baby Don't Forget My Number",
        lyrics: "oh baby in the morning light",
        decade: 1980,
      }),
      makeSong({
        id: "genuine-hit",
        title: "Hey! Baby",
        lyrics: "hey baby",
        decade: 1960,
      }),
    ];
    const parsed = makeParsed({
      searchPhrase: "baby in the title from the 60s",
      terms: ["baby"],
      termsUnfiltered: ["baby", "in", "the", "title", "from", "the", "60s"],
      scopeTitle: true,
      filters: { decades: [1960], genres: [], moods: [], audioFeatures: [], artistHint: [] },
    });
    const results = keywordSearch(songs, parsed);
    // The 1960s song should rank first because:
    // - Both have "baby" in title (equal)
    // - Genuine hit gets +2 decade bonus
    // - Noise hit should NOT get inflated score from "baby in" unfiltered match
    expect(results[0].song.id).toBe("genuine-hit");
  });

  test("testBoth: 5+ word unfiltered sequence DOES beat stripped score", () => {
    const songs = [
      makeSong({
        id: "long-match",
        title: "Some Song",
        lyrics: "baby in the title from the sky we fell down together",
      }),
    ];
    const parsed = makeParsed({
      searchPhrase: "baby in the title from the sky",
      terms: ["baby", "sky"],
      termsUnfiltered: ["baby", "in", "the", "title", "from", "the", "sky"],
    });
    const results = keywordSearch(songs, parsed);
    // 7-word unfiltered lyrics match should score very high (7²×1.5 = 73.5)
    // vs stripped score of 2 words max
    expect(results[0].score).toBeGreaterThan(20);
  });
```

- [ ] **Step 2: Run tests to verify the noise floor test fails**

Run: `cd server && bun test src/__tests__/keyword.test.ts`
Expected: The first new test FAILS (noise-hit currently ranks above genuine-hit). The second test may pass already.

- [ ] **Step 3: Add noise floor to `testBoth` block**

In `server/src/search/keyword.ts`, add a constant near the top with the other constants:

```ts
/** Minimum sequence length for unfiltered path to beat stripped path.
 *  Prevents structural query words (e.g. "in the title from the 60s")
 *  from creating false sequence matches in lyrics. */
const UNFILTERED_MIN_SEQUENCE = 5;
```

Then replace the `testBoth` block (lines 51-65) with:

```ts
    // --- For long queries, also try unfiltered and take the better score ---
    // Only accept the unfiltered result if its best sequence is >= UNFILTERED_MIN_SEQUENCE
    // words. Short matches like "baby in" from structural query syntax are noise.
    if (testBoth) {
      const altTitle = longestSequence(unfiltered, song.title);
      const altLyrics = longestSequence(unfiltered, song.lyrics);
      const altArtist = longestSequence(unfiltered, song.artist);
      const bestAltLen = Math.max(altTitle.length, altLyrics.length, altArtist.length);
      if (bestAltLen >= UNFILTERED_MIN_SEQUENCE) {
        const altScore =
          (altTitle.length ** 2) * TITLE_WEIGHT +
          (altLyrics.length ** 2) * LYRICS_WEIGHT +
          (altArtist.length ** 2) * ARTIST_WEIGHT;
        if (altScore > score) {
          score = altScore;
          titleMatch = altTitle;
          lyricsMatch = altLyrics;
          artistMatch = altArtist;
        }
      }
    }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd server && bun test src/__tests__/keyword.test.ts`
Expected: All PASS (including both new tests and all existing ones)

- [ ] **Step 5: Commit**

```bash
git add server/src/search/keyword.ts server/src/__tests__/keyword.test.ts
git commit -m "fix: keyword testBoth requires 5+ word sequence to beat stripped score"
```

---

### Task 4: Remove hard decade/genre/mood filters from semantic search

**Files:**
- Modify: `server/src/search/semantic.ts`

- [ ] **Step 1: Baseline current semantic results**

Run the test queries and save results before changing anything:

```bash
cd "c:/Users/Jamie/Documents/Ai Dev Tools/Portfolio/Lyric-Lens"

echo "=== BASELINE ===" > docs/semantic-filter-baseline.txt

for q in "baby in the title from the 60s" "heartbreak 90s r&b" "songs about heartbreak" "dive bar at 2am"; do
  echo -e "\n--- $q ---" >> docs/semantic-filter-baseline.txt
  curl -s -X POST "http://localhost:5201/api/search/semantic" \
    -H "Content-Type: application/json" \
    -d "{\"query\":\"$q\"}" | node -e "
    const c=[];process.stdin.on('data',d=>c.push(d));process.stdin.on('end',()=>{
      const data=JSON.parse(Buffer.concat(c));
      console.log('Results: ' + (data.results||[]).length);
      (data.results||[]).slice(0,10).forEach(r=>{
        const s=r.song;
        console.log(r.score.toFixed(3).padStart(7)+' | '+s.title+' — '+s.artist+' ('+s.year+') | '+r.matchReason);
      });
    });" >> docs/semantic-filter-baseline.txt 2>&1
done

cat docs/semantic-filter-baseline.txt
```

- [ ] **Step 2: Modify `buildQdrantFilter` to only keep hard intent filters**

In `server/src/search/semantic.ts`, replace the `buildQdrantFilter` function (lines 9-54) with:

```ts
function buildQdrantFilter(parsed: ParsedQuery): Record<string, any> | undefined {
  const { artistHint } = parsed.filters;
  const must: any[] = [];

  // Artist filter — explicit user intent ("by Artist")
  if (artistHint.length > 0) {
    for (const token of artistHint) {
      must.push({ key: "artist", match: { text: token } });
    }
  }

  // Title scope — explicit user intent ("in the title")
  if (parsed.scopeTitle && parsed.terms.length > 0) {
    for (const term of parsed.terms) {
      must.push({ key: "title", match: { text: term } });
    }
  }

  if (must.length === 0) return undefined;
  return { must };
}
```

This removes: decade filter, genre filter, mood/emotion range filter. Keeps: artist filter, title scope filter.

- [ ] **Step 3: Run the same test queries and compare to baseline**

```bash
echo "=== AFTER ===" > docs/semantic-filter-after.txt

for q in "baby in the title from the 60s" "heartbreak 90s r&b" "songs about heartbreak" "dive bar at 2am"; do
  echo -e "\n--- $q ---" >> docs/semantic-filter-after.txt
  curl -s -X POST "http://localhost:5201/api/search/semantic" \
    -H "Content-Type: application/json" \
    -d "{\"query\":\"$q\"}" | node -e "
    const c=[];process.stdin.on('data',d=>c.push(d));process.stdin.on('end',()=>{
      const data=JSON.parse(Buffer.concat(c));
      console.log('Results: ' + (data.results||[]).length);
      (data.results||[]).slice(0,10).forEach(r=>{
        const s=r.song;
        console.log(r.score.toFixed(3).padStart(7)+' | '+s.title+' — '+s.artist+' ('+s.year+') | '+r.matchReason);
      });
    });" >> docs/semantic-filter-after.txt 2>&1
done

cat docs/semantic-filter-after.txt
```

Verify:
- "baby in the title from the 60s" — should return 20 results (not 4), all with "baby" in title, from any decade. 1960s songs should still rank well due to embedding similarity.
- "heartbreak 90s r&b" — should return 20 results, broader than before. Heartbreak themes should dominate via vector similarity.
- "songs about heartbreak" — should be unchanged (had no decade/genre/mood filters before either).
- "dive bar at 2am" — should be unchanged.

- [ ] **Step 4: Run all tests to check for regressions**

Run: `cd server && bun test`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add server/src/search/semantic.ts
git commit -m "fix: semantic search removes hard decade/genre/mood filters, keeps title+artist"
```

- [ ] **Step 6: Clean up baseline files**

```bash
rm docs/semantic-filter-baseline.txt docs/semantic-filter-after.txt
```

---

### Task 5: End-to-end verification with the trigger query

**Files:** None modified — verification only.

- [ ] **Step 1: Run all three modes for the trigger query**

```bash
for mode in keyword semantic hybrid; do
  echo -e "\n=== $mode ==="
  curl -s -X POST "http://localhost:5201/api/search/$mode" \
    -H "Content-Type: application/json" \
    -d '{"query":"baby in the title from the 60s"}' | node -e "
    const c=[];process.stdin.on('data',d=>c.push(d));process.stdin.on('end',()=>{
      const data=JSON.parse(Buffer.concat(c));
      (data.results||[]).slice(0,10).forEach(r=>{
        const s=r.song;
        console.log(r.score.toFixed(3).padStart(7)+' | '+s.title+' — '+s.artist+' ('+s.year+') | '+r.matchReason);
      });
    });"
done
```

Verify:
- **Keyword:** 1960s songs with "baby" in title rank at the top (not Milli Vanilli/Amy Grant)
- **Semantic:** 20 results, all with "baby" in title, from various decades, ranked by vector similarity
- **Hybrid:** No duplicate entries. Songs found by both legs have combined scores. 1960s "baby in title" songs should rank highest.

- [ ] **Step 2: Run typecheck**

Run: `cd "c:/Users/Jamie/Documents/Ai Dev Tools/Portfolio/Lyric-Lens" && bun run typecheck`
Expected: No errors

- [ ] **Step 3: Run full test suite**

Run: `cd server && bun test`
Expected: All PASS
