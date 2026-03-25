import type { SearchResult } from "../lib/types";

interface ResultCardProps {
  result: SearchResult;
  expanded: boolean;
  onToggle: () => void;
}

export function ResultCard({ result, expanded, onToggle }: ResultCardProps) {
  const { song, score, matchReason, mode } = result;
  const scoreDisplay = mode === "keyword"
    ? score.toFixed(1)
    : score.toFixed(3);

  return (
    <div
      className="border border-(--color-border) rounded-[var(--radius-md)] bg-(--color-surface) hover:border-(--color-accent) transition-colors overflow-hidden"
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left px-4 py-4 flex items-start gap-4"
      >
        {/* Score badge */}
        <div className="shrink-0 w-10 h-10 rounded-[var(--radius-sm)] bg-(--color-accent) flex items-center justify-center">
          <span className="text-xs font-bold text-(--color-text-inverse)">{scoreDisplay}</span>
        </div>

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="font-semibold text-(--color-text) truncate">{song.title}</span>
            <span className="text-sm text-(--color-text-secondary)">{song.artist}</span>
          </div>
          <p className="text-xs text-(--color-text-tertiary) mt-0.5">{matchReason}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Tag label={song.genre} type="genre" />
            <Tag label={`${song.decade}s`} type="decade" />
          </div>
        </div>

        {/* Year + expand indicator */}
        <div className="shrink-0 flex flex-col items-end gap-1">
          <span className="text-xs text-(--color-text-tertiary)">{song.year}</span>
          <span className="text-xs text-(--color-text-tertiary)">{expanded ? "\u25B2" : "\u25BC"}</span>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-(--color-border-subtle) pt-4 space-y-4">
          {/* Lyrics preview */}
          {song.lyrics && (
            <div>
              <h4 className="text-xs font-semibold text-(--color-text-secondary) uppercase tracking-wide mb-2">
                Lyrics
              </h4>
              <p className="text-sm text-(--color-text-secondary) leading-relaxed whitespace-pre-line line-clamp-8">
                {song.lyrics.slice(0, 500)}
                {song.lyrics.length > 500 ? "\u2026" : ""}
              </p>
            </div>
          )}

          {/* Album + writers */}
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-(--color-text-tertiary)">
            {song.album && <span>Album: {song.album}</span>}
            {song.chartPosition > 0 && <span>Chart: #{song.chartPosition}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

function Tag({ label, type }: { label: string; type: "genre" | "decade" }) {
  const styles: Record<string, string> = {
    genre: "bg-(--color-info-bg) text-(--color-info)",
    decade: "bg-(--color-warning-bg) text-(--color-warning)",
  };

  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${styles[type]}`}
    >
      {label}
    </span>
  );
}
