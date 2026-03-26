// web/src/components/animations/NLAnimation.tsx

import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import type { ModeAnimationContent } from "./animation-content";

interface Props {
  content: ModeAnimationContent;
}

export const NLAnimation: React.FC<Props> = ({ content }) => {
  const frame = useCurrentFrame();
  const color = `var(${content.cssVar}, ${content.fallbackColor})`;

  const textOpacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const badgeOpacity = interpolate(frame, [20, 50], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "var(--color-bg)",
        fontFamily: "var(--font-sans)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
      }}
    >
      {/* Explanation text */}
      <div
        style={{
          opacity: textOpacity,
          textAlign: "center" as const,
          fontSize: 16,
          lineHeight: 1.6,
          color: "var(--color-text-secondary)",
          maxWidth: 480,
        }}
      >
        {content.explanation}
      </div>

      {/* Mode badge */}
      <div
        style={{
          opacity: badgeOpacity,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "8px 20px",
          borderRadius: 20,
          border: `1px solid ${color}`,
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            backgroundColor: content.fallbackColor,
          }}
        />
        <span style={{ fontSize: 13, fontWeight: 600, color }}>
          {content.label}
        </span>
      </div>
    </AbsoluteFill>
  );
};
