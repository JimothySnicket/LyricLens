# Search Results: Structured Score Breakdown

**Date:** 2026-03-30
**Status:** Approved

---

## Problem

Search result cards currently show raw lyrics (useless — they're just the dataset) and a flat `matchReason` string like `title: "baby" (1w) · lyrics: "baby" (1w) · decade: 1960s`. For a portfolio app demonstrating search techniques, the most valuable thing to show is *how* each pipeline arrived at its score — and that explanation differs per mode.

## Goal

Replace the lyrics snippet in expanded result cards with a structured score breakdown that explains how each search mode scored the result. This is the core educational value of the app: same query, four pipelines, here's exactly why each one ranked this song where it did.

## Design

### API: Add `scoreBreakdown` to SearchResult

Add a structured array to the `SearchResult` type:

```ts
interface ScoreComponent {
  label: string;    // "Title match", "Lyrics similarity", "Decade bonus"
  detail?: string;  // "'baby' (1-word sequence)", "1960s", etc.
  value: string;    // "2.0 pts", "55.3%", "+0.10"
}

interface SearchResult {
  song: Song;
  score: number;
  matchReason: string;        // keep for backwards compat / simple display
  scoreBreakdown: ScoreComponent[];  // NEW
  mode: SearchMode;
}
```

### Per-mode breakdown construction

Each search function builds its breakdown at the same point it currently builds `matchReason`:

**Keyword** — sequence match scores + filter bonuses:
```
Title match     | "'baby'" (1-word)     | 2.0 pts
Lyrics match    | "'baby'" (1-word)     | 1.5 pts
Decade bonus    | 1960s                 | +2.0 pts
─────────────────────────────────────────────────
Total           |                       | 5.5 pts
```

**Semantic** — vector similarity per space:
```
Lyrics vector   |                       | 55.3%
Summary vector  |                       | 47.7%
Best match      |                       | 55.3%
```

**Hybrid** — both legs plus blending:
```
Keyword leg     | normalized            | 0.69
Vector leg      | best similarity       | 0.55
Keyword weight  |                       | 40%
Vector weight   |                       | 60%
Title bonus     | 1-word match          | +0.10
Blended score   |                       | 0.78
```

**Natural/Deep** — show the chosen strategy + underlying mode breakdown:
```
Strategy        | hybrid                |
```
Plus the breakdown from whichever mode was chosen.

### Frontend: Replace lyrics with breakdown

In the expanded state of `CompactResult` (Search.tsx) and `ResultRow` (Main.tsx):

- Remove the lyrics snippet
- Render `scoreBreakdown` as a compact table: label left-aligned, detail in the middle (muted), value right-aligned
- Keep the existing match reason as a one-line summary above the breakdown
- Show song metadata (genre, year, chart position, album) as small pills/tags — this is already partially done

### Emotion profile (stretch, not required)

The `Song` type already has `emotions: Record<string, number>`. A small horizontal bar chart showing the emotion scores would complement the score breakdown nicely. But this is additive — the score breakdown is the priority.

## Files changed

### Server (API)
| File | Change |
|------|--------|
| `server/src/lib/types.ts` | Add `ScoreComponent` interface, add `scoreBreakdown` to `SearchResult` |
| `server/src/search/keyword.ts` | Build `scoreBreakdown[]` alongside existing `matchReason` |
| `server/src/search/semantic.ts` | Build `scoreBreakdown[]` from lyrics/summary scores |
| `server/src/search/hybrid.ts` | Build `scoreBreakdown[]` from blended components |
| `server/src/routes/search.ts` | Pass through (natural/deep modes inherit from underlying search) |

### Frontend (UI)
| File | Change |
|------|--------|
| `web/src/lib/types.ts` | Add `ScoreComponent`, update `SearchResult` |
| `web/src/pages/Search.tsx` | `CompactResult`: replace lyrics with breakdown table |
| `web/src/pages/Main.tsx` | `ResultRow`: replace lyrics with breakdown table |

## Out of scope

- Emotion radar/bar chart (nice-to-have, separate feature)
- Changes to the Visualizer page result display
- Changing how scores are calculated (display only)
- ResultCard.tsx (standalone component, not actively used in main pages)
