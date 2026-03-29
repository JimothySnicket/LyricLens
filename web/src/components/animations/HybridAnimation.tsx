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

  // --- Explanation: 0 → EXPLAIN_END ---
  const explainOpacity = interpolate(frame, [0, 25], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // --- Query typewriter ---
  const queryText = content.successQuery;
  const typeProgress = interpolate(frame, [EXPLAIN_END, EXPLAIN_END + 25], [0, queryText.length], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const visibleQuery = queryText.slice(0, Math.floor(typeProgress));
  const queryOpacity = frame >= EXPLAIN_END ? 1 : 0;
  const typeEnd = EXPLAIN_END + 25;

  // --- Decomposition pills: query splits into filters + semantic ---
  const decompStart = typeEnd + 5;
  const decompEnd = decompStart + 25;
  const filters = content.filters ?? [
    { label: "decade", value: "90s" },
    { label: "genre", value: "R&B" },
  ];
  const semanticText = content.semanticRemainder ?? "heartbreak";

  const decompOpacity = interpolate(frame, [decompStart, decompStart + 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // --- Three columns appear in sequence ---
  const col1Start = decompEnd + 5;
  const col2Start = col1Start + 40;
  const col3Start = col2Start + 40;

  const col1Opacity = interpolate(frame, [col1Start, col1Start + 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const col2Opacity = interpolate(frame, [col2Start, col2Start + 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const col3Opacity = interpolate(frame, [col3Start, col3Start + 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Results stagger within each column
  const kw1Results = col1Start + 14;
  const se1Results = col2Start + 14;
  const hy1Results = col3Start + 14;

  // Captions
  const kwCaptionStart = kw1Results + 40;
  const seCaptionStart = se1Results + 40;
  const hyCaptionStart = hy1Results + 40;

  const kwCaptionOpacity = interpolate(frame, [kwCaptionStart, kwCaptionStart + 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const seCaptionOpacity = interpolate(frame, [seCaptionStart, seCaptionStart + 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const hyCaptionOpacity = interpolate(frame, [hyCaptionStart, hyCaptionStart + 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const kwResults = content.keywordOnlyResults ?? [];
  const seResults = content.semanticOnlyResults ?? [];
  const hyResults = content.successResults;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "var(--color-bg)",
        fontFamily: "var(--font-sans)",
        padding: "24px 28px",
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

      {/* Query — single query for all three */}
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

      {/* Decomposition — query splits into filters + semantic */}
      {frame >= decompStart && (
        <div
          style={{
            opacity: decompOpacity,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            marginBottom: 10,
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: 10, color: "var(--color-text-tertiary)", fontWeight: 600, letterSpacing: 0.5 }}>
            FILTERS
          </span>
          {filters.map((f, i) => {
            const pillAppear = interpolate(
              frame,
              [decompStart + 4 + i * 6, decompStart + 10 + i * 6],
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
                  opacity: pillAppear,
                  color: "white",
                  backgroundColor: "#e65100",
                  transform: `translateY(${(1 - pillAppear) * 4}px)`,
                }}
              >
                {f.label}: {f.value}
              </span>
            );
          })}
          <span
            style={{
              width: 1,
              height: 16,
              backgroundColor: "var(--color-border)",
              margin: "0 4px",
              opacity: interpolate(frame, [decompStart + 12, decompStart + 16], [0, 0.5], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            }}
          />
          <span style={{ fontSize: 10, color: "var(--color-text-tertiary)", fontWeight: 600, letterSpacing: 0.5 }}>
            MEANING
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              fontWeight: 600,
              padding: "3px 8px",
              borderRadius: 10,
              opacity: interpolate(frame, [decompStart + 14, decompStart + 20], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
              color: "white",
              backgroundColor: "#1565c0",
              transform: `translateY(${(1 - interpolate(frame, [decompStart + 14, decompStart + 20], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              })) * 4}px)`,
            }}
          >
            {semanticText}
          </span>
        </div>
      )}

      {/* Three-column comparison */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          gap: 16,
          flex: 1,
          minHeight: 0,
        }}
      >
        {/* COLUMN 1 — Keyword */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, opacity: col1Opacity }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 1.2,
              textTransform: "uppercase" as const,
              color: "#e65100",
              marginBottom: 8,
            }}
          >
            Keyword alone
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {kwResults.map((r, i) => (
              <SongCard
                key={`kw-${i}`}
                title={r.title}
                artist={r.artist}
                year={r.year}
                status={i === 0 ? "success" : "failure"}
                frame={frame}
                appearFrame={kw1Results + i * 10}
              />
            ))}
          </div>
          <div
            style={{
              opacity: kwCaptionOpacity,
              fontSize: 11,
              fontStyle: "italic",
              color: "var(--color-text-tertiary)",
              marginTop: 6,
            }}
          >
            {content.keywordCaption}
          </div>
        </div>

        {/* COLUMN 2 — Semantic */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, opacity: col2Opacity }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 1.2,
              textTransform: "uppercase" as const,
              color: "#1565c0",
              marginBottom: 8,
            }}
          >
            Semantic alone
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {seResults.map((r, i) => (
              <SongCard
                key={`se-${i}`}
                title={r.title}
                artist={r.artist}
                year={r.year}
                status="success"
                frame={frame}
                appearFrame={se1Results + i * 10}
              />
            ))}
          </div>
          <div
            style={{
              opacity: seCaptionOpacity,
              fontSize: 11,
              fontStyle: "italic",
              color: "var(--color-text-tertiary)",
              marginTop: 6,
            }}
          >
            {content.semanticCaption}
          </div>
        </div>

        {/* COLUMN 3 — Hybrid (winner) */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
            opacity: col3Opacity,
            borderLeft: `2px solid ${content.fallbackColor}`,
            paddingLeft: 14,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 1.2,
              textTransform: "uppercase" as const,
              color: content.fallbackColor,
              marginBottom: 8,
            }}
          >
            {"\u2713"} Hybrid — both
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {hyResults.map((r, i) => (
              <SongCard
                key={`hy-${i}`}
                title={r.title}
                artist={r.artist}
                year={r.year}
                status="success"
                accentColor={content.fallbackColor}
                frame={frame}
                appearFrame={hy1Results + i * 10}
              />
            ))}
          </div>
          <div
            style={{
              opacity: hyCaptionOpacity,
              fontSize: 11,
              fontStyle: "italic",
              color: "var(--color-text-tertiary)",
              marginTop: 6,
            }}
          >
            {content.successCaption}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
