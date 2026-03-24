import type { SearchResponse } from "../lib/types";

interface UnderTheHoodProps {
  response: SearchResponse;
  expanded: boolean;
  onToggle: () => void;
}

function getPipelineSteps(response: SearchResponse): string[] {
  const { mode, parsedQuery, totalFiltered, results, searchTimeMs } = response;
  const resultCount = results.length;

  const steps: string[] = [];

  // Step 1: Query parsing
  const termList = parsedQuery.terms.length > 0
    ? `"${parsedQuery.terms.join('", "')}"`
    : "no keyword terms";
  steps.push(`Query parsed — extracted ${termList}. Scopes: ${[
    parsedQuery.scopeTitle && "title",
    parsedQuery.scopeLyrics && "lyrics",
    parsedQuery.scopeArtist && "artist",
  ].filter(Boolean).join(", ") || "all fields"}.`);

  // Step 2: Filter application
  const filterParts: string[] = [];
  if (parsedQuery.filters.decades.length > 0) {
    filterParts.push(`decades: ${parsedQuery.filters.decades.map((d) => `${d}s`).join(", ")}`);
  }
  if (parsedQuery.filters.genres.length > 0) {
    filterParts.push(`genres: ${parsedQuery.filters.genres.join(", ")}`);
  }
  if (parsedQuery.filters.artistHint.length > 0) {
    filterParts.push(`artist: ${parsedQuery.filters.artistHint.join(", ")}`);
  }
  if (filterParts.length > 0) {
    steps.push(`Filters applied — narrowed corpus to ${totalFiltered} songs (${filterParts.join("; ")}).`);
  } else {
    steps.push(`No filters detected — searching full corpus of ${totalFiltered} songs.`);
  }

  // Step 3: Mode-specific ranking
  if (mode === "keyword") {
    steps.push(
      `Keyword ranking — scored ${totalFiltered} songs using TF-IDF term frequency against title, lyrics, and artist fields.`
    );
  } else if (mode === "semantic") {
    steps.push(
      `Semantic ranking — embedded query using sentence-transformers, then computed cosine similarity against ${totalFiltered} pre-computed song vectors.`
    );
    if (parsedQuery.semanticText) {
      steps.push(
        `Semantic text used for embedding: "${parsedQuery.semanticText}"`
      );
    }
  } else if (mode === "hybrid") {
    steps.push(
      `Hybrid ranking — applied keyword filters first (${totalFiltered} songs passed), then re-ranked using semantic similarity for final ordering.`
    );
    if (parsedQuery.semanticText) {
      steps.push(
        `Semantic re-rank text: "${parsedQuery.semanticText}"`
      );
    }
  }

  // Step 4: Results
  steps.push(
    `Returned top ${resultCount} results in ${searchTimeMs}ms.`
  );

  return steps;
}

export function UnderTheHood({ response, expanded, onToggle }: UnderTheHoodProps) {
  const steps = getPipelineSteps(response);

  return (
    <div className="border border-(--color-border) rounded-[var(--radius-md)] overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-(--color-bg-secondary) hover:bg-(--color-bg-tertiary) transition-colors text-left"
      >
        <span className="text-sm font-medium text-(--color-text-secondary)">
          Under the hood: how this search worked
        </span>
        <span className="text-xs text-(--color-text-tertiary) ml-2">
          {expanded ? "▲" : "▼"}
        </span>
      </button>

      {expanded && (
        <div className="px-4 py-4 bg-(--color-surface)">
          <ol className="space-y-3">
            {steps.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="shrink-0 w-5 h-5 rounded-full bg-(--color-accent) text-(--color-text-inverse) text-xs flex items-center justify-center font-medium">
                  {i + 1}
                </span>
                <p className="text-sm text-(--color-text-secondary) leading-relaxed">{step}</p>
              </li>
            ))}
          </ol>

          <div className="mt-4 pt-3 border-t border-(--color-border-subtle) flex flex-wrap gap-4 text-xs text-(--color-text-tertiary)">
            <span>Mode: <span className="font-medium text-(--color-text-secondary)">{response.mode}</span></span>
            <span>Results: <span className="font-medium text-(--color-text-secondary)">{response.results.length}</span></span>
            <span>Corpus searched: <span className="font-medium text-(--color-text-secondary)">{response.totalFiltered}</span></span>
            <span>Time: <span className="font-medium text-(--color-text-secondary)">{response.searchTimeMs}ms</span></span>
          </div>
        </div>
      )}
    </div>
  );
}
