// web/src/components/animations/SemanticAnimation.tsx

import { AbsoluteFill, useCurrentFrame, interpolate, Sequence } from "remotion";
import type { ModeAnimationContent } from "./animation-content";
import { ACT_1_END, ACT_2_END, ANIMATION_DURATION_FRAMES } from "./animation-content";
import { QueryEntry } from "./shared/QueryEntry";
import { ResultsReveal } from "./shared/ResultsReveal";

interface Props {
  content: ModeAnimationContent;
}

// Pseudo-random positions for song dots (deterministic)
const SONG_DOTS = Array.from({ length: 24 }, (_, i) => ({
  x: 80 + ((i * 137) % 440),
  y: 60 + ((i * 97) % 280),
  isMatch: i < 3, // first 3 are matches
}));

const QUERY_POINT = { x: 300, y: 180 };

export const SemanticAnimation: React.FC<Props> = ({ content }) => {
  const frame = useCurrentFrame();
  const color = `var(${content.cssVar}, ${content.fallbackColor})`;

  const act2Frame = frame - ACT_1_END;
  const act2Duration = ACT_2_END - ACT_1_END;

  // Phase 1: query text shrinks to a point (0–30% of act 2)
  const collapseProgress = interpolate(act2Frame, [0, act2Duration * 0.3], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Phase 2: point enters song space, proximity lines draw (30–70%)
  const searchProgress = interpolate(act2Frame, [act2Duration * 0.3, act2Duration * 0.7], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Phase 3: matches highlight (70–100%)
  const highlightProgress = interpolate(act2Frame, [act2Duration * 0.7, act2Duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "var(--color-bg)",
        fontFamily: "var(--font-sans)",
      }}
    >
      {/* Act 1 */}
      <Sequence from={0} durationInFrames={ACT_1_END}>
        <AbsoluteFill>
          <QueryEntry query={content.query} accentColor={color} />
        </AbsoluteFill>
      </Sequence>

      {/* Act 2: Vector space visualization */}
      <Sequence from={ACT_1_END} durationInFrames={act2Duration}>
        <AbsoluteFill
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Pipeline steps at top */}
          <div style={{ display: "flex", gap: 12, marginBottom: 32 }}>
            {content.pipelineSteps.map((step, i) => {
              const stepOpacity = interpolate(
                act2Frame,
                [i * 20, i * 20 + 15],
                [0, 1],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
              );
              return (
                <div
                  key={i}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 20,
                    border: `1px solid ${color}`,
                    fontSize: 12,
                    color,
                    opacity: stepOpacity,
                  }}
                >
                  {step}
                </div>
              );
            })}
          </div>

          {/* Vector space */}
          <svg width={600} height={360} viewBox="0 0 600 360">
            {/* Song dots */}
            {SONG_DOTS.map((dot, i) => {
              const isHighlighted = dot.isMatch && highlightProgress > 0.3;
              const dotOpacity = interpolate(searchProgress, [0, 0.3], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });

              return (
                <g key={i}>
                  {/* Proximity line for matches */}
                  {dot.isMatch && searchProgress > 0.5 && (
                    <line
                      x1={QUERY_POINT.x}
                      y1={QUERY_POINT.y}
                      x2={dot.x}
                      y2={dot.y}
                      stroke={content.fallbackColor}
                      strokeWidth={1}
                      strokeDasharray="4 4"
                      opacity={highlightProgress * 0.5}
                    />
                  )}
                  <circle
                    cx={dot.x}
                    cy={dot.y}
                    r={isHighlighted ? 8 : 4}
                    fill={isHighlighted ? content.fallbackColor : "var(--color-text-tertiary)"}
                    opacity={isHighlighted ? 1 : dotOpacity * 0.3}
                  />
                </g>
              );
            })}

            {/* Query point */}
            {collapseProgress > 0.5 && (
              <circle
                cx={QUERY_POINT.x}
                cy={QUERY_POINT.y}
                r={interpolate(collapseProgress, [0.5, 1], [20, 8], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                })}
                fill={content.fallbackColor}
                opacity={0.9}
              />
            )}

            {/* Query label */}
            {collapseProgress > 0.8 && (
              <text
                x={QUERY_POINT.x}
                y={QUERY_POINT.y - 16}
                textAnchor="middle"
                fontSize={11}
                fill="var(--color-text-secondary)"
              >
                query vector
              </text>
            )}
          </svg>
        </AbsoluteFill>
      </Sequence>

      {/* Act 3 */}
      <Sequence from={ACT_2_END} durationInFrames={ANIMATION_DURATION_FRAMES - ACT_2_END}>
        <AbsoluteFill>
          <ResultsReveal
            results={content.results}
            verdict={content.verdict}
            accentColor={color}
          />
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
