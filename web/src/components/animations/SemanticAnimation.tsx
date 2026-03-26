// web/src/components/animations/SemanticAnimation.tsx

import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import type { ModeAnimationContent } from "./animation-content";
import { EXPLAIN_END, QUERY_SUCCESS_END } from "./animation-content";
import { SongCard } from "./shared/SongCard";

interface Props {
  content: ModeAnimationContent;
}

// Deterministic dot field for the "database" of songs
const DB_DOTS = Array.from({ length: 30 }, (_, i) => ({
  x: 40 + ((i * 137 + 29) % 420),
  y: 20 + ((i * 97 + 13) % 160),
}));

// Positions for the matched songs (first 3 dots, placed near query)
const MATCH_DOTS = [
  { x: 240, y: 65 },
  { x: 290, y: 110 },
  { x: 200, y: 105 },
];

const QUERY_DOT = { x: 250, y: 90 };

export const SemanticAnimation: React.FC<Props> = ({ content }) => {
  const frame = useCurrentFrame();
  const color = `var(${content.cssVar}, ${content.fallbackColor})`;

  // --- Phase timings ---
  const explainOpacity = interpolate(frame, [0, 25], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

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

  // Success caption
  const captionStart = resultsStart + 30;
  const captionOpacity = interpolate(frame, [captionStart, captionStart + 15], [0, 1], {
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
  const limQueryOpacity = frame >= QUERY_SUCCESS_END ? 1 : 0;

  // Limitation results: 230-270
  const limResultsStart = QUERY_SUCCESS_END + 20;

  // Limitation caption
  const limCaptionStart = limResultsStart + 15;
  const limCaptionOpacity = interpolate(frame, [limCaptionStart, limCaptionStart + 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Query text fades as it contracts
  const queryTextOpacity = interpolate(contractProgress, [0, 0.6], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Query dot appears as contract progresses
  const queryDotOpacity = interpolate(contractProgress, [0.3, 0.8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "var(--color-bg)",
        fontFamily: "var(--font-sans)",
        padding: "28px 40px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 0,
      }}
    >
      {/* Explanation */}
      <div
        style={{
          opacity: explainOpacity,
          textAlign: "center" as const,
          fontSize: 14,
          lineHeight: 1.6,
          color: "var(--color-text-secondary)",
          maxWidth: 560,
          marginBottom: 16,
        }}
      >
        {content.explanation}
      </div>

      {/* Query typewriter — fades out as it contracts to dot */}
      <div
        style={{
          opacity: queryOpacity * queryTextOpacity,
          textAlign: "center" as const,
          marginBottom: 6,
          minHeight: 24,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 18,
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

      {/* Vector space visualization */}
      <div style={{ position: "relative", width: 500, height: 190, flexShrink: 0 }}>
        <svg width={500} height={190} viewBox="0 0 500 190">
          {/* Database dots */}
          {DB_DOTS.map((dot, i) => (
            <circle
              key={`db-${i}`}
              cx={dot.x}
              cy={dot.y}
              r={3}
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
                  r={dotHighlight > 0 ? 6 : 3}
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
                r={interpolate(queryDotOpacity, [0, 1], [14, 7], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                })}
                fill={content.fallbackColor}
                opacity={queryDotOpacity * 0.9}
              />
              {queryDotOpacity > 0.8 && (
                <text
                  x={QUERY_DOT.x}
                  y={QUERY_DOT.y - 14}
                  textAnchor="middle"
                  fontSize={10}
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
          maxWidth: 380,
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
          textAlign: "center" as const,
          fontSize: 12,
          fontStyle: "italic",
          color: "var(--color-text-tertiary)",
          marginTop: 6,
          marginBottom: 12,
        }}
      >
        {content.successCaption}
      </div>

      {/* Limitation query */}
      <div
        style={{
          opacity: limQueryOpacity,
          textAlign: "center" as const,
          marginBottom: 6,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 16,
            fontWeight: 600,
            color: "var(--color-text)",
          }}
        >
          {visibleLimQuery}
          {frame >= QUERY_SUCCESS_END && frame < QUERY_SUCCESS_END + 20 && (
            <span style={{ opacity: frame % 16 < 8 ? 1 : 0, color }}>|</span>
          )}
        </span>
      </div>

      {/* Limitation results */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 5,
          maxWidth: 380,
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
          textAlign: "center" as const,
          fontSize: 12,
          fontStyle: "italic",
          color: "var(--color-text-tertiary)",
          marginTop: 6,
        }}
      >
        {content.limitationCaption}
      </div>
    </AbsoluteFill>
  );
};
