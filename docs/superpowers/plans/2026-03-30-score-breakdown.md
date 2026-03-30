# Score Breakdown — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add structured score breakdown to search results so users see exactly how each pipeline scored each song. Replace lyrics snippet with a breakdown table in the UI.

**Architecture:** Add `ScoreComponent[]` to `SearchResult` on both server and client. Each search mode builds breakdown at the same point it builds `matchReason`. Frontend renders it as a compact label/value table in the expanded result card.

**Tech Stack:** TypeScript, Hono, React, Tailwind

**Spec:** `docs/superpowers/specs/2026-03-30-score-breakdown-design.md`

---

## File Map

| File | Responsibility | Change |
|------|---------------|--------|
| `server/src/lib/types.ts` | Shared types | Add `ScoreComponent`, add `scoreBreakdown` to `SearchResult` |
| `server/src/search/keyword.ts` | Keyword scoring | Build `scoreBreakdown[]` alongside `matchReason` |
| `server/src/search/semantic.ts` | Semantic scoring | Build `scoreBreakdown[]` from lyrics/summary scores |
| `server/src/search/hybrid.ts` | Hybrid blending | Build `scoreBreakdown[]` from blend components |
| `web/src/lib/types.ts` | Frontend types | Add `ScoreComponent`, update `SearchResult` |
| `web/src/pages/Search.tsx` | Search page | Replace lyrics with breakdown table in `CompactResult` |
| `web/src/pages/Main.tsx` | Main landing page | Replace lyrics with breakdown table in `ResultRow` |

---

### Task 1: Add `ScoreComponent` type to server and client

**Files:**
- Modify: `server/src/lib/types.ts`
- Modify: `web/src/lib/types.ts`

- [ ] **Step 1: Add type to server**

In `server/src/lib/types.ts`, add `ScoreComponent` interface before `SearchResult`, and add the field to `SearchResult`:

```ts
export interface ScoreComponent {
  label: string;
  detail?: string;
  value: string;
}

export interface SearchResult {
  song: Song;
  score: number;
  matchReason: string;
  scoreBreakdown: ScoreComponent[];
  mode: SearchMode;
}
```

- [ ] **Step 2: Add type to frontend**

In `web/src/lib/types.ts`, add the same `ScoreComponent` interface and update `SearchResult`:

```ts
export interface ScoreComponent {
  label: string;
  detail?: string;
  value: string;
}

export interface SearchResult {
  song: Song;
  score: number;
  matchReason: string;
  scoreBreakdown: ScoreComponent[];
  mode: SearchMode;
}
```

- [ ] **Step 3: Commit**

```bash
git add server/src/lib/types.ts web/src/lib/types.ts
git commit -m "feat: add ScoreComponent type for structured score breakdown"
```

---

### Task 2: Build scoreBreakdown in keyword search

**Files:**
- Modify: `server/src/search/keyword.ts`

- [ ] **Step 1: Import ScoreComponent**

Add to the import at the top of `server/src/search/keyword.ts`:

```ts
import type { Song, ParsedQuery, SearchResult, ScoreComponent } from "../lib/types";
```

- [ ] **Step 2: Build breakdown alongside matchReason**

In the `keywordSearch` function, after the existing "Build match reason" block (after line 121, before `results.push`), add the breakdown construction:

```ts
    // --- Build score breakdown ---
    const breakdown: ScoreComponent[] = [];
    if (titleMatch.length > 0) {
      breakdown.push({
        label: "Title match",
        detail: `"${titleMatch.phrase}" (${titleMatch.length}-word)`,
        value: `${(titleMatch.length ** 2 * TITLE_WEIGHT).toFixed(1)} pts`,
      });
    }
    if (lyricsMatch.length > 0) {
      breakdown.push({
        label: "Lyrics match",
        detail: `"${lyricsMatch.phrase}" (${lyricsMatch.length}-word)`,
        value: `${(lyricsMatch.length ** 2 * LYRICS_WEIGHT).toFixed(1)} pts`,
      });
    }
    if (artistMatch.length > 0) {
      breakdown.push({
        label: "Artist match",
        detail: `"${artistMatch.phrase}" (${artistMatch.length}-word)`,
        value: `${(artistMatch.length ** 2 * ARTIST_WEIGHT).toFixed(1)} pts`,
      });
    }
    if (artistHint.length > 0) {
      const lowerArtist = song.artist.toLowerCase();
      if (artistHint.every((token) => lowerArtist.includes(token))) {
        breakdown.push({ label: "Artist bonus", value: `+${ARTIST_HINT_BONUS} pts` });
      }
    }
    if (decades.length > 0 && decades.includes(song.decade)) {
      breakdown.push({ label: "Decade bonus", detail: `${song.decade}s`, value: `+${DECADE_BONUS} pts` });
    }
    if (genres.length > 0) {
      const songGenre = song.genre.toLowerCase();
      if (genres.some((g) => songGenre.includes(g.toLowerCase()))) {
        breakdown.push({ label: "Genre bonus", detail: song.genre, value: `+${GENRE_BONUS} pts` });
      }
    }
    breakdown.push({ label: "Total", value: `${score.toFixed(1)} pts` });
```

- [ ] **Step 3: Add breakdown to result**

Update the `results.push` call (around line 123) to include the breakdown:

```ts
    results.push({
      song,
      score,
      matchReason: reasons.join(" · ") || "match",
      scoreBreakdown: breakdown,
      mode: "keyword",
    });
```

- [ ] **Step 4: Run typecheck**

Run: `cd "c:/Users/Jamie/Documents/Ai Dev Tools/Portfolio/Lyric-Lens/server" && bun run typecheck`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add server/src/search/keyword.ts
git commit -m "feat: keyword search builds structured scoreBreakdown"
```

---

### Task 3: Build scoreBreakdown in semantic search

**Files:**
- Modify: `server/src/search/semantic.ts`

- [ ] **Step 1: Import ScoreComponent**

Update the import in `server/src/search/semantic.ts`:

```ts
import type { ParsedQuery, SearchResult, ScoreComponent } from "../lib/types";
```

- [ ] **Step 2: Track per-vector scores for breakdown**

The semantic merge logic needs to track both lyrics and summary scores per song. Modify the merge section (lines 68-101) to store both scores and build breakdowns.

Replace the merge logic after the parallel queries with:

```ts
  // Merge by song ID — keep whichever score is higher, track both for breakdown
  const merged = new Map<string, {
    result: SearchResult;
    lyricsScore: number;
    summaryScore: number;
  }>();

  for (const point of lyricsResponse.points) {
    const song = payloadToSong(point.id, point.payload);
    const lScore = point.score ?? 0;
    merged.set(song.id, {
      result: {
        song,
        score: lScore,
        matchReason: `lyrics: ${lScore.toFixed(3)}`,
        scoreBreakdown: [],
        mode: "semantic" as const,
      },
      lyricsScore: lScore,
      summaryScore: 0,
    });
  }

  for (const point of summaryResponse.points) {
    const song = payloadToSong(point.id, point.payload);
    const sScore = point.score ?? 0;
    const existing = merged.get(song.id);
    if (existing) {
      existing.summaryScore = sScore;
      if (sScore > existing.result.score) {
        existing.result.score = sScore;
        existing.result.song = song;
      }
    } else {
      merged.set(song.id, {
        result: {
          song,
          score: sScore,
          matchReason: `summary: ${sScore.toFixed(3)}`,
          scoreBreakdown: [],
          mode: "semantic" as const,
        },
        lyricsScore: 0,
        summaryScore: sScore,
      });
    }
  }

  // Build matchReason and scoreBreakdown for each result
  for (const entry of merged.values()) {
    const { lyricsScore, summaryScore } = entry;
    const parts: string[] = [];
    const breakdown: ScoreComponent[] = [];

    if (lyricsScore > 0) {
      parts.push(`lyrics: ${lyricsScore.toFixed(3)}`);
      breakdown.push({ label: "Lyrics similarity", value: `${(lyricsScore * 100).toFixed(1)}%` });
    }
    if (summaryScore > 0) {
      parts.push(`summary: ${summaryScore.toFixed(3)}`);
      breakdown.push({ label: "Summary similarity", value: `${(summaryScore * 100).toFixed(1)}%` });
    }
    const best = Math.max(lyricsScore, summaryScore);
    breakdown.push({ label: "Best match", value: `${(best * 100).toFixed(1)}%` });

    entry.result.matchReason = parts.join(" · ");
    entry.result.scoreBreakdown = breakdown;
  }
```

- [ ] **Step 3: Update the return to extract results**

Replace the results extraction (around line 106):

```ts
  const results = [...merged.values()]
    .map((e) => e.result)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
```

- [ ] **Step 4: Run typecheck**

Run: `cd "c:/Users/Jamie/Documents/Ai Dev Tools/Portfolio/Lyric-Lens/server" && bun run typecheck`
Expected: No errors

- [ ] **Step 5: Run tests**

Run: `cd "c:/Users/Jamie/Documents/Ai Dev Tools/Portfolio/Lyric-Lens/server" && bun test`
Expected: All pass (except pre-existing embedder dimension test)

- [ ] **Step 6: Commit**

```bash
git add server/src/search/semantic.ts
git commit -m "feat: semantic search builds structured scoreBreakdown"
```

---

### Task 4: Build scoreBreakdown in hybrid search

**Files:**
- Modify: `server/src/search/hybrid.ts`

- [ ] **Step 1: Import ScoreComponent**

Update the import in `server/src/search/hybrid.ts`:

```ts
import type { Song, ParsedQuery, SearchResult, ScoreComponent } from "../lib/types";
```

- [ ] **Step 2: Build breakdown in mergeHybridResults**

In the `mergeHybridResults` function, in the scoring loop (inside `for (const entry of merged.values())`), build a breakdown after calculating the blended score. Add this after the `bonus` calculation and before pushing to `results`:

```ts
    const breakdown: ScoreComponent[] = [];
    if (entry.keywordScore > 0) {
      breakdown.push({ label: "Keyword score", detail: "normalized", value: entry.keywordScore.toFixed(2) });
    }
    if (entry.vectorScore > 0) {
      breakdown.push({ label: "Vector score", detail: "similarity", value: entry.vectorScore.toFixed(3) });
    }
    breakdown.push({ label: "Keyword weight", value: `${(kwWeight * 100).toFixed(0)}%` });
    breakdown.push({ label: "Vector weight", value: `${(vecWeight * 100).toFixed(0)}%` });
    if (bonus > 0) {
      const bonusParts: string[] = [];
      const titleWords = titleMatchWords(entry.keywordReason);
      if (titleWords > 0) bonusParts.push(`title (${titleWords}w)`);
      if (hasArtistMatch(entry.keywordReason)) bonusParts.push("artist");
      breakdown.push({ label: "Bonus", detail: bonusParts.join(" + "), value: `+${bonus.toFixed(2)}` });
    }
    breakdown.push({ label: "Blended total", value: blended.toFixed(3) });
```

- [ ] **Step 3: Add breakdown to result push**

Update the `results.push` call to include the breakdown:

```ts
    results.push({
      song: entry.song,
      score: blended,
      matchReason: reasons.join(" · ") || "hybrid match",
      scoreBreakdown: breakdown,
      mode: "hybrid",
    });
```

- [ ] **Step 4: Run typecheck and tests**

Run: `cd "c:/Users/Jamie/Documents/Ai Dev Tools/Portfolio/Lyric-Lens/server" && bun run typecheck && bun test`
Expected: No new errors, all tests pass

- [ ] **Step 5: Commit**

```bash
git add server/src/search/hybrid.ts
git commit -m "feat: hybrid search builds structured scoreBreakdown"
```

---

### Task 5: Replace lyrics with breakdown table in frontend

**Files:**
- Modify: `web/src/pages/Search.tsx`
- Modify: `web/src/pages/Main.tsx`

- [ ] **Step 1: Create ScoreBreakdown component in Search.tsx**

Add a small inline component before `CompactResult` in `Search.tsx`:

```tsx
function ScoreBreakdown({ breakdown }: { breakdown?: { label: string; detail?: string; value: string }[] }) {
  if (!breakdown?.length) return null;
  return (
    <div className="space-y-0.5">
      {breakdown.map((c, i) => (
        <div key={i} className="flex items-baseline gap-2 text-[11px]">
          <span className="text-(--color-text-tertiary) shrink-0">{c.label}</span>
          {c.detail && (
            <span className="text-(--color-text-tertiary)/60 truncate text-[10px]">{c.detail}</span>
          )}
          <span className="ml-auto text-(--color-text-secondary) tabular-nums shrink-0">{c.value}</span>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Replace lyrics in CompactResult expanded view**

In the `CompactResult` component's expanded section (around lines 255-267), replace:

```tsx
      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-(--color-border) text-xs space-y-2">
          <p className="text-(--color-text-tertiary)">{matchReason}</p>
          {song.lyrics && (
            <p className="text-(--color-text-secondary) leading-relaxed whitespace-pre-line line-clamp-4">
              {song.lyrics.slice(0, 300)}
            </p>
          )}
          {song.album && (
            <p className="text-(--color-text-tertiary)">Album: {song.album}</p>
          )}
        </div>
      )}
```

With:

```tsx
      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-(--color-border) text-xs space-y-2">
          <ScoreBreakdown breakdown={result.scoreBreakdown} />
          {song.album && (
            <p className="text-(--color-text-tertiary)">Album: {song.album}</p>
          )}
        </div>
      )}
```

- [ ] **Step 3: Replace lyrics in ResultRow expanded view (Main.tsx)**

In `Main.tsx`, add the same `ScoreBreakdown` component before `ResultRow` (around line 420):

```tsx
function ScoreBreakdown({ breakdown }: { breakdown?: { label: string; detail?: string; value: string }[] }) {
  if (!breakdown?.length) return null;
  return (
    <div className="space-y-0.5">
      {breakdown.map((c, i) => (
        <div key={i} className="flex items-baseline gap-2 text-[11px]">
          <span className="text-(--color-text-tertiary) shrink-0">{c.label}</span>
          {c.detail && (
            <span className="text-(--color-text-tertiary)/60 truncate text-[10px]">{c.label === "Total" || c.label === "Best match" || c.label === "Blended total" ? "" : c.detail}</span>
          )}
          <span className="ml-auto text-(--color-text-secondary) tabular-nums shrink-0">{c.value}</span>
        </div>
      ))}
    </div>
  );
}
```

Actually, to avoid duplication, extract the component. But since these are inline components in different page files and the skill says keep it simple — just duplicate the small component in both files.

In `ResultRow`'s expanded view (around lines 452-465), replace:

```tsx
      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="px-3 pb-3 text-xs space-y-1.5 border-t border-(--color-border) overflow-hidden"
        >
          <p className="text-(--color-text-tertiary) pt-2">{matchReason}</p>
          {song.lyrics && (
            <p className="text-(--color-text-secondary) leading-relaxed whitespace-pre-line line-clamp-3">
              {song.lyrics.slice(0, 250)}
            </p>
          )}
        </motion.div>
      )}
```

With:

```tsx
      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="px-3 pb-3 text-xs space-y-1.5 border-t border-(--color-border) overflow-hidden"
        >
          <div className="pt-2">
            <ScoreBreakdown breakdown={result.scoreBreakdown} />
          </div>
        </motion.div>
      )}
```

- [ ] **Step 4: Run typecheck**

Run: `cd "c:/Users/Jamie/Documents/Ai Dev Tools/Portfolio/Lyric-Lens/web" && bun run typecheck`
Expected: No new errors (pre-existing EmbeddingViz errors are known)

- [ ] **Step 5: Commit**

```bash
git add web/src/pages/Search.tsx web/src/pages/Main.tsx
git commit -m "feat: replace lyrics snippet with score breakdown table in result cards"
```

---

### Task 6: End-to-end verification

- [ ] **Step 1: Test keyword breakdown**

```bash
curl -s -X POST "http://localhost:5201/api/search/keyword" \
  -H "Content-Type: application/json" \
  -d '{"query":"baby in the title from the 60s"}' | node -e "
  const c=[];process.stdin.on('data',d=>c.push(d));process.stdin.on('end',()=>{
    const data=JSON.parse(Buffer.concat(c));
    const r=data.results[0];
    console.log('Song:', r.song.title, '—', r.song.artist);
    console.log('Breakdown:');
    r.scoreBreakdown.forEach(c => console.log('  ', c.label, c.detail||'', '→', c.value));
  });"
```

Expected: Structured breakdown with Title match, Lyrics match, Decade bonus, Total.

- [ ] **Step 2: Test semantic breakdown**

```bash
curl -s -X POST "http://localhost:5201/api/search/semantic" \
  -H "Content-Type: application/json" \
  -d '{"query":"songs about heartbreak"}' | node -e "
  const c=[];process.stdin.on('data',d=>c.push(d));process.stdin.on('end',()=>{
    const data=JSON.parse(Buffer.concat(c));
    const r=data.results[0];
    console.log('Song:', r.song.title, '—', r.song.artist);
    console.log('Breakdown:');
    r.scoreBreakdown.forEach(c => console.log('  ', c.label, c.detail||'', '→', c.value));
  });"
```

Expected: Lyrics similarity %, Summary similarity %, Best match %.

- [ ] **Step 3: Test hybrid breakdown**

```bash
curl -s -X POST "http://localhost:5201/api/search/hybrid" \
  -H "Content-Type: application/json" \
  -d '{"query":"baby in the title from the 60s"}' | node -e "
  const c=[];process.stdin.on('data',d=>c.push(d));process.stdin.on('end',()=>{
    const data=JSON.parse(Buffer.concat(c));
    const r=data.results[0];
    console.log('Song:', r.song.title, '—', r.song.artist);
    console.log('Breakdown:');
    r.scoreBreakdown.forEach(c => console.log('  ', c.label, c.detail||'', '→', c.value));
  });"
```

Expected: Keyword score, Vector score, weights, bonus, blended total.

- [ ] **Step 4: Run full typecheck**

Run: `cd "c:/Users/Jamie/Documents/Ai Dev Tools/Portfolio/Lyric-Lens" && bun run typecheck`
Expected: No new errors

- [ ] **Step 5: Run server tests**

Run: `cd "c:/Users/Jamie/Documents/Ai Dev Tools/Portfolio/Lyric-Lens/server" && bun test`
Expected: All pass (except pre-existing embedder dimension test)
