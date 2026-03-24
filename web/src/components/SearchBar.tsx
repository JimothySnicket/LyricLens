import { useState, type KeyboardEvent } from "react";

interface SearchBarProps {
  onSearch: (query: string) => void;
  initialQuery?: string;
}

const SUGGESTIONS = [
  "baby in title, 60s",
  "sad rock",
  "by Michael Jackson",
  "upbeat dance",
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

  function handleSuggestion(suggestion: string) {
    setQuery(suggestion);
    onSearch(suggestion);
  }

  return (
    <div className="w-full">
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="songs that feel like driving at night..."
          className="flex-1 px-4 py-3 rounded-[var(--radius-md)] bg-(--color-surface) border border-(--color-border) text-(--color-text) placeholder:text-(--color-text-tertiary) text-base outline-none focus:border-(--color-accent) transition-colors"
        />
        <button
          onClick={handleSearch}
          className="px-5 py-3 rounded-[var(--radius-md)] bg-(--color-accent) text-(--color-text-inverse) text-sm font-medium hover:bg-(--color-accent-hover) transition-colors whitespace-nowrap"
        >
          Search
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => handleSuggestion(suggestion)}
            className="px-3 py-1 rounded-full text-sm bg-(--color-accent-subtle) text-(--color-text-secondary) hover:text-(--color-text) hover:bg-(--color-bg-tertiary) border border-(--color-border-subtle) transition-colors"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}
