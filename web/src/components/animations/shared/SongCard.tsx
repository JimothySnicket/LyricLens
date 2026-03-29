// web/src/components/animations/shared/SongCard.tsx

import { interpolate } from "remotion";

interface SongCardProps {
  title: string;
  artist: string;
  year?: number;
  status: "success" | "failure";
  highlight?: string; // word to highlight in title
  accentColor?: string; // background color for highlighted word
  frame: number;
  appearFrame: number; // global frame when card should start appearing
}

function highlightWord(title: string, word: string, bgColor: string) {
  const idx = title.toLowerCase().indexOf(word.toLowerCase());
  if (idx === -1) return <>{title}</>;

  const before = title.slice(0, idx);
  const match = title.slice(idx, idx + word.length);
  const after = title.slice(idx + word.length);

  return (
    <>
      {before}
      <span
        style={{
          backgroundColor: bgColor,
          color: "white",
          padding: "1px 4px",
          borderRadius: 3,
        }}
      >
        {match}
      </span>
      {after}
    </>
  );
}

export function SongCard({
  title,
  artist,
  year,
  status,
  highlight,
  accentColor,
  frame,
  appearFrame,
}: SongCardProps) {
  const opacity = interpolate(frame, [appearFrame, appearFrame + 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const y = interpolate(frame, [appearFrame, appearFrame + 12], [14, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const isSuccess = status === "success";
  const icon = isSuccess ? "\u2713" : "\u2717";
  const iconColor = isSuccess ? "#16a34a" : "#dc2626";

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${y}px)`,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "7px 12px",
        borderRadius: 8,
        border: "1px solid var(--color-border)",
        backgroundColor: "var(--color-bg-secondary)",
      }}
    >
      <span
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: iconColor,
          flexShrink: 0,
          width: 20,
          textAlign: "center" as const,
        }}
      >
        {icon}
      </span>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)" }}>
          {highlight && accentColor
            ? highlightWord(title, highlight, accentColor)
            : title}
        </div>
        <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 1 }}>
          {artist}
          {year ? ` \u00b7 ${year}` : ""}
        </div>
      </div>
    </div>
  );
}
