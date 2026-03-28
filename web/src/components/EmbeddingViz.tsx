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

type Vec3 = { x: number; y: number; z: number };

function lerp3(a: Vec3, b: Vec3, t: number): Vec3 {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
  };
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function EmbeddingViz({ points, onSelect, selectedId, projectedPoint, dimmedIds, focusPoint }: Props) {
  const plotRef = useRef<any>(null);
  const animRef = useRef<number>(0);

  // Precompute data extents for normalizing data coords → Plotly scene coords
  const dataExtents = useMemo(() => {
    if (points.length === 0) return null;
    let xMin = Infinity, xMax = -Infinity;
    let yMin = Infinity, yMax = -Infinity;
    let zMin = Infinity, zMax = -Infinity;
    for (const p of points) {
      if (p.x < xMin) xMin = p.x; if (p.x > xMax) xMax = p.x;
      if (p.y < yMin) yMin = p.y; if (p.y > yMax) yMax = p.y;
      if (p.z < zMin) zMin = p.z; if (p.z > zMax) zMax = p.z;
    }
    return {
      cx: (xMin + xMax) / 2, cy: (yMin + yMax) / 2, cz: (zMin + zMax) / 2,
      rx: xMax - xMin || 1, ry: yMax - yMin || 1, rz: zMax - zMin || 1,
    };
  }, [points]);

  // Smooth pan: shift camera.center toward the selected point in normalized scene space
  // Keeps eye (user's zoom/angle) untouched — only moves the orbit pivot
  useEffect(() => {
    if (!focusPoint || !plotRef.current || !dataExtents) return;

    cancelAnimationFrame(animRef.current);
    const el = plotRef.current;

    // Convert data coords → normalized scene coords (Plotly's internal [-0.5, 0.5] domain)
    const targetCenter: Vec3 = {
      x: (focusPoint.x - dataExtents.cx) / dataExtents.rx,
      y: (focusPoint.y - dataExtents.cy) / dataExtents.ry,
      z: (focusPoint.z - dataExtents.cz) / dataExtents.rz,
    };

    // Get current center from the live camera
    const scene = el._fullLayout?.scene?._scene;
    const cam = scene?.getCamera?.();
    const startCenter: Vec3 = cam?.center ?? { x: 0, y: 0, z: 0 };

    const duration = 500;
    const startTime = performance.now();

    function step() {
      const elapsed = performance.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      const center = lerp3(startCenter, targetCenter, easeOutCubic(t));

      Plotly.relayout(el, { "scene.camera.center": center });

      if (t < 1) {
        animRef.current = requestAnimationFrame(step);
      }
    }

    animRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animRef.current);
  }, [focusPoint, dataExtents]);

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
      onInitialized={(_: any, div: any) => { plotRef.current = div; }}
      onUpdate={(_: any, div: any) => { plotRef.current = div; }}
    />
  );
}
