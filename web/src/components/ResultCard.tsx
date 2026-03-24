import type { SearchResult } from "../lib/types";
import { SCORE_LABELS } from "../lib/types";

interface ResultCardProps {
  result: SearchResult;
  expanded: boolean;
  onToggle: () => void;
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-(--color-text-secondary) w-24 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-(--color-bg-tertiary) overflow-hidden">
        <div
          className="h-full rounded-full bg-(--color-accent)"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-(--color-text-tertiary) w-7 text-right">{pct}%</span>
    </div>
  );
}

export function ResultCard({ result, expanded, onToggle }: ResultCardProps) {
  const { song, score, matchReason } = result;
  const scoreDisplay = (score * 100).toFixed(0);

  const topicScores = Object.entries(song.scores)
    .filter(([key]) => key in SCORE_LABELS)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <div
      className="border border-(--color-border) rounded-[var(--radius-md)] bg-(--color-surface) hover:border-(--color-accent) transition-colors overflow-hidden"
    >
      <button
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
            {song.topic && <Tag label={song.topic} type="topic" />}
          </div>
        </div>

        {/* Year + expand indicator */}
        <div className="shrink-0 flex flex-col items-end gap-1">
          <span className="text-xs text-(--color-text-tertiary)">{song.year}</span>
          <span className="text-xs text-(--color-text-tertiary)">{expanded ? "▲" : "▼"}</span>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-(--color-border-subtle) pt-4 space-y-5">
          {/* Lyrics preview */}
          {song.lyrics && (
            <div>
              <h4 className="text-xs font-semibold text-(--color-text-secondary) uppercase tracking-wide mb-2">
                Lyrics Preview
              </h4>
              <p className="text-sm text-(--color-text-secondary) leading-relaxed line-clamp-4 font-mono">
                {song.lyrics.slice(0, 300)}
                {song.lyrics.length > 300 ? "…" : ""}
              </p>
            </div>
          )}

          {/* Audio features */}
          <div>
            <h4 className="text-xs font-semibold text-(--color-text-secondary) uppercase tracking-wide mb-2">
              Audio Features
            </h4>
            <div className="space-y-1.5">
              <ScoreBar label="Valence" value={song.valence} />
              <ScoreBar label="Energy" value={song.energy} />
              <ScoreBar label="Danceability" value={song.danceability} />
              <ScoreBar label="Acousticness" value={song.acousticness} />
            </div>
          </div>

          {/* Topic scores */}
          {topicScores.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-(--color-text-secondary) uppercase tracking-wide mb-2">
                Sentiment / Topic Scores
              </h4>
              <div className="space-y-1.5">
                {topicScores.map(([key, val]) => (
                  <ScoreBar key={key} label={SCORE_LABELS[key] ?? key} value={val} />
                ))}
              </div>
            </div>
          )}

          {/* Chart position */}
          {song.chartPosition > 0 && (
            <p className="text-xs text-(--color-text-tertiary)">
              Chart position: #{song.chartPosition}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Tag({ label, type }: { label: string; type: "genre" | "decade" | "topic" }) {
  const styles: Record<string, string> = {
    genre: "bg-(--color-info-bg) text-(--color-info)",
    decade: "bg-(--color-warning-bg) text-(--color-warning)",
    topic: "bg-(--color-accent-subtle) text-(--color-text-secondary)",
  };

  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${styles[type]}`}
    >
      {label}
    </span>
  );
}
