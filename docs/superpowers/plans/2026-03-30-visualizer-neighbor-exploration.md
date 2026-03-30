# Visualizer Neighbor Exploration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Highlight a selected node's nearest neighbors in the 3D vector map so users can visually trace relationships and continuously explore.

**Architecture:** Pass `neighborIds` set from Visualizer → EmbeddingViz. The trace builder pulls neighbor points into a dedicated "Neighbors" trace with larger markers and a colored ring. Pure frontend — no API changes.

**Tech Stack:** React, Plotly GL3D, TypeScript

**Spec:** `docs/superpowers/specs/2026-03-30-visualizer-neighbor-exploration-design.md`

---

## File Map

| File | Responsibility | Change |
|------|---------------|--------|
| `web/src/pages/Visualizer.tsx` | Main page state + handlers | Compute `neighborIds` from `selected.neighbors`, pass as prop |
| `web/src/components/EmbeddingViz.tsx` | 3D scatter plot rendering | Accept `neighborIds` prop, add neighbor trace |

---

### Task 1: Pass `neighborIds` from Visualizer to EmbeddingViz

**Files:**
- Modify: `web/src/pages/Visualizer.tsx`

- [ ] **Step 1: Add neighborIds memo**

In `Visualizer.tsx`, add a `useMemo` after the existing `highlightedIds` memo (around line 519). Place it before the `handleSearch` function:

```ts
  const neighborIds = useMemo(() => {
    if (!selected?.neighbors?.length) return null;
    return new Set(selected.neighbors.map((n) => n.id));
  }, [selected]);
```

- [ ] **Step 2: Pass neighborIds to EmbeddingViz**

In the `<EmbeddingViz>` JSX (around line 733), add the prop:

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
              dimmedIds={dimmedIds}
              highlightedIds={highlightedIds}
              hideNonHighlighted={!showAllPoints}
              focusPoint={focusPoint}
              neighborIds={neighborIds}
            />
```

- [ ] **Step 3: Commit**

```bash
git add web/src/pages/Visualizer.tsx
git commit -m "feat: compute neighborIds and pass to EmbeddingViz"
```

---

### Task 2: Add neighbor trace to EmbeddingViz

**Files:**
- Modify: `web/src/components/EmbeddingViz.tsx`

- [ ] **Step 1: Add `neighborIds` to Props interface**

In `EmbeddingViz.tsx`, update the `Props` interface (around line 12):

```ts
interface Props {
  points: VizPoint[];
  onSelect: (point: VizPoint) => void;
  selectedId?: string;
  projectedPoint?: { x: number; y: number; z: number; label: string } | null;
  dimmedIds?: Set<string> | null;
  highlightedIds?: Set<string> | null;
  hideNonHighlighted?: boolean;
  focusPoint?: { x: number; y: number; z: number } | null;
  neighborIds?: Set<string> | null;
}
```

- [ ] **Step 2: Destructure the new prop**

Update the component signature (line 47):

```ts
export function EmbeddingViz({ points, onSelect, selectedId, projectedPoint, dimmedIds, highlightedIds, hideNonHighlighted, focusPoint, neighborIds }: Props) {
```

- [ ] **Step 3: Add neighbor sorting in trace builder**

In the `useMemo` that builds traces (starting at line 144), add `neighborIds` to the categorization loop and the dependency array.

Replace the existing point categorization block (lines 144-163):

```ts
  const { traces } = useMemo(() => {
    const hasDimming = dimmedIds != null && dimmedIds.size > 0;
    const hasHighlighting = highlightedIds != null && highlightedIds.size > 0;
    const hasNeighbors = neighborIds != null && neighborIds.size > 0;

    const bright: VizPoint[] = [];
    const dimmed: VizPoint[] = [];
    const highlighted: VizPoint[] = [];
    const neighbors: VizPoint[] = [];

    for (const p of points) {
      if (hasHighlighting && highlightedIds.has(p.id)) {
        highlighted.push(p);
      } else if (hasNeighbors && neighborIds.has(p.id)) {
        neighbors.push(p);
      } else if (hasDimming && dimmedIds.has(p.id)) {
        dimmed.push(p);
      } else if (hasHighlighting) {
        if (!hideNonHighlighted) dimmed.push(p);
      } else {
        bright.push(p);
      }
    }
```

- [ ] **Step 4: Add the neighbor trace**

After the dimmed trace block (after line 216) and before the search result highlights block, add:

```ts
    // Neighbor highlights — medium size, colored ring matching their emotion
    if (neighbors.length > 0) {
      traces.push({
        type: "scatter3d" as const,
        mode: "markers" as const,
        name: "Neighbors",
        x: neighbors.map((p) => p.x),
        y: neighbors.map((p) => p.y),
        z: neighbors.map((p) => p.z),
        text: neighbors.map((p) => `${p.title} — ${p.artist} (neighbor)`),
        customdata: neighbors.map((p) => p.id),
        hovertemplate: "%{text}<extra>Neighbor</extra>",
        marker: {
          size: 7,
          color: neighbors.map((p) => EMOTION_COLORS[p.dominantEmotion?.toLowerCase()] ?? "#888888"),
          opacity: 0.95,
          line: {
            width: 1.5,
            color: neighbors.map((p) => EMOTION_COLORS[p.dominantEmotion?.toLowerCase()] ?? "#888888"),
          },
        },
      } as Plotly.Data);
    }
```

- [ ] **Step 5: Update the useMemo dependency array**

Update the dependency array of the trace builder useMemo (line 281) to include `neighborIds`:

```ts
  }, [points, dimmedIds, highlightedIds, hideNonHighlighted, selectedId, projectedPoint, selectedPoint, neighborIds]);
```

- [ ] **Step 6: Run typecheck**

Run: `cd "c:/Users/Jamie/Documents/Ai Dev Tools/Portfolio/Lyric-Lens" && cd web && bun run typecheck`
Expected: No new errors (pre-existing EmbeddingViz Plotly type errors are known)

- [ ] **Step 7: Commit**

```bash
git add web/src/components/EmbeddingViz.tsx
git commit -m "feat: highlight nearest neighbors in 3D vector map"
```

---

### Task 3: Visual verification

- [ ] **Step 1: Open the vector map in browser**

Navigate to `http://localhost:5200/vector-map` (or wherever the visualizer route is).

- [ ] **Step 2: Click a node and verify neighbors are highlighted**

Click any point in the 3D graph. Verify:
- Side panel shows the node's details + 5 nearest neighbors
- The 5 neighbors are visually distinct in the 3D graph (7px markers with colored ring)
- The selected node has its existing treatment (10px, white ring)
- Other points remain at normal size

- [ ] **Step 3: Click a neighbor and verify chain exploration**

Click one of the listed neighbors in the side panel. Verify:
- Camera pans to the new node
- Side panel updates to show the new node's details + ITS neighbors
- The 3D graph updates: old neighbors return to normal, new neighbors get highlighted
- Continuous exploration works — can keep clicking neighbors indefinitely
