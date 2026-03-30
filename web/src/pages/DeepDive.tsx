import { motion, useInView } from "motion/react";
import { useRef } from "react";

function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.25, 0.1, 0.25, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xl font-semibold text-(--color-text) mb-5 mt-0">
      {children}
    </h2>
  );
}

function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4 text-[15px] text-(--color-text-secondary) leading-relaxed">
      {children}
    </div>
  );
}

function Table({
  headers,
  rows,
  compact,
}: {
  headers: string[];
  rows: (string | React.ReactNode)[][];
  compact?: boolean;
}) {
  return (
    <div className="overflow-x-auto my-6 rounded-(--radius-md) border border-(--color-border-subtle)">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-(--color-bg-secondary)">
            {headers.map((h, i) => (
              <th
                key={i}
                className={`text-left ${compact ? "px-3 py-2" : "px-4 py-3"} text-[11px] uppercase tracking-wider text-(--color-text-tertiary) font-medium ${i > 0 ? "border-l border-(--color-border-subtle)" : ""}`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className="border-t border-(--color-border-subtle)"
            >
              {row.map((cell, j) => (
                <td
                  key={j}
                  className={`${compact ? "px-3 py-2" : "px-4 py-3"} text-(--color-text-secondary) ${j > 0 ? "border-l border-(--color-border-subtle)" : ""} ${j === 0 ? "font-medium text-(--color-text)" : ""}`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center p-4 rounded-(--radius-md) bg-(--color-bg-secondary)">
      <div className="text-2xl font-bold font-mono text-(--color-text)">
        {value}
      </div>
      <div className="text-[11px] uppercase tracking-wider text-(--color-text-tertiary) mt-1">
        {label}
      </div>
    </div>
  );
}

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-6 border-l-2 border-(--color-border) pl-5 py-1">
      {children}
    </div>
  );
}

function PipelineDiagram() {
  const box =
    "border border-(--color-border) rounded-(--radius-md) bg-(--color-bg-secondary) px-4 py-3 text-center";
  const label = "text-xs text-(--color-text-tertiary)";
  const title = "text-sm font-medium text-(--color-text)";
  const connector = "text-(--color-text-tertiary) text-lg leading-none";

  return (
    <div className="my-8 flex flex-col items-center gap-2">
      {/* User query */}
      <div className={`${box} w-48`}>
        <div className={title}>User query</div>
      </div>
      <div className={connector}>&#x25BC;</div>

      {/* Orchestrator */}
      <div className={`${box} max-w-sm w-full`}>
        <div className={title}>DeepSeek Chat</div>
        <div className={label}>Generates 3 interpretations</div>
      </div>

      {/* Three branches */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-sm">
        <div className="flex flex-col items-center gap-2">
          <div className={connector}>&#x25BC;</div>
          <div className={`${box} w-full`}>
            <div className="text-xs font-medium text-(--color-text)">
              Config A
            </div>
          </div>
          <div className={connector}>&#x25BC;</div>
          <div className={`${box} w-full`}>
            <div className="text-xs font-medium text-(--color-text)">
              Results A
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className={connector}>&#x25BC;</div>
          <div className={`${box} w-full`}>
            <div className="text-xs font-medium text-(--color-text)">
              Config B
            </div>
          </div>
          <div className={connector}>&#x25BC;</div>
          <div className={`${box} w-full`}>
            <div className="text-xs font-medium text-(--color-text)">
              Results B
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className={connector}>&#x25BC;</div>
          <div className={`${box} w-full`}>
            <div className="text-xs font-medium text-(--color-text)">
              Config C
            </div>
          </div>
          <div className={connector}>&#x25BC;</div>
          <div className={`${box} w-full`}>
            <div className="text-xs font-medium text-(--color-text)">
              Results C
            </div>
          </div>
        </div>
      </div>

      <div className={label}>
        Each may use a different mode, filters, and semantic text
      </div>
      <div className={connector}>&#x25BC;</div>

      {/* Judge */}
      <div className={`${box} max-w-sm w-full`}>
        <div className={title}>DeepSeek Reasoner</div>
        <div className={label}>
          Sees query + 3 result sets. No orchestrator context. Picks the best.
        </div>
      </div>
      <div className={connector}>&#x25BC;</div>

      {/* Final */}
      <div className={`${box} w-48`}>
        <div className={title}>Final results</div>
      </div>
    </div>
  );
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-(--color-border-subtle) last:border-b-0">
      <span className="text-sm text-(--color-text-secondary)">{label}</span>
      <span className="text-sm font-mono text-(--color-text)">{value}</span>
    </div>
  );
}

export function DeepDive() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16 pt-24 pb-32">
      {/* Header */}
      <Reveal>
        <h1 className="text-3xl font-semibold text-(--color-text) mb-4">
          Deep Dive
        </h1>
        <p className="text-(--color-text-secondary) text-base mb-16">
          How LyricLens works, why it's built this way, and what the tradeoffs
          actually look like.
        </p>
      </Reveal>

      {/* The Point */}
      <Reveal>
        <section className="mb-16">
          <SectionHeading>The Point</SectionHeading>
          <Prose>
            <p>
              A search needs to be organized. It needs to be as good as it needs
              to be. It does not need to be complicated.
            </p>
            <p>
              LyricLens is a functional portfolio piece. I wanted to demonstrate
              technical and conceptual familiarity with some of the fundamentals
              of AI-first development. Having said that, it's also a genuine
              attempt to understand retrieval from the ground up: what keyword
              search, semantic search, and hybrid retrieval actually are, how
              they differ, and where each one breaks.
            </p>
            <p>
              All work with LLMs comes down to inputs and outputs. Models are no
              different from people in this respect: garbage in, garbage out.
              Both forget things, so brevity matters. Both lose the thread when
              context gets noisy, so structure matters. Any time spent getting
              better at shaping inputs and interpreting outputs carries forward
              to every other problem in this space. Building a search engine
              before building a RAG pipeline is just spending time learning how
              to make a brick before you make the house.
            </p>
            <p>
              Three search modes run on the same dataset, side by side. When one
              mode fails, you can see exactly why. When another succeeds, you can
              see exactly how. The failures teach as much as the successes, and
              the nature of the dataset means that changes in the results can
              immediately be conceptualised in a way that more typical data
              wouldn't allow. No domain expertise is needed to judge whether
              "songs that feel like driving at night" returned something good.
              That shared context makes the tradeoffs tangible. Swap the lyrics
              for support tickets or product documentation, and the retrieval
              patterns map directly to production RAG. With music, anyone can
              tell when the search is wrong.
            </p>
            <p>
              The job of retrieval is to put relevant information in front of an
              agent as quickly and minimally as possible, not to keep adding
              layers until the system is solving a different problem than the one
              it started with.
            </p>
          </Prose>
        </section>
      </Reveal>

      {/* Deliberate Constraint */}
      <Reveal>
        <section className="mb-16">
          <SectionHeading>Deliberate Constraint</SectionHeading>
          <Prose>
            <p>
              Every pipeline in this application is deliberately limited. Keyword
              search doesn't understand synonyms. Semantic search can't filter by
              decade. These aren't oversights. The intention was to keep a clear,
              traceable separation of concerns.
            </p>
            <p>
              When "heartbreak" returns nothing from keyword because the word
              doesn't appear in the lyrics, that gap is the lesson. Adding
              synonym expansion would improve recall, but the moment keyword
              starts understanding that "heartbreak" relates to "broken heart,"
              it's doing semantic work. It stops being keyword search. Its
              purpose, showing what rigid lexical matching can and cannot do,
              would be undermined.
            </p>
            <p>
              The same tension exists on the semantic side. Semantic search does
              support a narrow set of hard filters — artist matching and title
              scope — because ignoring "by Elvis" or "in the title" when the
              user explicitly says it would feel broken rather than instructive.
              But it deliberately stops there. It would be straightforward to
              ground vector results with decade or genre filters, to boost songs
              from the right era or style. Hybrid already does this. Leaving
              semantic otherwise ungrounded feels like a handicap, and it is, but
              it's an intentional one. Vector similarity searching by the shape
              of meaning, not by metadata, is a specific capability with specific
              blind spots. Those blind spots are the point.
            </p>
            <p>
              Each mode could be improved. All three could be orchestrated into a
              multi-turn agentic loop. But once the lines between modes blur,
              it's no longer possible to point at one and say "this is pure
              vector search, and here's exactly why it can't handle 'baby in the
              title from the 60s.'" The struggle wasn't building the best search
              possible. It was building something that honestly represents each
              approach without letting one borrow from another. Every improvement
              that crossed the line would have made the search better and the
              demonstration worse.
            </p>
            <p>
              Accuracy was never really the goal, and the dataset wouldn't have
              supported it anyway. The corpus is 2,742 songs extracted from a
              Billboard-derived Kaggle set. James Brown is not in it. The
              Godfather of Soul, the man who invented funk, the most sampled
              artist in the history of recorded music, simply didn't make it into
              this particular Kaggle export. That is an oversight on the behalf
              of the Billboard charts, not this application.
            </p>
          </Prose>
        </section>
      </Reveal>

      {/* The Dataset */}
      <Reveal>
        <section className="mb-16">
          <SectionHeading>The Dataset</SectionHeading>
          <Prose>
            <p>
              Getting to 2,742 indexed songs wasn't straightforward. The project
              started with a bag-of-words dataset that wasn't usable. A second
              had formatting problems throughout. The final source came from
              Kaggle and Genius, but it arrived with just lyrics, titles,
              artists, and chart positions. No genre classifications, no emotion
              labels, no summaries.
            </p>
            <p>
              That was a problem. Lyrics alone give vector search a narrow
              surface to work with. "Songs that sound like a train" would only
              match songs that literally mention trains. To make semantic search
              meaningful, the embeddings needed something higher-level: the mood,
              the themes, the feel of a song, not just its words.
            </p>
            <p>
              DeepSeek generated two to three sentence profile summaries for
              every song in the dataset, capturing thematic content, emotional
              character, and cultural context. The entire summarisation run cost
              $0.23, and it was run several times during iteration. A separate
              classification pass tagged each song with scores across seven
              emotion dimensions: joy, sadness, anger, fear, surprise, disgust,
              and neutral.
            </p>
            <p>
              With summaries and emotions layered onto the base data, Qdrant
              stores two separate vector spaces per song: one embedding of the
              lyrics and one of the summary. When semantic search runs, it
              queries both and keeps whichever scores higher. "Songs that sound
              like a train" can now match against the summary's description of
              rhythm and energy rather than being limited to the literal text.
            </p>
          </Prose>

          <div className="grid grid-cols-3 gap-4 mt-8">
            <StatCard value="2,742" label="Songs" />
            <StatCard value="768D" label="Vectors" />
            <StatCard value="7" label="Emotions" />
          </div>

          <div className="mt-6">
            <SpecRow label="Source" value="Kaggle + Genius" />
            <SpecRow label="Timespan" value="1950 – 2019" />
            <SpecRow label="Summaries" value="DeepSeek ($0.23/run)" />
            <SpecRow label="Vector spaces" value="Lyrics + Summary" />
            <SpecRow label="Song data" value="~10 MB" />
            <SpecRow label="Embeddings" value="~15 MB" />
            <SpecRow label="Viz coordinates" value="~5 MB" />
          </div>
        </section>
      </Reveal>

      {/* How the Searches Work */}
      <Reveal>
        <section className="mb-16">
          <SectionHeading>How the Searches Work</SectionHeading>

          {/* Keyword */}
          <Prose>
            <p>
              <span className="font-semibold text-(--color-text)">
                Keyword
              </span>{" "}
              search uses longest contiguous sequence matching rather than
              individual word frequency. "Be my baby" finds the song because it
              matches the title as a phrase, not because "be," "my," and "baby"
              each appear somewhere in the lyrics. Scores are squared to reward
              longer sequences, so a 3-word title match dominates over scattered
              single-word hits. Filters for decade and genre are additive bonuses
              rather than hard constraints, and scope enforcement means "baby in
              the title" excludes results without a title match. This is
              something keyword search handles that vector search simply cannot.
            </p>
          </Prose>

          <Callout>
            <div className="text-sm font-medium text-(--color-text) mb-3">
              Keyword scoring formula:{" "}
              <code className="font-mono text-(--color-text-secondary)">
                sequence_length&sup2; &times; field_weight + filter_bonuses
              </code>
            </div>
            <Table
              compact
              headers={["Match", "Calculation", "Points"]}
              rows={[
                ["3-word title match", "3\u00B2 \u00D7 2.0", "18"],
                ["1-word lyrics match", "1\u00B2 \u00D7 1.5", "1.5"],
                [
                  "Three scattered 1-word title matches",
                  "(1\u00B2 \u00D7 2.0) \u00D7 3",
                  "6",
                ],
                ["Decade bonus", "flat", "+2"],
                ["Genre bonus", "flat", "+2"],
              ]}
            />
            <p className="text-xs text-(--color-text-tertiary) mt-2">
              The 3-word phrase scores triple what three individual words would.
              Sequences are the score; everything else is a tiebreaker.
            </p>
          </Callout>

          {/* Semantic */}
          <Prose>
            <p className="mt-8">
              <span className="font-semibold text-(--color-text)">
                Semantic
              </span>{" "}
              search converts a query into a 768-dimensional vector using
              nomic-embed-text-v1.5 and finds the closest songs in embedding
              space. The model runs locally via Transformers.js and ONNX rather
              than through an external API. An embedding service would have been
              easier, but self-hosting keeps the pipeline self-contained and
              demonstrates ONNX runtime at the cost of roughly 300MB of model
              weight on the server. Full fp32 rather than quantised, because at
              this scale the quality difference matters more than the size
              savings. Semantic search supports a minimal set of hard
              filters — artist and title scope — so that explicit intent like "by
              Prince" isn't ignored. Beyond that, it has no concept of structured
              metadata. It doesn't know what "from the 60s" means. It finds
              songs that are a similar shape in vector space, and nothing else.
            </p>
          </Prose>

          {/* Hybrid */}
          <Prose>
            <p className="mt-8">
              <span className="font-semibold text-(--color-text)">
                Hybrid
              </span>{" "}
              runs both pipelines in parallel and merges the results, with a base
              weighting of 40% keyword and 60% semantic. That split came from
              iteration, not theory. The weights are dynamic: when keyword
              confidence is low, its weight scales down and semantic takes over,
              so weak keyword noise doesn't drag down strong vector results. On
              top of the blended score, title matches add a per-word bonus
              (capped at three words) and artist matches add a flat bonus, both
              designed to break the ceiling that keyword scoring hits on
              exact-match queries. Deduplication runs on title and artist rather
              than internal IDs, so the same song surfaced by both pipelines
              appears once with its best score. Hybrid is what most people would
              actually use in practice, and it's the hardest to get right because
              the blending logic has to handle every edge case between a pure
              metadata lookup and a pure vibes query.
            </p>
          </Prose>

          {/* Natural */}
          <Prose>
            <p className="mt-8">
              <span className="font-semibold text-(--color-text)">
                Natural language
              </span>{" "}
              mode adds a lightweight LLM layer on top. A single call to DeepSeek
              Chat generates three different interpretations of the same
              query — each with its own search mode, filters, and semantic
              intent. All three configurations run in parallel against the
              database, producing three independent result sets. A second call to
              DeepSeek Reasoner acts as a judge: it sees the user's query and the
              three result sets, with no memory of the orchestrator's reasoning,
              and picks the best one.
            </p>
            <p>
              The multi-query approach matters because ambiguous queries have
              more than one reasonable reading. "Love songs from the 60s" could
              be a keyword lookup, a semantic mood search, or a hybrid of both.
              Rather than forcing the orchestrator to commit to a single
              interpretation, it generates three and lets the results speak for
              themselves. The judge doesn't get to rerun searches, only choose
              between existing results. The orchestrator and judge together cost
              fractions of a cent per query. A more capable model wouldn't help.
            </p>
          </Prose>

          <PipelineDiagram />

          <Prose>
            <p>
              In a RAG system, the retrieval step exists to put something useful
              in front of an agent as fast as possible. The agent shouldn't be
              browsing. Even a simple orchestrator with clear instructions can
              make meaningful decisions about which pipeline to invoke and how to
              decompose a query.
            </p>
          </Prose>

          {/* Mode capabilities table */}
          <Table
            headers={["Capability", "Keyword", "Semantic", "Hybrid"]}
            rows={[
              [
                "Title / lyrics / artist",
                "Exact phrase, n\u00B2 scored",
                "\u2014",
                "Via keyword component",
              ],
              [
                "Conceptual / mood",
                "\u2014",
                "Vector similarity",
                "Via semantic component",
              ],
              [
                "Decade & genre filters",
                "Additive bonus",
                "\u2014",
                "Additive bonus",
              ],
              [
                "Artist & title scope",
                "Hard exclusion",
                "Hard exclusion",
                "Hard exclusion",
              ],
              [
                '"Vibes" queries',
                "\u2014",
                "Primary strength",
                "Weighted blend",
              ],
              ["Deduplication", "N/A", "N/A", "By title + artist"],
              [
                "Weight adaptation",
                "N/A",
                "N/A",
                "Keyword confidence scales 0\u201340%",
              ],
            ]}
          />
        </section>
      </Reveal>

      {/* What the Numbers Show */}
      <Reveal>
        <section className="mb-16">
          <SectionHeading>What the Numbers Show</SectionHeading>
          <Prose>
            <p>
              Evaluation used 32 test queries across eight categories. The
              evaluation was designed to find where each mode breaks, not to
              produce a headline number. Every mode runs against every query,
              including the categories where it has no mechanism to succeed.
              Keyword can't answer "driving at night music." Semantic can't
              answer "songs by Queen." The interesting part isn't the aggregate
              score — it's the map of when each mode wins.
            </p>
          </Prose>

          <Table
            headers={["Query category", "Queries", "Strongest mode", "Why"]}
            rows={[
              [
                "Title & artist lookups",
                "9",
                "Keyword",
                "Exact phrase matching is unbeatable here",
              ],
              [
                "Conceptual & mood",
                "10",
                "Semantic",
                "Keyword returns nothing useful for abstract queries",
              ],
              [
                "Decade + genre",
                "8",
                "Keyword",
                "Additive filter bonuses surface the right era",
              ],
              [
                "Atmosphere",
                "2",
                "Semantic",
                'Only vector similarity can interpret "vibes"',
              ],
              [
                "Mixed / compound",
                "3",
                "Hybrid",
                "Needs both structured filters and semantic meaning",
              ],
            ]}
          />

          <Prose>
            <p>
              Blind testing shaped the development as much as the structured
              evaluation did. Multiple rounds of A/B comparisons ran different
              prompt strategies, scoring algorithms, and pipeline configurations,
              with results ranked without knowing which system produced them.
              These surfaced regressions that metrics alone missed. A
              configuration that improved average precision sometimes made
              specific atmospheric queries noticeably worse. Later iterations
              used Claude Opus as an impartial judge to grade different pipeline
              strategies, which helped catch developer bias and identify which
              changes were genuine improvements versus lateral moves.
            </p>
          </Prose>
        </section>
      </Reveal>

      {/* Building With an Agent */}
      <Reveal>
        <section className="mb-16">
          <SectionHeading>Building With an Agent</SectionHeading>
          <Prose>
            <p>
              LyricLens was built collaboratively with an AI coding agent. The
              process itself became one of the more interesting parts of the
              project.
            </p>
            <p>
              Building search logic with an agent that struggles with the concept
              of how to find things is genuinely difficult. The agent
              consistently wanted to approach scoring reductively, filtering out
              bad results rather than surfacing good ones. Reinforcing that the
              system works additively, taking the top results rather than
              removing bottom ones, was a recurring friction point.
            </p>
            <p>
              The distinction between semantic concepts and hard facts was
              equally difficult to maintain. Artist names are factual. Decades
              are temporal, and can serve as both hard filters and semantic
              context. Lyrics are simultaneously keyword-searchable text and
              semantic content. Genres and summaries need to be embedded and
              queried semantically for emotion but aren't included in keyword
              scoring. Keeping these categories clear, and ensuring the agent
              didn't collapse them into a single approach, required constant
              correction.
            </p>
            <p>
              The most persistent issue was match consumption. The agent
              repeatedly implemented scoring where finding a match would
              "swallow" the matched words, preventing them from contributing to
              additional scoring categories. The system needed those words
              available across all scoring dimensions. A word that matches in the
              title should still be available for lyrics scoring.
            </p>
            <p>
              None of these are criticisms of the tool. They're observations
              about the current state of AI-assisted development on tasks that
              require holding multiple competing conceptual frameworks
              simultaneously. The agent is excellent at implementing
              well-specified logic. The challenge is specifying logic that
              depends on understanding{" "}
              <em>why</em> keyword search and semantic search are fundamentally
              different activities, not just different algorithms.
            </p>
          </Prose>
        </section>
      </Reveal>

      {/* Tech Stack & Costs */}
      <Reveal>
        <section className="mb-16">
          <SectionHeading>Tech Stack & Costs</SectionHeading>

          <div className="space-y-6">
            <div>
              <div className="text-sm font-medium text-(--color-text) mb-2">
                Frontend
              </div>
              <p className="text-sm text-(--color-text-secondary)">
                React 19, TypeScript, Vite, Tailwind CSS v4, Motion, Remotion,
                Plotly.js, React Router.
              </p>
            </div>

            <div>
              <div className="text-sm font-medium text-(--color-text) mb-2">
                Backend
              </div>
              <p className="text-sm text-(--color-text-secondary)">
                Bun runtime, Hono framework, Transformers.js with ONNX
                (nomic-embed-text-v1.5, 768-dim, fp32), Qdrant Cloud, Compromise
                for NLP and entity extraction.
              </p>
            </div>

            <div>
              <div className="text-sm font-medium text-(--color-text) mb-2">
                Pipeline
              </div>
              <p className="text-sm text-(--color-text-secondary)">
                Python, sentence-transformers, qdrant-client, scikit-learn for
                KMeans clustering, UMAP for dimensionality reduction, pandas and
                numpy.
              </p>
            </div>

            <div>
              <div className="text-sm font-medium text-(--color-text) mb-2">
                LLM
              </div>
              <p className="text-sm text-(--color-text-secondary)">
                DeepSeek Chat as orchestrator, DeepSeek Reasoner as judge. Total
                API cost for the entire project including multiple summarisation
                runs across nearly 3,000 songs: under $1.
              </p>
            </div>
          </div>

          <div className="mt-8">
            <SpecRow label="Embedding model" value="nomic-embed-text-v1.5" />
            <SpecRow label="Dimensions" value="768" />
            <SpecRow label="Context window" value="8,192 tokens" />
            <SpecRow label="Precision" value="fp32 (~300 MB)" />
            <SpecRow label="Vector database" value="Qdrant Cloud" />
            <SpecRow label="Vector spaces" value="Lyrics + Summary (cosine)" />
            <SpecRow label="Clustering" value="KMeans (k=10)" />
            <SpecRow
              label="Dimensionality reduction"
              value="UMAP 768D → 3D"
            />
          </div>

          <Prose>
            <p className="mt-8">
              The total external cost of running this application is effectively
              the Qdrant Cloud free tier and DeepSeek queries that round to zero.
              Everything else runs locally or is bundled with the deployment.
            </p>
          </Prose>
        </section>
      </Reveal>
    </div>
  );
}
