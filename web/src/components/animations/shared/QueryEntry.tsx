// web/src/components/animations/shared/QueryEntry.tsx

import { interpolate, useCurrentFrame } from "remotion";
import { ACT_1_END } from "../animation-content";

interface QueryEntryProps {
  query: string;
  accentColor: string;
}

export function QueryEntry({ query, accentColor }: QueryEntryProps) {
  const frame = useCurrentFrame();
  const words = query.split(" ");

  // Entire query fades in over first 20 frames
  const textOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Words start highlighting after frame 30
  const highlightProgress = interpolate(frame, [30, ACT_1_END], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        opacity: textOpacity,
      }}
    >
      <div
        style={{
          fontSize: 14,
          letterSpacing: 3,
          textTransform: "uppercase" as const,
          color: "var(--color-text-tertiary)",
          marginBottom: 16,
        }}
      >
        Query
      </div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          justifyContent: "center",
          maxWidth: 600,
        }}
      >
        {words.map((word, i) => {
          const wordDelay = i / words.length;
          const isHighlighted = highlightProgress > wordDelay;

          return (
            <span
              key={i}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 28,
                fontWeight: 600,
                padding: "4px 12px",
                borderRadius: 6,
                color: isHighlighted ? "white" : "var(--color-text)",
                backgroundColor: isHighlighted ? accentColor : "transparent",
                transition: "none",
              }}
            >
              {word}
            </span>
          );
        })}
      </div>
    </div>
  );
}
