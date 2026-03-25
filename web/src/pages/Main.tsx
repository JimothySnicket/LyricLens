import { useState } from "react";
import type { SearchMode, SearchResponse } from "../lib/types";
import { searchAll } from "../lib/api";
import { SearchBar } from "../components/SearchBar";
import { QueryChips } from "../components/QueryChips";

// ---------------------------------------------------------------------------
// Section 1: Intro
// ---------------------------------------------------------------------------
function Intro() {
  return (
    <section className="min-h-[70vh] flex flex-col items-center justify-center text-center px-6">
      <h1 className="text-4xl font-bold text-(--color-text) mb-4">LyricLens</h1>
      <p className="text-lg text-(--color-text-secondary) max-w-2xl mb-8">
        This application demonstrates different methods of RAG retrieval and the
        relative merits of each depending on your use case — from simple keyword
        matching to LLM-powered natural language understanding.
      </p>

      {/* Tech stack card */}
      <div className="flex flex-wrap justify-center gap-3 mb-10">
        {[
          { label: "React + TypeScript", category: "frontend" },
          { label: "Bun + Hono", category: "backend" },
          { label: "Qdrant Cloud", category: "vector" },
          { label: "MiniLM-L6-v2", category: "embedding" },
          { label: "DeepSeek V3", category: "llm" },
          { label: "2,742 songs", category: "data" },
        ].map((item) => (
          <span
            key={item.label}
            className="px-3 py-1.5 rounded-full text-xs font-medium border border-(--color-border) bg-(--color-surface) text-(--color-text-secondary)"
          >
            {item.label}
          </span>
        ))}
      </div>

      <a
        href="#search"
        className="px-6 py-3 rounded-[var(--radius-md)] bg-(--color-accent) text-(--color-text-inverse) text-sm font-medium hover:bg-(--color-accent-hover) transition-colors"
      >
        Skip to Search
      </a>

      <div className="mt-16 flex flex-col items-center gap-2 text-(--color-text-tertiary)">
        <span className="text-xs uppercase tracking-widest">Scroll to learn how it works</span>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="animate-bounce">
          <path d="M5 8l5 5 5-5" />
        </svg>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Section 2: How It Works — Static pipeline cards (replacing broken scroll)
// ---------------------------------------------------------------------------
const PIPELINES = [
  {
    id: "keyword",
    label: "Keyword Search",
    color: "#e65100",
    description: "Regex parser breaks the query into terms, then matches exact words against song titles, lyrics, and artist names. Fast and predictable.",
    goodQuery: "baby in the title from the 60s",
    goodResult: "Baby Love — The Supremes (exact title match)",
    badQuery: "songs about heartbreak",
    badResult: "Matches literal word 'heartbreak' only — misses songs about loss that don't use that word",
    takeaway: "Best for: specific lookups where you know the words. Fails on concepts and vibes.",
  },
  {
    id: "semantic",
    label: "Semantic Search",
    color: "#1565c0",
    description: "Embeds the query with MiniLM, then finds songs whose AI-generated profile summaries are closest in meaning. Captures the vibe, not the words.",
    goodQuery: "songs that feel like driving at night",
    goodResult: "Self Control — Laura Branigan, I Love A Rainy Night — Eddie Rabbitt",
    badQuery: "by Michael Jackson",
    badResult: "Artist name isn't a 'meaning' — vector similarity to 'michael jackson' is weak without filters",
    takeaway: "Best for: conceptual queries and moods. Fails on structured lookups (artist, decade, genre).",
  },
  {
    id: "hybrid",
    label: "Hybrid Search",
    color: "#6a1b9a",
    description: "Regex parser extracts filters (decade, genre, mood, artist), then vector search ranks within the filtered pool. Keyword matches boost the score.",
    goodQuery: "sad rock from the 80s",
    goodResult: "Filters to 1980s rock songs with high sadness scores, then ranks by semantic similarity",
    badQuery: "old songs about missing home",
    badResult: "Regex parser doesn't understand 'old' as a time reference — no decade filter applied",
    takeaway: "Best general-purpose approach. Limited by the intelligence of the regex parser.",
  },
  {
    id: "natural",
    label: "Natural Language",
    color: "#2e7d32",
    description: "An LLM (DeepSeek) reads the query and extracts structured intent — understanding context, slang, and relative time references that rules can't.",
    goodQuery: "old songs about missing home",
    goodResult: "LLM interprets 'old' → 1950s-1970s, 'missing home' → sadness + nostalgia theme",
    goodQuery2: "something like bohemian rhapsody",
    goodResult2: "LLM extracts: artist=Queen, genre=rock, semantic='epic rock with operatic sections'",
    takeaway: "Handles anything natural language can express. Trade-off: ~3 second latency and API cost.",
  },
];

function HowItWorksSection() {
  return (
    <section className="py-20 px-4">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl font-semibold text-(--color-text) text-center mb-3">
          Four approaches to the same problem
        </h2>
        <p className="text-(--color-text-secondary) text-center mb-12 max-w-2xl mx-auto">
          Each pipeline adds a layer of intelligence. The same query produces different
          results — and the comparison shows when each approach wins.
        </p>

        <div className="space-y-8">
          {PIPELINES.map((pipeline, i) => (
            <div
              key={pipeline.id}
              id={`how-${pipeline.id}`}
              className="rounded-[var(--radius-md)] border border-(--color-border) bg-(--color-surface) overflow-hidden"
            >
              {/* Header */}
              <div className="px-6 py-4 flex items-center gap-3 border-b border-(--color-border)">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: pipeline.color }}
                />
                <h3 className="text-lg font-semibold text-(--color-text)">
                  {i + 1}. {pipeline.label}
                </h3>
              </div>

              <div className="px-6 py-5 space-y-4">
                <p className="text-sm text-(--color-text-secondary) leading-relaxed">
                  {pipeline.description}
                </p>

                {/* Examples */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Good example */}
                  <div className="rounded-[var(--radius-sm)] border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/30 p-3">
                    <span className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide">
                      Where it shines
                    </span>
                    <p className="text-sm text-(--color-text) mt-1 font-mono">"{pipeline.goodQuery}"</p>
                    <p className="text-xs text-(--color-text-secondary) mt-1">{pipeline.goodResult}</p>
                    {"goodQuery2" in pipeline && (
                      <>
                        <p className="text-sm text-(--color-text) mt-2 font-mono">"{(pipeline as any).goodQuery2}"</p>
                        <p className="text-xs text-(--color-text-secondary) mt-1">{(pipeline as any).goodResult2}</p>
                      </>
                    )}
                  </div>

                  {/* Bad example */}
                  {"badQuery" in pipeline && pipeline.badQuery && (
                    <div className="rounded-[var(--radius-sm)] border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 p-3">
                      <span className="text-xs font-semibold text-red-700 dark:text-red-400 uppercase tracking-wide">
                        Where it struggles
                      </span>
                      <p className="text-sm text-(--color-text) mt-1 font-mono">"{pipeline.badQuery}"</p>
                      <p className="text-xs text-(--color-text-secondary) mt-1">{pipeline.badResult}</p>
                    </div>
                  )}
                </div>

                {/* Takeaway */}
                <p className="text-xs text-(--color-text-tertiary) italic">
                  {pipeline.takeaway}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Section 3: Search
// ---------------------------------------------------------------------------
const MODE_INFO: Record<SearchMode, { label: string; description: string; color: string }> = {
  keyword: { label: "Keyword", description: "Regex parser + exact word matching", color: "#e65100" },
  semantic: { label: "Semantic", description: "Regex parser + vector similarity", color: "#1565c0" },
  hybrid: { label: "Hybrid", description: "Regex parser + filters + vector + keyword boost", color: "#6a1b9a" },
  natural: { label: "Natural Language", description: "LLM parses query + vector similarity", color: "#2e7d32" },
};

const MODES: SearchMode[] = ["keyword", "semantic", "hybrid", "natural"];

function SearchSection() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Record<SearchMode, SearchResponse> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  async function handleSearch(q: string) {
    if (!q.trim()) return;
    setQuery(q);
    setLoading(true);
    setError(null);
    setExpandedCards(new Set());
    setSummary(null);
    try {
      const res = await searchAll(q);
      setResults(res);
      // Trigger agentic summary
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
      // Build top 3 from each mode
      const modeResults = MODES.map((mode) => ({
        mode,
        songs: (res[mode]?.results ?? []).slice(0, 3).map((r) => ({
          title: r.song.title,
          artist: r.song.artist,
          year: r.song.year,
          genre: r.song.genre,
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
    } catch {
      // Silent fail — summary is optional
    } finally {
      setSummaryLoading(false);
    }
  }

  function toggleCard(id: string) {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const hasResults = results !== null;
  const parsedQuery = results?.keyword?.parsedQuery ?? results?.semantic?.parsedQuery;

  return (
    <section id="search" className="py-16 px-4">
      <div className="max-w-[1800px] mx-auto">
        <h2 className="text-2xl font-semibold text-(--color-text) text-center mb-2">
          Try it yourself
        </h2>
        <p className="text-(--color-text-secondary) text-center mb-8 text-sm">
          Type a query and see how all four approaches handle it side by side.
        </p>

        {/* Search bar */}
        <div className="max-w-2xl mx-auto mb-6">
          <SearchBar onSearch={handleSearch} initialQuery={query} />
        </div>

        {/* Loading */}
        {loading && (
          <div className="py-16 flex items-center justify-center gap-3">
            <div className="w-4 h-4 rounded-full border-2 border-(--color-border) border-t-(--color-accent) animate-spin" />
            <span className="text-sm text-(--color-text-secondary)">Searching all four modes…</span>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="max-w-2xl mx-auto rounded-[var(--radius-md)] border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950 px-4 py-3 mb-6">
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Parsed query chips */}
        {!loading && parsedQuery && (
          <div className="max-w-2xl mx-auto mb-4">
            <QueryChips interpretations={parsedQuery.interpretations} />
          </div>
        )}

        {/* Agentic summary */}
        {!loading && hasResults && (
          <div className="max-w-3xl mx-auto mb-8">
            {summaryLoading ? (
              <div className="rounded-[var(--radius-md)] border border-(--color-border) bg-(--color-surface) px-5 py-4 text-center">
                <span className="text-sm text-(--color-text-tertiary)">Generating comparative analysis…</span>
              </div>
            ) : summary ? (
              <div className="rounded-[var(--radius-md)] border border-(--color-border) bg-(--color-surface) px-5 py-4">
                <p className="text-xs font-semibold text-(--color-text-secondary) uppercase tracking-wide mb-2">
                  Comparative Analysis
                </p>
                <p className="text-sm text-(--color-text-secondary) leading-relaxed">
                  {summary}
                </p>
              </div>
            ) : null}
          </div>
        )}

        {/* Four columns */}
        {!loading && hasResults && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {MODES.map((mode) => {
              const res2 = results[mode];
              const info = MODE_INFO[mode];
              const count = res2?.results?.length ?? 0;

              return (
                <div key={mode} className="flex flex-col">
                  <div className="rounded-t-[var(--radius-md)] px-4 py-3 border border-b-0 border-(--color-border) bg-(--color-surface)">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: info.color }} />
                      <h3 className="text-sm font-semibold text-(--color-text)">{info.label}</h3>
                      <span className="ml-auto text-xs text-(--color-text-tertiary)">{res2?.searchTimeMs ?? 0}ms</span>
                    </div>
                    <p className="text-xs text-(--color-text-tertiary)">{info.description}</p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-(--color-text-tertiary)">
                      <span>{count} results</span>
                      {res2?.totalFiltered != null && <span>from {res2.totalFiltered} songs</span>}
                    </div>
                  </div>

                  <div className="flex-1 border border-t-0 border-(--color-border) rounded-b-[var(--radius-md)] overflow-hidden">
                    {count > 0 ? (
                      <div className="divide-y divide-(--color-border)">
                        {res2.results.slice(0, 10).map((result, i) => (
                          <CompactResult
                            key={`${mode}-${result.song.id}-${i}`}
                            result={result}
                            rank={i + 1}
                            modeColor={info.color}
                            expanded={expandedCards.has(`${mode}-${result.song.id}`)}
                            onToggle={() => toggleCard(`${mode}-${result.song.id}`)}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="px-4 py-8 text-center text-xs text-(--color-text-tertiary)">No results</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {!loading && !hasResults && !error && (
          <div className="max-w-2xl mx-auto pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              {[
                { q: "old songs about missing home", why: "Natural Language understands 'old' as 1950s-70s." },
                { q: "songs that feel like driving at night", why: "Semantic captures the vibe. Keyword can't." },
                { q: "sad rock from the 80s", why: "Hybrid combines mood + genre + decade filters." },
                { q: "something like bohemian rhapsody", why: "The LLM extracts artist, genre, and concept." },
              ].map((example) => (
                <button
                  type="button"
                  key={example.q}
                  onClick={() => handleSearch(example.q)}
                  className="text-left p-3 rounded-[var(--radius-md)] border border-(--color-border) bg-(--color-surface) hover:border-(--color-accent) transition-colors"
                >
                  <span className="font-medium text-(--color-text)">{example.q}</span>
                  <span className="block text-xs text-(--color-text-tertiary) mt-0.5">{example.why}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Compact Result Card
// ---------------------------------------------------------------------------
function CompactResult({
  result,
  rank,
  modeColor,
  expanded,
  onToggle,
}: {
  result: { song: any; score: number; matchReason: string; mode: SearchMode };
  rank: number;
  modeColor: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { song, score, matchReason, mode } = result;
  const scoreDisplay = mode === "keyword" ? score.toFixed(1) : score.toFixed(3);

  return (
    <div className="bg-(--color-surface)">
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left px-3 py-2.5 flex items-start gap-2.5 hover:bg-(--color-bg-secondary) transition-colors"
      >
        <span className="text-xs font-mono text-(--color-text-tertiary) w-4 shrink-0 pt-0.5">{rank}</span>
        <span
          className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 text-white"
          style={{ backgroundColor: modeColor }}
        >
          {scoreDisplay}
        </span>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-(--color-text) truncate block">{song.title}</span>
          <span className="text-xs text-(--color-text-secondary) block truncate">{song.artist}</span>
          <div className="mt-1 flex flex-wrap gap-1">
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-(--color-bg-tertiary) text-(--color-text-tertiary)">{song.genre}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-(--color-bg-tertiary) text-(--color-text-tertiary)">{song.year}</span>
          </div>
        </div>
        <span className="text-[10px] text-(--color-text-tertiary) shrink-0">{expanded ? "\u25B2" : "\u25BC"}</span>
      </button>
      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-(--color-border) text-xs space-y-2">
          <p className="text-(--color-text-tertiary)">{matchReason}</p>
          {song.lyrics && (
            <p className="text-(--color-text-secondary) leading-relaxed whitespace-pre-line line-clamp-4">{song.lyrics.slice(0, 300)}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page — combines all sections
// ---------------------------------------------------------------------------
export function Main() {
  return (
    <div>
      <Intro />
      <HowItWorksSection />
      <SearchSection />
    </div>
  );
}
