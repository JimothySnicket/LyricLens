import { useTransform, motion, type MotionValue } from "motion/react";

interface Props {
  progress: MotionValue<number>;
}

interface PipelineTrack {
  mode: string;
  color: string;
  steps: string[];
  verdict: string;
}

const TRACKS: PipelineTrack[] = [
  {
    mode: "Keyword",
    color: "var(--color-mode-keyword)",
    steps: ["Parse", "Filter", "Term Match", "Score"],
    verdict: "Needs exact words",
  },
  {
    mode: "Semantic",
    color: "var(--color-mode-semantic)",
    steps: ["Parse", "Embed", "Vector Search", "Rank"],
    verdict: "Finds the meaning",
  },
  {
    mode: "Hybrid",
    color: "var(--color-mode-hybrid)",
    steps: ["Parse", "Filter", "Embed", "Search", "Rank"],
    verdict: "Best of both",
  },
];

export function ModeComparison({ progress }: Props) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center px-8">
      <HeaderText progress={progress} />

      <div className="flex gap-6 w-full max-w-2xl mt-6">
        {TRACKS.map((track, trackIndex) => (
          <Track
            key={track.mode}
            track={track}
            trackIndex={trackIndex}
            progress={progress}
          />
        ))}
      </div>
    </div>
  );
}

function HeaderText({ progress }: Props) {
  const opacity = useTransform(progress, [0, 0.12], [0, 1]);
  const y = useTransform(progress, [0, 0.12], [10, 0]);

  return (
    <motion.p
      className="text-xs uppercase tracking-widest text-(--color-text-tertiary) mb-2"
      style={{ opacity, y }}
    >
      Three modes, one query
    </motion.p>
  );
}

function Track({
  track,
  trackIndex,
  progress,
}: {
  track: PipelineTrack;
  trackIndex: number;
  progress: MotionValue<number>;
}) {
  const trackDelay = trackIndex * 0.05;
  const trackOpacity = useTransform(
    progress,
    [0.05 + trackDelay, 0.15 + trackDelay],
    [0, 1]
  );

  return (
    <motion.div
      className="flex-1 flex flex-col items-center gap-3"
      style={{ opacity: trackOpacity }}
    >
      {/* Mode label */}
      <span
        className="text-sm font-semibold uppercase tracking-wider"
        style={{ color: track.color }}
      >
        {track.mode}
      </span>

      {/* Pipeline steps */}
      <div className="flex flex-col gap-2 w-full">
        {track.steps.map((step, stepIndex) => (
          <Step
            key={step}
            step={step}
            color={track.color}
            stepIndex={stepIndex}
            trackIndex={trackIndex}
            totalSteps={track.steps.length}
            progress={progress}
          />
        ))}
      </div>

      {/* Connector line to verdict */}
      <ConnectorLine
        color={track.color}
        trackIndex={trackIndex}
        totalSteps={track.steps.length}
        progress={progress}
      />

      {/* Verdict */}
      <Verdict
        text={track.verdict}
        color={track.color}
        trackIndex={trackIndex}
        totalSteps={track.steps.length}
        progress={progress}
      />
    </motion.div>
  );
}

function Step({
  step,
  color,
  stepIndex,
  trackIndex,
  totalSteps,
  progress,
}: {
  step: string;
  color: string;
  stepIndex: number;
  trackIndex: number;
  totalSteps: number;
  progress: MotionValue<number>;
}) {
  // Stagger: each step lights up sequentially
  const baseDelay = trackIndex * 0.05;
  const stepDelay = stepIndex * 0.08;
  const start = 0.15 + baseDelay + stepDelay;
  const end = start + 0.1;

  const stepOpacity = useTransform(progress, [start, end], [0.25, 1]);
  const bgOpacity = useTransform(progress, [start, end], [0, 0.12]);
  const scale = useTransform(progress, [start, end, end + 0.02], [0.95, 1.03, 1]);
  const borderColor = useTransform(
    progress,
    [start, end],
    [`color-mix(in srgb, ${color} 15%, transparent)`, `color-mix(in srgb, ${color} 50%, transparent)`]
  );

  return (
    <motion.div
      className="text-center text-sm py-2 px-3 rounded-(--radius-sm) border"
      style={{
        opacity: stepOpacity,
        scale,
        borderColor,
        backgroundColor: `color-mix(in srgb, ${color} 8%, transparent)`,
      }}
    >
      <span style={{ color }}>{step}</span>
    </motion.div>
  );
}

function ConnectorLine({
  color,
  trackIndex,
  totalSteps,
  progress,
}: {
  color: string;
  trackIndex: number;
  totalSteps: number;
  progress: MotionValue<number>;
}) {
  const start = 0.15 + trackIndex * 0.05 + totalSteps * 0.08 + 0.05;
  const opacity = useTransform(progress, [start, start + 0.08], [0, 0.4]);

  return (
    <motion.div
      className="w-px h-4"
      style={{ backgroundColor: color, opacity }}
    />
  );
}

function Verdict({
  text,
  color,
  trackIndex,
  totalSteps,
  progress,
}: {
  text: string;
  color: string;
  trackIndex: number;
  totalSteps: number;
  progress: MotionValue<number>;
}) {
  const start = 0.15 + trackIndex * 0.05 + totalSteps * 0.08 + 0.1;
  const end = start + 0.1;

  const opacity = useTransform(progress, [start, end], [0, 1]);
  const y = useTransform(progress, [start, end], [8, 0]);

  return (
    <motion.div
      className="text-xs font-medium px-3 py-1.5 rounded-full"
      style={{
        opacity,
        y,
        color,
        backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
      }}
    >
      {text}
    </motion.div>
  );
}
