// web/src/components/animations/NLAnimation.tsx

import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import type { ModeAnimationContent } from "./animation-content";
import { EXPLAIN_END, QUERY_SUCCESS_END } from "./animation-content";
import { SongCard } from "./shared/SongCard";

interface Props {
  content: ModeAnimationContent;
}

export const NLAnimation: React.FC<Props> = ({ content }) => {
  const frame = useCurrentFrame();
  const color = `var(${content.cssVar}, ${content.fallbackColor})`;

  // --- Explanation: 0 → EXPLAIN_END ---
  const explainOpacity = interpolate(frame, [0, 25], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // --- Query typewriter (single query for both sides) ---
  const queryText = content.successQuery;
  const typeProgress = interpolate(frame, [EXPLAIN_END, EXPLAIN_END + 20], [0, queryText.length], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const visibleQuery = queryText.slice(0, Math.floor(typeProgress));
  const queryOpacity = frame >= EXPLAIN_END ? 1 : 0;
  const typeEnd = EXPLAIN_END + 20;

  // === LEFT COLUMN — Other modes fail ===
  const leftStart = typeEnd + 5;
  const leftOpacity = interpolate(frame, [leftStart, leftStart + 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const leftResultsStart = leftStart + 14;

  const leftCaptionStart = leftResultsStart + 40;
  const leftCaptionOpacity = interpolate(frame, [leftCaptionStart, leftCaptionStart + 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // === RIGHT COLUMN — NL succeeds ===
  const rightStart = QUERY_SUCCESS_END;
  const rightOpacity = interpolate(frame, [rightStart, rightStart + 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // LLM thinking pulse
  const thinkStart = rightStart + 5;
  const thinkEnd = thinkStart + 20;
  const thinkOpacity = interpolate(frame, [thinkStart, thinkStart + 5, thinkEnd - 5, thinkEnd], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const thinkPulse = frame >= thinkStart && frame < thinkEnd
    ? 0.5 + 0.5 * Math.sin((frame - thinkStart) * 0.5)
    : 0;

  // Expansion terms appear after thinking
  const expansionStart = thinkEnd;
  const expansion = content.llmExpansion ?? [];

  // Results after expansion
  const rightResultsStart = expansionStart + expansion.length * 4 + 10;
  const rightLabelOpacity = interpolate(frame, [rightResultsStart, rightResultsStart + 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Right caption
  const rightCaptionStart = rightResultsStart + 40;
  const rightCaptionOpacity = interpolate(frame, [rightCaptionStart, rightCaptionStart + 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "var(--color-bg)",
        fontFamily: "var(--font-sans)",
        padding: "24px 32px",
        display: "flex",
        flexDirection: "column",
        gap: 0,
      }}
    >
      {/* Explanation */}
      <div
        style={{
          opacity: explainOpacity,
          textAlign: "center" as const,
          fontSize: 16,
          lineHeight: 1.7,
          color: "var(--color-text-secondary)",
          maxWidth: 700,
          alignSelf: "center",
          marginBottom: 12,
        }}
      >
        {content.explanation}
      </div>

      {/* Query — same query for both columns */}
      <div style={{ opacity: queryOpacity, textAlign: "center" as const, marginBottom: 14 }}>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 15,
            fontWeight: 600,
            color: "var(--color-text)",
          }}
        >
          {visibleQuery}
          {frame >= EXPLAIN_END && frame < typeEnd && (
            <span style={{ opacity: frame % 16 < 8 ? 1 : 0, color }}>|</span>
          )}
        </span>
      </div>

      {/* Two-column comparison */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          gap: 24,
          flex: 1,
          minHeight: 0,
        }}
      >
        {/* LEFT — Keyword + Semantic fail */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, opacity: leftOpacity }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 1.2,
              textTransform: "uppercase" as const,
              color: "#dc2626",
              marginBottom: 8,
            }}
          >
            {"\u2717"} Keyword + Semantic
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {content.limitationResults.map((r, i) => (
              <SongCard
                key={`lim-${i}`}
                title={r.title}
                artist={r.artist}
                year={r.year}
                status="failure"
                frame={frame}
                appearFrame={leftResultsStart + i * 10}
              />
            ))}
          </div>

          <div
            style={{
              opacity: leftCaptionOpacity,
              fontSize: 11,
              fontStyle: "italic",
              color: "var(--color-text-tertiary)",
              marginTop: 8,
            }}
          >
            {content.limitationCaption}
          </div>
        </div>

        {/* RIGHT — NL interprets and wins */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
            opacity: rightOpacity,
            borderLeft: `2px solid ${content.fallbackColor}`,
            paddingLeft: 20,
          }}
        >
          <div
            style={{
              opacity: rightLabelOpacity,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 1.2,
              textTransform: "uppercase" as const,
              color: content.fallbackColor,
              marginBottom: 8,
            }}
          >
            {"\u2713"} Natural Language
          </div>

          {/* LLM thinking */}
          {thinkOpacity > 0 && (
            <div
              style={{
                opacity: thinkOpacity,
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: content.fallbackColor,
                  opacity: thinkPulse,
                }}
              />
              <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", fontStyle: "italic" }}>
                LLM interpreting the scene...
              </span>
            </div>
          )}

          {/* Expansion terms */}
          {frame >= expansionStart && (
            <div
              style={{
                display: "flex",
                gap: 5,
                marginBottom: 10,
                flexWrap: "wrap",
              }}
            >
              {expansion.map((term, i) => {
                const termAppear = interpolate(
                  frame,
                  [expansionStart + i * 4, expansionStart + i * 4 + 8],
                  [0, 1],
                  { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                );
                return (
                  <span
                    key={i}
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      fontWeight: 600,
                      padding: "3px 8px",
                      borderRadius: 10,
                      opacity: termAppear,
                      color: "white",
                      backgroundColor: content.fallbackColor,
                      transform: `translateY(${(1 - termAppear) * 6}px)`,
                    }}
                  >
                    {term}
                  </span>
                );
              })}
            </div>
          )}

          {/* NL results */}
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {content.successResults.map((r, i) => (
              <SongCard
                key={`nl-${i}`}
                title={r.title}
                artist={r.artist}
                year={r.year}
                status="success"
                frame={frame}
                appearFrame={rightResultsStart + i * 10}
              />
            ))}
          </div>

          <div
            style={{
              opacity: rightCaptionOpacity,
              fontSize: 11,
              fontStyle: "italic",
              color: "var(--color-text-tertiary)",
              marginTop: 8,
            }}
          >
            {content.successCaption}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
