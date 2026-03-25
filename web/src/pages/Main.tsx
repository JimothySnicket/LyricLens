import { useState, useRef } from "react";
import { motion, useInView } from "motion/react";
import type { SearchMode, SearchResponse } from "../lib/types";
import { searchAll } from "../lib/api";
import { SearchBar } from "../components/SearchBar";
import { QueryChips } from "../components/QueryChips";

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
// Section 1: Hero
// ---------------------------------------------------------------------------
function Hero() {
  return (
    <section className="relative min-h-[85vh] flex flex-col items-center justify-center text-center px-6 overflow-hidden">
      {/* Subtle grid background */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <Reveal>
        <div className="relative">
          <h1 className="text-5xl md:text-6xl font-bold text-(--color-text) tracking-tight mb-6">
            Lyric<span className="text-(--color-text-secondary)">Lens</span>
          </h1>
          <p className="text-lg md:text-xl text-(--color-text-secondary) max-w-2xl leading-relaxed">
            Four approaches to the same search problem.
            <br className="hidden md:block" />
            From keyword matching to LLM-powered understanding — see what each finds and why.
          </p>
        </div>
      </Reveal>

      <Reveal delay={0.2}>
        <div className="flex flex-wrap justify-center gap-2 mt-10 mb-12">
          {[
            "React + TypeScript",
            "Bun + Hono",
            "Qdrant Cloud",
            "MiniLM-L6-v2",
            "DeepSeek V3",
            "2,742 songs",
          ].map((item) => (
            <span
              key={item}
              className="px-3 py-1 rounded-full text-xs tracking-wide border border-(--color-border) text-(--color-text-tertiary)"
            >
              {item}
            </span>
          ))}
        </div>
      </Reveal>

      <Reveal delay={0.4}>
        <a
          href="#search"
          className="group px-8 py-3 rounded-full text-sm font-medium bg-(--color-text) text-(--color-bg) hover:opacity-90 transition-opacity"
        >
          Skip to Search
          <span className="inline-block ml-2 group-hover:translate-y-0.5 transition-transform">&darr;</span>
        </a>
      </Reveal>

      <Reveal delay={0.6} className="absolute bottom-8">
        <div className="flex flex-col items-center gap-2 text-(--color-text-tertiary)">
          <span className="text-[10px] uppercase tracking-[0.2em]">Scroll to explore</span>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M4 6l4 4 4-4" />
            </svg>
          </motion.div>
        </div>
      </Reveal>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Section 2: Pipeline Explainers
// ---------------------------------------------------------------------------
const PIPELINES = [
  {
    id: "keyword",
    num: "01",
    label: "Keyword Search",
    color: "#e65100",
    what: "A regex parser breaks your query into terms, then scans every song for exact word matches in titles, lyrics, and artist names.",
    how: ["Parse query into tokens", "Remove stop words", "Match against title, lyrics, artist", "Score by match weight + position"],
    good: { query: "baby in the title from the 60s", result: "Baby Love — The Supremes. Exact title match, decade filter applied." },
    bad: { query: "songs about heartbreak", result: "Only finds songs literally containing 'heartbreak'. Misses songs about loss, pain, and longing." },
    verdict: "Fast and predictable. Best when you know the exact words.",
  },
  {
    id: "semantic",
    num: "02",
    label: "Semantic Search",
    color: "#1565c0",
    what: "Your query is embedded into a 384-dimensional vector and compared against pre-computed song profile summaries — finding meaning, not words.",
    how: ["Embed query with MiniLM", "Search summary vectors in Qdrant", "Rank by cosine similarity", "Return nearest neighbors"],
    good: { query: "songs that feel like driving at night", result: "Self Control, I Love A Rainy Night. Captures the nocturnal, contemplative vibe." },
    bad: { query: "by Michael Jackson", result: "Artist name isn't a 'meaning'. The vector for 'michael jackson' is vague without structured filters." },
    verdict: "Captures vibes and concepts. Fails on structured lookups.",
  },
  {
    id: "hybrid",
    num: "03",
    label: "Hybrid Search",
    color: "#6a1b9a",
    what: "The regex parser extracts structured filters (decade, genre, mood, artist), Qdrant narrows the pool, then vector similarity ranks what's left.",
    how: ["Parse → extract filters", "Apply as Qdrant payload constraints", "Embed remaining text", "Vector search within filtered set", "Boost keyword matches"],
    good: { query: "sad rock from the 80s", result: "Filters to 1980s rock with high sadness scores, then ranks by semantic similarity to 'sad rock'." },
    bad: { query: "old songs about missing home", result: "'Old' isn't in the regex dictionary. No decade filter applied — returns songs from all eras." },
    verdict: "Best general-purpose. Limited by how smart the parser is.",
  },
  {
    id: "natural",
    num: "04",
    label: "Natural Language",
    color: "#2e7d32",
    what: "An LLM reads your query and extracts structured intent — understanding context, slang, and relative time references that no rule system can.",
    how: ["Send query to DeepSeek", "LLM returns structured JSON", "Validate + fallback to regex", "Vector search with LLM-derived filters"],
    good: { query: "old songs about missing home", result: "LLM maps 'old' → 1950s-70s, 'missing home' → sadness. Finds nostalgic classics." },
    good2: { query: "something like bohemian rhapsody", result: "Extracts: artist=Queen, genre=rock, semantic='epic rock with operatic sections'." },
    verdict: "Handles anything. Trade-off: ~3s latency and API cost per query.",
  },
];

function PipelineSection() {
  return (
    <section className="py-24 px-4">
      <div className="max-w-4xl mx-auto">
        <Reveal>
          <p className="text-[10px] uppercase tracking-[0.3em] text-(--color-text-tertiary) mb-3">
            How it works
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-(--color-text) mb-4">
            Four approaches,<br />same problem
          </h2>
          <p className="text-(--color-text-secondary) mb-16 max-w-lg">
            Each pipeline adds a layer of intelligence. The comparison reveals when
            each approach wins — and when it doesn't.
          </p>
        </Reveal>

        <div className="space-y-16">
          {PIPELINES.map((p, i) => (
            <Reveal key={p.id} delay={i * 0.05}>
              <div id={`how-${p.id}`} className="group">
                {/* Header */}
                <div className="flex items-baseline gap-4 mb-6">
                  <span
                    className="text-4xl font-bold opacity-20"
                    style={{ color: p.color }}
                  >
                    {p.num}
                  </span>
                  <div>
                    <h3 className="text-xl font-semibold text-(--color-text)">{p.label}</h3>
                    <p className="text-sm text-(--color-text-secondary) mt-1 max-w-xl leading-relaxed">{p.what}</p>
                  </div>
                </div>

                {/* Pipeline steps */}
                <div className="flex flex-wrap gap-2 mb-6 ml-16">
                  {p.how.map((step, si) => (
                    <motion.div
                      key={si}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: si * 0.1, duration: 0.4 }}
                      className="flex items-center gap-2"
                    >
                      <span
                        className="text-[10px] px-2.5 py-1 rounded-full border"
                        style={{ borderColor: p.color + "40", color: p.color }}
                      >
                        {step}
                      </span>
                      {si < p.how.length - 1 && (
                        <span className="text-(--color-text-tertiary) text-xs">&rarr;</span>
                      )}
                    </motion.div>
                  ))}
                </div>

                {/* Examples */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-16">
                  {/* Good */}
                  <div className="rounded-lg border border-(--color-border) bg-(--color-bg-secondary) p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      <span className="text-[10px] uppercase tracking-wider text-green-500 font-medium">Strength</span>
                    </div>
                    <p className="text-sm text-(--color-text) font-mono mb-1.5">"{p.good.query}"</p>
                    <p className="text-xs text-(--color-text-tertiary) leading-relaxed">{p.good.result}</p>
                  </div>

                  {/* Good 2 or Bad */}
                  {"good2" in p ? (
                    <div className="rounded-lg border border-(--color-border) bg-(--color-bg-secondary) p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        <span className="text-[10px] uppercase tracking-wider text-green-500 font-medium">Strength</span>
                      </div>
                      <p className="text-sm text-(--color-text) font-mono mb-1.5">"{(p as any).good2.query}"</p>
                      <p className="text-xs text-(--color-text-tertiary) leading-relaxed">{(p as any).good2.result}</p>
                    </div>
                  ) : "bad" in p ? (
                    <div className="rounded-lg border border-(--color-border) bg-(--color-bg-secondary) p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                        <span className="text-[10px] uppercase tracking-wider text-red-400 font-medium">Limitation</span>
                      </div>
                      <p className="text-sm text-(--color-text) font-mono mb-1.5">"{(p as any).bad.query}"</p>
                      <p className="text-xs text-(--color-text-tertiary) leading-relaxed">{(p as any).bad.result}</p>
                    </div>
                  ) : null}
                </div>

                {/* Verdict */}
                <p className="text-xs text-(--color-text-tertiary) mt-4 ml-16 italic">
                  {p.verdict}
                </p>

                {/* Divider */}
                {i < PIPELINES.length - 1 && (
                  <div className="mt-16 border-t border-(--color-border) opacity-30" />
                )}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Section 3: Search
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
export function Main() {
  return (
    <div>
      <Hero />
      <PipelineSection />
      <SearchSection />
    </div>
  );
}
