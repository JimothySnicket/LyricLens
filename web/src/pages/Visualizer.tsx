import { useState, useEffect, useMemo } from "react";
import { EmbeddingViz } from "../components/EmbeddingViz";
import { getVizData, projectQuery } from "../lib/api";
import type { VizData, ProjectionResult } from "../lib/types";

type Lens = "genre" | "decade" | "cluster";
type VizPoint = VizData["points"][number];

const LENS_OPTIONS: { value: Lens; label: string }[] = [
  { value: "genre", label: "Genre" },
  { value: "decade", label: "Decade" },
  { value: "cluster", label: "Cluster" },
];

const EMOTION_COLORS: Record<string, string> = {
  joy: "#fbbf24",
  sadness: "#60a5fa",
  anger: "#ef4444",
  fear: "#a78bfa",
  surprise: "#34d399",
  disgust: "#f97316",
  neutral: "#9ca3af",
};

const EMOTION_KEYS = ["joy", "sadness", "anger", "fear", "surprise", "disgust", "neutral"];

const META_GENRE_COLORS: Record<string, string> = {
  Pop: "#2196f3",
  Rock: "#4caf50",
  "R&B": "#ec407a",
  "Hip-Hop": "#ff9800",
  Country: "#8d6e63",
  Electronic: "#00bcd4",
  Folk: "#a1887f",
  Latin: "#f44336",
  World: "#9c27b0",
  Other: "#78909c",
};

const DECADE_COLORS: Record<number, string> = {
  1950: "#e91e63",
  1960: "#9c27b0",
  1970: "#3f51b5",
  1980: "#009688",
  1990: "#ff5722",
  2000: "#607d8b",
  2010: "#2196f3",
  2020: "#795548",
};

const CLUSTER_COLORS = [
  "#e53935", "#8e24aa", "#1e88e5", "#00897b", "#43a047",
  "#fb8c00", "#6d4c41", "#546e7a", "#d81b60", "#5e35b1",
];

/* -------------------------------------------------------------------------- */
/*  useLegendItems hook                                                       */
/* -------------------------------------------------------------------------- */

interface LegendItem {
  key: string;
  label: string;
  color: string;
  count: number;
}

function useLegendItems(
  points: VizPoint[],
  lens: Lens,
  genreDrillDown: string | null,
): LegendItem[] {
  return useMemo(() => {
    if (points.length === 0) return [];

    if (lens === "genre") {
      if (genreDrillDown) {
        const counts = new Map<string, number>();
        for (const p of points) {
          if (p.metaGenre === genreDrillDown) {
            counts.set(p.genre, (counts.get(p.genre) || 0) + 1);
          }
        }
        const baseColor = META_GENRE_COLORS[genreDrillDown] ?? "#888";
        return Array.from(counts.entries())
          .sort(([, a], [, b]) => b - a)
          .map(([genre, count]) => ({
            key: genre,
            label: genre,
            color: baseColor,
            count,
          }));
      }
      const counts = new Map<string, number>();
      for (const p of points) {
        const mg = p.metaGenre || "Other";
        counts.set(mg, (counts.get(mg) || 0) + 1);
      }
      return Array.from(counts.entries())
        .sort(([, a], [, b]) => b - a)
        .map(([mg, count]) => ({
          key: mg,
          label: mg,
          color: META_GENRE_COLORS[mg] ?? "#888",
          count,
        }));
    }

    if (lens === "decade") {
      const counts = new Map<number, number>();
      for (const p of points) {
        counts.set(p.decade, (counts.get(p.decade) || 0) + 1);
      }
      return Array.from(counts.entries())
        .sort(([a], [b]) => a - b)
        .map(([decade, count]) => ({
          key: String(decade),
          label: `${decade}s`,
          color: DECADE_COLORS[decade] ?? "#888",
          count,
        }));
    }

    // cluster
    const counts = new Map<number, number>();
    for (const p of points) {
      counts.set(p.cluster, (counts.get(p.cluster) || 0) + 1);
    }
    return Array.from(counts.entries())
      .sort(([a], [b]) => a - b)
      .map(([cluster, count]) => ({
        key: String(cluster),
        label: `Cluster ${cluster}`,
        color: CLUSTER_COLORS[cluster % CLUSTER_COLORS.length],
        count,
      }));
  }, [points, lens, genreDrillDown]);
}

/* -------------------------------------------------------------------------- */
/*  useDimmedIds hook                                                         */
/* -------------------------------------------------------------------------- */

function useDimmedIds(
  points: VizPoint[],
  lens: Lens,
  activeFilter: string | null,
  genreDrillDown: string | null,
): Set<string> | null {
  return useMemo(() => {
    if (!activeFilter) return null;

    const dimmed = new Set<string>();
    for (const p of points) {
      let match = false;
      if (lens === "genre") {
        if (genreDrillDown) {
          match = p.genre === activeFilter;
        } else {
          match = p.metaGenre === activeFilter;
        }
      } else if (lens === "decade") {
        match = String(p.decade) === activeFilter;
      } else {
        match = String(p.cluster) === activeFilter;
      }
      if (!match) dimmed.add(p.id);
    }
    return dimmed.size === points.length ? null : dimmed;
  }, [points, lens, activeFilter, genreDrillDown]);
}

/* -------------------------------------------------------------------------- */
/*  SongDetail (right panel)                                                  */
/* -------------------------------------------------------------------------- */

function SongDetail({
  point,
  projection,
  onSelectId,
  onDismiss,
}: {
  point: VizPoint | null;
  projection: ProjectionResult | null;
  onSelectId: (id: string) => void;
  onDismiss: () => void;
}) {
  // Projection results (no song selected)
  if (!point && projection) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-(--color-text-tertiary) mb-1">
              Query Projection
            </p>
            <p className="text-sm font-medium text-[#22d3ee]">"{projection.query}"</p>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="text-(--color-text-tertiary) hover:text-(--color-text) text-sm cursor-pointer shrink-0"
          >
            &#10005;
          </button>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-(--color-text-tertiary) mb-2">
            Nearest Songs
          </p>
          <div className="space-y-1.5">
            {projection.nearest.map((n, i) => (
              <button
                type="button"
                key={n.id}
                onClick={() => onSelectId(n.id)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-(--radius-sm) bg-(--color-bg-tertiary) hover:bg-(--color-border) transition-colors cursor-pointer text-left"
              >
                <span className="text-[10px] font-mono font-semibold text-(--color-text-tertiary) w-4 text-center">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-(--color-text) truncate">{n.title}</p>
                  <p className="text-[10px] text-(--color-text-tertiary)">{n.artist}</p>
                </div>
                <span className="text-[10px] font-mono text-(--color-text-tertiary)">{n.sim.toFixed(2)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Nothing selected — default intro
  if (!point) {
    return (
      <div className="p-4 space-y-3">
        <h3 className="text-sm font-semibold text-(--color-text)">Embedding Space</h3>
        <p className="text-xs text-(--color-text-secondary) leading-relaxed">
          2,742 Billboard hits mapped by semantic similarity. Songs that share lyrical themes cluster together regardless of genre or era.
        </p>
        <div className="space-y-1.5 text-[11px] text-(--color-text-tertiary)">
          <p><strong className="text-(--color-text-secondary)">Filter</strong> — click a genre, decade, or cluster chip above to highlight a subset</p>
          <p><strong className="text-(--color-text-secondary)">Explore</strong> — click any point to see its detail and nearest neighbors</p>
          <p><strong className="text-(--color-text-secondary)">Project</strong> — type a query to see where it would land in the space</p>
        </div>
        <div className="pt-2 border-t border-(--color-border-subtle)">
          <p className="text-[10px] text-(--color-text-tertiary)">
            768D nomic embeddings → UMAP 3D · colored by emotion
          </p>
        </div>
      </div>
    );
  }

  // Song detail
  const emotionEntries = Object.entries(point.emotions)
    .filter(([, v]) => v > 0.01)
    .sort(([, a], [, b]) => b - a);

  return (
    <div className="p-4 space-y-3">
      {/* Header with dismiss */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-(--color-text) leading-snug">{point.title}</h3>
          <p className="text-xs text-(--color-text-secondary) mt-0.5">{point.artist}</p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="text-(--color-text-tertiary) hover:text-(--color-text) text-sm cursor-pointer shrink-0"
        >
          &#10005;
        </button>
      </div>

      {/* Metadata chips */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs px-1.5 py-0.5 rounded-(--radius-sm) bg-(--color-bg-secondary) text-(--color-text-secondary)">
          {point.year}
        </span>
        <span className="text-xs px-1.5 py-0.5 rounded-(--radius-sm) bg-(--color-bg-secondary) text-(--color-text-secondary)">
          {point.genre}
        </span>
        {point.chartPosition > 0 && (
          <span className="text-xs px-1.5 py-0.5 rounded-(--radius-sm) bg-(--color-bg-secondary) text-(--color-text-secondary)">
            #{point.chartPosition}
          </span>
        )}
      </div>

      {/* Emotion bars */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-(--color-text-tertiary) mb-1">
          Emotions
        </p>
        <div className="space-y-1">
          {emotionEntries.map(([emotion, value]) => (
            <div key={emotion} className="flex items-center gap-2">
              <span className="text-[10px] text-(--color-text-secondary) w-14 capitalize shrink-0 text-right">
                {emotion}
              </span>
              <div className="flex-1 h-1.5 rounded-full bg-(--color-bg-secondary) overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.round(value * 100)}%`,
                    backgroundColor: EMOTION_COLORS[emotion] ?? "#9ca3af",
                  }}
                />
              </div>
              <span className="text-[10px] text-(--color-text-tertiary) w-7 text-right tabular-nums">
                {(value * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Summary */}
      {point.summary && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-(--color-text-tertiary) mb-1">
            Summary
          </p>
          <p className="text-[11px] text-(--color-text-secondary) leading-relaxed line-clamp-3">{point.summary}</p>
        </div>
      )}

      {/* Nearest neighbors */}
      {point.neighbors.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-(--color-text-tertiary) mb-1">
            Nearest Neighbors
          </p>
          <div className="space-y-0.5">
            {point.neighbors.slice(0, 5).map((n, i) => (
              <button
                type="button"
                key={n.id}
                onClick={() => onSelectId(n.id)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-(--radius-sm) bg-(--color-bg-tertiary) hover:bg-(--color-border) transition-colors cursor-pointer text-left"
              >
                <span className="text-[10px] text-(--color-text-tertiary) tabular-nums w-4 shrink-0">
                  {i + 1}.
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-(--color-text) truncate">{n.title}</p>
                  <p className="text-[10px] text-(--color-text-tertiary) truncate">{n.artist}</p>
                </div>
                <span className="text-[10px] text-(--color-text-tertiary) tabular-nums shrink-0">
                  {(n.sim * 100).toFixed(0)}%
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main Visualizer                                                           */
/* -------------------------------------------------------------------------- */

export function Visualizer() {
  const [points, setPoints] = useState<VizPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lens, setLens] = useState<Lens>("genre");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [genreDrillDown, setGenreDrillDown] = useState<string | null>(null);
  const [selected, setSelected] = useState<VizPoint | null>(null);
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number; z: number } | null>(null);
  const [query, setQuery] = useState("");
  const [projecting, setProjecting] = useState(false);
  const [projection, setProjection] = useState<ProjectionResult | null>(null);

  const legendItems = useLegendItems(points, lens, genreDrillDown);
  const dimmedIds = useDimmedIds(points, lens, activeFilter, genreDrillDown);

  const filteredCount = useMemo(() => {
    if (!activeFilter) return points.length;
    return points.length - (dimmedIds?.size ?? 0);
  }, [points, activeFilter, dimmedIds]);

  useEffect(() => {
    getVizData()
      .then((data) => { setPoints(data); setLoading(false); })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load viz data");
        setLoading(false);
      });
  }, []);

  function handleLensChange(newLens: Lens) {
    setLens(newLens);
    setActiveFilter(null);
    setGenreDrillDown(null);
  }

  function handleLegendItemClick(key: string) {
    if (lens === "genre" && !genreDrillDown) {
      setGenreDrillDown(key);
      setActiveFilter(null);
      return;
    }
    setActiveFilter((prev) => (prev === key ? null : key));
  }

  function handleBack() {
    setGenreDrillDown(null);
    setActiveFilter(null);
  }

  function handleSelect(point: VizPoint) {
    setSelected(point);
    setFocusPoint({ x: point.x, y: point.y, z: point.z });
  }

  function handleSelectById(id: string) {
    const found = points.find((p) => p.id === id);
    if (found) handleSelect(found);
  }

  function handleDismiss() {
    setSelected(null);
    setProjection(null);
    setFocusPoint(null);
  }

  async function handleProject() {
    if (!query.trim() || projecting) return;
    setProjecting(true);
    try {
      const result = await projectQuery(query.trim());
      setProjection(result);
      setSelected(null);
      setFocusPoint({ x: result.x, y: result.y, z: result.z });
    } catch {
      setProjection(null);
    } finally {
      setProjecting(false);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] pt-14">
      {/* Row 1: Lens selector + query */}
      <div className="px-4 py-2 border-b border-(--color-border) bg-(--color-surface) flex-shrink-0 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-(--color-bg-secondary) rounded-(--radius-sm) p-0.5">
            {LENS_OPTIONS.map((opt) => (
              <button
                type="button"
                key={opt.value}
                onClick={() => handleLensChange(opt.value)}
                className={`text-[11px] px-2 py-1 rounded transition-colors cursor-pointer ${
                  lens === opt.value
                    ? "bg-(--color-accent) text-(--color-text-inverse)"
                    : "text-(--color-text-secondary) hover:text-(--color-text)"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <span className="text-[11px] text-(--color-text-tertiary) hidden sm:inline tabular-nums">
            {!loading && points.length > 0
              ? activeFilter
                ? `${filteredCount.toLocaleString()} / ${points.length.toLocaleString()} songs`
                : `${points.length.toLocaleString()} songs`
              : ""}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleProject()}
            placeholder="Project a query..."
            className="text-xs px-3 py-1.5 rounded-(--radius-sm) border border-(--color-border) bg-(--color-bg) text-(--color-text) placeholder:text-(--color-text-tertiary) focus:outline-none focus:border-(--color-accent) w-48"
          />
          <button
            type="button"
            onClick={handleProject}
            disabled={projecting || !query.trim()}
            className="text-xs px-3 py-1.5 rounded-(--radius-sm) bg-(--color-accent) text-(--color-text-inverse) hover:bg-(--color-accent-hover) transition-colors disabled:opacity-40 cursor-pointer"
          >
            {projecting ? "..." : "Project"}
          </button>
        </div>
      </div>

      {/* Row 2: Legend chips + emotion key */}
      <div className="px-4 py-1.5 border-b border-(--color-border) bg-(--color-surface) flex-shrink-0 flex items-center gap-2 overflow-x-auto">
        {/* Back button for genre drill-down */}
        {genreDrillDown && (
          <button
            type="button"
            onClick={handleBack}
            className="text-[11px] text-(--color-accent) hover:text-(--color-accent-hover) transition-colors cursor-pointer shrink-0 mr-1"
          >
            &#9664; All
          </button>
        )}

        {/* Legend items as chips */}
        {legendItems.map((item) => {
          const isActive = activeFilter === item.key;
          const isDimmed = activeFilter != null && !isActive;
          return (
            <button
              type="button"
              key={item.key}
              onClick={() => handleLegendItemClick(item.key)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] shrink-0 transition-colors cursor-pointer border ${
                isActive
                  ? "border-(--color-accent) bg-(--color-accent-subtle) text-(--color-text)"
                  : isDimmed
                    ? "border-transparent opacity-40 text-(--color-text-secondary) hover:opacity-70"
                    : "border-transparent text-(--color-text-secondary) hover:bg-(--color-bg-secondary)"
              }`}
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
              <span className="truncate max-w-[120px]">{item.label}</span>
              <span className="text-(--color-text-tertiary) tabular-nums">{item.count}</span>
            </button>
          );
        })}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Emotion key */}
        <div className="flex items-center gap-2 shrink-0 pl-2 border-l border-(--color-border-subtle)">
          {EMOTION_KEYS.map((e) => (
            <div key={e} className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: EMOTION_COLORS[e] }} />
              <span className="text-[9px] text-(--color-text-tertiary) capitalize">{e}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 min-h-0">
        {/* 3D plot */}
        <div className="flex-1 relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-sm text-(--color-text-secondary)">Loading embedding data...</div>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-sm text-(--color-warning) bg-(--color-warning-bg) px-4 py-3 rounded-(--radius-md)">{error}</div>
            </div>
          )}
          {!loading && !error && points.length > 0 && (
            <EmbeddingViz
              points={points}
              onSelect={handleSelect}
              selectedId={selected?.id}
              projectedPoint={
                projection
                  ? { x: projection.x, y: projection.y, z: projection.z, label: projection.query }
                  : null
              }
              dimmedIds={dimmedIds}
              focusPoint={focusPoint}


            />
          )}

          {/* Floating panel */}
          <div className="absolute top-3 right-3 w-[300px] max-md:hidden rounded-(--radius-md) border border-(--color-border) bg-(--color-surface)/95 backdrop-blur-sm shadow-lg overflow-hidden z-10">
            <SongDetail
              point={selected}
              projection={projection}
              onSelectId={handleSelectById}
              onDismiss={handleDismiss}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
