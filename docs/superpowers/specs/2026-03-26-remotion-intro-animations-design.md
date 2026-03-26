# LyricLens — Remotion Intro Animations

## Overview

Replace the current Hero + PipelineSection with a snap-scroll page flow featuring 4 Remotion `<Player>` animations, one per search mode. The animations demonstrate how each RAG retrieval method processes the same query, using a hybrid narrative (one throughline query, four lenses) with each mode also getting a hero moment.

## Page Structure

6 full-viewport snap-scroll sections:

| Section | Content | Scroll behavior |
|---------|---------|-----------------|
| 1 — Intro | Static hero: title, copy, tech badges, CTAs | `scroll-snap-align: start`, `100vh` |
| 2 — Keyword | Remotion Player, auto-plays on snap | `scroll-snap-align: start`, `100vh` |
| 3 — Semantic | Remotion Player, auto-plays on snap | `scroll-snap-align: start`, `100vh` |
| 4 — Hybrid | Remotion Player, auto-plays on snap | `scroll-snap-align: start`, `100vh` |
| 5 — Natural Language | Remotion Player, auto-plays on snap | `scroll-snap-align: start`, `100vh` |
| 6 — Search | Live search interface, sticky nav reveals | `scroll-snap-align: start`, internal scroll |

### Intro Section

- Title: `Lyric` + `Lens` (Lens in secondary color, matching existing brand)
- Copy: "Welcome to LyricLens — this application demonstrates different methods of RAG retrieval and the relative merits of each depending on your use case."
- Tech stack badges (portfolio-style, listing tools used): React, TypeScript, Bun, Hono, Qdrant, Python, Remotion, Tailwind
- Two CTAs: "Scroll to explore" (primary) and "Skip to search" (understated underlined text)
- Scroll indicator at bottom

### Animation Sections

Each section is full viewport (`100vh`) with:
- Colored number badge (28px circle, mode accent color, white number text) centered at the top of the section as a header element
- Mode name below the badge
- Remotion `<Player>` filling the remaining viewport space
- Subtle "Skip to search ↓" bottom-right

### Condensed Summary

Between the last animation section and the search section, a brief static reference row showing all 4 modes with one-line descriptions. Acts as a legend for the search columns. Part of the search section's top area, visible after the nav reveals.

### Search Section

- Sticky nav fades in via Motion when this section enters viewport
- Nav links: Intro, Keyword, Semantic, Hybrid, NL, Deep Dive →
- Existing search UI: search bar, query chips, agentic summary, 4-column results
- Normal scrolling within this section for results

## Visual Design

### Brand Language
- Monochrome surfaces: `--color-bg` (#0f0f0f dark / #fff light), `--color-border` (#333 / #e0e0e0)
- Mode colors used only as accents via number badges: Keyword #e65100, Semantic #1565c0, Hybrid #6a1b9a, NL #2e7d32
- Typography: Inter for body, JetBrains Mono for code/queries
- Editorial style: small-caps tracking for labels, bold headings, subtle borders
- No saturated color backgrounds, no colored dots/bullets

### Mode Color Treatment
Color appears only through the number badge at the top of each animation section — a 28px circle in the mode's accent color with white number text. All other surfaces stay monochrome. The same badge style carries through to the condensed summary and search column headers for visual continuity.

## Animation Design

### Remotion Integration
- Package: `@remotion/player` only (no CLI, no server-side rendering)
- 4 independent Remotion compositions, one per search mode
- 30fps, duration derived from act timings (~240–300 frames per composition)
- Each composition receives props from `animation-content.ts` data file
- Compositions are pure renderers — no data fetching
- Animations must respect theme: read CSS custom properties for colors, so they work in both light and dark mode

### Data File (`animation-content.ts`)
Defines per-mode:
- Throughline query text
- Bonus "hero" query where this mode wins
- Example result songs (title, artist, year)
- Strength/limitation callout copy
- Pipeline step labels

Dev default: "baby in the title from the 60s" as the working example across all modes.

Content is placeholder — designed to be swapped once search is finalized.

### Animation Structure (3-act, ~8-10s each)

**Act 1 — Query enters (~2s)**
Query text appears, then visually breaks apart into the components that mode cares about.

**Act 2 — Pipeline processes (~4s)**
Core mechanic animated:

| Mode | Act 2 visualization |
|------|-------------------|
| Keyword | Words split into tokens, scan against a list, matches light up |
| Semantic | Query collapses into a point in vector space, nearby songs pull in by similarity |
| Hybrid | Query splits into structured filters (left) + semantic text (right), filters narrow the pool, vectors rank remainder |
| NL | Query goes to LLM box, structured JSON comes out, then hybrid pipeline runs on LLM-derived filters |

**Act 3 — Results + verdict (~3s)**
Example results appear with a one-line callout:

| Mode | Verdict tone |
|------|-------------|
| Keyword | "Fast and literal — if the words are there, it finds them" |
| Semantic | "Finds the feeling — but can't filter by facts" |
| Hybrid | "Best of both — limited by what the parser understands" |
| NL | "Understands anything — at the cost of latency" |

### Auto-play Behavior
- IntersectionObserver on each animation section (threshold ~0.6)
- When ≥60% visible → `player.play()`
- When leaves viewport → `player.pause()` + `player.seekTo(0)` (resets for re-entry)

## Navigation & Scroll Mechanics

### Snap Scroll
- Outer container: `scroll-snap-type: y mandatory`
- Sections 1–5: `height: 100vh`, `scroll-snap-align: start`, `overflow: hidden`
- Section 6: `scroll-snap-align: start`, allows internal scrolling

### Keyboard Navigation
- `ArrowDown` / `ArrowRight` → scroll to next section
- `ArrowUp` / `ArrowLeft` → scroll to previous section
- Tracked via IntersectionObserver (threshold ~0.6) maintaining current section index
- `scrollTo` with `behavior: smooth`

### Skip Buttons
- Intro: prominent "Skip to search" CTA
- Animation sections 2–5: subtle "Skip to search ↓" bottom-right
- All skip actions scroll to section 6

### Sticky Nav
- Hidden during sections 1–5
- Fades in (Motion animation) when section 6 enters viewport
- Links: Intro, Keyword, Semantic, Hybrid, NL (scroll to respective sections), Deep Dive (route to `/deep-dive`)
- Section jump links use same `scrollTo` smooth behavior

## File Structure

### New Files
```
web/src/
├── components/
│   └── animations/
│       ├── animation-content.ts       ← data: queries, results, copy per mode
│       ├── KeywordAnimation.tsx        ← Remotion composition
│       ├── SemanticAnimation.tsx
│       ├── HybridAnimation.tsx
│       ├── NLAnimation.tsx
│       ├── AnimationSection.tsx        ← wrapper: Player + observer + skip
│       └── shared/
│           ├── QueryEntry.tsx          ← act 1: query appears + breaks apart
│           └── ResultsReveal.tsx       ← act 3: results + verdict
├── hooks/
│   └── useSnapScroll.ts               ← keyboard nav + section tracking
```

### Modified Files
- `Main.tsx` — restructured into snap container with 6 sections
- `Nav.tsx` — conditional visibility, section jump links added
- `index.css` — snap scroll CSS properties

### Removed Files
- `pages/HowItWorks.tsx` — replaced by animation sections
- `components/how-it-works/QueryDecomposition.tsx`
- `components/how-it-works/TheFunnel.tsx`
- `components/how-it-works/EmbeddingMoment.tsx`
- `components/how-it-works/ModeComparison.tsx`

### New Dependencies
- `@remotion/player` — Remotion Player component (browser-only, no CLI)

## Technical Approach

CSS Scroll Snap + Remotion Player + IntersectionObserver:
- Native CSS scroll-snap handles snap behavior (no scroll-hijacking library)
- IntersectionObserver triggers Remotion Player play/pause
- Motion (already installed) handles nav reveal and supplementary transitions
- Keyboard listener on snap container for arrow key navigation
