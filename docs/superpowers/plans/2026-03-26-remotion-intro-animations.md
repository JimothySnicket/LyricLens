# Remotion Intro Animations — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static Hero + PipelineSection with a snap-scroll page featuring 4 Remotion Player animations (one per search mode) that auto-play on scroll, with keyboard navigation and a sticky nav that reveals at the search section.

**Architecture:** CSS scroll-snap container with 6 full-viewport sections. Each animation section wraps a Remotion `<Player>` component triggered by IntersectionObserver. Animation content is data-driven via a single `animation-content.ts` file. The existing search section is preserved as section 6.

**Tech Stack:** Remotion Player (`@remotion/player` + `remotion`), CSS scroll-snap, IntersectionObserver, Motion (existing) for nav transitions.

**Spec:** `docs/superpowers/specs/2026-03-26-remotion-intro-animations-design.md`

---

### Task 1: Install Remotion dependencies

**Files:**
- Modify: `web/package.json`

- [ ] **Step 1: Install packages**

```bash
cd web && bun add @remotion/player remotion
```

- [ ] **Step 2: Verify installation and React 19 compatibility**

```bash
cd web && bun run typecheck
```

If there are React version conflicts, install the latest Remotion version that supports React 19:
```bash
cd web && bun add @remotion/player@latest remotion@latest
```

- [ ] **Step 3: Commit**

```bash
git add web/package.json web/bun.lock
git commit -m "chore: add @remotion/player and remotion dependencies"
```

---

### Task 2: Add `--color-mode-natural` CSS variable

**Files:**
- Modify: `web/src/index.css`

The existing CSS defines `--color-mode-keyword`, `--color-mode-semantic`, `--color-mode-hybrid` but not natural. The green #2e7d32 is used inline only.

- [ ] **Step 1: Add the variable to the @theme block**

In `web/src/index.css`, after `--color-mode-hybrid: #6a1b9a;` (line 32), add:

```css
  --color-mode-natural: #2e7d32;
```

- [ ] **Step 2: Verify typecheck still passes**

```bash
cd web && bun run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add web/src/index.css
git commit -m "chore: add --color-mode-natural CSS variable"
```

---

### Task 3: Create animation data file

**Files:**
- Create: `web/src/components/animations/animation-content.ts`

This file defines all text, queries, results, and copy for each animation. Dev default uses "baby in the title from the 60s".

- [ ] **Step 1: Create the data file**

```typescript
// web/src/components/animations/animation-content.ts

export interface AnimationResult {
  title: string;
  artist: string;
  year: number;
}

export interface ModeAnimationContent {
  id: string;
  num: string;
  label: string;
  desc: string;
  cssVar: string;
  fallbackColor: string;
  query: string;
  heroQuery: string;
  pipelineSteps: string[];
  results: AnimationResult[];
  verdict: string;
}

export const animationContent: Record<string, ModeAnimationContent> = {
  keyword: {
    id: "keyword",
    num: "01",
    label: "Keyword Search",
    desc: "Regex + exact matching",
    cssVar: "--color-mode-keyword",
    fallbackColor: "#e65100",
    query: "baby in the title from the 60s",
    heroQuery: "baby in the title from the 60s",
    pipelineSteps: [
      "Parse query into tokens",
      "Remove stop words",
      "Match against title, lyrics, artist",
      "Score by match weight",
    ],
    results: [
      { title: "Baby Love", artist: "The Supremes", year: 1964 },
      { title: "Be My Baby", artist: "The Ronettes", year: 1963 },
      { title: "Baby It's You", artist: "The Shirelles", year: 1962 },
    ],
    verdict: "Fast and literal — if the words are there, it finds them.",
  },
  semantic: {
    id: "semantic",
    num: "02",
    label: "Semantic Search",
    desc: "Vector similarity",
    cssVar: "--color-mode-semantic",
    fallbackColor: "#1565c0",
    query: "baby in the title from the 60s",
    heroQuery: "songs that feel like driving at night",
    pipelineSteps: [
      "Embed query with MiniLM",
      "Search summary vectors in Qdrant",
      "Rank by cosine similarity",
      "Return nearest neighbors",
    ],
    results: [
      { title: "You've Lost That Lovin' Feeling", artist: "The Righteous Brothers", year: 1965 },
      { title: "My Girl", artist: "The Temptations", year: 1965 },
      { title: "Stand By Me", artist: "Ben E. King", year: 1961 },
    ],
    verdict: "Finds the feeling — but can't filter by facts.",
  },
  hybrid: {
    id: "hybrid",
    num: "03",
    label: "Hybrid Search",
    desc: "Filters + vectors",
    cssVar: "--color-mode-hybrid",
    fallbackColor: "#6a1b9a",
    query: "baby in the title from the 60s",
    heroQuery: "sad rock from the 80s",
    pipelineSteps: [
      "Parse → extract filters",
      "Apply as Qdrant constraints",
      "Embed remaining text",
      "Vector search within filtered set",
    ],
    results: [
      { title: "Baby Love", artist: "The Supremes", year: 1964 },
      { title: "Be My Baby", artist: "The Ronettes", year: 1963 },
      { title: "Maybe Baby", artist: "Buddy Holly", year: 1958 },
    ],
    verdict: "Best of both — limited by what the parser understands.",
  },
  natural: {
    id: "natural",
    num: "04",
    label: "Natural Language",
    desc: "LLM + vectors",
    cssVar: "--color-mode-natural",
    fallbackColor: "#2e7d32",
    query: "baby in the title from the 60s",
    heroQuery: "old songs about missing home",
    pipelineSteps: [
      "Send query to DeepSeek",
      "LLM returns structured JSON",
      "Validate + fallback to regex",
      "Vector search with LLM filters",
    ],
    results: [
      { title: "Baby Love", artist: "The Supremes", year: 1964 },
      { title: "Be My Baby", artist: "The Ronettes", year: 1963 },
      { title: "Baby It's You", artist: "The Shirelles", year: 1962 },
    ],
    verdict: "Understands anything — at the cost of latency.",
  },
};

export const ANIMATION_FPS = 30;
export const ANIMATION_DURATION_FRAMES = 300; // 10s at 30fps

// Act boundaries in frames
export const ACT_1_END = 60;   // 0–2s: query enters
export const ACT_2_END = 180;  // 2–6s: pipeline processes
export const ACT_3_END = 270;  // 6–9s: results + verdict
// 9–10s: hold / outro
```

- [ ] **Step 2: Verify typecheck**

```bash
cd web && bun run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add web/src/components/animations/animation-content.ts
git commit -m "feat: add animation content data file with dev defaults"
```

---

### Task 4: Create `useSnapScroll` hook

**Files:**
- Create: `web/src/hooks/useSnapScroll.ts`

Handles keyboard navigation and tracks which section is currently visible.

- [ ] **Step 1: Create the hook**

```typescript
// web/src/hooks/useSnapScroll.ts

import { useEffect, useRef, useState, useCallback } from "react";

export interface UseSnapScrollOptions {
  /** Total number of sections */
  sectionCount: number;
  /** IntersectionObserver threshold for "active" section */
  threshold?: number;
}

export function useSnapScroll({ sectionCount, threshold = 0.6 }: UseSnapScrollOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  const setSectionRef = useCallback((index: number) => (el: HTMLElement | null) => {
    sectionRefs.current[index] = el;
  }, []);

  const scrollToSection = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(index, sectionCount - 1));
    const section = sectionRefs.current[clamped];
    if (section) {
      section.scrollIntoView({ behavior: "smooth" });
    }
  }, [sectionCount]);

  // IntersectionObserver to track active section
  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    sectionRefs.current.forEach((section, index) => {
      if (!section) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveIndex(index);
          }
        },
        { threshold }
      );

      observer.observe(section);
      observers.push(observer);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, [threshold, sectionCount]);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't capture when user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        setActiveIndex((prev) => {
          const next = Math.min(prev + 1, sectionCount - 1);
          scrollToSection(next);
          return next;
        });
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        setActiveIndex((prev) => {
          const next = Math.max(prev - 1, 0);
          scrollToSection(next);
          return next;
        });
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [sectionCount, scrollToSection]);

  return {
    containerRef,
    setSectionRef,
    activeIndex,
    scrollToSection,
  };
}
```

- [ ] **Step 2: Verify typecheck**

```bash
cd web && bun run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add web/src/hooks/useSnapScroll.ts
git commit -m "feat: add useSnapScroll hook for keyboard nav and section tracking"
```

---

### Task 5: Create shared animation primitives

**Files:**
- Create: `web/src/components/animations/shared/QueryEntry.tsx`
- Create: `web/src/components/animations/shared/ResultsReveal.tsx`

These are Remotion sub-compositions used by all 4 animations.

- [ ] **Step 1: Create QueryEntry (Act 1)**

This component shows the query text appearing, then words highlighting/separating.

```tsx
// web/src/components/animations/shared/QueryEntry.tsx

import { interpolate, useCurrentFrame } from "remotion";
import { ACT_1_END } from "../animation-content";

interface QueryEntryProps {
  query: string;
  accentColor: string;
}

export function QueryEntry({ query, accentColor }: QueryEntryProps) {
  const frame = useCurrentFrame();
  const words = query.split(" ");

  // Entire query fades in over first 20 frames
  const textOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Words start highlighting after frame 30
  const highlightProgress = interpolate(frame, [30, ACT_1_END], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        opacity: textOpacity,
      }}
    >
      <div
        style={{
          fontSize: 14,
          letterSpacing: 3,
          textTransform: "uppercase" as const,
          color: "var(--color-text-tertiary)",
          marginBottom: 16,
        }}
      >
        Query
      </div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          justifyContent: "center",
          maxWidth: 600,
        }}
      >
        {words.map((word, i) => {
          const wordDelay = i / words.length;
          const isHighlighted = highlightProgress > wordDelay;

          return (
            <span
              key={i}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 28,
                fontWeight: 600,
                padding: "4px 12px",
                borderRadius: 6,
                color: isHighlighted ? "white" : "var(--color-text)",
                backgroundColor: isHighlighted ? accentColor : "transparent",
                transition: "none",
              }}
            >
              {word}
            </span>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create ResultsReveal (Act 3)**

```tsx
// web/src/components/animations/shared/ResultsReveal.tsx

import { interpolate, useCurrentFrame } from "remotion";
import { ACT_2_END, ACT_3_END } from "../animation-content";
import type { AnimationResult } from "../animation-content";

interface ResultsRevealProps {
  results: AnimationResult[];
  verdict: string;
  accentColor: string;
}

export function ResultsReveal({ results, verdict, accentColor }: ResultsRevealProps) {
  const frame = useCurrentFrame();

  // Results fade in sequentially starting at ACT_2_END
  const resultsStart = ACT_2_END;
  const verdictStart = ACT_2_END + 50;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        gap: 16,
      }}
    >
      <div
        style={{
          fontSize: 14,
          letterSpacing: 3,
          textTransform: "uppercase" as const,
          color: "var(--color-text-tertiary)",
          marginBottom: 8,
        }}
      >
        Results
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 320 }}>
        {results.map((r, i) => {
          const delay = resultsStart + i * 12;
          const opacity = interpolate(frame, [delay, delay + 15], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const y = interpolate(frame, [delay, delay + 15], [20, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });

          return (
            <div
              key={i}
              style={{
                opacity,
                transform: `translateY(${y}px)`,
                padding: "12px 16px",
                borderRadius: 8,
                border: "1px solid var(--color-border)",
                backgroundColor: "var(--color-surface)",
              }}
            >
              <div style={{ fontSize: 16, fontWeight: 600, color: "var(--color-text)" }}>
                {r.title}
              </div>
              <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 2 }}>
                {r.artist} · {r.year}
              </div>
            </div>
          );
        })}
      </div>

      {/* Verdict */}
      <div
        style={{
          opacity: interpolate(frame, [verdictStart, verdictStart + 20], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          marginTop: 16,
          fontSize: 15,
          fontStyle: "italic",
          color: "var(--color-text-secondary)",
          maxWidth: 400,
          textAlign: "center" as const,
        }}
      >
        {verdict}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify typecheck**

```bash
cd web && bun run typecheck
```

- [ ] **Step 4: Commit**

```bash
git add web/src/components/animations/shared/
git commit -m "feat: add shared Remotion primitives — QueryEntry and ResultsReveal"
```

---

### Task 6: Create KeywordAnimation composition

**Files:**
- Create: `web/src/components/animations/KeywordAnimation.tsx`

Act 2 for keyword: words split into tokens, scan against a list, matches light up.

- [ ] **Step 1: Create the composition**

```tsx
// web/src/components/animations/KeywordAnimation.tsx

import { AbsoluteFill, useCurrentFrame, interpolate, Sequence } from "remotion";
import type { ModeAnimationContent } from "./animation-content";
import { ACT_1_END, ACT_2_END, ANIMATION_DURATION_FRAMES } from "./animation-content";
import { QueryEntry } from "./shared/QueryEntry";
import { ResultsReveal } from "./shared/ResultsReveal";

interface Props {
  content: ModeAnimationContent;
}

export const KeywordAnimation: React.FC<Props> = ({ content }) => {
  const frame = useCurrentFrame();
  const color = `var(${content.cssVar}, ${content.fallbackColor})`;

  // Token scanning in act 2
  const tokens = content.query.split(/\s+/).filter((w) => !["in", "the", "from"].includes(w.toLowerCase()));
  const scanProgress = interpolate(frame, [ACT_1_END, ACT_2_END], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "var(--color-bg)",
        fontFamily: "var(--font-sans)",
      }}
    >
      {/* Act 1: Query enters */}
      <Sequence from={0} durationInFrames={ACT_1_END}>
        <AbsoluteFill>
          <QueryEntry query={content.query} accentColor={color} />
        </AbsoluteFill>
      </Sequence>

      {/* Act 2: Token matching */}
      <Sequence from={ACT_1_END} durationInFrames={ACT_2_END - ACT_1_END}>
        <AbsoluteFill
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 32,
          }}
        >
          {/* Pipeline steps */}
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {content.pipelineSteps.map((step, i) => {
              const stepProgress = interpolate(
                scanProgress,
                [i / content.pipelineSteps.length, (i + 0.5) / content.pipelineSteps.length],
                [0, 1],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
              );

              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      padding: "6px 14px",
                      borderRadius: 20,
                      border: `1px solid ${color}`,
                      fontSize: 12,
                      color: stepProgress > 0.5 ? "white" : color,
                      backgroundColor: stepProgress > 0.5 ? color : "transparent",
                      opacity: interpolate(stepProgress, [0, 0.3], [0.3, 1], {
                        extrapolateRight: "clamp",
                      }),
                    }}
                  >
                    {step}
                  </div>
                  {i < content.pipelineSteps.length - 1 && (
                    <span style={{ color: "var(--color-text-tertiary)", fontSize: 14 }}>→</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Token match visualization */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
            {tokens.map((token, i) => {
              const tokenDelay = i / tokens.length;
              const isMatched = scanProgress > tokenDelay + 0.3;

              return (
                <div
                  key={i}
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 20,
                    fontWeight: 600,
                    padding: "8px 16px",
                    borderRadius: 8,
                    border: `2px solid ${isMatched ? color : "var(--color-border)"}`,
                    color: isMatched ? color : "var(--color-text-tertiary)",
                    backgroundColor: isMatched
                      ? `color-mix(in srgb, ${content.fallbackColor} 10%, transparent)`
                      : "transparent",
                  }}
                >
                  {token}
                </div>
              );
            })}
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Act 3: Results */}
      <Sequence from={ACT_2_END} durationInFrames={ANIMATION_DURATION_FRAMES - ACT_2_END}>
        <AbsoluteFill>
          <ResultsReveal
            results={content.results}
            verdict={content.verdict}
            accentColor={color}
          />
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: Verify typecheck**

```bash
cd web && bun run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add web/src/components/animations/KeywordAnimation.tsx
git commit -m "feat: add Keyword search Remotion composition"
```

---

### Task 7: Create SemanticAnimation composition

**Files:**
- Create: `web/src/components/animations/SemanticAnimation.tsx`

Act 2 for semantic: query collapses into a point in vector space, nearby songs pull in.

- [ ] **Step 1: Create the composition**

```tsx
// web/src/components/animations/SemanticAnimation.tsx

import { AbsoluteFill, useCurrentFrame, interpolate, Sequence } from "remotion";
import type { ModeAnimationContent } from "./animation-content";
import { ACT_1_END, ACT_2_END, ANIMATION_DURATION_FRAMES } from "./animation-content";
import { QueryEntry } from "./shared/QueryEntry";
import { ResultsReveal } from "./shared/ResultsReveal";

interface Props {
  content: ModeAnimationContent;
}

// Pseudo-random positions for song dots (deterministic)
const SONG_DOTS = Array.from({ length: 24 }, (_, i) => ({
  x: 80 + ((i * 137) % 440),
  y: 60 + ((i * 97) % 280),
  isMatch: i < 3, // first 3 are matches
}));

const QUERY_POINT = { x: 300, y: 180 };

export const SemanticAnimation: React.FC<Props> = ({ content }) => {
  const frame = useCurrentFrame();
  const color = `var(${content.cssVar}, ${content.fallbackColor})`;

  const act2Frame = frame - ACT_1_END;
  const act2Duration = ACT_2_END - ACT_1_END;

  // Phase 1: query text shrinks to a point (0–30% of act 2)
  const collapseProgress = interpolate(act2Frame, [0, act2Duration * 0.3], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Phase 2: point enters song space, proximity lines draw (30–70%)
  const searchProgress = interpolate(act2Frame, [act2Duration * 0.3, act2Duration * 0.7], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Phase 3: matches highlight (70–100%)
  const highlightProgress = interpolate(act2Frame, [act2Duration * 0.7, act2Duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "var(--color-bg)",
        fontFamily: "var(--font-sans)",
      }}
    >
      {/* Act 1 */}
      <Sequence from={0} durationInFrames={ACT_1_END}>
        <AbsoluteFill>
          <QueryEntry query={content.query} accentColor={color} />
        </AbsoluteFill>
      </Sequence>

      {/* Act 2: Vector space visualization */}
      <Sequence from={ACT_1_END} durationInFrames={act2Duration}>
        <AbsoluteFill
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Pipeline steps at top */}
          <div style={{ display: "flex", gap: 12, marginBottom: 32 }}>
            {content.pipelineSteps.map((step, i) => {
              const stepOpacity = interpolate(
                act2Frame,
                [i * 20, i * 20 + 15],
                [0, 1],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
              );
              return (
                <div
                  key={i}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 20,
                    border: `1px solid ${color}`,
                    fontSize: 12,
                    color,
                    opacity: stepOpacity,
                  }}
                >
                  {step}
                </div>
              );
            })}
          </div>

          {/* Vector space */}
          <svg width={600} height={360} viewBox="0 0 600 360">
            {/* Song dots */}
            {SONG_DOTS.map((dot, i) => {
              const isHighlighted = dot.isMatch && highlightProgress > 0.3;
              const dotOpacity = interpolate(searchProgress, [0, 0.3], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });

              return (
                <g key={i}>
                  {/* Proximity line for matches */}
                  {dot.isMatch && searchProgress > 0.5 && (
                    <line
                      x1={QUERY_POINT.x}
                      y1={QUERY_POINT.y}
                      x2={dot.x}
                      y2={dot.y}
                      stroke={content.fallbackColor}
                      strokeWidth={1}
                      strokeDasharray="4 4"
                      opacity={highlightProgress * 0.5}
                    />
                  )}
                  <circle
                    cx={dot.x}
                    cy={dot.y}
                    r={isHighlighted ? 8 : 4}
                    fill={isHighlighted ? content.fallbackColor : "var(--color-text-tertiary)"}
                    opacity={isHighlighted ? 1 : dotOpacity * 0.3}
                  />
                </g>
              );
            })}

            {/* Query point */}
            {collapseProgress > 0.5 && (
              <circle
                cx={QUERY_POINT.x}
                cy={QUERY_POINT.y}
                r={interpolate(collapseProgress, [0.5, 1], [20, 8], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                })}
                fill={content.fallbackColor}
                opacity={0.9}
              />
            )}

            {/* Query label */}
            {collapseProgress > 0.8 && (
              <text
                x={QUERY_POINT.x}
                y={QUERY_POINT.y - 16}
                textAnchor="middle"
                fontSize={11}
                fill="var(--color-text-secondary)"
              >
                query vector
              </text>
            )}
          </svg>
        </AbsoluteFill>
      </Sequence>

      {/* Act 3 */}
      <Sequence from={ACT_2_END} durationInFrames={ANIMATION_DURATION_FRAMES - ACT_2_END}>
        <AbsoluteFill>
          <ResultsReveal
            results={content.results}
            verdict={content.verdict}
            accentColor={color}
          />
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: Verify typecheck**

```bash
cd web && bun run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add web/src/components/animations/SemanticAnimation.tsx
git commit -m "feat: add Semantic search Remotion composition"
```

---

### Task 8: Create HybridAnimation composition

**Files:**
- Create: `web/src/components/animations/HybridAnimation.tsx`

Act 2 for hybrid: query splits into filters (left) + semantic text (right), filters narrow pool, vectors rank remainder.

- [ ] **Step 1: Create the composition**

```tsx
// web/src/components/animations/HybridAnimation.tsx

import { AbsoluteFill, useCurrentFrame, interpolate, Sequence } from "remotion";
import type { ModeAnimationContent } from "./animation-content";
import { ACT_1_END, ACT_2_END, ANIMATION_DURATION_FRAMES } from "./animation-content";
import { QueryEntry } from "./shared/QueryEntry";
import { ResultsReveal } from "./shared/ResultsReveal";

interface Props {
  content: ModeAnimationContent;
}

export const HybridAnimation: React.FC<Props> = ({ content }) => {
  const frame = useCurrentFrame();
  const color = `var(${content.cssVar}, ${content.fallbackColor})`;

  const act2Frame = frame - ACT_1_END;
  const act2Duration = ACT_2_END - ACT_1_END;

  // Phase 1: split into filters vs semantic (0–25%)
  const splitProgress = interpolate(act2Frame, [0, act2Duration * 0.25], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Phase 2: filters narrow the pool (25–55%)
  const filterProgress = interpolate(act2Frame, [act2Duration * 0.25, act2Duration * 0.55], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Phase 3: vector ranking (55–100%)
  const rankProgress = interpolate(act2Frame, [act2Duration * 0.55, act2Duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Split query words into filter vs semantic
  const words = content.query.split(/\s+/);
  const filterWords = ["baby", "title", "60s"];
  const semanticWords = words.filter((w) => !filterWords.includes(w.toLowerCase()) && !["in", "the", "from"].includes(w.toLowerCase()));

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "var(--color-bg)",
        fontFamily: "var(--font-sans)",
      }}
    >
      {/* Act 1 */}
      <Sequence from={0} durationInFrames={ACT_1_END}>
        <AbsoluteFill>
          <QueryEntry query={content.query} accentColor={color} />
        </AbsoluteFill>
      </Sequence>

      {/* Act 2: Split + filter + rank */}
      <Sequence from={ACT_1_END} durationInFrames={act2Duration}>
        <AbsoluteFill
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 24,
          }}
        >
          {/* Pipeline steps */}
          <div style={{ display: "flex", gap: 12 }}>
            {content.pipelineSteps.map((step, i) => {
              const stepActive = (act2Frame / act2Duration) > (i / content.pipelineSteps.length);
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      padding: "6px 14px",
                      borderRadius: 20,
                      border: `1px solid ${color}`,
                      fontSize: 12,
                      color: stepActive ? "white" : color,
                      backgroundColor: stepActive ? content.fallbackColor : "transparent",
                    }}
                  >
                    {step}
                  </div>
                  {i < content.pipelineSteps.length - 1 && (
                    <span style={{ color: "var(--color-text-tertiary)" }}>→</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Two-panel split */}
          <div
            style={{
              display: "flex",
              gap: 32,
              width: 500,
              justifyContent: "center",
            }}
          >
            {/* Left: Structured filters */}
            <div
              style={{
                flex: 1,
                padding: 20,
                borderRadius: 10,
                border: "1px solid var(--color-border)",
                backgroundColor: "var(--color-surface)",
                opacity: splitProgress,
                transform: `translateX(${interpolate(splitProgress, [0, 1], [-20, 0])}px)`,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: 2,
                  textTransform: "uppercase" as const,
                  color: "var(--color-text-tertiary)",
                  marginBottom: 12,
                }}
              >
                Filters extracted
              </div>
              {filterWords.map((w, i) => (
                <div
                  key={i}
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 14,
                    padding: "4px 10px",
                    marginBottom: 6,
                    borderRadius: 4,
                    backgroundColor: filterProgress > i / filterWords.length
                      ? `color-mix(in srgb, ${content.fallbackColor} 15%, transparent)`
                      : "transparent",
                    color: "var(--color-text)",
                  }}
                >
                  {w}
                </div>
              ))}
              {filterProgress > 0.5 && (
                <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 8 }}>
                  {`2,742 → ~180 songs`}
                </div>
              )}
            </div>

            {/* Right: Semantic remainder */}
            <div
              style={{
                flex: 1,
                padding: 20,
                borderRadius: 10,
                border: "1px solid var(--color-border)",
                backgroundColor: "var(--color-surface)",
                opacity: splitProgress,
                transform: `translateX(${interpolate(splitProgress, [0, 1], [20, 0])}px)`,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: 2,
                  textTransform: "uppercase" as const,
                  color: "var(--color-text-tertiary)",
                  marginBottom: 12,
                }}
              >
                Semantic search
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 14,
                  color: "var(--color-text)",
                  marginBottom: 12,
                }}
              >
                {semanticWords.length > 0 ? semanticWords.join(" ") : "baby"}
              </div>
              {rankProgress > 0.3 && (
                <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
                  Vector ranking within filtered set...
                </div>
              )}
            </div>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Act 3 */}
      <Sequence from={ACT_2_END} durationInFrames={ANIMATION_DURATION_FRAMES - ACT_2_END}>
        <AbsoluteFill>
          <ResultsReveal
            results={content.results}
            verdict={content.verdict}
            accentColor={color}
          />
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: Verify typecheck**

```bash
cd web && bun run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add web/src/components/animations/HybridAnimation.tsx
git commit -m "feat: add Hybrid search Remotion composition"
```

---

### Task 9: Create NLAnimation composition

**Files:**
- Create: `web/src/components/animations/NLAnimation.tsx`

Act 2 for NL: query goes to LLM box, structured JSON comes out, then pipeline runs.

- [ ] **Step 1: Create the composition**

```tsx
// web/src/components/animations/NLAnimation.tsx

import { AbsoluteFill, useCurrentFrame, interpolate, Sequence } from "remotion";
import type { ModeAnimationContent } from "./animation-content";
import { ACT_1_END, ACT_2_END, ANIMATION_DURATION_FRAMES } from "./animation-content";
import { QueryEntry } from "./shared/QueryEntry";
import { ResultsReveal } from "./shared/ResultsReveal";

interface Props {
  content: ModeAnimationContent;
}

export const NLAnimation: React.FC<Props> = ({ content }) => {
  const frame = useCurrentFrame();
  const color = `var(${content.cssVar}, ${content.fallbackColor})`;

  const act2Frame = frame - ACT_1_END;
  const act2Duration = ACT_2_END - ACT_1_END;

  // Phase 1: query enters LLM box (0–30%)
  const sendProgress = interpolate(act2Frame, [0, act2Duration * 0.3], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Phase 2: LLM "thinking" + JSON output (30–65%)
  const thinkProgress = interpolate(act2Frame, [act2Duration * 0.3, act2Duration * 0.65], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Phase 3: structured filters feed into search (65–100%)
  const searchProgress = interpolate(act2Frame, [act2Duration * 0.65, act2Duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Simulated JSON output lines
  const jsonLines = [
    `"title_contains": "baby"`,
    `"decade": "1960s"`,
    `"semantic": "baby in title"`,
  ];

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "var(--color-bg)",
        fontFamily: "var(--font-sans)",
      }}
    >
      {/* Act 1 */}
      <Sequence from={0} durationInFrames={ACT_1_END}>
        <AbsoluteFill>
          <QueryEntry query={content.query} accentColor={color} />
        </AbsoluteFill>
      </Sequence>

      {/* Act 2: LLM processing */}
      <Sequence from={ACT_1_END} durationInFrames={act2Duration}>
        <AbsoluteFill
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 24,
          }}
        >
          {/* Pipeline steps */}
          <div style={{ display: "flex", gap: 12 }}>
            {content.pipelineSteps.map((step, i) => {
              const stepActive = (act2Frame / act2Duration) > (i / content.pipelineSteps.length);
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      padding: "6px 14px",
                      borderRadius: 20,
                      border: `1px solid ${color}`,
                      fontSize: 12,
                      color: stepActive ? "white" : color,
                      backgroundColor: stepActive ? content.fallbackColor : "transparent",
                    }}
                  >
                    {step}
                  </div>
                  {i < content.pipelineSteps.length - 1 && (
                    <span style={{ color: "var(--color-text-tertiary)" }}>→</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* LLM box */}
          <div
            style={{
              display: "flex",
              gap: 32,
              alignItems: "center",
            }}
          >
            {/* Query input arrow */}
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 14,
                color: "var(--color-text-secondary)",
                opacity: sendProgress,
                transform: `translateX(${interpolate(sendProgress, [0, 1], [-20, 0])}px)`,
              }}
            >
              "{content.query}"
            </div>

            <div style={{ color: "var(--color-text-tertiary)", opacity: sendProgress > 0.8 ? 1 : 0 }}>→</div>

            {/* LLM box */}
            <div
              style={{
                padding: "16px 24px",
                borderRadius: 10,
                border: `2px solid ${content.fallbackColor}`,
                backgroundColor: "var(--color-surface)",
                minWidth: 100,
                textAlign: "center" as const,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text)" }}>
                DeepSeek
              </div>
              {thinkProgress > 0 && thinkProgress < 0.8 && (
                <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 4 }}>
                  Parsing intent...
                </div>
              )}
              {thinkProgress >= 0.8 && (
                <div style={{ fontSize: 11, color: content.fallbackColor, marginTop: 4 }}>
                  Done
                </div>
              )}
            </div>

            <div style={{ color: "var(--color-text-tertiary)", opacity: thinkProgress > 0.8 ? 1 : 0 }}>→</div>

            {/* JSON output */}
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                padding: 16,
                borderRadius: 8,
                border: "1px solid var(--color-border)",
                backgroundColor: "var(--color-bg-secondary)",
                opacity: thinkProgress > 0.7 ? 1 : 0,
                lineHeight: 1.8,
              }}
            >
              <div style={{ color: "var(--color-text-tertiary)" }}>{"{"}</div>
              {jsonLines.map((line, i) => (
                <div
                  key={i}
                  style={{
                    paddingLeft: 16,
                    color: "var(--color-text)",
                    opacity: thinkProgress > 0.7 + i * 0.08 ? 1 : 0,
                  }}
                >
                  {line}
                </div>
              ))}
              <div style={{ color: "var(--color-text-tertiary)" }}>{"}"}</div>
            </div>
          </div>

          {/* Search status */}
          {searchProgress > 0.3 && (
            <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
              Searching with LLM-derived filters...
            </div>
          )}
        </AbsoluteFill>
      </Sequence>

      {/* Act 3 */}
      <Sequence from={ACT_2_END} durationInFrames={ANIMATION_DURATION_FRAMES - ACT_2_END}>
        <AbsoluteFill>
          <ResultsReveal
            results={content.results}
            verdict={content.verdict}
            accentColor={color}
          />
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: Verify typecheck**

```bash
cd web && bun run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add web/src/components/animations/NLAnimation.tsx
git commit -m "feat: add Natural Language search Remotion composition"
```

---

### Task 10: Create AnimationSection wrapper

**Files:**
- Create: `web/src/components/animations/AnimationSection.tsx`

Wraps a Remotion Player with IntersectionObserver auto-play, the colored number badge, and skip button.

- [ ] **Step 1: Create the wrapper component**

```tsx
// web/src/components/animations/AnimationSection.tsx

import { useRef, useEffect, useCallback, useState } from "react";
import { Player, type PlayerRef } from "@remotion/player";
import type { ModeAnimationContent } from "./animation-content";
import { ANIMATION_FPS, ANIMATION_DURATION_FRAMES } from "./animation-content";

interface AnimationSectionProps {
  content: ModeAnimationContent;
  composition: React.FC<{ content: ModeAnimationContent }>;
  onSkipToSearch: () => void;
}

export function AnimationSection({ content, composition, onSkipToSearch }: AnimationSectionProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<PlayerRef>(null);
  const [hasPlayed, setHasPlayed] = useState(false);

  const handleIntersection = useCallback(
    ([entry]: IntersectionObserverEntry[]) => {
      const player = playerRef.current;
      if (!player) return;

      if (entry.isIntersecting) {
        player.seekTo(0);
        player.play();
        setHasPlayed(true);
      } else {
        player.pause();
      }
    },
    []
  );

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(handleIntersection, {
      threshold: 0.6,
    });

    observer.observe(section);
    return () => observer.disconnect();
  }, [handleIntersection]);

  return (
    <div
      ref={sectionRef}
      style={{
        height: "100vh",
        scrollSnapAlign: "start",
        overflow: "hidden",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        backgroundColor: "var(--color-bg)",
      }}
    >
      {/* Colored number badge */}
      <div
        style={{
          marginTop: 32,
          width: 36,
          height: 36,
          borderRadius: "50%",
          backgroundColor: `var(${content.cssVar}, ${content.fallbackColor})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 13,
          fontWeight: 700,
          color: "white",
          flexShrink: 0,
        }}
      >
        {content.num}
      </div>

      {/* Mode label */}
      <div
        style={{
          marginTop: 8,
          fontSize: 18,
          fontWeight: 600,
          color: "var(--color-text)",
          flexShrink: 0,
        }}
      >
        {content.label}
      </div>

      {/* Remotion Player */}
      <div style={{ flex: 1, width: "100%", maxWidth: 900, margin: "16px auto 0" }}>
        <Player
          ref={playerRef}
          component={composition}
          inputProps={{ content }}
          durationInFrames={ANIMATION_DURATION_FRAMES}
          fps={ANIMATION_FPS}
          compositionWidth={900}
          compositionHeight={500}
          style={{ width: "100%", height: "100%" }}
        />
      </div>

      {/* Skip to search */}
      <button
        type="button"
        onClick={onSkipToSearch}
        style={{
          position: "absolute",
          bottom: 24,
          right: 24,
          background: "none",
          border: "none",
          cursor: "pointer",
          fontSize: 12,
          color: "var(--color-text-tertiary)",
          borderBottom: "1px solid var(--color-border)",
          padding: 0,
          fontFamily: "var(--font-sans)",
        }}
      >
        Skip to search ↓
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Verify typecheck**

```bash
cd web && bun run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add web/src/components/animations/AnimationSection.tsx
git commit -m "feat: add AnimationSection wrapper with auto-play and skip"
```

---

### Task 11: Add snap scroll CSS

**Files:**
- Modify: `web/src/index.css`

- [ ] **Step 1: Add snap scroll styles**

At the end of `web/src/index.css` (after the `body` rule at line 77), add:

```css
.snap-container {
  height: 100vh;
  overflow-y: auto;
  scroll-snap-type: y mandatory;
  scroll-behavior: smooth;
}

.snap-section {
  height: 100vh;
  scroll-snap-align: start;
  overflow: hidden;
}

.snap-section-scrollable {
  min-height: 100vh;
  scroll-snap-align: start;
}
```

- [ ] **Step 2: Verify build**

```bash
cd web && bun run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add web/src/index.css
git commit -m "feat: add snap scroll CSS classes"
```

---

### Task 12: Refactor Main.tsx

**Files:**
- Modify: `web/src/pages/Main.tsx`

This is the biggest change. Replace Hero + PipelineSection with snap container holding 6 sections. Preserve SearchSection and ResultRow as-is.

- [ ] **Step 1: Add new imports at top of Main.tsx**

Replace lines 1–6 of `web/src/pages/Main.tsx`:

```tsx
import { useState, useRef, useCallback } from "react";
import { motion, useInView } from "motion/react";
import type { SearchMode, SearchResponse } from "../lib/types";
import { searchAll } from "../lib/api";
import { SearchBar } from "../components/SearchBar";
import { QueryChips } from "../components/QueryChips";
import { useSnapScroll } from "../hooks/useSnapScroll";
import { animationContent } from "../components/animations/animation-content";
import { AnimationSection } from "../components/animations/AnimationSection";
import { KeywordAnimation } from "../components/animations/KeywordAnimation";
import { SemanticAnimation } from "../components/animations/SemanticAnimation";
import { HybridAnimation } from "../components/animations/HybridAnimation";
import { NLAnimation } from "../components/animations/NLAnimation";
```

- [ ] **Step 2: Keep the Reveal component (lines 11–34) — no change**

The `Reveal` wrapper is still used by SearchSection.

- [ ] **Step 3: Replace the Hero component (lines 39–109) with IntroSection**

Delete the existing `Hero` function and replace with:

```tsx
function IntroSection() {
  return (
    <div className="snap-section flex flex-col items-center justify-center text-center px-6 bg-(--color-bg) relative">
      <div className="relative">
        <h1 className="text-5xl md:text-6xl font-bold text-(--color-text) tracking-tight mb-6">
          Lyric<span className="text-(--color-text-secondary)">Lens</span>
        </h1>
        <p className="text-base text-(--color-text-secondary) max-w-lg mx-auto leading-relaxed">
          Welcome to LyricLens — this application demonstrates different methods
          of RAG retrieval and the relative merits of each depending on your use
          case.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-2 mt-10 mb-12">
        {["React", "TypeScript", "Bun", "Hono", "Qdrant", "Python", "Remotion", "Tailwind"].map(
          (item) => (
            <span
              key={item}
              className="px-3 py-1 rounded-full text-xs tracking-wide border border-(--color-border) text-(--color-text-tertiary)"
            >
              {item}
            </span>
          )
        )}
      </div>

      <div className="flex items-center gap-3">
        <span className="px-6 py-2.5 rounded-full text-sm font-medium bg-(--color-text) text-(--color-bg)">
          Scroll to explore
        </span>
        <span className="text-sm text-(--color-text-tertiary)">or</span>
        <button
          type="button"
          className="text-sm text-(--color-text-tertiary) border-b border-(--color-border) hover:text-(--color-text-secondary) transition-colors bg-transparent cursor-pointer"
          style={{ padding: 0, fontFamily: "inherit" }}
        >
          Skip to search ↓
        </button>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 flex flex-col items-center gap-2 text-(--color-text-tertiary)">
        <span className="text-[10px] uppercase tracking-[0.2em]">Scroll</span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M4 6l4 4 4-4" />
          </svg>
        </motion.div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Delete the PIPELINES array (lines 114–159) and PipelineSection function (lines 161–270)**

These are fully replaced by the animation sections.

- [ ] **Step 5: Add condensed summary to SearchSection**

In the `SearchSection` function, add a condensed mode reference row above the search bar. Insert after the "Search four ways" heading block (after the closing `</Reveal>` around line 360) and before the search bar div:

```tsx
        {/* Condensed mode summary */}
        <Reveal>
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            {MODES.map((mode) => {
              const m = MODE_META[mode];
              return (
                <div key={mode} className="flex items-center gap-2">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                    style={{ backgroundColor: m.color }}
                  >
                    {MODES.indexOf(mode) + 1}
                  </div>
                  <span className="text-xs text-(--color-text-secondary)">
                    {m.label} — {m.desc}
                  </span>
                </div>
              );
            })}
          </div>
        </Reveal>
```

- [ ] **Step 6: Keep the rest of SearchSection and ResultRow unchanged**

Lines 275–546 (MODE_META, MODES, SearchSection logic, ResultRow) stay as-is beyond the condensed summary addition.

- [ ] **Step 7: Replace the Main export (lines 551–559)**

Delete the existing `Main` function and replace with:

```tsx
const ANIMATION_MODES = [
  { key: "keyword", composition: KeywordAnimation },
  { key: "semantic", composition: SemanticAnimation },
  { key: "hybrid", composition: HybridAnimation },
  { key: "natural", composition: NLAnimation },
] as const;

const SECTION_COUNT = 6; // intro + 4 animations + search

export function Main() {
  const { containerRef, setSectionRef, scrollToSection } = useSnapScroll({
    sectionCount: SECTION_COUNT,
  });

  const skipToSearch = useCallback(() => scrollToSection(5), [scrollToSection]);

  return (
    <div ref={containerRef} className="snap-container">
      {/* Section 1: Intro */}
      <div ref={setSectionRef(0)}>
        <IntroSection />
      </div>

      {/* Sections 2–5: Animations */}
      {ANIMATION_MODES.map((mode, i) => (
        <div key={mode.key} ref={setSectionRef(i + 1)}>
          <AnimationSection
            content={animationContent[mode.key]}
            composition={mode.composition}
            onSkipToSearch={skipToSearch}
          />
        </div>
      ))}

      {/* Section 6: Search */}
      <div ref={setSectionRef(5)} className="snap-section-scrollable">
        <SearchSection />
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Wire up intro skip button**

In the `IntroSection` component, the "Skip to search ↓" button needs the scroll function. Refactor to accept a prop:

Change `function IntroSection()` to:

```tsx
function IntroSection({ onSkipToSearch }: { onSkipToSearch: () => void }) {
```

And update the skip button's `onClick`:

```tsx
        <button
          type="button"
          onClick={onSkipToSearch}
          className="text-sm text-(--color-text-tertiary) border-b border-(--color-border) hover:text-(--color-text-secondary) transition-colors bg-transparent cursor-pointer"
          style={{ padding: 0, fontFamily: "inherit" }}
        >
          Skip to search ↓
        </button>
```

And in the `Main` function, pass the prop:

```tsx
      <div ref={setSectionRef(0)}>
        <IntroSection onSkipToSearch={skipToSearch} />
      </div>
```

- [ ] **Step 9: Verify typecheck**

```bash
cd web && bun run typecheck
```

Fix any type errors — most likely issues will be around the Remotion `component` prop type. If `Player` expects `React.LazyExoticComponent` or a specific type, wrap compositions:

```tsx
composition={composition as React.ComponentType<{ content: ModeAnimationContent }>}
```

- [ ] **Step 10: Commit**

```bash
git add web/src/pages/Main.tsx
git commit -m "feat: refactor Main.tsx to snap-scroll layout with Remotion animations"
```

---

### Task 13: Update Nav.tsx

**Files:**
- Modify: `web/src/components/Nav.tsx`

Nav should be hidden during sections 1–5 and appear when the search section is visible. Add section jump links.

- [ ] **Step 1: Rewrite Nav.tsx**

Replace the entire contents of `web/src/components/Nav.tsx` with:

```tsx
import { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { useTheme } from "../theme/ThemeProvider";

const SECTION_LINKS = [
  { label: "Intro", index: 0 },
  { label: "Keyword", index: 1 },
  { label: "Semantic", index: 2 },
  { label: "Hybrid", index: 3 },
  { label: "NL", index: 4 },
];

interface NavProps {
  visible: boolean;
  onNavigate: (sectionIndex: number) => void;
}

export function Nav({ visible, onNavigate }: NavProps) {
  const { theme, toggle } = useTheme();

  if (!visible) return null;

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-(--color-border) bg-(--color-bg)/95 backdrop-blur-sm"
    >
      <nav className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <button
          type="button"
          onClick={() => onNavigate(0)}
          className="text-base font-semibold text-(--color-text) bg-transparent border-none cursor-pointer"
          style={{ fontFamily: "inherit" }}
        >
          Lyric<span className="text-(--color-text-secondary)">Lens</span>
        </button>

        {/* Section links */}
        <div className="flex items-center gap-6">
          {SECTION_LINKS.map((link) => (
            <button
              key={link.label}
              type="button"
              onClick={() => onNavigate(link.index)}
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

- [ ] **Step 2: Update Layout.tsx to pass nav props**

Replace `web/src/components/Layout.tsx`:

```tsx
import { Outlet } from "react-router";

export function Layout() {
  return <Outlet />;
}
```

The Nav is now rendered inside Main.tsx (not Layout) because it needs access to the snap scroll state.

- [ ] **Step 3: Add Nav to Main.tsx**

In `web/src/pages/Main.tsx`, add the Nav import at the top:

```tsx
import { Nav } from "../components/Nav";
```

Then in the `Main` function, add Nav and track visibility based on activeIndex:

```tsx
export function Main() {
  const { containerRef, setSectionRef, activeIndex, scrollToSection } = useSnapScroll({
    sectionCount: SECTION_COUNT,
  });

  const skipToSearch = useCallback(() => scrollToSection(5), [scrollToSection]);
  const navVisible = activeIndex >= 5;

  return (
    <>
      <Nav visible={navVisible} onNavigate={scrollToSection} />
      <div ref={containerRef} className="snap-container">
        {/* ... sections unchanged ... */}
      </div>
    </>
  );
}
```

- [ ] **Step 4: Verify typecheck**

```bash
cd web && bun run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add web/src/components/Nav.tsx web/src/components/Layout.tsx web/src/pages/Main.tsx
git commit -m "feat: update Nav with section links, hidden until search section"
```

---

### Task 14: Remove old How It Works files

**Files:**
- Delete: `web/src/pages/HowItWorks.tsx`
- Delete: `web/src/components/how-it-works/QueryDecomposition.tsx`
- Delete: `web/src/components/how-it-works/TheFunnel.tsx`
- Delete: `web/src/components/how-it-works/EmbeddingMoment.tsx`
- Delete: `web/src/components/how-it-works/ModeComparison.tsx`

- [ ] **Step 1: Verify no imports reference these files**

```bash
cd web && grep -r "HowItWorks\|how-it-works\|QueryDecomposition\|TheFunnel\|EmbeddingMoment\|ModeComparison" src/ --include="*.tsx" --include="*.ts"
```

If `App.tsx` or any other file imports these, remove those imports first.

- [ ] **Step 2: Delete the files**

```bash
rm web/src/pages/HowItWorks.tsx
rm -rf web/src/components/how-it-works/
```

- [ ] **Step 3: Verify typecheck**

```bash
cd web && bun run typecheck
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove old HowItWorks page and scroll animation components"
```

---

### Task 15: Visual verification and polish

- [ ] **Step 1: Start dev server**

```bash
cd web && bun run dev -- --port 5200 --strictPort
```

- [ ] **Step 2: Verify snap scroll behavior**

Open http://localhost:5200. Check:
- Scroll snaps between sections
- Arrow keys navigate between sections
- Skip buttons jump to search
- Animations auto-play when section snaps into view
- Animations pause and reset when scrolled away
- Nav appears when search section is reached
- Nav links scroll back to correct sections
- Light and dark mode both work (use theme toggle)

- [ ] **Step 3: Fix any visual issues found**

Common issues to check:
- Player sizing within viewport (may need `style={{ width: "100%", height: "100%" }}` adjustments)
- Snap scroll conflicts with search section internal scroll
- Mobile responsiveness of animation content

- [ ] **Step 4: Final typecheck**

```bash
cd web && bun run typecheck
```

- [ ] **Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix: visual polish and snap scroll adjustments"
```
