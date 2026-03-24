import { useMemo } from "react";
import Plotly from "plotly.js-basic-dist-min";
import factory from "react-plotly.js/factory";
import type { VizData } from "../lib/types";

// Factory default export varies by bundler — handle both cases
const createPlotlyComponent = typeof factory === "function" ? factory : (factory as any).default;
const Plot = createPlotlyComponent(Plotly);

type ColorBy = "genre" | "decade" | "topic" | "cluster";

type VizPoint = VizData["points"][number];

interface Props {
  points: VizPoint[];
  colorBy: ColorBy;
  onSelect: (point: VizPoint) => void;
  selectedId?: string;
}

// Genre colors matching CSS vars
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

function getPointColor(point: VizPoint, colorBy: ColorBy): string {
  if (colorBy === "genre") {
    return GENRE_COLORS[point.genre?.toLowerCase()] ?? "#888888";
  }
  if (colorBy === "decade") {
    return DECADE_COLORS[point.decade] ?? "#888888";
  }
  if (colorBy === "topic") {
    return TOPIC_COLORS[point.topic?.toLowerCase()] ?? "#888888";
  }
  // cluster: use a hash of the cluster value for stable colors
  const palette = [
    "#e53935", "#8e24aa", "#1e88e5", "#00897b",
    "#43a047", "#fb8c00", "#6d4c41", "#546e7a",
  ];
  const hash = String(point.topic ?? "").split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return palette[hash % palette.length];
}

export function EmbeddingViz({ points, colorBy, onSelect, selectedId }: Props) {
  const { traces } = useMemo(() => {
    // Group points by their color key for efficient rendering
    const groups = new Map<string, VizPoint[]>();

    for (const p of points) {
      let key: string;
      if (colorBy === "genre") key = p.genre?.toLowerCase() || "unknown";
      else if (colorBy === "decade") key = String(p.decade || "unknown");
      else key = p.topic?.toLowerCase() || "unknown";

      const existing = groups.get(key);
      if (existing) existing.push(p);
      else groups.set(key, [p]);
    }

    const traces: Plotly.Data[] = Array.from(groups.entries()).map(([key, pts]) => {
      const color = getPointColor(pts[0], colorBy);
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

    return { traces };
  }, [points, colorBy, selectedId]);

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
    />
  );
}
