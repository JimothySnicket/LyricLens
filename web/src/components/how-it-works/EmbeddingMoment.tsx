import { useTransform, motion, type MotionValue } from "motion/react";

interface Props {
  progress: MotionValue<number>;
}

interface SongDot {
  id: number;
  x: number;
  y: number;
  isMatch: boolean;
  similarity: number;
  title: string;
}

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

const QUERY_POINT = { x: 200, y: 140 };

function generateSongDots(): SongDot[] {
  const rng = seededRandom(99);
  const dots: SongDot[] = [];

  // 5 matched songs clustered near query point
  const matchedSongs = [
    { title: "Crying in the Rain", sim: 0.94 },
    { title: "Purple Rain", sim: 0.91 },
    { title: "Who Will Stop the Rain", sim: 0.88 },
    { title: "Lonely Teardrops", sim: 0.85 },
    { title: "Solitary Man", sim: 0.82 },
  ];

  matchedSongs.forEach((song, i) => {
    const angle = (i / matchedSongs.length) * Math.PI * 2 + 0.3;
    const radius = 25 + rng() * 20;
    dots.push({
      id: i,
      x: QUERY_POINT.x + Math.cos(angle) * radius,
      y: QUERY_POINT.y + Math.sin(angle) * radius,
      isMatch: true,
      similarity: song.sim,
      title: song.title,
    });
  });

  // ~20 non-matching dots scattered further away
  for (let i = 0; i < 20; i++) {
    const angle = rng() * Math.PI * 2;
    const radius = 80 + rng() * 100;
    dots.push({
      id: i + 5,
      x: QUERY_POINT.x + Math.cos(angle) * radius,
      y: QUERY_POINT.y + Math.sin(angle) * radius,
      isMatch: false,
      similarity: 0.2 + rng() * 0.3,
      title: "",
    });
  }

  return dots;
}

const SONG_DOTS = generateSongDots();

export function EmbeddingMoment({ progress }: Props) {
  // Phase 1: 0-0.2 — query text visible
  // Phase 2: 0.2-0.4 — text shrinks into a point
  // Phase 3: 0.4-0.6 — point drops into song space
  // Phase 4: 0.6-0.8 — proximity lines draw, matches highlight
  // Phase 5: 0.8-1.0 — results appear

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center">
      {/* Query text that transforms into a point */}
      <QueryText progress={progress} />

      {/* Song space with dots and proximity lines */}
      <div className="relative" style={{ width: 400, height: 280 }}>
        <svg
          width={400}
          height={280}
          className="absolute inset-0"
          style={{ overflow: "visible" }}
        >
          {/* Proximity lines */}
          {SONG_DOTS.filter((d) => d.isMatch).map((dot) => (
            <ProximityLine
              key={`line-${dot.id}`}
              dot={dot}
              progress={progress}
            />
          ))}

          {/* Song dots */}
          {SONG_DOTS.map((dot) => (
            <SongDotElement key={dot.id} dot={dot} progress={progress} />
          ))}

          {/* Query point */}
          <QueryPoint progress={progress} />
        </svg>
      </div>

      {/* Results */}
      <Results progress={progress} />
    </div>
  );
}

function QueryText({ progress }: Props) {
  const opacity = useTransform(progress, [0, 0.15, 0.3], [1, 1, 0]);
  const scale = useTransform(progress, [0.15, 0.3], [1, 0.3]);
  const y = useTransform(progress, [0.15, 0.3], [0, 40]);

  return (
    <motion.div
      className="text-center mb-4"
      style={{ opacity, scale, y }}
    >
      <p className="text-xs uppercase tracking-widest text-(--color-text-tertiary) mb-2">
        Semantic meaning
      </p>
      <p
        className="text-lg font-medium"
        style={{ color: "var(--color-mode-semantic)" }}
      >
        "loneliness and rain"
      </p>
    </motion.div>
  );
}

function QueryPoint({ progress }: Props) {
  const opacity = useTransform(progress, [0.25, 0.35], [0, 1]);
  const cy = useTransform(progress, [0.35, 0.5], [-20, QUERY_POINT.y]);
  const r = useTransform(progress, [0.25, 0.35], [2, 6]);

  // Glow pulse
  const glowRadius = useTransform(progress, [0.35, 0.5], [6, 12]);
  const glowOpacity = useTransform(progress, [0.35, 0.55], [0.6, 0.3]);

  return (
    <>
      {/* Glow */}
      <motion.circle
        cx={QUERY_POINT.x}
        cy={cy}
        r={glowRadius}
        fill="var(--color-mode-semantic)"
        style={{ opacity: glowOpacity }}
      />
      {/* Point */}
      <motion.circle
        cx={QUERY_POINT.x}
        cy={cy}
        r={r}
        fill="var(--color-mode-semantic)"
        style={{ opacity }}
      />
    </>
  );
}

function SongDotElement({
  dot,
  progress,
}: {
  dot: SongDot;
  progress: MotionValue<number>;
}) {
  const opacity = useTransform(progress, (p) => {
    if (p < 0.3) return 0;
    if (p < 0.55) {
      const v = (p - 0.3) / 0.25;
      return 0.5 * Math.min(v, 1);
    }
    const v = (p - 0.55) / 0.15;
    const t = Math.min(v, 1);
    return dot.isMatch ? 0.5 + 0.5 * t : 0.5 - 0.35 * t;
  });

  const r = useTransform(progress, (p) => {
    if (!dot.isMatch) return 3;
    if (p > 0.65) return 5;
    return 3;
  });

  const fill = useTransform(progress, (p) => {
    if (dot.isMatch && p > 0.6) return "var(--color-mode-semantic)";
    return "var(--color-text-tertiary)";
  });

  return (
    <motion.circle
      cx={dot.x}
      cy={dot.y}
      r={r}
      style={{ opacity, fill }}
    />
  );
}

function ProximityLine({
  dot,
  progress,
}: {
  dot: SongDot;
  progress: MotionValue<number>;
}) {
  const stagger = dot.id * 0.03;
  const lineOpacity = useTransform(
    progress,
    [0.55 + stagger, 0.65 + stagger],
    [0, 0.4]
  );

  return (
    <motion.line
      x1={QUERY_POINT.x}
      y1={QUERY_POINT.y}
      x2={dot.x}
      y2={dot.y}
      stroke="var(--color-mode-semantic)"
      strokeWidth={1}
      strokeDasharray="4 2"
      style={{ opacity: lineOpacity }}
    />
  );
}

function Results({ progress }: Props) {
  const opacity = useTransform(progress, [0.75, 0.9], [0, 1]);
  const y = useTransform(progress, [0.75, 0.9], [20, 0]);

  const matches = SONG_DOTS.filter((d) => d.isMatch);

  return (
    <motion.div
      className="mt-4 flex flex-col gap-1.5"
      style={{ opacity, y }}
    >
      {matches.map((dot) => (
        <div
          key={dot.id}
          className="flex items-center gap-3 text-sm"
        >
          <span
            className="font-mono text-xs tabular-nums px-1.5 py-0.5 rounded-(--radius-sm)"
            style={{
              color: "var(--color-mode-semantic)",
              backgroundColor: "var(--color-info-bg)",
            }}
          >
            {dot.similarity.toFixed(2)}
          </span>
          <span className="text-(--color-text-secondary)">{dot.title}</span>
        </div>
      ))}
    </motion.div>
  );
}
