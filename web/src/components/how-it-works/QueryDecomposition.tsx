import { useTransform, motion, type MotionValue } from "motion/react";

interface Props {
  progress: MotionValue<number>;
}

interface WordToken {
  text: string;
  type: "filter" | "semantic" | "stop";
}

const QUERY_WORDS: WordToken[] = [
  { text: "songs", type: "stop" },
  { text: "about", type: "stop" },
  { text: "loneliness", type: "semantic" },
  { text: "and", type: "semantic" },
  { text: "rain", type: "semantic" },
  { text: "from", type: "stop" },
  { text: "the", type: "stop" },
  { text: "80s", type: "filter" },
];

const TYPE_COLORS: Record<WordToken["type"], string> = {
  filter: "var(--color-mode-keyword)",
  semantic: "var(--color-mode-semantic)",
  stop: "var(--color-text-tertiary)",
};

export function QueryDecomposition({ progress }: Props) {
  // Phase 1: 0-0.3 — words visible, then highlights appear
  // Phase 2: 0.3-0.7 — words separate to buckets
  // Phase 3: 0.7-1.0 — stop words fade, buckets settle

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-12">
      {/* Query text */}
      <div className="text-center mb-4">
        <p className="text-xs uppercase tracking-widest text-(--color-text-tertiary) mb-4">
          User query
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {QUERY_WORDS.map((word, i) => (
            <Word key={i} word={word} index={i} progress={progress} />
          ))}
        </div>
      </div>

      {/* Buckets */}
      <div className="flex gap-16 mt-8">
        <Bucket
          label="FILTERS"
          color="var(--color-mode-keyword)"
          progress={progress}
          side="left"
        />
        <Bucket
          label="MEANING"
          color="var(--color-mode-semantic)"
          progress={progress}
          side="right"
        />
      </div>
    </div>
  );
}

function Word({
  word,
  index,
  progress,
}: {
  word: WordToken;
  index: number;
  progress: MotionValue<number>;
}) {
  const staggerDelay = index * 0.04;

  // Highlight phase: each word gets colored at slightly different times
  const highlightStart = 0.15 + staggerDelay;
  const highlightEnd = highlightStart + 0.1;

  const colorOpacity = useTransform(
    progress,
    [highlightStart, highlightEnd],
    [0, 1]
  );

  // Movement phase — words drift toward their bucket
  const moveStart = 0.35 + staggerDelay;
  const moveEnd = moveStart + 0.25;

  const xTarget =
    word.type === "filter" ? -120 : word.type === "semantic" ? 120 : 0;
  const yTarget =
    word.type === "stop" ? 0 : 60;

  const x = useTransform(progress, [moveStart, moveEnd], [0, xTarget]);
  const y = useTransform(progress, [moveStart, moveEnd], [0, yTarget]);

  // Stop words fade out
  const stopOpacity = useTransform(
    progress,
    word.type === "stop" ? [0.5, 0.7] : [0, 1],
    word.type === "stop" ? [1, 0] : [1, 1]
  );

  // Scale up slightly when highlighted
  const scale = useTransform(
    progress,
    [highlightStart, highlightEnd, highlightEnd + 0.05],
    [1, 1.15, 1.05]
  );

  const bgOpacity = useTransform(
    progress,
    [highlightStart, highlightEnd],
    [0, 0.15]
  );

  return (
    <motion.span
      style={{
        x,
        y,
        scale,
        opacity: stopOpacity,
      }}
      className="relative inline-block text-xl font-medium px-2 py-1 rounded-(--radius-sm)"
    >
      {/* Highlight background */}
      <motion.span
        className="absolute inset-0 rounded-(--radius-sm)"
        style={{
          backgroundColor: TYPE_COLORS[word.type],
          opacity: bgOpacity,
        }}
      />
      <motion.span
        style={{
          color: useTransform(colorOpacity, (v) =>
            v > 0.5 ? TYPE_COLORS[word.type] : "var(--color-text)"
          ),
        }}
        className="relative z-10"
      >
        {word.text}
      </motion.span>
    </motion.span>
  );
}

function Bucket({
  label,
  color,
  progress,
  side,
}: {
  label: string;
  color: string;
  progress: MotionValue<number>;
  side: "left" | "right";
}) {
  const opacity = useTransform(progress, [0.25, 0.4], [0, 1]);
  const y = useTransform(progress, [0.25, 0.4], [20, 0]);
  const borderColor = useTransform(
    progress,
    [0.5, 0.7],
    [`color-mix(in srgb, ${color} 30%, transparent)`, `color-mix(in srgb, ${color} 80%, transparent)`]
  );

  const items =
    side === "left"
      ? QUERY_WORDS.filter((w) => w.type === "filter")
      : QUERY_WORDS.filter((w) => w.type === "semantic");

  const itemsOpacity = useTransform(progress, [0.6, 0.8], [0, 1]);

  return (
    <motion.div
      style={{ opacity, y }}
      className="flex flex-col items-center gap-3 min-w-[140px]"
    >
      <motion.div
        className="px-6 py-4 rounded-(--radius-md) border-2 border-dashed flex flex-col items-center gap-2"
        style={{
          borderColor,
        }}
      >
        <span
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color }}
        >
          {label}
        </span>
        <motion.div
          style={{ opacity: itemsOpacity }}
          className="flex flex-wrap gap-1 justify-center mt-1"
        >
          {items.map((item, i) => (
            <span
              key={i}
              className="text-sm px-2 py-0.5 rounded-(--radius-sm)"
              style={{
                color,
                backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`,
              }}
            >
              {item.text}
            </span>
          ))}
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
