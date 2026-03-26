// web/src/components/animations/HybridAnimation.tsx

import { AbsoluteFill, useCurrentFrame, interpolate, Sequence } from "remotion";
import type { ModeAnimationContent } from "./animation-content";
import { ACT_1_END, ACT_2_END, ANIMATION_DURATION_FRAMES } from "./animation-content";
import { QueryEntry } from "./shared/QueryEntry";
import { ResultsReveal } from "./shared/ResultsReveal";

interface Props {
  content: ModeAnimationContent;
}

export const HybridAnimation: React.FC<Props> = ({ content }) => {
  const frame = useCurrentFrame();
  const color = `var(${content.cssVar}, ${content.fallbackColor})`;

  const act2Frame = frame - ACT_1_END;
  const act2Duration = ACT_2_END - ACT_1_END;

  // Phase 1: split into filters vs semantic (0–25%)
  const splitProgress = interpolate(act2Frame, [0, act2Duration * 0.25], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Phase 2: filters narrow the pool (25–55%)
  const filterProgress = interpolate(act2Frame, [act2Duration * 0.25, act2Duration * 0.55], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Phase 3: vector ranking (55–100%)
  const rankProgress = interpolate(act2Frame, [act2Duration * 0.55, act2Duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Split query words into filter vs semantic
  const words = content.query.split(/\s+/);
  const filterWords = ["baby", "title", "60s"];
  const semanticWords = words.filter((w) => !filterWords.includes(w.toLowerCase()) && !["in", "the", "from"].includes(w.toLowerCase()));

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

      {/* Act 2: Split + filter + rank */}
      <Sequence from={ACT_1_END} durationInFrames={act2Duration}>
        <AbsoluteFill
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 24,
          }}
        >
          {/* Pipeline steps */}
          <div style={{ display: "flex", gap: 12 }}>
            {content.pipelineSteps.map((step, i) => {
              const stepActive = (act2Frame / act2Duration) > (i / content.pipelineSteps.length);
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      padding: "6px 14px",
                      borderRadius: 20,
                      border: `1px solid ${color}`,
                      fontSize: 12,
                      color: stepActive ? "white" : color,
                      backgroundColor: stepActive ? content.fallbackColor : "transparent",
                    }}
                  >
                    {step}
                  </div>
                  {i < content.pipelineSteps.length - 1 && (
                    <span style={{ color: "var(--color-text-tertiary)" }}>→</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Two-panel split */}
          <div
            style={{
              display: "flex",
              gap: 32,
              width: 500,
              justifyContent: "center",
            }}
          >
            {/* Left: Structured filters */}
            <div
              style={{
                flex: 1,
                padding: 20,
                borderRadius: 10,
                border: "1px solid var(--color-border)",
                backgroundColor: "var(--color-surface)",
                opacity: splitProgress,
                transform: `translateX(${interpolate(splitProgress, [0, 1], [-20, 0])}px)`,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: 2,
                  textTransform: "uppercase" as const,
                  color: "var(--color-text-tertiary)",
                  marginBottom: 12,
                }}
              >
                Filters extracted
              </div>
              {filterWords.map((w, i) => (
                <div
                  key={i}
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 14,
                    padding: "4px 10px",
                    marginBottom: 6,
                    borderRadius: 4,
                    backgroundColor: filterProgress > i / filterWords.length
                      ? `color-mix(in srgb, ${content.fallbackColor} 15%, transparent)`
                      : "transparent",
                    color: "var(--color-text)",
                  }}
                >
                  {w}
                </div>
              ))}
              {filterProgress > 0.5 && (
                <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 8 }}>
                  {`2,742 → ~180 songs`}
                </div>
              )}
            </div>

            {/* Right: Semantic remainder */}
            <div
              style={{
                flex: 1,
                padding: 20,
                borderRadius: 10,
                border: "1px solid var(--color-border)",
                backgroundColor: "var(--color-surface)",
                opacity: splitProgress,
                transform: `translateX(${interpolate(splitProgress, [0, 1], [20, 0])}px)`,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: 2,
                  textTransform: "uppercase" as const,
                  color: "var(--color-text-tertiary)",
                  marginBottom: 12,
                }}
              >
                Semantic search
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 14,
                  color: "var(--color-text)",
                  marginBottom: 12,
                }}
              >
                {semanticWords.length > 0 ? semanticWords.join(" ") : "baby"}
              </div>
              {rankProgress > 0.3 && (
                <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
                  Vector ranking within filtered set...
                </div>
              )}
            </div>
          </div>
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
