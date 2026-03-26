// web/src/components/animations/shared/ResultsReveal.tsx

import { interpolate, useCurrentFrame } from "remotion";
import { ACT_2_END, ACT_3_END } from "../animation-content";
import type { AnimationResult } from "../animation-content";

interface ResultsRevealProps {
  results: AnimationResult[];
  verdict: string;
  accentColor: string;
}

export function ResultsReveal({ results, verdict, accentColor }: ResultsRevealProps) {
  const frame = useCurrentFrame();

  // Results fade in sequentially starting at ACT_2_END
  const resultsStart = ACT_2_END;
  const verdictStart = ACT_2_END + 50;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        gap: 16,
      }}
    >
      <div
        style={{
          fontSize: 14,
          letterSpacing: 3,
          textTransform: "uppercase" as const,
          color: "var(--color-text-tertiary)",
          marginBottom: 8,
        }}
      >
        Results
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 320 }}>
        {results.map((r, i) => {
          const delay = resultsStart + i * 12;
          const opacity = interpolate(frame, [delay, delay + 15], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const y = interpolate(frame, [delay, delay + 15], [20, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });

          return (
            <div
              key={i}
              style={{
                opacity,
                transform: `translateY(${y}px)`,
                padding: "12px 16px",
                borderRadius: 8,
                border: "1px solid var(--color-border)",
                backgroundColor: "var(--color-surface)",
              }}
            >
              <div style={{ fontSize: 16, fontWeight: 600, color: "var(--color-text)" }}>
                {r.title}
              </div>
              <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 2 }}>
                {r.artist} · {r.year}
              </div>
            </div>
          );
        })}
      </div>

      {/* Verdict */}
      <div
        style={{
          opacity: interpolate(frame, [verdictStart, verdictStart + 20], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          marginTop: 16,
          fontSize: 15,
          fontStyle: "italic",
          color: "var(--color-text-secondary)",
          maxWidth: 400,
          textAlign: "center" as const,
        }}
      >
        {verdict}
      </div>
    </div>
  );
}
