// web/src/components/animations/HybridAnimation.tsx

import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import type { ModeAnimationContent } from "./animation-content";
import { EXPLAIN_END, QUERY_SUCCESS_END } from "./animation-content";
import { SongCard } from "./shared/SongCard";

interface Props {
  content: ModeAnimationContent;
}

export const HybridAnimation: React.FC<Props> = ({ content }) => {
  const frame = useCurrentFrame();
  const color = `var(${content.cssVar}, ${content.fallbackColor})`;

  // --- Phase timings ---
  const explainOpacity = interpolate(frame, [0, 25], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // === LEFT COLUMN (Success) ===
  // Query typewriter: 90-115
  const queryText = content.successQuery;
  const typeProgress = interpolate(frame, [EXPLAIN_END, EXPLAIN_END + 25], [0, queryText.length], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const visibleQuery = queryText.slice(0, Math.floor(typeProgress));
  const queryOpacity = frame >= EXPLAIN_END ? 1 : 0;

  // Words split into two groups: 115-140
  const splitStart = EXPLAIN_END + 25;
  const splitEnd = EXPLAIN_END + 50;
  const splitProgress = interpolate(frame, [splitStart, splitEnd], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Filter counter: 140-160
  const counterStart = EXPLAIN_END + 50;
  const counterEnd = EXPLAIN_END + 70;
  const counterProgress = interpolate(frame, [counterStart, counterEnd], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Semantic search within filtered: 160-180
  const semanticStart = EXPLAIN_END + 70;
  const semanticProgress = interpolate(frame, [semanticStart, semanticStart + 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Success results: 180-210
  const resultsStart = EXPLAIN_END + 90;

  // Success caption
  const captionStart = resultsStart + 20;
  const captionOpacity = interpolate(frame, [captionStart, captionStart + 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // === RIGHT COLUMN (Limitation) — appears after QUERY_SUCCESS_END ===
  const rightColumnOpacity = interpolate(frame, [QUERY_SUCCESS_END, QUERY_SUCCESS_END + 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Limitation query: 210-235
  const limQueryText = content.limitationQuery;
  const limTypeProgress = interpolate(
    frame,
    [QUERY_SUCCESS_END, QUERY_SUCCESS_END + 25],
    [0, limQueryText.length],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const visibleLimQuery = limQueryText.slice(0, Math.floor(limTypeProgress));

  // "old" flashes with "?" : 235-250
  const ambiguousStart = QUERY_SUCCESS_END + 25;
  const ambiguousProgress = interpolate(frame, [ambiguousStart, ambiguousStart + 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Limitation caption
  const limCaptionStart = ambiguousStart + 15;
  const limCaptionOpacity = interpolate(frame, [limCaptionStart, limCaptionStart + 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const filters = content.filters ?? [];
  const semanticRemainder = content.semanticRemainder ?? "";
  const countBefore = content.filterCountBefore ?? 2742;
  const countAfter = content.filterCountAfter ?? 186;

  // Animated counter
  const currentCount = Math.round(
    interpolate(counterProgress, [0, 1], [countBefore, countAfter], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
  );

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
      {/* Explanation — top centre, full width */}
      <div
        style={{
          opacity: explainOpacity,
          textAlign: "center" as const,
          fontSize: 13,
          lineHeight: 1.6,
          color: "var(--color-text-secondary)",
          maxWidth: 560,
          alignSelf: "center",
          marginBottom: 16,
        }}
      >
        {content.explanation}
      </div>

      {/* Two-column container */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          gap: 24,
          flex: 1,
          minHeight: 0,
        }}
      >
        {/* LEFT COLUMN — Success */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: 0,
            minWidth: 0,
          }}
        >
          {/* Column label */}
          <div
            style={{
              opacity: queryOpacity,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 1.5,
              textTransform: "uppercase" as const,
              color: "#16a34a",
              marginBottom: 8,
            }}
          >
            ✓ Works
          </div>

          {/* Success query — typewriter */}
          <div
            style={{
              opacity: queryOpacity,
              marginBottom: 8,
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 14,
                fontWeight: 600,
                color: "var(--color-text)",
              }}
            >
              {visibleQuery}
              {frame >= EXPLAIN_END && frame < splitStart && (
                <span style={{ opacity: frame % 16 < 8 ? 1 : 0, color }}>|</span>
              )}
            </span>
          </div>

          {/* Two-panel split: Filters | Meaning */}
          {splitProgress > 0 && (
            <div
              style={{
                display: "flex",
                gap: 10,
                width: "100%",
                marginBottom: 10,
              }}
            >
              {/* Filters panel */}
              <div
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  borderRadius: 6,
                  border: "1px solid var(--color-border)",
                  backgroundColor: "var(--color-surface)",
                  opacity: splitProgress,
                  transform: `translateX(${interpolate(splitProgress, [0, 1], [-12, 0])}px)`,
                }}
              >
                <div
                  style={{
                    fontSize: 9,
                    letterSpacing: 1.5,
                    textTransform: "uppercase" as const,
                    color: "var(--color-text-tertiary)",
                    marginBottom: 6,
                  }}
                >
                  Filters
                </div>
                {filters.map((f, i) => {
                  const fOpacity = interpolate(
                    splitProgress,
                    [(i * 0.3) + 0.2, (i * 0.3) + 0.5],
                    [0, 1],
                    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                  );
                  return (
                    <div
                      key={i}
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        padding: "2px 6px",
                        marginBottom: 3,
                        borderRadius: 3,
                        opacity: fOpacity,
                        color: "var(--color-text)",
                        backgroundColor: `color-mix(in srgb, ${content.fallbackColor} 12%, transparent)`,
                      }}
                    >
                      {f.label}: {f.value}
                    </div>
                  );
                })}
                {/* Counter */}
                {counterProgress > 0 && (
                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--color-text-tertiary)",
                      marginTop: 6,
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {currentCount.toLocaleString()} songs
                  </div>
                )}
              </div>

              {/* Meaning panel */}
              <div
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  borderRadius: 6,
                  border: "1px solid var(--color-border)",
                  backgroundColor: "var(--color-surface)",
                  opacity: splitProgress,
                  transform: `translateX(${interpolate(splitProgress, [0, 1], [12, 0])}px)`,
                }}
              >
                <div
                  style={{
                    fontSize: 9,
                    letterSpacing: 1.5,
                    textTransform: "uppercase" as const,
                    color: "var(--color-text-tertiary)",
                    marginBottom: 6,
                  }}
                >
                  Meaning
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 14,
                    fontWeight: 600,
                    color: content.fallbackColor,
                    marginBottom: 4,
                  }}
                >
                  {semanticRemainder}
                </div>
                {semanticProgress > 0.3 && (
                  <div style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>
                    Vector ranking within {countAfter} songs...
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Success results */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 5,
              width: "100%",
            }}
          >
            {content.successResults.map((r, i) => (
              <SongCard
                key={`s-${i}`}
                title={r.title}
                artist={r.artist}
                year={r.year}
                status="success"
                frame={frame}
                appearFrame={resultsStart + i * 10}
              />
            ))}
          </div>

          {/* Success caption */}
          <div
            style={{
              opacity: captionOpacity,
              fontSize: 11,
              fontStyle: "italic",
              color: "var(--color-text-tertiary)",
              marginTop: 8,
            }}
          >
            {content.successCaption}
          </div>
        </div>

        {/* RIGHT COLUMN — Limitation */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: 0,
            minWidth: 0,
            opacity: rightColumnOpacity,
          }}
        >
          {/* Column label */}
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 1.5,
              textTransform: "uppercase" as const,
              color: "#dc2626",
              marginBottom: 8,
            }}
          >
            ✗ Struggles
          </div>

          {/* Limitation query — typewriter */}
          <div
            style={{
              marginBottom: 10,
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 14,
                fontWeight: 600,
                color: "var(--color-text)",
              }}
            >
              {visibleLimQuery}
              {frame >= QUERY_SUCCESS_END && frame < ambiguousStart && (
                <span style={{ opacity: frame % 16 < 8 ? 1 : 0, color }}>|</span>
              )}
            </span>
          </div>

          {/* Ambiguous word "old" with "?" */}
          {content.ambiguousWord && ambiguousProgress > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginBottom: 8,
                opacity: ambiguousProgress,
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#dc2626",
                  padding: "2px 8px",
                  borderRadius: 5,
                  border: "1px dashed #dc2626",
                  opacity: ambiguousProgress > 0.5
                    ? (frame % 20 < 10 ? 1 : 0.6)
                    : ambiguousProgress,
                }}
              >
                {content.ambiguousWord}
              </span>
              <span style={{ fontSize: 18, color: "#dc2626", fontWeight: 700 }}>?</span>
              <span style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>
                doesn't map to a decade
              </span>
            </div>
          )}

          {/* Limitation results (empty for hybrid, but kept for consistency) */}
          {content.limitationResults.length > 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 5,
                width: "100%",
              }}
            >
              {content.limitationResults.map((r, i) => (
                <SongCard
                  key={`l-${i}`}
                  title={r.title}
                  artist={r.artist}
                  year={r.year}
                  status="failure"
                  frame={frame}
                  appearFrame={ambiguousStart + i * 12}
                />
              ))}
            </div>
          )}

          {/* Limitation caption */}
          <div
            style={{
              opacity: limCaptionOpacity,
              fontSize: 11,
              fontStyle: "italic",
              color: "var(--color-text-tertiary)",
              marginTop: 8,
            }}
          >
            {content.limitationCaption}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
