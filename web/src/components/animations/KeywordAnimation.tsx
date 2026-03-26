// web/src/components/animations/KeywordAnimation.tsx

import { AbsoluteFill, useCurrentFrame, interpolate, Sequence } from "remotion";
import type { ModeAnimationContent } from "./animation-content";
import { ACT_1_END, ACT_2_END, ANIMATION_DURATION_FRAMES } from "./animation-content";
import { QueryEntry } from "./shared/QueryEntry";
import { ResultsReveal } from "./shared/ResultsReveal";

interface Props {
  content: ModeAnimationContent;
}

export const KeywordAnimation: React.FC<Props> = ({ content }) => {
  const frame = useCurrentFrame();
  const color = `var(${content.cssVar}, ${content.fallbackColor})`;

  // Token scanning in act 2
  const tokens = content.query.split(/\s+/).filter((w) => !["in", "the", "from"].includes(w.toLowerCase()));
  const scanProgress = interpolate(frame, [ACT_1_END, ACT_2_END], [0, 1], {
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
      {/* Act 1: Query enters */}
      <Sequence from={0} durationInFrames={ACT_1_END}>
        <AbsoluteFill>
          <QueryEntry query={content.query} accentColor={color} />
        </AbsoluteFill>
      </Sequence>

      {/* Act 2: Token matching */}
      <Sequence from={ACT_1_END} durationInFrames={ACT_2_END - ACT_1_END}>
        <AbsoluteFill
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 32,
          }}
        >
          {/* Pipeline steps */}
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {content.pipelineSteps.map((step, i) => {
              const stepProgress = interpolate(
                scanProgress,
                [i / content.pipelineSteps.length, (i + 0.5) / content.pipelineSteps.length],
                [0, 1],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
              );

              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      padding: "6px 14px",
                      borderRadius: 20,
                      border: `1px solid ${color}`,
                      fontSize: 12,
                      color: stepProgress > 0.5 ? "white" : color,
                      backgroundColor: stepProgress > 0.5 ? color : "transparent",
                      opacity: interpolate(stepProgress, [0, 0.3], [0.3, 1], {
                        extrapolateRight: "clamp",
                      }),
                    }}
                  >
                    {step}
                  </div>
                  {i < content.pipelineSteps.length - 1 && (
                    <span style={{ color: "var(--color-text-tertiary)", fontSize: 14 }}>→</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Token match visualization */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
            {tokens.map((token, i) => {
              const tokenDelay = i / tokens.length;
              const isMatched = scanProgress > tokenDelay + 0.3;

              return (
                <div
                  key={i}
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 20,
                    fontWeight: 600,
                    padding: "8px 16px",
                    borderRadius: 8,
                    border: `2px solid ${isMatched ? color : "var(--color-border)"}`,
                    color: isMatched ? color : "var(--color-text-tertiary)",
                    backgroundColor: isMatched
                      ? `color-mix(in srgb, ${content.fallbackColor} 10%, transparent)`
                      : "transparent",
                  }}
                >
                  {token}
                </div>
              );
            })}
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Act 3: Results */}
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
