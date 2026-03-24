interface ActiveFilters {
  decades: number[];
  genres: string[];
}

interface FilterPanelProps {
  filters: ActiveFilters;
  onRemoveFilter: (type: "decade" | "genre", value: number | string) => void;
  onAddFilter?: (type: "decade" | "genre", value: number | string) => void;
}

export function FilterPanel({ filters, onRemoveFilter }: FilterPanelProps) {
  const hasFilters = filters.decades.length > 0 || filters.genres.length > 0;

  if (!hasFilters) return null;

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <span className="text-xs text-(--color-text-tertiary) font-medium">Filters:</span>

      {filters.decades.map((decade) => (
        <span
          key={`decade-${decade}`}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-(--color-warning-bg) text-(--color-warning) border border-orange-200 dark:border-orange-900"
        >
          {decade}s
          <button
            onClick={() => onRemoveFilter("decade", decade)}
            className="ml-0.5 hover:opacity-70 transition-opacity leading-none"
            aria-label={`Remove ${decade}s filter`}
          >
            &times;
          </button>
        </span>
      ))}

      {filters.genres.map((genre) => (
        <span
          key={`genre-${genre}`}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-(--color-info-bg) text-(--color-info) border border-blue-200 dark:border-blue-900"
        >
          {genre}
          <button
            onClick={() => onRemoveFilter("genre", genre)}
            className="ml-0.5 hover:opacity-70 transition-opacity leading-none"
            aria-label={`Remove ${genre} filter`}
          >
            &times;
          </button>
        </span>
      ))}
    </div>
  );
}
