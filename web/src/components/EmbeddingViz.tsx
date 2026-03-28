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

type Vec3 = { x: number; y: number; z: number };

function lerp3(a: Vec3, b: Vec3, t: number): Vec3 {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t };
}

function len3(v: Vec3): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

function scale3(v: Vec3, s: number): Vec3 {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

// Ease-out cubic for smooth deceleration
function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
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
  const animRef = useRef<number>(0);

  // Compute data extents once for normalizing data coords → scene coords
  const extents = useMemo(() => {
    if (points.length === 0) return null;
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    for (const p of points) {
      if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
      if (p.z < minZ) minZ = p.z; if (p.z > maxZ) maxZ = p.z;
    }
    return { minX, maxX, minY, maxY, minZ, maxZ };
  }, [points]);

  // Animate camera to face the selected point
  useEffect(() => {
    if (!focusPoint || !plotRef.current || !extents) return;

    cancelAnimationFrame(animRef.current);
    const el = plotRef.current;

    // Normalize target point to [-0.5, 0.5] scene domain
    const nx = (focusPoint.x - (extents.minX + extents.maxX) / 2) / (extents.maxX - extents.minX || 1);
    const ny = (focusPoint.y - (extents.minY + extents.maxY) / 2) / (extents.maxY - extents.minY || 1);
    const nz = (focusPoint.z - (extents.minZ + extents.maxZ) / 2) / (extents.maxZ - extents.minZ || 1);

    // Direction from scene center to target (normalized)
    const dirLen = len3({ x: nx, y: ny, z: nz }) || 0.01;
    const dir = { x: -nx / dirLen, y: -ny / dirLen, z: -nz / dirLen };

    // Get current camera eye from the plot
    const currentLayout = el._fullLayout;
    const currentCamera = currentLayout?.scene?._scene?.getCamera?.();
    const startEye: Vec3 = currentCamera?.eye ?? { x: 1.5, y: 1.5, z: 1.2 };

    // Target eye: on the opposite side of the point, keeping same distance from origin
    const currentDist = len3(startEye);
    const targetEye = scale3(dir, currentDist);

    // Animate over 600ms with ease-out
    const duration = 600;
    const startTime = performance.now();

    function step() {
      const elapsed = performance.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = easeOut(t);

      const eye = lerp3(startEye, targetEye, eased);

      Plotly.relayout(el, { "scene.camera.eye": eye });

      if (t < 1) {
        animRef.current = requestAnimationFrame(step);
      }
    }

    animRef.current = requestAnimationFrame(step);

    return () => cancelAnimationFrame(animRef.current);
  }, [focusPoint, extents]);

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
