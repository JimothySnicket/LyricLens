# Visualizer Filtering, Nav Consistency & Toolbar Polish — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Simplify visualizer display filtering to one filter source + show/hide toggle, make nav consistent across all pages, and use full pipeline names in the toolbar.

**Architecture:** Replace overlapping display state in Visualizer/EmbeddingViz with a single `filteredIds` + `filterMode` model. Update Nav to always show section links with cross-page navigation. Rename toolbar labels.

**Tech Stack:** React, TypeScript, Plotly GL3D, React Router, Tailwind

**Spec:** `docs/superpowers/specs/2026-03-30-visualizer-nav-polish-design.md`

---

## File Map

| File | Responsibility | Change |
|------|---------------|--------|
| `web/src/components/EmbeddingViz.tsx` | 3D scatter plot | Replace `dimmedIds`/`highlightedIds`/`hideNonHighlighted` with `filteredIds`/`filterMode` |
| `web/src/pages/Visualizer.tsx` | Visualizer page | Simplify state, add corner toggle, fix filter switching, rename toolbar labels |
| `web/src/components/Nav.tsx` | Site navigation | Always show section links, cross-page navigation via hash |
| `web/src/components/Layout.tsx` | Root layout | Always render Nav |
| `web/src/pages/Main.tsx` | Homepage | Handle hash-based section navigation on mount |

---

### Task 1: Simplify EmbeddingViz props and categorization

**Files:**
- Modify: `web/src/components/EmbeddingViz.tsx`

- [ ] **Step 1: Replace the Props interface**

Replace the current Props interface (lines 12-22) with:

```ts
interface Props {
  points: VizPoint[];
  onSelect: (point: VizPoint) => void;
  selectedId?: string;
  projectedPoint?: { x: number; y: number; z: number; label: string } | null;
  filteredIds?: Set<string> | null;
  filterMode?: "show" | "hide";
  neighborIds?: Set<string> | null;
  focusPoint?: { x: number; y: number; z: number } | null;
}
```

- [ ] **Step 2: Update the component signature**

Replace line 48:

```ts
export function EmbeddingViz({ points, onSelect, selectedId, projectedPoint, filteredIds, filterMode = "show", neighborIds, focusPoint }: Props) {
```

- [ ] **Step 3: Replace the categorization logic in the trace builder useMemo**

Replace the entire categorization block (lines 145-168) with:

```ts
  const { traces } = useMemo(() => {
    const hasFilter = filteredIds != null && filteredIds.size > 0;
    const hasNeighbors = neighborIds != null && neighborIds.size > 0;

    const bright: VizPoint[] = [];
    const dimmed: VizPoint[] = [];
    const neighbors: VizPoint[] = [];

    for (const p of points) {
      // Neighbors always visible regardless of filter
      if (hasNeighbors && neighborIds.has(p.id)) {
        neighbors.push(p);
      } else if (!hasFilter) {
        // No filter — everything bright
        bright.push(p);
      } else if (filteredIds.has(p.id)) {
        // Matches filter — bright
        bright.push(p);
      } else if (filterMode === "show") {
        // Doesn't match but "show all" — dimmed
        dimmed.push(p);
      }
      // filterMode === "hide" and doesn't match — skip (not rendered)
    }
```

- [ ] **Step 4: Remove the old `highlighted` trace**

Delete the "Search result highlights" trace block (the block starting with `// Search result highlights — larger, brighter points with white ring`, lines 247-266). The filtered points now go into the `bright` bucket and render normally via the emotion-grouped traces — no special "highlighted" trace needed.

- [ ] **Step 5: Update the useMemo dependency array**

Replace the dependency array (line 310) with:

```ts
  }, [points, filteredIds, filterMode, selectedId, projectedPoint, selectedPoint, neighborIds]);
```

- [ ] **Step 6: Commit**

```bash
git add web/src/components/EmbeddingViz.tsx
git commit -m "refactor: simplify EmbeddingViz to filteredIds + filterMode model"
```

---

### Task 2: Simplify Visualizer state and wire up new props

**Files:**
- Modify: `web/src/pages/Visualizer.tsx`

- [ ] **Step 1: Replace display state variables**

In the `Visualizer` function (starting line 427), replace the state declarations. Remove `showAllPoints` (line 441). Add `filterMode`:

Replace:
```ts
  const [showAllPoints, setShowAllPoints] = useState(true); // false = only show search results
```

With:
```ts
  const [filterMode, setFilterMode] = useState<"show" | "hide">("show");
```

- [ ] **Step 2: Replace `highlightedIds` and `dimmedIds` with a single `filteredIds` memo**

Remove the `dimmedIds` usage (line 444) and the `highlightedIds` memo (lines 513-525). Replace both with a single `filteredIds` memo that derives from whichever filter is active — legend OR search:

Replace lines 443-449 (the `legendItems`, `dimmedIds`, `filteredCount` block) with:

```ts
  const legendItems = useLegendItems(points, lens, genreDrillDown);

  // Single filter source: legend OR search results (last one set wins)
  const filteredIds = useMemo(() => {
    // Search results take priority if set
    if (searchResults?.results?.length && points.length > 0) {
      const searchKeys = new Set(
        searchResults.results.map((r) => `${r.song.title}|||${r.song.artist}`.toLowerCase())
      );
      const ids = new Set<string>();
      for (const p of points) {
        if (searchKeys.has(`${p.title}|||${p.artist}`.toLowerCase())) {
          ids.add(p.id);
        }
      }
      return ids.size > 0 ? ids : null;
    }

    // Legend filter
    if (!activeFilter) return null;
    const ids = new Set<string>();
    for (const p of points) {
      let match = false;
      if (lens === "genre") {
        if (genreDrillDown && activeFilter === genreDrillDown) {
          match = p.metaGenre === activeFilter;
        } else if (genreDrillDown) {
          match = p.genre === activeFilter;
        } else {
          match = p.metaGenre === activeFilter;
        }
      } else if (lens === "decade") {
        match = String(p.decade) === activeFilter;
      } else {
        match = String(p.cluster) === activeFilter;
      }
      if (match) ids.add(p.id);
    }
    return ids.size > 0 ? ids : null;
  }, [points, searchResults, activeFilter, lens, genreDrillDown]);

  const filteredCount = filteredIds?.size ?? points.length;
```

- [ ] **Step 3: Delete the old `highlightedIds` memo**

Remove lines 511-525 (the `highlightedIds` useMemo block). This is now handled by `filteredIds`.

- [ ] **Step 4: Update handleSelect — clear search when navigating outside filter**

Replace the current `handleSelect` (lines 480-489) with:

```ts
  function handleSelect(point: VizPoint) {
    // If navigating to a node outside the current filter, clear it
    if (filteredIds && !filteredIds.has(point.id)) {
      setSearchResults(null);
      setProjection(null);
      setActiveFilter(null);
    }
    setSelected(point);
    setFocusPoint({ x: point.x, y: point.y, z: point.z });
  }
```

- [ ] **Step 5: Update handleLegendItemClick to clear search**

Replace the `handleLegendItemClick` function (lines 466-473) with:

```ts
  function handleLegendItemClick(key: string) {
    // Legend click clears search
    setSearchResults(null);
    setProjection(null);
    if (lens === "genre" && !genreDrillDown) {
      setGenreDrillDown(key);
      setActiveFilter(key);
      return;
    }
    setActiveFilter((prev) => (prev === key ? null : key));
  }
```

- [ ] **Step 6: Update handleSearch to clear legend filter**

In `handleSearch` (line 532), add `setActiveFilter(null)` after `setSelected(null)`:

```ts
  async function handleSearch() {
    if (!query.trim() || projecting) return;
    setProjecting(true);
    setSelected(null);
    setActiveFilter(null);
    setSearchResults(null);
    setProjection(null);
```

- [ ] **Step 7: Update the EmbeddingViz JSX props**

Replace the `<EmbeddingViz>` call (lines 751-765) with:

```tsx
            <EmbeddingViz
              points={points}
              onSelect={handleSelect}
              selectedId={selected?.id}
              projectedPoint={
                projection
                  ? { x: projection.x, y: projection.y, z: projection.z, label: projection.query }
                  : null
              }
              filteredIds={filteredIds}
              filterMode={filterMode}
              focusPoint={focusPoint}
              neighborIds={neighborIds}
            />
```

- [ ] **Step 8: Commit**

```bash
git add web/src/pages/Visualizer.tsx
git commit -m "refactor: single filteredIds source, legend and search clear each other"
```

---

### Task 3: Add corner toggle overlay and update search bar

**Files:**
- Modify: `web/src/pages/Visualizer.tsx`

- [ ] **Step 1: Replace the search active bar with a corner overlay**

Remove the entire "Search active bar" block (lines 694-727, the `{(searchResults || projecting) && (` section).

In the 3D plot container (`<div className="flex-1 relative">`, around line 732), after the `{projecting && (` overlay and before the `<EmbeddingViz>` component, add the corner toggle:

```tsx
          {/* Filter toggle — bottom-left corner */}
          {filteredIds && (
            <div className="absolute bottom-3 left-3 z-20 flex items-center gap-1.5 bg-(--color-surface)/95 backdrop-blur-sm rounded-(--radius-sm) border border-(--color-border) px-2 py-1.5 shadow-sm">
              <div className="flex items-center gap-0.5 bg-(--color-bg-secondary) rounded p-0.5">
                <button
                  type="button"
                  onClick={() => setFilterMode("show")}
                  className={`text-[10px] px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                    filterMode === "show"
                      ? "bg-(--color-accent) text-(--color-text-inverse)"
                      : "text-(--color-text-secondary) hover:text-(--color-text)"
                  }`}
                >
                  Show all
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode("hide")}
                  className={`text-[10px] px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                    filterMode === "hide"
                      ? "bg-(--color-accent) text-(--color-text-inverse)"
                      : "text-(--color-text-secondary) hover:text-(--color-text)"
                  }`}
                >
                  Filter only
                </button>
              </div>
              <span className="text-[10px] text-(--color-text-tertiary)">
                {searchResults
                  ? `${filteredIds.size} results`
                  : activeFilter ?? ""}
              </span>
              {searchResults && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="text-[10px] text-(--color-text-tertiary) hover:text-(--color-text) cursor-pointer ml-1"
                >
                  ✕
                </button>
              )}
            </div>
          )}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/pages/Visualizer.tsx
git commit -m "feat: add corner filter toggle overlay, remove search active bar"
```

---

### Task 4: Rename visualizer toolbar labels

**Files:**
- Modify: `web/src/pages/Visualizer.tsx`

- [ ] **Step 1: Update the pipeline toggle labels**

Replace the pipeline toggle array (lines 600-606) with:

```ts
            {([
              { value: "project", label: "Embed Query" },
              { value: "keyword", label: "Keyword" },
              { value: "semantic", label: "Semantic" },
              { value: "hybrid", label: "Hybrid" },
              { value: "natural", label: "Natural" },
            ] as { value: typeof searchMode; label: string }[]).map((opt) => (
```

- [ ] **Step 2: Update the search button and placeholder text**

Replace the search button text (line 638):

```tsx
            {projecting ? "..." : searchMode === "project" ? "Embed" : "Search"}
```

Replace the input placeholder (line 628):

```tsx
            placeholder={searchMode === "project" ? "Embed a query into vector space..." : "Search and visualize..."}
```

- [ ] **Step 3: Commit**

```bash
git add web/src/pages/Visualizer.tsx
git commit -m "feat: use full pipeline names in visualizer toolbar"
```

---

### Task 5: Consistent nav across all pages

**Files:**
- Modify: `web/src/components/Nav.tsx`
- Modify: `web/src/components/Layout.tsx`
- Modify: `web/src/pages/Main.tsx`

- [ ] **Step 1: Update Nav.tsx — always show section links**

Replace the entire `Nav.tsx` with:

```tsx
import { motion } from "motion/react";
import { useNavigate, useLocation } from "react-router";
import { useTheme } from "../theme/ThemeProvider";

const SECTION_LINKS = [
  { label: "Intro", hash: "intro" },
  { label: "Keyword", hash: "keyword" },
  { label: "Semantic", hash: "semantic" },
  { label: "Hybrid", hash: "hybrid" },
  { label: "NL", hash: "nl" },
];

interface NavProps {
  visible?: boolean;
  onNavigate?: (sectionIndex: number) => void;
}

export function Nav({ visible = true, onNavigate }: NavProps) {
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const isHome = pathname === "/";

  function handleSectionClick(index: number, hash: string) {
    if (isHome && onNavigate) {
      // On homepage — scroll directly
      onNavigate(index);
    } else {
      // On other pages — navigate to homepage with hash
      navigate(`/#${hash}`);
    }
  }

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: visible ? 0 : -60 }}
      transition={{ duration: 0.3 }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-(--color-border) bg-(--color-bg)/95 backdrop-blur-sm"
    >
      <nav className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <button
          type="button"
          onClick={() => handleSectionClick(0, "intro")}
          className="text-base font-semibold text-(--color-text) bg-transparent border-none cursor-pointer"
          style={{ fontFamily: "inherit" }}
        >
          Lyric<span className="text-(--color-text-secondary)">Lens</span>
        </button>

        {/* Section links + page links */}
        <div className="flex items-center gap-6">
          {SECTION_LINKS.map((link, i) => (
            <button
              key={link.label}
              type="button"
              onClick={() => handleSectionClick(i, link.hash)}
              className="text-xs text-(--color-text-tertiary) hover:text-(--color-text-secondary) transition-colors bg-transparent border-none cursor-pointer"
              style={{ fontFamily: "inherit" }}
            >
              {link.label}
            </button>
          ))}
          <a
            href="/deep-dive"
            className="text-xs text-(--color-text-secondary) hover:text-(--color-text) transition-colors"
          >
            Deep Dive →
          </a>
          <a
            href="/visualizer"
            className="text-xs text-(--color-text-secondary) hover:text-(--color-text) transition-colors"
          >
            Vector Map
          </a>

          {/* Theme toggle */}
          <button
            type="button"
            onClick={toggle}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-(--color-bg-secondary) transition-colors text-(--color-text-tertiary) bg-transparent border-none cursor-pointer"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="8" cy="8" r="3" />
                <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M13.5 8.5a5.5 5.5 0 01-7-7 5.5 5.5 0 107 7z" />
              </svg>
            )}
          </button>
        </div>
      </nav>
    </motion.header>
  );
}
```

Key change: removed the `isHome` guard on section links. Added `hash` to each link. Non-home pages navigate to `/#hash`.

- [ ] **Step 2: Update Layout.tsx — always render Nav**

Replace the entire `Layout.tsx` with:

```tsx
import { Outlet } from "react-router";
import { Nav } from "./Nav";

export function Layout() {
  return (
    <>
      <Nav />
      <main>
        <Outlet />
      </main>
    </>
  );
}
```

Removed the `isMain` conditional — Nav always renders. The homepage's own Nav will override via its `visible` prop and `onNavigate` handler.

Wait — this creates a problem. The homepage renders its own `<Nav visible={navVisible} onNavigate={scrollToSection} />` AND Layout also renders `<Nav />`. We'd get two navbars.

Instead, Layout should NOT render Nav for the homepage, but the homepage should use the same Nav with its scroll handler. Let's keep the current approach: Layout renders Nav for non-home pages, homepage renders its own.

Revised Layout.tsx:

```tsx
import { Outlet, useLocation } from "react-router";
import { Nav } from "./Nav";

export function Layout() {
  const { pathname } = useLocation();
  const isMain = pathname === "/";

  return (
    <>
      {!isMain && <Nav />}
      <main>
        <Outlet />
      </main>
    </>
  );
}
```

This is actually unchanged from current. The Nav changes in Step 1 handle everything — on non-home pages, section links navigate to `/#hash`. No Layout change needed.

- [ ] **Step 3: Handle hash navigation on homepage mount**

In `web/src/pages/Main.tsx`, add a `useEffect` to handle incoming hash navigation. Add after the existing `useEffect` or at the top of the `Main` component, after `useSnapScroll`:

```ts
  // Handle hash navigation from other pages (e.g. /#keyword)
  useEffect(() => {
    const hash = window.location.hash.slice(1); // remove #
    if (!hash) return;
    const HASH_TO_INDEX: Record<string, number> = {
      intro: 0, keyword: 1, semantic: 2, hybrid: 3, nl: 4, search: 5,
    };
    const index = HASH_TO_INDEX[hash];
    if (index != null) {
      // Small delay to let sections mount
      setTimeout(() => scrollToSection(index), 100);
      // Clean up the hash
      window.history.replaceState(null, "", "/");
    }
  }, [scrollToSection]);
```

Add `useEffect` to the existing import if not already there (line 1 already imports it via `useRef` — check and add `useEffect`):

The current import is:
```ts
import { useState, useRef, useCallback } from "react";
```

Update to:
```ts
import { useState, useRef, useCallback, useEffect } from "react";
```

- [ ] **Step 4: Commit**

```bash
git add web/src/components/Nav.tsx web/src/pages/Main.tsx
git commit -m "feat: consistent nav across all pages, section links always visible"
```

---

### Task 6: Visual verification

- [ ] **Step 1: Test filter simplification**

Open `http://localhost:5200/visualizer`:

1. Click a genre legend chip (e.g. "Rock") — points should filter. Toggle "Show all" / "Filter only" in bottom-left corner.
2. Type a search query and run it — legend filter should clear, search filter should apply. Corner overlay should show result count.
3. Click a search result node — neighbors highlight. Click a neighbor outside the filter — filter should clear, back to full view.
4. Click a legend chip while search results are showing — search should clear, legend filter should apply.

- [ ] **Step 2: Test nav consistency**

1. From the Visualizer, click "Keyword" in the nav — should navigate to homepage and scroll to the Keyword section.
2. From the Deep Dive, click "Semantic" — should navigate to homepage and scroll to Semantic section.
3. On the homepage, click "Keyword" — should scroll to Keyword section (existing behaviour).

- [ ] **Step 3: Test toolbar labels**

Verify the pipeline toggle shows: "Embed Query", "Keyword", "Semantic", "Hybrid", "Natural" with no text overflow.

- [ ] **Step 4: Run typecheck**

Run: `cd "c:/Users/Jamie/Documents/Ai Dev Tools/Portfolio/Lyric-Lens/web" && bun run typecheck`
Expected: No new errors (pre-existing EmbeddingViz Plotly type errors are known)
