export function DeepDive() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16 pt-24">
      <h1 className="text-3xl font-semibold text-(--color-text) mb-4">Deep Dive</h1>
      <p className="text-(--color-text-secondary) mb-12">
        How LyricLens turns song lyrics into searchable vectors.
      </p>

      {/* Pipeline overview */}
      <section className="mb-12">
        <h2 className="text-lg font-semibold text-(--color-text) mb-4">Pipeline</h2>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center p-4 rounded-(--radius-md) bg-(--color-bg-secondary)">
            <div className="text-2xl font-bold font-mono text-(--color-text)">2,742</div>
            <div className="text-[11px] uppercase tracking-wider text-(--color-text-tertiary) mt-1">Songs</div>
          </div>
          <div className="text-center p-4 rounded-(--radius-md) bg-(--color-bg-secondary)">
            <div className="text-2xl font-bold font-mono text-(--color-text)">768D</div>
            <div className="text-[11px] uppercase tracking-wider text-(--color-text-tertiary) mt-1">Vectors</div>
          </div>
          <div className="text-center p-4 rounded-(--radius-md) bg-(--color-bg-secondary)">
            <div className="text-2xl font-bold font-mono text-(--color-text)">10</div>
            <div className="text-[11px] uppercase tracking-wider text-(--color-text-tertiary) mt-1">Clusters</div>
          </div>
        </div>

        <div className="space-y-2 text-sm text-(--color-text-secondary)">
          <div className="flex justify-between py-1 border-b border-(--color-border-subtle)">
            <span>Embedding model</span>
            <span className="font-mono text-(--color-text)">nomic-embed-text-v1.5</span>
          </div>
          <div className="flex justify-between py-1 border-b border-(--color-border-subtle)">
            <span>Context window</span>
            <span className="font-mono text-(--color-text)">8,192 tokens</span>
          </div>
          <div className="flex justify-between py-1 border-b border-(--color-border-subtle)">
            <span>Dimensionality reduction</span>
            <span className="font-mono text-(--color-text)">UMAP 768 → 3</span>
          </div>
          <div className="flex justify-between py-1 border-b border-(--color-border-subtle)">
            <span>Clustering</span>
            <span className="font-mono text-(--color-text)">KMeans (k=10)</span>
          </div>
          <div className="flex justify-between py-1 border-b border-(--color-border-subtle)">
            <span>Nearest neighbors</span>
            <span className="font-mono text-(--color-text)">k=5 cosine similarity</span>
          </div>
          <div className="flex justify-between py-1">
            <span>Vector database</span>
            <span className="font-mono text-(--color-text)">Qdrant Cloud</span>
          </div>
        </div>
      </section>

      <p className="text-sm text-(--color-text-tertiary)">
        More sections coming soon — search architecture, evaluation metrics, and query parsing.
      </p>
    </div>
  );
}
