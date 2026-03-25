import { useState } from "react";
import type { SearchMode, SearchResponse } from "../lib/types";
import { searchAll } from "../lib/api";
import { SearchBar } from "../components/SearchBar";
import { QueryChips } from "../components/QueryChips";
import { ResultCard } from "../components/ResultCard";

const MODE_INFO: Record<SearchMode, { label: string; description: string; color: string }> = {
  keyword: {
    label: "Keyword",
    description: "Matches exact words in title, lyrics, and artist name",
    color: "var(--color-mode-keyword, #e65100)",
  },
  semantic: {
    label: "Semantic",
    description: "Finds songs by meaning and vibe, not matching words",
    color: "var(--color-mode-semantic, #1565c0)",
  },
  hybrid: {
    label: "Hybrid",
    description: "Filters first, then ranks by meaning + keyword boost",
    color: "var(--color-mode-hybrid, #6a1b9a)",
  },
};

const MODES: SearchMode[] = ["keyword", "semantic", "hybrid"];

export function Search() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Record<SearchMode, SearchResponse> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  async function handleSearch(q: string) {
    if (!q.trim()) return;
    setQuery(q);
    setLoading(true);
    setError(null);
    setExpandedCards(new Set());
    try {
      const res = await searchAll(q);
      setResults(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
      setResults(null);
    } finally {
      setLoading(false);
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
    <div className="max-w-[1400px] mx-auto px-4 py-8">
      {/* Header */}
      {!hasResults && !loading && (
        <div className="text-center space-y-2 pb-4 max-w-2xl mx-auto">
          <h1 className="text-3xl font-semibold text-(--color-text)">LyricLens</h1>
          <p className="text-(--color-text-secondary) text-base">
            Search 2,742 chart hits three ways. Same query, three approaches — see what each finds.
          </p>
        </div>
      )}

      {/* Search bar */}
      <div className="max-w-2xl mx-auto mb-6">
        <SearchBar onSearch={handleSearch} initialQuery={query} />
      </div>

      {/* Loading */}
      {loading && (
        <div className="py-16 flex items-center justify-center gap-3">
          <div className="w-4 h-4 rounded-full border-2 border-(--color-border) border-t-(--color-accent) animate-spin" />
          <span className="text-sm text-(--color-text-secondary)">Searching all three modes…</span>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="max-w-2xl mx-auto rounded-[var(--radius-md)] border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950 px-4 py-3">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Parsed query interpretation */}
      {!loading && parsedQuery && (
        <div className="max-w-2xl mx-auto mb-6">
          <QueryChips interpretations={parsedQuery.interpretations} />
        </div>
      )}

      {/* Three-column results */}
      {!loading && hasResults && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {MODES.map((mode) => {
            const res = results[mode];
            const info = MODE_INFO[mode];
            const count = res?.results?.length ?? 0;

            return (
              <div key={mode} className="flex flex-col">
                {/* Column header */}
                <div
                  className="rounded-t-[var(--radius-md)] px-4 py-3 border border-b-0 border-(--color-border) bg-(--color-surface)"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: info.color }}
                    />
                    <h2 className="text-sm font-semibold text-(--color-text)">{info.label}</h2>
                    <span className="ml-auto text-xs text-(--color-text-tertiary)">
                      {res?.searchTimeMs ?? 0}ms
                    </span>
                  </div>
                  <p className="text-xs text-(--color-text-tertiary)">{info.description}</p>
                  <div className="mt-2 flex items-center gap-3 text-xs text-(--color-text-tertiary)">
                    <span>{count} results</span>
                    {res?.totalFiltered && (
                      <span>from {res.totalFiltered} songs</span>
                    )}
                  </div>
                </div>

                {/* Results list */}
                <div className="flex-1 border border-t-0 border-(--color-border) rounded-b-[var(--radius-md)] overflow-hidden">
                  {count > 0 ? (
                    <div className="divide-y divide-(--color-border)">
                      {res.results.slice(0, 10).map((result, i) => (
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
                    <div className="px-4 py-8 text-center text-xs text-(--color-text-tertiary)">
                      No results
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {!loading && !hasResults && !error && (
        <div className="max-w-2xl mx-auto pt-6">
          <p className="text-xs font-semibold text-(--color-text-secondary) uppercase tracking-wide mb-4">
            Try a search to see the difference
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            {[
              { q: "sad rock", why: "Keyword finds rock songs. Semantic finds the sad vibes." },
              { q: "songs that feel like driving at night", why: "Keyword matches literal words. Semantic gets the concept." },
              { q: "by Michael Jackson", why: "All three filter by artist, but rank differently." },
              { q: "upbeat party music from the 80s", why: "Decade filter + mood + genre + semantic vibe." },
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
  );
}

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
        {/* Rank */}
        <span className="text-xs font-mono text-(--color-text-tertiary) w-4 shrink-0 pt-0.5">
          {rank}
        </span>

        {/* Score pill */}
        <span
          className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 text-white"
          style={{ backgroundColor: modeColor }}
        >
          {scoreDisplay}
        </span>

        {/* Song info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm font-medium text-(--color-text) truncate">{song.title}</span>
          </div>
          <span className="text-xs text-(--color-text-secondary) block truncate">{song.artist}</span>
          <div className="mt-1 flex flex-wrap gap-1">
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-(--color-bg-tertiary) text-(--color-text-tertiary)">
              {song.genre}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-(--color-bg-tertiary) text-(--color-text-tertiary)">
              {song.year}
            </span>
          </div>
        </div>

        <span className="text-[10px] text-(--color-text-tertiary) shrink-0">
          {expanded ? "\u25B2" : "\u25BC"}
        </span>
      </button>

      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-(--color-border) text-xs space-y-2">
          <p className="text-(--color-text-tertiary)">{matchReason}</p>
          {song.lyrics && (
            <p className="text-(--color-text-secondary) leading-relaxed whitespace-pre-line line-clamp-4">
              {song.lyrics.slice(0, 300)}
            </p>
          )}
          {song.album && (
            <p className="text-(--color-text-tertiary)">Album: {song.album}</p>
          )}
        </div>
      )}
    </div>
  );
}
