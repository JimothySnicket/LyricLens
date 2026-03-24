import { useRef } from "react";
import { useScroll, useTransform, motion } from "motion/react";
import { QueryDecomposition } from "../components/how-it-works/QueryDecomposition";
import { TheFunnel } from "../components/how-it-works/TheFunnel";
import { EmbeddingMoment } from "../components/how-it-works/EmbeddingMoment";
import { ModeComparison } from "../components/how-it-works/ModeComparison";

const SEQUENCES = [
  { label: "Query Decomposition", range: [0.2, 0.45] as const },
  { label: "The Funnel", range: [0.45, 0.65] as const },
  { label: "The Embedding Moment", range: [0.65, 0.85] as const },
  { label: "Mode Comparison", range: [0.85, 1.0] as const },
] as const;

export function HowItWorks() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: scrollRef,
    offset: ["start start", "end end"],
  });

  // Map overall progress to each sequence's 0-1 range
  const seq1Progress = useTransform(
    scrollYProgress,
    [SEQUENCES[0].range[0], SEQUENCES[0].range[1]],
    [0, 1]
  );
  const seq2Progress = useTransform(
    scrollYProgress,
    [SEQUENCES[1].range[0], SEQUENCES[1].range[1]],
    [0, 1]
  );
  const seq3Progress = useTransform(
    scrollYProgress,
    [SEQUENCES[2].range[0], SEQUENCES[2].range[1]],
    [0, 1]
  );
  const seq4Progress = useTransform(
    scrollYProgress,
    [SEQUENCES[3].range[0], SEQUENCES[3].range[1]],
    [0, 1]
  );

  // Determine which sequence is active for visibility
  const seq1Opacity = useTransform(scrollYProgress, [0.05, 0.2, 0.43, 0.45], [0, 1, 1, 0]);
  const seq2Opacity = useTransform(scrollYProgress, [0.43, 0.45, 0.63, 0.65], [0, 1, 1, 0]);
  const seq3Opacity = useTransform(scrollYProgress, [0.63, 0.65, 0.83, 0.85], [0, 1, 1, 0]);
  const seq4Opacity = useTransform(scrollYProgress, [0.83, 0.85, 0.98, 1.0], [0, 1, 1, 1]);

  return (
    <div>
      {/* ── Scroll-driven animation section ── */}
      <div ref={scrollRef} className="relative" style={{ height: "500vh" }}>
        {/* Sticky viewport */}
        <div className="sticky top-14 h-[calc(100vh-56px)] flex items-center justify-center overflow-hidden">
          <div className="relative w-full max-w-3xl mx-auto" style={{ height: "70vh" }}>
            {/* Intro text — fades out as scroll begins */}
            <IntroOverlay scrollProgress={scrollYProgress} />

            {/* Sequence 1: Query Decomposition */}
            <motion.div className="absolute inset-0" style={{ opacity: seq1Opacity }}>
              <SequenceLabel label="1. Query Decomposition" />
              <QueryDecomposition progress={seq1Progress} />
            </motion.div>

            {/* Sequence 2: The Funnel */}
            <motion.div className="absolute inset-0" style={{ opacity: seq2Opacity }}>
              <SequenceLabel label="2. The Funnel" />
              <TheFunnel progress={seq2Progress} />
            </motion.div>

            {/* Sequence 3: The Embedding Moment */}
            <motion.div className="absolute inset-0" style={{ opacity: seq3Opacity }}>
              <SequenceLabel label="3. The Embedding Moment" />
              <EmbeddingMoment progress={seq3Progress} />
            </motion.div>

            {/* Sequence 4: Mode Comparison */}
            <motion.div className="absolute inset-0" style={{ opacity: seq4Opacity }}>
              <SequenceLabel label="4. Mode Comparison" />
              <ModeComparison progress={seq4Progress} />
            </motion.div>

            {/* Scroll progress indicator */}
            <ProgressBar scrollProgress={scrollYProgress} />
          </div>
        </div>
      </div>

      {/* ── Static content sections ── */}
      <div className="max-w-3xl mx-auto px-6 py-24 space-y-24">
        <WhenDoYouNeedIt />
        <KeywordWinsToo />
        <TheNumbers />
        <RealWorldMapping />
        <BuiltByJamie />
      </div>
    </div>
  );
}

/* ────────────────────────────── Helpers ────────────────────────────── */

function IntroOverlay({
  scrollProgress,
}: {
  scrollProgress: ReturnType<typeof useScroll>["scrollYProgress"];
}) {
  const opacity = useTransform(scrollProgress, [0, 0.08, 0.18], [1, 1, 0]);
  const y = useTransform(scrollProgress, [0.08, 0.18], [0, -30]);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center text-center z-10"
      style={{ opacity, y }}
    >
      <h1 className="text-3xl font-semibold text-(--color-text) mb-3">
        How retrieval actually works
      </h1>
      <p className="text-(--color-text-secondary) max-w-md">
        Scroll to watch a natural-language query become search results — step by step.
      </p>
      <div className="mt-8 flex flex-col items-center gap-2 text-(--color-text-tertiary)">
        <span className="text-xs uppercase tracking-widest">Scroll to begin</span>
        <motion.svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          animate={{ y: [0, 4, 0] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          <path d="M5 8l5 5 5-5" />
        </motion.svg>
      </div>
    </motion.div>
  );
}

function SequenceLabel({ label }: { label: string }) {
  return (
    <div className="absolute top-0 left-0 right-0 text-center">
      <span className="text-xs uppercase tracking-widest text-(--color-text-tertiary)">
        {label}
      </span>
    </div>
  );
}

function ProgressBar({
  scrollProgress,
}: {
  scrollProgress: ReturnType<typeof useScroll>["scrollYProgress"];
}) {
  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
      {SEQUENCES.map((seq, i) => (
        <ProgressDot
          key={i}
          index={i}
          range={seq.range}
          scrollProgress={scrollProgress}
        />
      ))}
    </div>
  );
}

function ProgressDot({
  index,
  range,
  scrollProgress,
}: {
  index: number;
  range: readonly [number, number];
  scrollProgress: ReturnType<typeof useScroll>["scrollYProgress"];
}) {
  const isActive = useTransform(scrollProgress, (p) =>
    p >= range[0] && p <= range[1] ? 1 : 0.3
  );

  const width = useTransform(scrollProgress, (p) =>
    p >= range[0] && p <= range[1] ? 24 : 8
  );

  return (
    <motion.div
      className="h-2 rounded-full bg-(--color-text)"
      style={{ opacity: isActive, width }}
    />
  );
}

/* ────────────────────────── Static Sections ───────────────────────── */

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-2xl font-semibold text-(--color-text) mb-6">
      {children}
    </h2>
  );
}

function WhenDoYouNeedIt() {
  return (
    <section>
      <SectionHeading>When do you actually need vector search?</SectionHeading>
      <div className="space-y-4 text-(--color-text-secondary) leading-relaxed">
        <p>
          Most search problems don't need embeddings. If your users search by
          exact titles, SKUs, or known terms — keyword search is faster, cheaper,
          and easier to debug.
        </p>
        <p>
          Vector search earns its complexity when queries are <em>conceptual</em>:
          "something upbeat for a road trip," "songs about losing someone you
          love." The user doesn't know the right keywords — they know the{" "}
          <em>feeling</em>.
        </p>
        <p>
          The hybrid approach in LyricLens exists because real-world queries
          usually contain <em>both</em>: a vague concept plus a concrete filter.
          "80s songs about loneliness" has a structured decade filter and an
          unstructured semantic core. Handling both well is the hard part.
        </p>
      </div>
    </section>
  );
}

function KeywordWinsToo() {
  return (
    <section>
      <SectionHeading>But keyword wins too</SectionHeading>
      <p className="text-(--color-text-secondary) mb-6 leading-relaxed">
        Semantic search is not always better. Here's a concrete example where
        keyword search outperforms it:
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Keyword result */}
        <div
          className="rounded-(--radius-md) border p-5"
          style={{
            borderColor: "var(--color-mode-keyword)",
            backgroundColor: "var(--color-warning-bg)",
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <span
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: "var(--color-mode-keyword)" }}
            >
              Keyword
            </span>
            <span className="text-xs text-(--color-text-tertiary)">exact match</span>
          </div>
          <p className="text-sm text-(--color-text) font-medium mb-2">
            "songs with baby in the title from the 60s"
          </p>
          <ul className="text-sm text-(--color-text-secondary) space-y-1">
            <li>Baby Love — The Supremes</li>
            <li>Be My Baby — The Ronettes</li>
            <li>Baby It's You — The Shirelles</li>
          </ul>
          <p
            className="text-xs font-medium mt-3"
            style={{ color: "var(--color-mode-keyword)" }}
          >
            Finds all of them instantly
          </p>
        </div>

        {/* Semantic result */}
        <div
          className="rounded-(--radius-md) border p-5"
          style={{
            borderColor: "var(--color-border)",
            backgroundColor: "var(--color-bg-secondary)",
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <span
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: "var(--color-mode-semantic)" }}
            >
              Semantic
            </span>
            <span className="text-xs text-(--color-text-tertiary)">meaning match</span>
          </div>
          <p className="text-sm text-(--color-text) font-medium mb-2">
            "songs with baby in the title from the 60s"
          </p>
          <ul className="text-sm text-(--color-text-tertiary) space-y-1">
            <li>You've Lost That Lovin' Feeling</li>
            <li>My Girl</li>
            <li>Stand By Me</li>
          </ul>
          <p className="text-xs text-(--color-text-tertiary) mt-3">
            Misses the point — "baby" is literal here
          </p>
        </div>
      </div>
    </section>
  );
}

function TheNumbers() {
  const metrics = [
    {
      label: "Precision@5",
      value: "—",
      description: "Fraction of top-5 results that are relevant",
    },
    {
      label: "MRR",
      value: "—",
      description: "Mean Reciprocal Rank across test queries",
    },
    {
      label: "Cluster Purity",
      value: "—",
      description: "How well embeddings separate by genre/mood",
    },
  ];

  return (
    <section>
      <SectionHeading>The numbers</SectionHeading>
      <p className="text-(--color-text-secondary) mb-6 leading-relaxed">
        Evaluation metrics will be populated from{" "}
        <code className="text-sm font-mono bg-(--color-bg-tertiary) px-1.5 py-0.5 rounded-(--radius-sm)">
          /api/stats
        </code>{" "}
        once the evaluation pipeline is wired up.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-(--radius-md) border border-(--color-border) p-5 bg-(--color-surface)"
          >
            <p className="text-xs uppercase tracking-wider text-(--color-text-tertiary) mb-2">
              {metric.label}
            </p>
            <p className="text-3xl font-semibold font-mono text-(--color-text) mb-2">
              {metric.value}
            </p>
            <p className="text-sm text-(--color-text-secondary)">
              {metric.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function RealWorldMapping() {
  const mappings = [
    {
      here: "Song lyrics",
      realWorld: "Support tickets, product descriptions, legal docs",
    },
    {
      here: "Artist / decade / genre filters",
      realWorld: "Department, priority, date range",
    },
    {
      here: "Qdrant vector search",
      realWorld: "Any vector DB (Pinecone, Weaviate, pgvector)",
    },
    {
      here: "The mode toggle",
      realWorld: "The decision your team needs to make",
    },
  ];

  return (
    <section>
      <SectionHeading>This pattern in the real world</SectionHeading>
      <p className="text-(--color-text-secondary) mb-6 leading-relaxed">
        LyricLens is a portfolio piece, but the retrieval pattern is
        production-ready. Here's how it maps:
      </p>

      <div className="rounded-(--radius-md) border border-(--color-border) overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-(--color-border) bg-(--color-bg-secondary)">
              <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-(--color-text-tertiary) font-medium">
                In LyricLens
              </th>
              <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-(--color-text-tertiary) font-medium">
                In production
              </th>
            </tr>
          </thead>
          <tbody>
            {mappings.map((row, i) => (
              <tr
                key={i}
                className={
                  i < mappings.length - 1
                    ? "border-b border-(--color-border-subtle)"
                    : ""
                }
              >
                <td className="px-5 py-3 text-(--color-text)">{row.here}</td>
                <td className="px-5 py-3 text-(--color-text-secondary)">
                  {row.realWorld}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function BuiltByJamie() {
  return (
    <section className="text-center py-12">
      <h2 className="text-2xl font-semibold text-(--color-text) mb-3">
        Built by Jamie
      </h2>
      <p className="text-(--color-text-secondary) max-w-md mx-auto mb-6 leading-relaxed">
        LyricLens is a portfolio project exploring hybrid search, vector
        embeddings, and scroll-driven storytelling. The entire retrieval
        pipeline — from query parsing to ranked results — is built from scratch.
      </p>
      <a
        href="/"
        className="inline-flex items-center gap-2 text-sm font-medium px-5 py-2.5 rounded-(--radius-md) bg-(--color-accent) text-(--color-text-inverse) hover:bg-(--color-accent-hover) transition-colors"
      >
        Try the search
      </a>
    </section>
  );
}
