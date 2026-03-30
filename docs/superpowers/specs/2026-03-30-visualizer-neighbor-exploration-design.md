# Visualizer: Continuous Neighbor Exploration

**Date:** 2026-03-30
**Status:** Approved

---

## Problem

When you select a node in the 3D vector map, the side panel shows its 5 nearest neighbors. Clicking a neighbor navigates to it (camera pans, side panel updates). But the 3D visualization doesn't highlight the new node's neighbors — you can't see where they are in the cloud. This breaks the exploration flow: the side panel says "here are the neighbors" but you can't visually locate them.

## Goal

When a node is selected, highlight its nearest neighbors in the 3D visualization so the user can visually trace relationships and continuously explore the vector space.

## Design

### Visual treatment

When a node is selected, its neighbors (listed in the side panel) get a distinct visual treatment in the 3D graph:

- **Neighbor markers**: Slightly larger than normal points (7px vs 5px), with a subtle colored ring (use the selected node's emotion color at reduced opacity)
- **Selected node**: Keeps its existing treatment (10px, white ring)
- **Everything else**: Unchanged (bright or dimmed depending on current filter state)

No connecting lines between selected node and neighbors — that clutters the view and Plotly GL3D line rendering is expensive. The size + ring treatment is enough to spot them.

### State flow

1. User clicks a node (or neighbor button) → `handleSelect(point)` fires
2. `selected` state updates → side panel shows new node's details + neighbors
3. New derived state: `neighborIds = new Set(selected.neighbors.map(n => n.id))`
4. `EmbeddingViz` receives `neighborIds` as a prop
5. Trace builder creates an additional "neighbors" trace for points whose ID is in `neighborIds`
6. These points render with the neighbor visual treatment (larger, colored ring)

### Props change

`EmbeddingViz` currently receives `selectedId: string | null`. Add:

```ts
neighborIds?: Set<string> | null  // IDs of selected node's neighbors to highlight
```

### Trace addition

Add a "Neighbors" trace after the existing bright/dimmed/highlighted traces. Points in `neighborIds` get pulled out of the bright or dimmed sets and rendered in the neighbor trace instead. This ensures they're always visible regardless of emotion filter state.

### No API changes

All neighbor data is already precomputed in the `VizPoint.neighbors` array. This is purely a frontend visualization change.

## Files changed

| File | Change |
|------|--------|
| `web/src/pages/Visualizer.tsx` | Compute `neighborIds` from `selected.neighbors`, pass to `EmbeddingViz` |
| `web/src/components/EmbeddingViz.tsx` | Accept `neighborIds` prop, add neighbor trace in trace builder |

## Out of scope

- Connecting lines between nodes
- Neighbor similarity percentage labels in 3D space
- Changing the precomputed neighbor count (stays at 5)
- Any server/API changes
