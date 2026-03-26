// web/src/components/animations/NLAnimation.tsx

import { AbsoluteFill, useCurrentFrame, interpolate, Sequence } from "remotion";
import type { ModeAnimationContent } from "./animation-content";
import { ACT_1_END, ACT_2_END, ANIMATION_DURATION_FRAMES } from "./animation-content";
import { QueryEntry } from "./shared/QueryEntry";
import { ResultsReveal } from "./shared/ResultsReveal";

interface Props {
  content: ModeAnimationContent;
}

export const NLAnimation: React.FC<Props> = ({ content }) => {
  const frame = useCurrentFrame();
  const color = `var(${content.cssVar}, ${content.fallbackColor})`;

  const act2Frame = frame - ACT_1_END;
  const act2Duration = ACT_2_END - ACT_1_END;

  // Phase 1: query enters LLM box (0–30%)
  const sendProgress = interpolate(act2Frame, [0, act2Duration * 0.3], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Phase 2: LLM "thinking" + JSON output (30–65%)
  const thinkProgress = interpolate(act2Frame, [act2Duration * 0.3, act2Duration * 0.65], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Phase 3: structured filters feed into search (65–100%)
  const searchProgress = interpolate(act2Frame, [act2Duration * 0.65, act2Duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Simulated JSON output lines
  const jsonLines = [
    `"title_contains": "baby"`,
    `"decade": "1960s"`,
    `"semantic": "baby in title"`,
  ];

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

      {/* Act 2: LLM processing */}
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
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
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

          {/* LLM box */}
          <div
            style={{
              display: "flex",
              gap: 32,
              alignItems: "center",
            }}
          >
            {/* Query input arrow */}
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 14,
                color: "var(--color-text-secondary)",
                opacity: sendProgress,
                transform: `translateX(${interpolate(sendProgress, [0, 1], [-20, 0])}px)`,
              }}
            >
              "{content.query}"
            </div>

            <div style={{ color: "var(--color-text-tertiary)", opacity: sendProgress > 0.8 ? 1 : 0 }}>→</div>

            {/* LLM box */}
            <div
              style={{
                padding: "16px 24px",
                borderRadius: 10,
                border: `2px solid ${content.fallbackColor}`,
                backgroundColor: "var(--color-surface)",
                minWidth: 100,
                textAlign: "center" as const,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text)" }}>
                DeepSeek
              </div>
              {thinkProgress > 0 && thinkProgress < 0.8 && (
                <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 4 }}>
                  Parsing intent...
                </div>
              )}
              {thinkProgress >= 0.8 && (
                <div style={{ fontSize: 11, color: content.fallbackColor, marginTop: 4 }}>
                  Done
                </div>
              )}
            </div>

            <div style={{ color: "var(--color-text-tertiary)", opacity: thinkProgress > 0.8 ? 1 : 0 }}>→</div>

            {/* JSON output */}
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                padding: 16,
                borderRadius: 8,
                border: "1px solid var(--color-border)",
                backgroundColor: "var(--color-bg-secondary)",
                opacity: thinkProgress > 0.7 ? 1 : 0,
                lineHeight: 1.8,
              }}
            >
              <div style={{ color: "var(--color-text-tertiary)" }}>{"{"}</div>
              {jsonLines.map((line, i) => (
                <div
                  key={i}
                  style={{
                    paddingLeft: 16,
                    color: "var(--color-text)",
                    opacity: thinkProgress > 0.7 + i * 0.08 ? 1 : 0,
                  }}
                >
                  {line}
                </div>
              ))}
              <div style={{ color: "var(--color-text-tertiary)" }}>{"}"}</div>
            </div>
          </div>

          {/* Search status */}
          {searchProgress > 0.3 && (
            <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
              Searching with LLM-derived filters...
            </div>
          )}
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
