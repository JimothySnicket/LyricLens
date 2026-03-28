import { useState, useEffect, useMemo } from "react";
import { EmbeddingViz } from "../components/EmbeddingViz";
import { getVizData, projectQuery } from "../lib/api";
import type { VizData, ProjectionResult } from "../lib/types";

type ColorBy = "genre" | "decade" | "emotion" | "cluster";
type VizPoint = VizData["points"][number];
type Tab = "song" | "clusters" | "stats";

const COLOR_BY_OPTIONS: { value: ColorBy; label: string }[] = [
  { value: "genre", label: "Genre" },
  { value: "emotion", label: "Emotion" },
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

/* -------------------------------------------------------------------------- */
/*  useClusterInfo hook                                                       */
/* -------------------------------------------------------------------------- */

interface ClusterInfo {
  id: number;
  name: string;
  count: number;
  topGenres: { genre: string; count: number }[];
  emotionBreakdown: { emotion: string; fraction: number }[];
}

function useClusterInfo(points: VizPoint[]): ClusterInfo[] {
  return useMemo(() => {
    if (points.length === 0) return [];

    const clusters = new Map<number, VizPoint[]>();
    for (const p of points) {
      const arr = clusters.get(p.cluster);
      if (arr) arr.push(p);
      else clusters.set(p.cluster, [p]);
    }

    return Array.from(clusters.entries())
      .sort(([a], [b]) => a - b)
      .map(([id, pts]) => {
        const genreCounts = new Map<string, number>();
        for (const p of pts) {
          const g = p.genre || "Unknown";
          genreCounts.set(g, (genreCounts.get(g) || 0) + 1);
        }
        const topGenres = Array.from(genreCounts.entries())
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([genre, count]) => ({ genre, count }));

        const emoCounts = new Map<string, number>();
        for (const p of pts) {
          const e = p.dominantEmotion || "neutral";
          emoCounts.set(e, (emoCounts.get(e) || 0) + 1);
        }
        const topEmotion = Array.from(emoCounts.entries()).sort(([, a], [, b]) => b - a)[0]?.[0] ?? "neutral";
        const emotionBreakdown = EMOTION_KEYS
          .map((e) => ({ emotion: e, fraction: (emoCounts.get(e) || 0) / pts.length }))
          .filter((e) => e.fraction > 0.05)
          .sort((a, b) => b.fraction - a.fraction);

        const genreLabel = topGenres[0]?.genre ?? "Mixed";
        const emoLabel = topEmotion.charAt(0).toUpperCase() + topEmotion.slice(1);
        const name = `${genreLabel} · ${emoLabel}`;

        return { id, name, count: pts.length, topGenres, emotionBreakdown };
      });
  }, [points]);
}

/* -------------------------------------------------------------------------- */
/*  SongTab                                                                   */
/* -------------------------------------------------------------------------- */

function SongTab({ point, projection, onSelectId }: { point: VizPoint | null; projection: ProjectionResult | null; onSelectId: (id: string) => void }) {
  if (!point && projection) {
    return (
      <div className="p-4 space-y-4 overflow-y-auto h-full">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-(--color-text-tertiary) mb-1">
            Query Projection
          </p>
          <p className="text-sm font-medium text-[#22d3ee]">"{projection.query}"</p>
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

  if (!point) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-(--color-text-tertiary)">
        Click a point in the plot to inspect a song
      </div>
    );
  }

  const emotionEntries = Object.entries(point.emotions)
    .filter(([, v]) => v > 0.01)
    .sort(([, a], [, b]) => b - a);

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full">
      {/* Title / Artist / Year */}
      <div>
        <h3 className="text-sm font-semibold text-(--color-text) leading-snug">{point.title}</h3>
        <p className="text-xs text-(--color-text-secondary) mt-0.5">{point.artist}</p>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span className="text-xs px-1.5 py-0.5 rounded-(--radius-sm) bg-(--color-bg-secondary) text-(--color-text-secondary) capitalize">
            {point.genre}
          </span>
          <span className="text-[11px] text-(--color-text-tertiary)">{point.year}</span>
          {point.chartPosition > 0 && (
            <span className="text-[11px] text-(--color-text-tertiary)">#{point.chartPosition}</span>
          )}
        </div>
      </div>

      {/* Dominant emotion chip */}
      <div>
        <span
          className="inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full text-white"
          style={{ backgroundColor: EMOTION_COLORS[point.dominantEmotion] ?? "#9ca3af" }}
        >
          {point.dominantEmotion}
        </span>
      </div>

      {/* Emotion bars */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-(--color-text-tertiary) mb-2">
          Emotions
        </p>
        <div className="space-y-1.5">
          {emotionEntries.map(([emotion, value]) => (
            <div key={emotion} className="flex items-center gap-2">
              <span className="text-[11px] text-(--color-text-secondary) w-16 capitalize shrink-0">
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
              <span className="text-[10px] text-(--color-text-tertiary) w-8 text-right tabular-nums">
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
          <p className="text-xs text-(--color-text-secondary) leading-relaxed">{point.summary}</p>
        </div>
      )}

      {/* Nearest neighbors */}
      {point.neighbors.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-(--color-text-tertiary) mb-2">
            Nearest neighbors
          </p>
          <div className="space-y-1.5">
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
                  <p className="text-[11px] text-(--color-text-tertiary) truncate">{n.artist}</p>
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
/*  ClustersTab                                                               */
/* -------------------------------------------------------------------------- */

function ClustersTab({ clusters }: { clusters: ClusterInfo[] }) {
  if (clusters.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-(--color-text-tertiary)">
        Loading cluster data...
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3 overflow-y-auto h-full">
      {clusters.map((c) => (
        <div
          key={c.id}
          className="p-3 rounded-(--radius-sm) border border-(--color-border) bg-(--color-bg-secondary)"
        >
          {/* Cluster name + count */}
          <div className="flex items-baseline justify-between gap-2 mb-2">
            <h4 className="text-xs font-semibold text-(--color-text) truncate">{c.name}</h4>
            <span className="text-[10px] text-(--color-text-tertiary) tabular-nums shrink-0">
              {c.count} songs
            </span>
          </div>

          {/* Top genres */}
          <div className="flex items-center gap-1.5 flex-wrap mb-2">
            {c.topGenres.map((g) => (
              <span
                key={g.genre}
                className="text-[10px] px-1.5 py-0.5 rounded bg-(--color-bg-tertiary) text-(--color-text-secondary) capitalize"
              >
                {g.genre} ({g.count})
              </span>
            ))}
          </div>

          {/* Emotion composition bar */}
          <div className="h-2 rounded-full overflow-hidden flex">
            {c.emotionBreakdown.map((e) => (
              <div
                key={e.emotion}
                title={`${e.emotion}: ${(e.fraction * 100).toFixed(0)}%`}
                style={{
                  width: `${(e.fraction * 100).toFixed(1)}%`,
                  backgroundColor: EMOTION_COLORS[e.emotion] ?? "#9ca3af",
                }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  StatsTab                                                                  */
/* -------------------------------------------------------------------------- */

function StatsTab({ points, clusters }: { points: VizPoint[]; clusters: ClusterInfo[] }) {
  const stats = useMemo(() => {
    if (points.length === 0) return null;

    // Decade distribution
    const decadeCounts = new Map<number, number>();
    for (const p of points) {
      decadeCounts.set(p.decade, (decadeCounts.get(p.decade) || 0) + 1);
    }
    const decadeDistribution = Array.from(decadeCounts.entries()).sort(([a], [b]) => a - b);
    const maxDecadeCount = Math.max(...decadeDistribution.map(([, c]) => c));

    // Dominant emotion by decade
    const decadeEmotions = new Map<number, Map<string, number>>();
    for (const p of points) {
      if (!decadeEmotions.has(p.decade)) decadeEmotions.set(p.decade, new Map());
      const emo = p.dominantEmotion || "neutral";
      const map = decadeEmotions.get(p.decade)!;
      map.set(emo, (map.get(emo) || 0) + 1);
    }
    const decadeTopEmotion = Array.from(decadeEmotions.entries())
      .sort(([a], [b]) => a - b)
      .map(([decade, emos]) => {
        const top = Array.from(emos.entries()).sort(([, a], [, b]) => b - a)[0];
        return { decade, emotion: top?.[0] ?? "neutral", count: top?.[1] ?? 0 };
      });

    return { decadeDistribution, maxDecadeCount, decadeTopEmotion };
  }, [points]);

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-(--color-text-tertiary)">
        Loading stats...
      </div>
    );
  }

  return (
    <div className="p-4 space-y-5 overflow-y-auto h-full">
      {/* Overview numbers */}
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center p-2 rounded-(--radius-sm) bg-(--color-bg-secondary)">
          <p className="text-sm font-semibold text-(--color-text) tabular-nums">
            {points.length.toLocaleString()}
          </p>
          <p className="text-[10px] text-(--color-text-tertiary) uppercase tracking-wider">Songs</p>
        </div>
        <div className="text-center p-2 rounded-(--radius-sm) bg-(--color-bg-secondary)">
          <p className="text-sm font-semibold text-(--color-text) tabular-nums">768D</p>
          <p className="text-[10px] text-(--color-text-tertiary) uppercase tracking-wider">Vectors</p>
        </div>
        <div className="text-center p-2 rounded-(--radius-sm) bg-(--color-bg-secondary)">
          <p className="text-sm font-semibold text-(--color-text) tabular-nums">{clusters.length}</p>
          <p className="text-[10px] text-(--color-text-tertiary) uppercase tracking-wider">Clusters</p>
        </div>
      </div>

      {/* Decade distribution */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-(--color-text-tertiary) mb-2">
          Decade distribution
        </p>
        <div className="space-y-1">
          {stats.decadeDistribution.map(([decade, count]) => (
            <div key={decade} className="flex items-center gap-2">
              <span className="text-[11px] text-(--color-text-secondary) w-10 shrink-0 tabular-nums">
                {decade}s
              </span>
              <div className="flex-1 h-1.5 rounded-full bg-(--color-bg-secondary) overflow-hidden">
                <div
                  className="h-full rounded-full bg-(--color-accent)"
                  style={{ width: `${(count / stats.maxDecadeCount) * 100}%` }}
                />
              </div>
              <span className="text-[10px] text-(--color-text-tertiary) w-8 text-right tabular-nums">
                {count}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Dominant emotion by decade */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-(--color-text-tertiary) mb-2">
          Top emotion by decade
        </p>
        <div className="space-y-1">
          {stats.decadeTopEmotion.map((row) => (
            <div key={row.decade} className="flex items-center gap-2">
              <span className="text-[11px] text-(--color-text-secondary) w-10 shrink-0 tabular-nums">
                {row.decade}s
              </span>
              <span
                className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full text-white capitalize"
                style={{ backgroundColor: EMOTION_COLORS[row.emotion] ?? "#9ca3af" }}
              >
                {row.emotion}
              </span>
              <span className="text-[10px] text-(--color-text-tertiary) tabular-nums">
                ({row.count})
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Pipeline specs */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-(--color-text-tertiary) mb-2">
          Pipeline
        </p>
        <div className="text-[11px] text-(--color-text-secondary) space-y-1">
          {[
            ["Model", "nomic-embed-text-v1.5"],
            ["Dimensions", "768"],
            ["Context", "8192 tokens"],
            ["Reduction", "UMAP 768 → 3"],
            ["Clusters", "HDBSCAN"],
            ["Neighbors", "k=5 cosine"],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between">
              <span className="text-(--color-text-tertiary)">{label}</span>
              <span className="tabular-nums">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main Visualizer                                                           */
/* -------------------------------------------------------------------------- */

export function Visualizer() {
  const [points, setPoints] = useState<VizPoint[]>([]);
  const [colorBy, setColorBy] = useState<ColorBy>("emotion");
  const [selected, setSelected] = useState<VizPoint | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("song");
  const [query, setQuery] = useState("");
  const [projecting, setProjecting] = useState(false);
  const [projection, setProjection] = useState<ProjectionResult | null>(null);

  const clusters = useClusterInfo(points);

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

  function handleSelect(point: VizPoint) {
    setSelected(point);
    setTab("song");
  }

  function handleSelectById(id: string) {
    const found = points.find((p) => p.id === id);
    if (found) handleSelect(found);
  }

  async function handleProject() {
    if (!query.trim() || projecting) return;
    setProjecting(true);
    try {
      const result = await projectQuery(query.trim());
      setProjection(result);
    } catch {
      setProjection(null);
    } finally {
      setProjecting(false);
    }
  }

  const TAB_OPTIONS: { value: Tab; label: string }[] = [
    { value: "song", label: "Song" },
    { value: "clusters", label: "Clusters" },
    { value: "stats", label: "Stats" },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] pt-14">
      {/* Controls bar */}
      <div className="px-4 py-2 border-b border-(--color-border) bg-(--color-surface) flex-shrink-0 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-semibold text-(--color-text)">Embedding Space</h1>
          <span className="text-[11px] text-(--color-text-tertiary) hidden sm:inline">
            {!loading && points.length > 0
              ? `${points.length.toLocaleString()} songs`
              : ""}
          </span>
        </div>

        {/* Color-by toggle */}
        <div className="flex items-center gap-1 bg-(--color-bg-secondary) rounded-(--radius-sm) p-0.5">
          {COLOR_BY_OPTIONS.map((opt) => (
            <button
              type="button"
              key={opt.value}
              onClick={() => setColorBy(opt.value)}
              className={`text-[11px] px-2 py-1 rounded transition-colors ${
                colorBy === opt.value
                  ? "bg-(--color-accent) text-(--color-text-inverse)"
                  : "text-(--color-text-secondary) hover:text-(--color-text)"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Inline legend (emotion only, large screens) */}
        {colorBy === "emotion" && (
          <div className="hidden xl:flex items-center gap-2">
            {EMOTION_KEYS.map((e) => (
              <div key={e} className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: EMOTION_COLORS[e] }} />
                <span className="text-[10px] text-(--color-text-tertiary) capitalize">{e}</span>
              </div>
            ))}
          </div>
        )}

        {/* Query projection */}
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
            className="text-xs px-3 py-1.5 rounded-(--radius-sm) bg-(--color-accent) text-(--color-text-inverse) hover:bg-(--color-accent-hover) transition-colors disabled:opacity-40"
          >
            {projecting ? "..." : "Project"}
          </button>
        </div>
      </div>

      {/* Main split */}
      <div className="flex flex-1 min-h-0">
        {/* 3D plot (left) */}
        <div className="flex-1 relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-sm text-(--color-text-secondary)">Loading embedding data...</div>
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
              onSelect={handleSelect}
              selectedId={selected?.id}
              projectedPoint={projection ? { x: projection.x, y: projection.y, z: projection.z, label: projection.query } : null}
            />
          )}
        </div>

        {/* Right panel */}
        <div className="w-[380px] max-lg:w-[300px] max-md:hidden flex-shrink-0 flex flex-col border-l border-(--color-border) bg-(--color-surface)">
          {/* Tabs */}
          <div className="flex border-b border-(--color-border) px-4">
            {TAB_OPTIONS.map((t) => (
              <button
                type="button"
                key={t.value}
                onClick={() => setTab(t.value)}
                className={`text-[11px] font-semibold uppercase tracking-wider px-3 py-2.5 border-b-2 transition-colors ${
                  tab === t.value
                    ? "border-(--color-accent) text-(--color-text)"
                    : "border-transparent text-(--color-text-tertiary) hover:text-(--color-text-secondary)"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 min-h-0">
            {tab === "song" && <SongTab point={selected} projection={projection} onSelectId={handleSelectById} />}
            {tab === "clusters" && <ClustersTab clusters={clusters} />}
            {tab === "stats" && <StatsTab points={points} clusters={clusters} />}
          </div>
        </div>
      </div>
    </div>
  );
}
