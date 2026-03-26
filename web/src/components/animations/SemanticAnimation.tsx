// web/src/components/animations/SemanticAnimation.tsx

import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import type { ModeAnimationContent } from "./animation-content";
import { EXPLAIN_END, QUERY_SUCCESS_END } from "./animation-content";
import { SongCard } from "./shared/SongCard";

interface Props {
  content: ModeAnimationContent;
}

// Deterministic dot field for the "database" of songs — scaled for half-width column
const DB_DOTS = Array.from({ length: 24 }, (_, i) => ({
  x: 20 + ((i * 137 + 29) % 320),
  y: 15 + ((i * 97 + 13) % 100),
}));

// Positions for the matched songs (first 3 dots, placed near query)
const MATCH_DOTS = [
  { x: 180, y: 45 },
  { x: 220, y: 75 },
  { x: 155, y: 70 },
];

const QUERY_DOT = { x: 190, y: 60 };

// Limitation side — query lands in "wrong neighborhood"
const LIM_DB_DOTS = Array.from({ length: 24 }, (_, i) => ({
  x: 20 + ((i * 149 + 37) % 320),
  y: 15 + ((i * 113 + 19) % 100),
}));

const LIM_QUERY_DOT = { x: 170, y: 55 };

// These are semantically "close" but structurally wrong
const LIM_MATCH_DOTS = [
  { x: 200, y: 40 },
  { x: 145, y: 70 },
  { x: 210, y: 80 },
];

export const SemanticAnimation: React.FC<Props> = ({ content }) => {
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

  // Query contracts to a dot: 115-130
  const contractStart = EXPLAIN_END + 25;
  const contractEnd = EXPLAIN_END + 40;
  const contractProgress = interpolate(frame, [contractStart, contractEnd], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Dot field appears: 130-145
  const fieldStart = EXPLAIN_END + 40;
  const fieldEnd = EXPLAIN_END + 55;
  const fieldOpacity = interpolate(frame, [fieldStart, fieldEnd], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Proximity lines + match highlights: 145-170
  const matchStart = EXPLAIN_END + 55;
  const matchEnd = EXPLAIN_END + 80;
  const matchProgress = interpolate(frame, [matchStart, matchEnd], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Success results below vector space: 170-210
  const resultsStart = EXPLAIN_END + 80;

  // Column label opacities — appear with their content
  const successLabelOpacity = interpolate(frame, [resultsStart, resultsStart + 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Success caption
  const captionStart = resultsStart + 30;
  const captionOpacity = interpolate(frame, [captionStart, captionStart + 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // === RIGHT COLUMN (Limitation) — appears after QUERY_SUCCESS_END ===
  const rightColumnOpacity = interpolate(frame, [QUERY_SUCCESS_END, QUERY_SUCCESS_END + 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Limitation query: 210-230
  const limQueryText = content.limitationQuery;
  const limTypeProgress = interpolate(
    frame,
    [QUERY_SUCCESS_END, QUERY_SUCCESS_END + 20],
    [0, limQueryText.length],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const visibleLimQuery = limQueryText.slice(0, Math.floor(limTypeProgress));

  // Limitation results: 270+
  const limResultsStart = QUERY_SUCCESS_END + 60;

  // Limitation column label opacity — appears with its results
  const limLabelOpacity = interpolate(frame, [limResultsStart, limResultsStart + 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Limitation caption
  const limCaptionStart = limResultsStart + 15;
  const limCaptionOpacity = interpolate(frame, [limCaptionStart, limCaptionStart + 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Query dot appears as contract progresses (text stays visible)
  const queryDotOpacity = interpolate(contractProgress, [0.3, 0.8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // === RIGHT COLUMN vector visualization ===
  // Limitation query contracts to dot: 230-245
  const limContractStart = QUERY_SUCCESS_END + 20;
  const limContractEnd = QUERY_SUCCESS_END + 35;
  const limContractProgress = interpolate(frame, [limContractStart, limContractEnd], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Limitation dot field: 245-255
  const limFieldStart = QUERY_SUCCESS_END + 35;
  const limFieldEnd = QUERY_SUCCESS_END + 45;
  const limFieldOpacity = interpolate(frame, [limFieldStart, limFieldEnd], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Limitation match highlights: 255-270
  const limMatchStart = QUERY_SUCCESS_END + 45;
  const limMatchEnd = QUERY_SUCCESS_END + 60;
  const limMatchProgress = interpolate(frame, [limMatchStart, limMatchEnd], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const limQueryDotOpacity = interpolate(limContractProgress, [0.3, 0.8], [0, 1], {
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
      {/* Explanation — top centre, full width */}
      <div
        style={{
          opacity: explainOpacity,
          textAlign: "center" as const,
          fontSize: 16,
          lineHeight: 1.7,
          color: "var(--color-text-secondary)",
          maxWidth: 700,
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
              opacity: successLabelOpacity,
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

          {/* Success query — typewriter, stays visible */}
          <div
            style={{
              opacity: queryOpacity,
              marginBottom: 4,
              minHeight: 20,
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
              {frame >= EXPLAIN_END && frame < contractStart && (
                <span style={{ opacity: frame % 16 < 8 ? 1 : 0, color }}>|</span>
              )}
            </span>
          </div>

          {/* Vector space visualization — scaled for column */}
          <div style={{ position: "relative", width: "100%", height: 120, flexShrink: 0 }}>
            <svg width="100%" height={120} viewBox="0 0 360 120">
              {/* Database dots */}
              {DB_DOTS.map((dot, i) => (
                <circle
                  key={`db-${i}`}
                  cx={dot.x}
                  cy={dot.y}
                  r={2.5}
                  fill="var(--color-text-tertiary)"
                  opacity={fieldOpacity * 0.25}
                />
              ))}

              {/* Match dots — brighter */}
              {MATCH_DOTS.map((dot, i) => {
                const dotHighlight = matchProgress > i / MATCH_DOTS.length ? 1 : 0;
                return (
                  <g key={`match-${i}`}>
                    {/* Dashed line from query to match */}
                    {dotHighlight > 0 && (
                      <line
                        x1={QUERY_DOT.x}
                        y1={QUERY_DOT.y}
                        x2={dot.x}
                        y2={dot.y}
                        stroke={content.fallbackColor}
                        strokeWidth={1}
                        strokeDasharray="4 3"
                        opacity={matchProgress * 0.6}
                      />
                    )}
                    <circle
                      cx={dot.x}
                      cy={dot.y}
                      r={dotHighlight > 0 ? 5 : 2.5}
                      fill={dotHighlight > 0 ? content.fallbackColor : "var(--color-text-tertiary)"}
                      opacity={fieldOpacity * (dotHighlight > 0 ? 1 : 0.25)}
                    />
                  </g>
                );
              })}

              {/* Query dot */}
              {queryDotOpacity > 0 && (
                <>
                  <circle
                    cx={QUERY_DOT.x}
                    cy={QUERY_DOT.y}
                    r={interpolate(queryDotOpacity, [0, 1], [12, 6], {
                      extrapolateLeft: "clamp",
                      extrapolateRight: "clamp",
                    })}
                    fill={content.fallbackColor}
                    opacity={queryDotOpacity * 0.9}
                  />
                  {queryDotOpacity > 0.8 && (
                    <text
                      x={QUERY_DOT.x}
                      y={QUERY_DOT.y - 12}
                      textAnchor="middle"
                      fontSize={9}
                      fill="var(--color-text-secondary)"
                      fontFamily="var(--font-sans)"
                    >
                      query vector
                    </text>
                  )}
                </>
              )}
            </svg>
          </div>

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
              opacity: limLabelOpacity,
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

          {/* Limitation query — typewriter, stays visible */}
          <div
            style={{
              marginBottom: 4,
              minHeight: 20,
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
              {frame >= QUERY_SUCCESS_END && frame < limContractStart && (
                <span style={{ opacity: frame % 16 < 8 ? 1 : 0, color }}>|</span>
              )}
            </span>
          </div>

          {/* Limitation vector space visualization */}
          <div style={{ position: "relative", width: "100%", height: 120, flexShrink: 0 }}>
            <svg width="100%" height={120} viewBox="0 0 360 120">
              {/* Database dots */}
              {LIM_DB_DOTS.map((dot, i) => (
                <circle
                  key={`ldb-${i}`}
                  cx={dot.x}
                  cy={dot.y}
                  r={2.5}
                  fill="var(--color-text-tertiary)"
                  opacity={limFieldOpacity * 0.25}
                />
              ))}

              {/* Match dots — semantically close but structurally wrong */}
              {LIM_MATCH_DOTS.map((dot, i) => {
                const dotHighlight = limMatchProgress > i / LIM_MATCH_DOTS.length ? 1 : 0;
                return (
                  <g key={`lmatch-${i}`}>
                    {dotHighlight > 0 && (
                      <line
                        x1={LIM_QUERY_DOT.x}
                        y1={LIM_QUERY_DOT.y}
                        x2={dot.x}
                        y2={dot.y}
                        stroke="#dc2626"
                        strokeWidth={1}
                        strokeDasharray="4 3"
                        opacity={limMatchProgress * 0.6}
                      />
                    )}
                    <circle
                      cx={dot.x}
                      cy={dot.y}
                      r={dotHighlight > 0 ? 5 : 2.5}
                      fill={dotHighlight > 0 ? "#dc2626" : "var(--color-text-tertiary)"}
                      opacity={limFieldOpacity * (dotHighlight > 0 ? 1 : 0.25)}
                    />
                  </g>
                );
              })}

              {/* Query dot */}
              {limQueryDotOpacity > 0 && (
                <>
                  <circle
                    cx={LIM_QUERY_DOT.x}
                    cy={LIM_QUERY_DOT.y}
                    r={interpolate(limQueryDotOpacity, [0, 1], [12, 6], {
                      extrapolateLeft: "clamp",
                      extrapolateRight: "clamp",
                    })}
                    fill={content.fallbackColor}
                    opacity={limQueryDotOpacity * 0.9}
                  />
                  {limQueryDotOpacity > 0.8 && (
                    <text
                      x={LIM_QUERY_DOT.x}
                      y={LIM_QUERY_DOT.y - 12}
                      textAnchor="middle"
                      fontSize={9}
                      fill="var(--color-text-secondary)"
                      fontFamily="var(--font-sans)"
                    >
                      query vector
                    </text>
                  )}
                </>
              )}
            </svg>
          </div>

          {/* Limitation results */}
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
                appearFrame={limResultsStart + i * 12}
              />
            ))}
          </div>

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
