# Visualizer Filtering, Nav Consistency & Toolbar Polish

**Date:** 2026-03-30
**Status:** Approved

---

## Problems

1. **Visualizer display filtering is confusing** — Multiple overlapping states (`dimmedIds`, `highlightedIds`, `showAllPoints`, `hideNonHighlighted`, `neighborIds`) interact unpredictably. Switching from legend filter to search or clicking neighbors through filtered results breaks the display.

2. **Nav is inconsistent across pages** — On the homepage, nav shows section links (Intro, Keyword, Semantic, Hybrid, NL) + page links (Deep Dive, Vector Map). On Visualizer/Deep Dive, only page links show. Section links should always be visible and navigate back to homepage sections.

3. **Visualizer toolbar uses unclear abbreviations** — "KW", "Sem", "Hyb", "NL" instead of full names. "Project" doesn't communicate what it does.

---

## Fix 1: Simplified visualizer filtering

### Current state (broken)

The EmbeddingViz categorization loop has 4 buckets (`bright`, `dimmed`, `highlighted`, `neighbors`) with priority logic that fights itself. The Visualizer passes 5 related props: `dimmedIds`, `highlightedIds`, `hideNonHighlighted`, `neighborIds`, `selectedId`.

### New model

**One filter source** at a time. Either:
- A **legend filter** (genre/decade/cluster from the chip bar), OR
- A **search filter** (search result IDs)

Whichever happened last wins. They don't stack.

**One toggle**: show all (filtered items bright, rest dimmed) or filter only (hide non-matching). Exposed as a small pill overlay in the bottom-left corner of the 3D graph. Only visible when a filter is active.

**Neighbors** are a separate visual layer — always rendered on top regardless of filter state.

### EmbeddingViz props simplification

Replace `dimmedIds`, `highlightedIds`, `hideNonHighlighted` with:

```ts
interface Props {
  points: VizPoint[];
  onSelect: (point: VizPoint) => void;
  selectedId?: string;
  projectedPoint?: { x: number; y: number; z: number; label: string } | null;
  filteredIds?: Set<string> | null;   // single filter: legend OR search
  filterMode?: "show" | "hide";       // show all with dimming, or hide non-matching
  neighborIds?: Set<string> | null;
  focusPoint?: { x: number; y: number; z: number } | null;
}
```

### Categorization logic (EmbeddingViz trace builder)

```
for each point:
  if point is a neighbor    → neighbors bucket (always visible)
  if no filter active       → bright bucket
  if point matches filter   → bright bucket
  if filterMode is "show"   → dimmed bucket
  if filterMode is "hide"   → skip (not rendered)
```

Selected node always renders with its existing treatment (10px, white ring) regardless of which bucket it's in.

### Visualizer state changes

Replace `showAllPoints`, `highlightedIds`, `dimmedIds`, `hideNonHighlighted` with:

- `filteredIds: Set<string> | null` — derived from either legend or search, whichever is current
- `filterMode: "show" | "hide"` — toggle state, default "show"

**Filter switching:**
- Clicking a legend chip → compute `filteredIds` from legend, clear `searchResults`
- Running a search → compute `filteredIds` from search results, clear `activeFilter`
- Clicking a node outside the filter → clear filter, back to full view (already implemented)
- Dismiss panel → clear everything

### Corner overlay toggle

Small pill in bottom-left of the 3D graph area:
- Only visible when `filteredIds` is non-null
- Shows: "[Show all] [Filter only]" — two small buttons, active one highlighted
- Below it, a label: filter description (e.g. "Rock", "12 results", "1960s")

---

## Fix 2: Consistent nav across all pages

### Current state

- `Layout.tsx` renders `<Nav>` only when `!isMain` (not on homepage)
- Homepage renders its own `<Nav visible={navVisible} onNavigate={scrollToSection} />`
- On non-home pages, `Nav` hides section links (`isHome` check in Nav.tsx)

### Change

**Always show section links in Nav.** When on the homepage, they scroll to sections (existing behaviour). When on other pages, they navigate to `/#section-name` — React Router navigates to `/` and then the homepage scrolls to the target section.

This requires:
- Nav.tsx: remove the `isHome` guard on section links. When not on homepage, navigate to `/?section=N` or use hash routing
- Main.tsx: on mount, check for a section parameter and scroll to it
- Layout.tsx: always render Nav (remove the `!isMain` conditional). Main.tsx already passes visibility control.

**Actually simpler**: Layout.tsx already renders Nav for non-home pages. Main.tsx renders its own Nav. The fix is just:
1. Nav.tsx: always show section links. On non-home pages, clicking them navigates to `/#keyword` etc.
2. Main.tsx: add `id` attributes to sections so hash navigation works, or read the hash on mount and scroll.

---

## Fix 3: Visualizer toolbar clarity

### Pipeline toggle

Replace abbreviations with full names:

| Current | New |
|---------|-----|
| Project | Embed Query |
| KW | Keyword |
| Sem | Semantic |
| Hyb | Hybrid |
| NL | Natural |

"Embed Query" communicates what "Project" actually does — it embeds the query text and shows where it lands in vector space.

The button styling may need slightly more horizontal padding to accommodate longer labels. The text size can stay at `text-[10px]`.

Update the search button text too: when mode is "project", button says "Embed" instead of "Project". Placeholder says "Embed a query into vector space..." instead of "Project a query...".

---

## Files changed

| File | Change |
|------|--------|
| `web/src/components/EmbeddingViz.tsx` | Replace `dimmedIds`/`highlightedIds`/`hideNonHighlighted` props with `filteredIds`/`filterMode`. Simplify categorization. |
| `web/src/pages/Visualizer.tsx` | Replace display state with `filteredIds`/`filterMode`. Add corner toggle overlay. Update pipeline labels. Fix filter switching between legend and search. |
| `web/src/components/Nav.tsx` | Always show section links. Non-home clicks navigate to homepage with hash. |
| `web/src/components/Layout.tsx` | Small adjustment if needed for Nav rendering. |
| `web/src/pages/Main.tsx` | Add section IDs or hash-scroll handling for cross-page navigation. |

## Out of scope

- Changing the legend chip bar design
- Changing the side panel layout
- Adding new filter types
- Changing the search functionality
