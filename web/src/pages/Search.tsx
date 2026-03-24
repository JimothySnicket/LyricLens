import { useState } from "react";
import type { SearchMode, SearchResponse } from "../lib/types";
import { search } from "../lib/api";
import { SearchBar } from "../components/SearchBar";
import { ModeToggle } from "../components/ModeToggle";
import { FilterPanel } from "../components/FilterPanel";
import { ResultCard } from "../components/ResultCard";
import { QueryChips } from "../components/QueryChips";
import { UnderTheHood } from "../components/UnderTheHood";

const CAPABILITIES = [
  {
    title: "Keyword Search",
    description: "Find songs by exact words in titles, lyrics, or artist names.",
    example: "baby in title",
  },
  {
    title: "Semantic Search",
    description: "Describe a feeling or vibe — the engine finds songs that match the meaning.",
    example: "songs that feel like driving at night",
  },
  {
    title: "Hybrid Search",
    description: "Combine filters with semantic ranking for precise, meaningful results.",
    example: "sad rock 80s",
  },
];

export function Search() {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<SearchMode>("semantic");
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [hoodExpanded, setHoodExpanded] = useState(false);
  const [activeFilters, setActiveFilters] = useState<{ decades: number[]; genres: string[] }>({
    decades: [],
    genres: [],
  });

  async function runSearch(q: string, m: SearchMode) {
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    setExpandedCards(new Set());
    setHoodExpanded(false);
    try {
      const res = await search(q, m);
      setResponse(res);
      // Sync active filters from parsed query
      setActiveFilters({
        decades: res.parsedQuery.filters.decades,
        genres: res.parsedQuery.filters.genres,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
      setResponse(null);
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(q: string) {
    setQuery(q);
    runSearch(q, mode);
  }

  function handleModeChange(m: SearchMode) {
    setMode(m);
    if (query) {
      runSearch(query, m);
    }
  }

  function toggleCard(id: string) {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function removeFilter(type: "decade" | "genre", value: number | string) {
    setActiveFilters((prev) => {
      if (type === "decade") {
        return { ...prev, decades: prev.decades.filter((d) => d !== value) };
      }
      return { ...prev, genres: prev.genres.filter((g) => g !== value) };
    });
  }

  const hasResults = response && response.results.length > 0;
  const hasQuery = query.length > 0;

  return (
    <div className="py-10 space-y-8">
      {/* Hero + Search zone */}
      <section className="space-y-6">
        {!hasQuery && (
          <div className="text-center space-y-2 pb-2">
            <h1 className="text-3xl font-semibold text-(--color-text)">LyricLens</h1>
            <p className="text-(--color-text-secondary) text-base">
              Search 5,000+ songs by keyword, meaning, or vibe.
            </p>
          </div>
        )}

        <SearchBar onSearch={handleSearch} initialQuery={query} />

        <ModeToggle mode={mode} onModeChange={handleModeChange} />
      </section>

      {/* Loading */}
      {loading && (
        <div className="py-12 flex items-center justify-center gap-3">
          <div className="w-4 h-4 rounded-full border-2 border-(--color-border) border-t-(--color-accent) animate-spin" />
          <span className="text-sm text-(--color-text-secondary)">Searching…</span>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="rounded-[var(--radius-md)] border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950 px-4 py-3">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          <p className="text-xs text-(--color-text-tertiary) mt-1">
            The backend may not be running yet. This is expected during development.
          </p>
        </div>
      )}

      {/* Results zone */}
      {!loading && response && (
        <section className="space-y-4">
          {/* Query chips + filters */}
          <div className="space-y-2">
            <QueryChips interpretations={response.parsedQuery.interpretations} />
            <FilterPanel
              filters={activeFilters}
              onRemoveFilter={removeFilter}
            />
          </div>

          {/* Result count */}
          <div className="flex items-center justify-between text-xs text-(--color-text-tertiary)">
            <span>
              {hasResults
                ? `${response.results.length} results from ${response.totalFiltered} songs`
                : "No results found"}
            </span>
            <span>{response.searchTimeMs}ms</span>
          </div>

          {/* Cards */}
          {hasResults ? (
            <div className="space-y-2">
              {response.results.map((result) => (
                <ResultCard
                  key={result.song.id}
                  result={result}
                  expanded={expandedCards.has(result.song.id)}
                  onToggle={() => toggleCard(result.song.id)}
                />
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-(--color-text-secondary) text-sm">
                No songs matched your query. Try a different search or mode.
              </p>
            </div>
          )}

          {/* Under the Hood */}
          <UnderTheHood
            response={response}
            expanded={hoodExpanded}
            onToggle={() => setHoodExpanded((v) => !v)}
          />
        </section>
      )}

      {/* Empty state / capabilities */}
      {!loading && !hasQuery && !response && (
        <section className="pt-4">
          <h2 className="text-sm font-semibold text-(--color-text-secondary) uppercase tracking-wide mb-4">
            What you can search for
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {CAPABILITIES.map((cap) => (
              <div
                key={cap.title}
                className="rounded-[var(--radius-md)] border border-(--color-border) bg-(--color-surface) p-4 space-y-1.5"
              >
                <h3 className="text-sm font-semibold text-(--color-text)">{cap.title}</h3>
                <p className="text-xs text-(--color-text-secondary) leading-relaxed">
                  {cap.description}
                </p>
                <p className="text-xs text-(--color-text-tertiary) italic">e.g. "{cap.example}"</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
