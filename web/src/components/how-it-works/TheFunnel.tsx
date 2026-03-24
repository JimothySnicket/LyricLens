import { useTransform, motion, type MotionValue } from "motion/react";

interface Props {
  progress: MotionValue<number>;
}

interface Dot {
  id: number;
  x: number;
  y: number;
  matches: boolean;
  // Settled position after filtering
  settledX: number;
  settledY: number;
}

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

function generateDots(count: number): Dot[] {
  const rng = seededRandom(42);
  const matchCount = Math.round(count * (142 / 819));
  const dots: Dot[] = [];

  for (let i = 0; i < count; i++) {
    dots.push({
      id: i,
      x: rng() * 280 + 10,
      y: rng() * 200 + 20,
      matches: i < matchCount,
      settledX: 0,
      settledY: 0,
    });
  }

  // Compute settled positions — matching dots cluster tighter
  const matching = dots.filter((d) => d.matches);
  const centerX = 150;
  const centerY = 120;
  matching.forEach((d, i) => {
    const angle = (i / matching.length) * Math.PI * 2;
    const radius = 30 + rng() * 50;
    d.settledX = centerX + Math.cos(angle) * radius;
    d.settledY = centerY + Math.sin(angle) * radius;
  });

  dots
    .filter((d) => !d.matches)
    .forEach((d) => {
      d.settledX = d.x;
      d.settledY = d.y;
    });

  return dots;
}

const DOTS = generateDots(50);

export function TheFunnel({ progress }: Props) {
  // Phase 1: 0-0.3 — all dots visible, counter shows 819
  // Phase 2: 0.3-0.7 — non-matching fade, counter animates down
  // Phase 3: 0.7-1.0 — remaining dots settle into cluster

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center">
      <p className="text-xs uppercase tracking-widest text-(--color-text-tertiary) mb-6">
        Filter: decade = 1980s
      </p>

      <div className="relative" style={{ width: 300, height: 260 }}>
        <svg width={300} height={260} className="absolute inset-0">
          {DOTS.map((dot) => (
            <DotElement key={dot.id} dot={dot} progress={progress} />
          ))}
        </svg>
      </div>

      <Counter progress={progress} />
    </div>
  );
}

function DotElement({
  dot,
  progress,
}: {
  dot: Dot;
  progress: MotionValue<number>;
}) {
  const stagger = dot.id * 0.003;

  // Non-matching dots fade and shrink
  const opacity = useTransform(
    progress,
    dot.matches
      ? [0, 1]
      : [0.25 + stagger, 0.45 + stagger],
    dot.matches ? [0.7, 0.7] : [0.7, 0]
  );

  const scale = useTransform(
    progress,
    dot.matches
      ? [0, 1]
      : [0.25 + stagger, 0.45 + stagger],
    dot.matches ? [1, 1] : [1, 0]
  );

  // Matching dots move to settled positions
  const cx = useTransform(
    progress,
    [0.5, 0.85],
    [dot.x, dot.matches ? dot.settledX : dot.x]
  );

  const cy = useTransform(
    progress,
    [0.5, 0.85],
    [dot.y, dot.matches ? dot.settledY : dot.y]
  );

  // Matching dots get highlighted
  const fill = useTransform(progress, (p) => {
    if (!dot.matches) return "var(--color-text-tertiary)";
    if (p > 0.5) return "var(--color-mode-keyword)";
    return "var(--color-text-tertiary)";
  });

  return (
    <motion.circle
      cx={cx}
      cy={cy}
      r={4}
      style={{
        opacity,
        scale,
        fill,
        transformOrigin: "center",
      }}
    />
  );
}

function Counter({ progress }: Props) {
  const displayCount = useTransform(progress, [0.2, 0.55], [819, 142]);

  // Round to integer for display
  const roundedCount = useTransform(displayCount, (v) => Math.round(v));

  const counterColor = useTransform(progress, (p) =>
    p > 0.5 ? "var(--color-mode-keyword)" : "var(--color-text)"
  );

  return (
    <div className="flex items-baseline gap-2 mt-6">
      <motion.span
        className="text-3xl font-semibold tabular-nums font-mono"
        style={{ color: counterColor }}
      >
        {roundedCount}
      </motion.span>
      <span className="text-sm text-(--color-text-secondary)">songs</span>
    </div>
  );
}
