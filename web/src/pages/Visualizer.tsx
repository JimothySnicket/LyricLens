import { useState, useEffect, useRef } from "react";
import { EmbeddingViz } from "../components/EmbeddingViz";
import { getVizData } from "../lib/api";
import type { VizData } from "../lib/types";

type ColorBy = "genre" | "decade" | "topic" | "cluster";
type VizPoint = VizData["points"][number];

const COLOR_BY_OPTIONS: { value: ColorBy; label: string }[] = [
  { value: "genre", label: "Genre" },
  { value: "decade", label: "Decade" },
  { value: "topic", label: "Topic" },
  { value: "cluster", label: "Cluster" },
];

const GENRE_COLORS: Record<string, string> = {
  rock: "#4caf50",
  pop: "#2196f3",
  country: "#ff9800",
  jazz: "#9c27b0",
  blues: "#f44336",
  reggae: "#795548",
};

const DECADE_COLORS: Record<number, string> = {
  1950: "#e91e63",
  1960: "#9c27b0",
  1970: "#3f51b5",
  1980: "#009688",
  1990: "#ff5722",
  2000: "#607d8b",
  2010: "#795548",
};

const TOPIC_COLORS: Record<string, string> = {
  sadness: "#5c6bc0",
  romantic: "#ec407a",
  intensity: "#ef5350",
  dating: "#ab47bc",
  mature: "#8d6e63",
  feelings: "#42a5f5",
  "night/time": "#7e57c2",
  "world/life": "#26a69a",
  communication: "#66bb6a",
  music: "#ffa726",
};

function getLegendEntries(
  points: VizPoint[],
  colorBy: ColorBy
): { label: string; color: string }[] {
  if (colorBy === "genre") {
    const genres = Array.from(new Set(points.map((p) => p.genre?.toLowerCase()).filter(Boolean)));
    return genres.map((g) => ({ label: g, color: GENRE_COLORS[g] ?? "#888" }));
  }
  if (colorBy === "decade") {
    const decades = Array.from(new Set(points.map((p) => p.decade).filter(Boolean))).sort();
    return decades.map((d) => ({ label: `${d}s`, color: DECADE_COLORS[d] ?? "#888" }));
  }
  if (colorBy === "topic") {
    const topics = Array.from(new Set(points.map((p) => p.topic?.toLowerCase()).filter(Boolean)));
    return topics.map((t) => ({ label: t, color: TOPIC_COLORS[t] ?? "#888" }));
  }
  return [];
}

export function Visualizer() {
  const [points, setPoints] = useState<VizPoint[]>([]);
  const [colorBy, setColorBy] = useState<ColorBy>("genre");
  const [selected, setSelected] = useState<VizPoint | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const queryRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getVizData()
      .then((data) => {
        setPoints(data);
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load viz data");
        setLoading(false);
      });
  }, []);

  const legendEntries = getLegendEntries(points, colorBy);

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      {/* Header */}
      <div className="px-6 pt-6 pb-3 border-b border-(--color-border) bg-(--color-surface) flex-shrink-0">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-semibold text-(--color-text)">Embedding Space</h1>
              <p className="text-sm text-(--color-text-secondary) mt-0.5">
                Songs positioned by semantic similarity — rotate to explore clusters
              </p>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Query input */}
              <div className="flex items-center gap-2">
                <input
                  ref={queryRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Project a query..."
                  className="text-sm px-3 py-1.5 rounded-(--radius-sm) border border-(--color-border) bg-(--color-bg) text-(--color-text) placeholder:text-(--color-text-tertiary) focus:outline-none focus:border-(--color-accent) w-52"
                />
                <button
                  type="button"
                  className="text-sm px-3 py-1.5 rounded-(--radius-sm) bg-(--color-accent) text-(--color-text-inverse) hover:bg-(--color-accent-hover) transition-colors disabled:opacity-40"
                  disabled
                  title="Query projection coming soon"
                >
                  Project
                </button>
              </div>

              {/* Color-by toggle */}
              <div className="flex items-center gap-1 bg-(--color-bg-secondary) rounded-(--radius-sm) p-1">
                {COLOR_BY_OPTIONS.map((opt) => (
                  <button
                    type="button"
                    key={opt.value}
                    onClick={() => setColorBy(opt.value)}
                    className={`text-xs px-2.5 py-1 rounded transition-colors ${
                      colorBy === opt.value
                        ? "bg-(--color-accent) text-(--color-text-inverse)"
                        : "text-(--color-text-secondary) hover:text-(--color-text)"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex flex-1 min-h-0">
        {/* Plot area */}
        <div className="flex-1 relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-sm text-(--color-text-secondary)">Loading embedding data…</div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-sm text-(--color-warning) bg-(--color-warning-bg) px-4 py-3 rounded-(--radius-md)">
                {error}
              </div>
            </div>
          )}

          {!loading && !error && points.length > 0 && (
            <EmbeddingViz
              points={points}
              colorBy={colorBy}
              onSelect={setSelected}
              selectedId={selected?.id}
            />
          )}
        </div>

        {/* Right sidebar */}
        <div
          className="w-60 flex-shrink-0 flex flex-col gap-4 p-4 border-l border-(--color-border) bg-(--color-surface) overflow-y-auto"
        >
          {/* Legend */}
          <div>
            <p className="text-xs font-medium text-(--color-text-secondary) uppercase tracking-wider mb-2">
              Color by {colorBy}
            </p>
            <div className="flex flex-col gap-1.5">
              {legendEntries.map((entry) => (
                <div key={entry.label} className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0 bg-[var(--dot-color)]"
                    // eslint-disable-next-line react/forbid-dom-props
                    style={{ "--dot-color": entry.color } as React.CSSProperties}
                  />
                  <span className="text-xs text-(--color-text-secondary) capitalize">
                    {entry.label}
                  </span>
                </div>
              ))}
              {legendEntries.length === 0 && colorBy === "cluster" && (
                <p className="text-xs text-(--color-text-tertiary)">
                  Colors assigned automatically per cluster
                </p>
              )}
            </div>
          </div>

          {/* Selected song detail */}
          {selected && (
            <div className="border-t border-(--color-border) pt-4">
              <p className="text-xs font-medium text-(--color-text-secondary) uppercase tracking-wider mb-2">
                Selected
              </p>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-(--color-text) leading-snug">
                  {selected.title}
                </p>
                <p className="text-xs text-(--color-text-secondary)">{selected.artist}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs px-1.5 py-0.5 rounded bg-(--color-bg-secondary) text-(--color-text-secondary) capitalize">
                    {selected.genre}
                  </span>
                  <span className="text-xs text-(--color-text-tertiary)">{selected.decade}s</span>
                </div>
                <p className="text-xs text-(--color-text-tertiary) mt-1 capitalize">
                  {selected.topic}
                </p>
              </div>
              <a
                href={`/?q=${encodeURIComponent(selected.title + " " + selected.artist)}`}
                className="mt-3 block text-center text-xs px-3 py-1.5 rounded-(--radius-sm) border border-(--color-border) text-(--color-text-secondary) hover:border-(--color-accent) hover:text-(--color-text) transition-colors"
              >
                Find Similar
              </a>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="mt-1.5 w-full text-xs text-(--color-text-tertiary) hover:text-(--color-text-secondary) transition-colors"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Cluster insight */}
          <div className="border-t border-(--color-border) pt-4 mt-auto">
            <p className="text-xs font-medium text-(--color-text-secondary) uppercase tracking-wider mb-2">
              How it works
            </p>
            <p className="text-xs text-(--color-text-tertiary) leading-relaxed">
              Songs cluster by emotional theme, not just genre. A slow country ballad and a soul
              R&amp;B track may land closer together than two rock songs with very different moods.
            </p>
            {!loading && points.length > 0 && (
              <p className="text-xs text-(--color-text-tertiary) mt-2">
                {points.length.toLocaleString()} songs projected into 3D space using UMAP.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
