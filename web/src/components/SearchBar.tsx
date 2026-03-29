import { useState, type KeyboardEvent } from "react";

interface SearchBarProps {
  onSearch: (query: string) => void;
  initialQuery?: string;
}

const SUGGESTIONS = [
  { q: "baby in the title from the 60s", hint: "Exact words + structure" },
  { q: "songs about heartbreak", hint: "Meaning over words" },
  { q: "heartbreak 90s r&b", hint: "Mood + genre + decade" },
  { q: "dive bar at 2am", hint: "Scenario \u2192 search terms" },
];

export function SearchBar({ onSearch, initialQuery = "" }: SearchBarProps) {
  const [query, setQuery] = useState(initialQuery);

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && query.trim()) {
      onSearch(query.trim());
    }
  }

  function handleSearch() {
    if (query.trim()) {
      onSearch(query.trim());
    }
  }

  function handleSuggestion(q: string) {
    setQuery(q);
    onSearch(q);
  }

  return (
    <div className="w-full">
      <div className="flex gap-2">
        <input
          id="search-query"
          name="search-query"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="dive bar at 2am..."
          aria-label="Search query"
          className="flex-1 px-4 py-3 rounded-[var(--radius-md)] bg-(--color-surface) border border-(--color-border) text-(--color-text) placeholder:text-(--color-text-tertiary) text-base outline-none focus:border-(--color-accent) transition-colors"
        />
        <button
          onClick={handleSearch}
          className="px-5 py-3 rounded-[var(--radius-md)] bg-(--color-accent) text-(--color-text-inverse) text-sm font-medium hover:bg-(--color-accent-hover) transition-colors whitespace-nowrap"
        >
          Search
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s.q}
            type="button"
            onClick={() => handleSuggestion(s.q)}
            className="text-left p-3 rounded-lg border border-(--color-border) hover:border-(--color-text-tertiary) transition-colors group"
          >
            <span className="block text-xs font-medium text-(--color-text) group-hover:text-(--color-text) leading-snug">
              {s.q}
            </span>
            <span className="block text-[10px] text-(--color-text-tertiary) mt-1">
              {s.hint}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
