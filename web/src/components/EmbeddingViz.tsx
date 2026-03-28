import { useMemo, useEffect, useRef } from "react";
import Plotly from "plotly.js-gl3d-dist-min";
import factory from "react-plotly.js/factory";
import type { VizData } from "../lib/types";

// Factory default export varies by bundler — handle both cases
const createPlotlyComponent = typeof factory === "function" ? factory : (factory as any).default;
const Plot = createPlotlyComponent(Plotly);

type VizPoint = VizData["points"][number];

interface Props {
  points: VizPoint[];
  onSelect: (point: VizPoint) => void;
  selectedId?: string;
  projectedPoint?: { x: number; y: number; z: number; label: string } | null;
  dimmedIds?: Set<string> | null;
  focusPoint?: { x: number; y: number; z: number } | null;
}

const EMOTION_COLORS: Record<string, string> = {
  joy: "#fbbf24",
  sadness: "#60a5fa",
  anger: "#ef4444",
  fear: "#a78bfa",
  surprise: "#34d399",
  disgust: "#f97316",
  neutral: "#9ca3af",
};

export function EmbeddingViz({ points, onSelect, selectedId, projectedPoint, dimmedIds, focusPoint }: Props) {
  const plotRef = useRef<any>(null);
  const centroidRef = useRef<{ x: number; y: number; z: number } | null>(null);

  // Compute data centroid once
  useEffect(() => {
    if (points.length === 0) return;
    let sx = 0, sy = 0, sz = 0;
    for (const p of points) { sx += p.x; sy += p.y; sz += p.z; }
    const n = points.length;
    centroidRef.current = { x: sx / n, y: sy / n, z: sz / n };
  }, [points]);

  // Rotate camera around the data centroid to face the selected point
  useEffect(() => {
    if (!focusPoint || !plotRef.current || !centroidRef.current) return;

    const el = plotRef.current;
    const c = centroidRef.current;

    // Direction from centroid toward the selected point
    const dx = focusPoint.x - c.x;
    const dy = focusPoint.y - c.y;
    const dz = focusPoint.z - c.z;
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;

    // Get current camera distance from centroid
    const scene = el._fullLayout?.scene?._scene;
    const cam = scene?.getCamera?.();
    const curEye = cam?.eye ?? { x: 1.5, y: 1.5, z: 1.2 };
    const ex = curEye.x - c.x;
    const ey = curEye.y - c.y;
    const ez = curEye.z - c.z;
    const viewDist = Math.sqrt(ex * ex + ey * ey + ez * ez) || 12;

    // Place camera on the opposite side of centroid from the point
    Plotly.relayout(el, {
      "scene.camera.center": { x: c.x, y: c.y, z: c.z },
      "scene.camera.eye": {
        x: c.x - (dx / len) * viewDist,
        y: c.y - (dy / len) * viewDist,
        z: c.z - (dz / len) * viewDist,
      },
    });
  }, [focusPoint]);

  const { traces } = useMemo(() => {
    const hasDimming = dimmedIds != null && dimmedIds.size > 0;

    const bright: VizPoint[] = [];
    const dimmed: VizPoint[] = [];

    for (const p of points) {
      if (hasDimming && dimmedIds.has(p.id)) {
        dimmed.push(p);
      } else {
        bright.push(p);
      }
    }

    // Group bright points by dominant emotion
    const emotionGroups = new Map<string, VizPoint[]>();
    for (const p of bright) {
      const key = p.dominantEmotion?.toLowerCase() || "unknown";
      const existing = emotionGroups.get(key);
      if (existing) existing.push(p);
      else emotionGroups.set(key, [p]);
    }

    const traces: Plotly.Data[] = Array.from(emotionGroups.entries()).map(([key, pts]) => {
      const color = EMOTION_COLORS[key] ?? "#888888";
      return {
        type: "scatter3d" as const,
        mode: "markers" as const,
        name: key,
        x: pts.map((p) => p.x),
        y: pts.map((p) => p.y),
        z: pts.map((p) => p.z),
        text: pts.map((p) => `${p.title} — ${p.artist}`),
        customdata: pts.map((p) => p.id),
        hovertemplate: "%{text}<extra></extra>",
        marker: {
          size: pts.map((p) => (p.id === selectedId ? 10 : 5)),
          color,
          opacity: 0.85,
          line: {
            width: pts.map((p) => (p.id === selectedId ? 2 : 0)),
            color: pts.map((p) => (p.id === selectedId ? "#ffffff" : "transparent")),
          },
        },
      } as Plotly.Data;
    });

    // Dimmed trace
    if (dimmed.length > 0) {
      traces.push({
        type: "scatter3d" as const,
        mode: "markers" as const,
        name: "dimmed",
        x: dimmed.map((p) => p.x),
        y: dimmed.map((p) => p.y),
        z: dimmed.map((p) => p.z),
        text: dimmed.map(() => ""),
        customdata: dimmed.map((p) => p.id),
        hoverinfo: "skip" as any,
        marker: {
          size: 3,
          color: "#555555",
          opacity: 0.08,
        },
      } as Plotly.Data);
    }

    if (projectedPoint) {
      traces.push({
        type: "scatter3d" as const,
        mode: "markers+text" as const,
        name: "Query",
        x: [projectedPoint.x],
        y: [projectedPoint.y],
        z: [projectedPoint.z],
        text: [projectedPoint.label],
        textposition: "top center",
        textfont: { size: 10, color: "#22d3ee", family: "Inter, sans-serif" },
        hovertemplate: "%{text}<extra>Query Projection</extra>",
        marker: {
          size: 12,
          color: "#22d3ee",
          opacity: 1,
          symbol: "diamond",
          line: { width: 2, color: "#ffffff" },
        },
      } as Plotly.Data);
    }

    return { traces };
  }, [points, dimmedIds, selectedId, projectedPoint]);

  const layout = useMemo(
    (): Partial<Plotly.Layout> => ({
      paper_bgcolor: "transparent",
      plot_bgcolor: "transparent",
      scene: {
        bgcolor: "transparent",
        camera: {
          eye: { x: 1.5, y: 1.5, z: 1.2 },
          up: { x: 0, y: 0, z: 1 },
        },
        xaxis: {
          showticklabels: false,
          title: { text: "" },
          showgrid: true,
          gridcolor: "rgba(128,128,128,0.1)",
          zeroline: false,
          showspikes: false,
        },
        yaxis: {
          showticklabels: false,
          title: { text: "" },
          showgrid: true,
          gridcolor: "rgba(128,128,128,0.1)",
          zeroline: false,
          showspikes: false,
        },
        zaxis: {
          showticklabels: false,
          title: { text: "" },
          showgrid: true,
          gridcolor: "rgba(128,128,128,0.1)",
          zeroline: false,
          showspikes: false,
        },
      },
      margin: { l: 0, r: 0, t: 0, b: 0 },
      showlegend: false,
      font: { family: "Inter, -apple-system, sans-serif" },
    }),
    []
  );

  const config = useMemo(
    (): Partial<Plotly.Config> => ({
      displayModeBar: false,
      responsive: true,
    }),
    []
  );

  function handleClick(event: Readonly<Plotly.PlotMouseEvent>) {
    const pt = event.points[0];
    if (!pt) return;
    const id = pt.customdata as string;
    const found = points.find((p) => p.id === id);
    if (found) onSelect(found);
  }

  return (
    <Plot
      data={traces}
      layout={layout}
      config={config}
      style={{ width: "100%", height: "100%" }}
      useResizeHandler
      onClick={handleClick}
      onInitialized={(_: any, graphDiv: any) => { plotRef.current = graphDiv; }}
      onUpdate={(_: any, graphDiv: any) => { plotRef.current = graphDiv; }}
    />
  );
}
