// web/src/components/animations/KeywordAnimation.tsx

import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import type { ModeAnimationContent } from "./animation-content";
import { EXPLAIN_END, QUERY_SUCCESS_END, LIMITATION_END } from "./animation-content";
import { SongCard } from "./shared/SongCard";

interface Props {
  content: ModeAnimationContent;
}

export const KeywordAnimation: React.FC<Props> = ({ content }) => {
  const frame = useCurrentFrame();
  const color = `var(${content.cssVar}, ${content.fallbackColor})`;

  // --- Phase timings (all in global frames) ---
  // Explanation: 0-90
  const explainOpacity = interpolate(frame, [0, 25], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Query typewriter: 90-120 (1s to type)
  const queryText = content.successQuery;
  const typeProgress = interpolate(frame, [EXPLAIN_END, EXPLAIN_END + 30], [0, queryText.length], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const visibleQuery = queryText.slice(0, Math.floor(typeProgress));
  const queryOpacity = frame >= EXPLAIN_END ? 1 : 0;

  // Token processing: 120-150 — stop words grey out, tokens become pills
  const tokenStart = EXPLAIN_END + 30;
  const tokenEnd = EXPLAIN_END + 60;
  const tokenProgress = interpolate(frame, [tokenStart, tokenEnd], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Success results: 150-210 (staggered)
  const resultsStart = EXPLAIN_END + 60;

  // Success caption
  const captionStart = resultsStart + 40;
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

  // Split query into words for token display
  const queryWords = queryText.split(" ");
  const stopWords = content.stopWords ?? [];
  const tokens = content.successTokens ?? [];

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "var(--color-bg)",
        fontFamily: "var(--font-sans)",
        padding: "28px 40px",
        display: "flex",
        flexDirection: "column",
        gap: 0,
      }}
    >
      {/* Explanation — top centre */}
      <div
        style={{
          opacity: explainOpacity,
          textAlign: "center" as const,
          fontSize: 14,
          lineHeight: 1.6,
          color: "var(--color-text-secondary)",
          maxWidth: 560,
          alignSelf: "center",
          marginBottom: 20,
        }}
      >
        {content.explanation}
      </div>

      {/* Success query — typewriter */}
      <div
        style={{
          opacity: queryOpacity,
          textAlign: "center" as const,
          marginBottom: 8,
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
          {frame >= EXPLAIN_END && frame < EXPLAIN_END + 30 && (
            <span style={{ opacity: frame % 16 < 8 ? 1 : 0, color }}>|</span>
          )}
        </span>
      </div>

      {/* Token pills — stop words grey, active tokens highlighted */}
      {tokenProgress > 0 && (
        <div
          style={{
            display: "flex",
            gap: 8,
            justifyContent: "center",
            marginBottom: 16,
            flexWrap: "wrap",
          }}
        >
          {queryWords.map((word, i) => {
            const isStop = stopWords.includes(word.toLowerCase());
            const isToken = tokens.includes(word.toLowerCase());
            const wordAppear = interpolate(
              tokenProgress,
              [i / queryWords.length, Math.min((i + 1) / queryWords.length, 1)],
              [0, 1],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
            );

            return (
              <span
                key={i}
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 14,
                  fontWeight: 600,
                  padding: "4px 10px",
                  borderRadius: 12,
                  opacity: wordAppear > 0.3 ? 1 : 0.4,
                  color: isStop
                    ? "var(--color-text-tertiary)"
                    : isToken
                      ? "white"
                      : "var(--color-text)",
                  backgroundColor: isToken && wordAppear > 0.5
                    ? content.fallbackColor
                    : "transparent",
                  textDecoration: isStop && wordAppear > 0.5 ? "line-through" : "none",
                }}
              >
                {word}
              </span>
            );
          })}
        </div>
      )}

      {/* Success results */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          maxWidth: 380,
          alignSelf: "center",
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
            highlight={r.highlight}
            accentColor={content.fallbackColor}
            frame={frame}
            appearFrame={resultsStart + i * 12}
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
          marginTop: 8,
          marginBottom: 16,
        }}
      >
        {content.successCaption}
      </div>

      {/* Limitation query */}
      <div
        style={{
          opacity: limQueryOpacity,
          textAlign: "center" as const,
          marginBottom: 8,
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
          gap: 6,
          maxWidth: 380,
          alignSelf: "center",
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
          marginTop: 8,
        }}
      >
        {content.limitationCaption}
      </div>
    </AbsoluteFill>
  );
};
