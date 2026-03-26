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
import { Nav } from "../components/Nav";

// ---------------------------------------------------------------------------
// Fade-in wrapper — triggers when element enters viewport
// ---------------------------------------------------------------------------
function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.25, 0.1, 0.25, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Section 1: Intro
// ---------------------------------------------------------------------------
function IntroSection({ onSkipToSearch }: { onSkipToSearch: () => void }) {
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
          onClick={onSkipToSearch}
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

// ---------------------------------------------------------------------------
// Section 6: Search
// ---------------------------------------------------------------------------
const MODE_META: Record<SearchMode, { label: string; desc: string; color: string }> = {
  keyword: { label: "Keyword", desc: "Regex + exact matching", color: "#e65100" },
  semantic: { label: "Semantic", desc: "Vector similarity", color: "#1565c0" },
  hybrid: { label: "Hybrid", desc: "Filters + vectors", color: "#6a1b9a" },
  natural: { label: "Natural Language", desc: "LLM + vectors", color: "#2e7d32" },
};
const MODES: SearchMode[] = ["keyword", "semantic", "hybrid", "natural"];

function SearchSection() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Record<SearchMode, SearchResponse> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  async function handleSearch(q: string) {
    if (!q.trim()) return;
    setQuery(q);
    setLoading(true);
    setError(null);
    setExpanded(new Set());
    setSummary(null);
    try {
      const res = await searchAll(q);
      setResults(res);
      fetchSummary(q, res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
      setResults(null);
    } finally {
      setLoading(false);
    }
  }

  async function fetchSummary(q: string, res: Record<SearchMode, SearchResponse>) {
    setSummaryLoading(true);
    try {
      const modeResults = MODES.map((m) => ({
        mode: m,
        songs: (res[m]?.results ?? []).slice(0, 3).map((r) => ({
          title: r.song.title, artist: r.song.artist, year: r.song.year, genre: r.song.genre,
        })),
      }));
      const resp = await fetch("/api/rag/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, modeResults }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setSummary(data.summary);
      }
    } catch { /* silent */ } finally {
      setSummaryLoading(false);
    }
  }

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const hasResults = results !== null;
  const parsed = results?.keyword?.parsedQuery ?? results?.semantic?.parsedQuery;

  return (
    <section id="search" className="py-24 px-4 border-t border-(--color-border)">
      <div className="max-w-[1800px] mx-auto">
        <Reveal>
          <div className="text-center mb-10">
            <p className="text-[10px] uppercase tracking-[0.3em] text-(--color-text-tertiary) mb-3">
              Try it yourself
            </p>
            <h2 className="text-3xl font-bold text-(--color-text) mb-2">
              Search four ways
            </h2>
            <p className="text-sm text-(--color-text-secondary)">
              Same query, four pipelines, side by side.
            </p>
          </div>
        </Reveal>

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

        {/* Search bar */}
        <div className="max-w-2xl mx-auto mb-8">
          <SearchBar onSearch={handleSearch} initialQuery={query} />
        </div>

        {/* Loading */}
        {loading && (
          <div className="py-20 flex items-center justify-center gap-3">
            <div className="w-4 h-4 rounded-full border-2 border-(--color-border) border-t-(--color-text) animate-spin" />
            <span className="text-sm text-(--color-text-tertiary)">Searching all four pipelines…</span>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="max-w-2xl mx-auto rounded-lg border border-red-800 bg-red-950/30 px-4 py-3 mb-6">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Query interpretation */}
        {!loading && parsed && (
          <div className="max-w-2xl mx-auto mb-6">
            <QueryChips interpretations={parsed.interpretations} />
          </div>
        )}

        {/* Agentic summary */}
        {!loading && hasResults && (
          <Reveal className="max-w-3xl mx-auto mb-10">
            {summaryLoading ? (
              <div className="rounded-lg border border-(--color-border) bg-(--color-bg-secondary) px-6 py-5 text-center">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-3 h-3 rounded-full border border-(--color-border) border-t-(--color-text) animate-spin" />
                  <span className="text-xs text-(--color-text-tertiary)">Generating comparative analysis…</span>
                </div>
              </div>
            ) : summary ? (
              <div className="rounded-lg border border-(--color-border) bg-(--color-bg-secondary) px-6 py-5">
                <p className="text-[10px] uppercase tracking-[0.2em] text-(--color-text-tertiary) mb-3">
                  Comparative Analysis
                </p>
                <p className="text-sm text-(--color-text-secondary) leading-relaxed">
                  {summary}
                </p>
              </div>
            ) : null}
          </Reveal>
        )}

        {/* Four columns */}
        {!loading && hasResults && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {MODES.map((mode) => {
              const r = results[mode];
              const m = MODE_META[mode];
              const count = r?.results?.length ?? 0;

              return (
                <Reveal key={mode} delay={MODES.indexOf(mode) * 0.08}>
                  <div className="flex flex-col h-full">
                    {/* Column header */}
                    <div className="px-4 py-3 border border-b-0 border-(--color-border) rounded-t-lg bg-(--color-bg-secondary)">
                      <div className="flex items-center gap-2 mb-0.5">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
                        <span className="text-sm font-semibold text-(--color-text)">{m.label}</span>
                        <span className="ml-auto text-[10px] text-(--color-text-tertiary) font-mono">
                          {r?.searchTimeMs ?? 0}ms
                        </span>
                      </div>
                      <p className="text-[10px] text-(--color-text-tertiary)">{m.desc}</p>
                      <p className="text-[10px] text-(--color-text-tertiary) mt-1">
                        {count} results {r?.totalFiltered != null && `from ${r.totalFiltered}`}
                      </p>
                    </div>

                    {/* Results */}
                    <div className="flex-1 border border-t-0 border-(--color-border) rounded-b-lg overflow-hidden">
                      {count > 0 ? (
                        <div className="divide-y divide-(--color-border)">
                          {r.results.slice(0, 8).map((res, i) => (
                            <ResultRow
                              key={`${mode}-${res.song.id}-${i}`}
                              result={res}
                              rank={i + 1}
                              color={m.color}
                              open={expanded.has(`${mode}-${res.song.id}`)}
                              onToggle={() => toggle(`${mode}-${res.song.id}`)}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="px-4 py-10 text-center text-xs text-(--color-text-tertiary)">
                          No results
                        </div>
                      )}
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {!loading && !hasResults && !error && (
          <Reveal>
            <div className="max-w-2xl mx-auto pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { q: "old songs about missing home", hint: "'Old' is only understood by the LLM." },
                { q: "songs that feel like driving at night", hint: "Semantic captures vibes keyword can't." },
                { q: "sad rock from the 80s", hint: "Hybrid combines mood + genre + decade." },
                { q: "something like bohemian rhapsody", hint: "The LLM extracts artist, genre, and feel." },
              ].map((ex) => (
                <button
                  type="button"
                  key={ex.q}
                  onClick={() => handleSearch(ex.q)}
                  className="text-left p-4 rounded-lg border border-(--color-border) hover:border-(--color-text-tertiary) transition-colors group"
                >
                  <span className="text-sm font-medium text-(--color-text) group-hover:text-(--color-text)">{ex.q}</span>
                  <span className="block text-xs text-(--color-text-tertiary) mt-1">{ex.hint}</span>
                </button>
              ))}
            </div>
          </Reveal>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Result Row
// ---------------------------------------------------------------------------
function ResultRow({
  result, rank, color, open, onToggle,
}: {
  result: any;
  rank: number;
  color: string;
  open: boolean;
  onToggle: () => void;
}) {
  const { song, score, matchReason, mode } = result;
  const sc = mode === "keyword" ? score.toFixed(1) : score.toFixed(3);

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left px-3 py-2.5 flex items-start gap-2 hover:bg-(--color-bg-secondary) transition-colors"
      >
        <span className="text-[10px] font-mono text-(--color-text-tertiary) w-3 shrink-0 pt-1">{rank}</span>
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded text-white shrink-0" style={{ backgroundColor: color }}>
          {sc}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-(--color-text) truncate">{song.title}</p>
          <p className="text-[11px] text-(--color-text-secondary) truncate">{song.artist}</p>
          <div className="flex gap-1 mt-1">
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-(--color-bg-tertiary) text-(--color-text-tertiary)">{song.genre}</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-(--color-bg-tertiary) text-(--color-text-tertiary)">{song.year}</span>
          </div>
        </div>
      </button>
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
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const ANIMATION_MODES = [
  { key: "keyword", composition: KeywordAnimation },
  { key: "semantic", composition: SemanticAnimation },
  { key: "hybrid", composition: HybridAnimation },
  { key: "natural", composition: NLAnimation },
] as const;

const SECTION_COUNT = 6; // intro + 4 animations + search

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
        {/* Section 1: Intro */}
        <div ref={setSectionRef(0)}>
          <IntroSection onSkipToSearch={skipToSearch} />
        </div>

        {/* Sections 2-5: Animations */}
        {ANIMATION_MODES.map((mode, i) => (
          <div key={mode.key} ref={setSectionRef(i + 1)}>
            <AnimationSection
              content={animationContent[mode.key]}
              composition={mode.composition}
              onSkipToSearch={skipToSearch}
              scrollContainerRef={containerRef}
            />
          </div>
        ))}

        {/* Section 6: Search */}
        <div ref={setSectionRef(5)} className="snap-section-scrollable">
          <SearchSection />
        </div>
      </div>
    </>
  );
}
