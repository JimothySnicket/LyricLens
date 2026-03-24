# LyricLens v2 — Spec

## What This Is

A hosted web app that searches 28k+ songs by meaning, not just keywords. It uses the same dataset (chart hits 1950–2019) but replaces keyword matching with real vector embeddings, keeps the structured filtering that already works well, and adds a 3D embedding visualizer so users can see the vector space.

The portfolio argument: this app demonstrates when you need embeddings and when you don't, side by side — which is a more valuable thing to show employers than "I plugged text into Qdrant."

## The Core Idea

Three search modes on one dataset, switchable in the UI:

1. **Keyword mode** — the weighted scoring system from LyricLens v1. Every term checked against title, lyrics, artist. Scope words change multipliers. Hard filters for decade/genre. Fast, transparent, works perfectly when the user knows what they want.

2. **Semantic mode** — query embedded with the same model as the lyrics, vector similarity via Qdrant. Finds songs by meaning ("songs that feel like driving at night") even when no keywords match. Slower, fuzzier, but handles conceptual queries that keyword search can't.

3. **Hybrid mode** — structured filters (decade, genre, mood, audio features) narrow the pool first, then vector similarity ranks within the filtered set. This is the production RAG pattern.

The visualizer tab shows the full embedding space as a 3D UMAP scatter plot. Firing a query highlights the matched results and shows where the query vector landed relative to the clusters.

---

## Data Pipeline

### Source Data

| File | Records | Contents | Role |
|------|---------|----------|------|
| `lyrics_db.csv` | ~691 songs (448k lines, multi-line per song) | Full sequential lyrics + year, artist, title, chart position, markets | Primary — these get embedded |
| `hits_filtered.csv` | 1,061 chart hits | BoW lyrics + full metadata (16 topic scores, 5 audio features, genre, chart data) | Metadata enrichment — join on artist+title to add genre, sentiment, audio features to the lyrics songs |

~691 songs is the entire corpus. They're all recognisable chart hits (1950–2019), so reviewers can judge result quality intuitively. A smaller, curated corpus makes the keyword vs semantic comparison sharper — keyword search visibly fails on conceptual queries, which is the whole point. No need for the 28k BoW dataset.

### Embedding Strategy

**What gets embedded:** The full sequential lyrics from `lyrics_db.csv`. These are the only texts with word order preserved, which is what the embedding model needs to capture meaning.

**Chunking:** Song lyrics are short enough (typically 200–500 words) to embed as a single document per song. No chunking needed — this is one of the advantages of this dataset over, say, help docs.

**Model:** `all-MiniLM-L6-v2` (384 dims, 22M params, ~30MB). Reasons:
- General-purpose English text — lyrics are natural language, not code or technical docs
- 384 dims is plenty for ~691 documents
- Fast inference — can run client-side via Transformers.js for the hosted version if desired
- Well-understood, widely benchmarked — easy to explain in interviews

**Metadata stored alongside vectors in Qdrant:**
- `artist` (string) — filterable
- `title` (string) — filterable
- `year` (int) — range filterable
- `decade` (int) — categorical filter
- `genre` (string) — categorical filter
- `chart_position` (int) — sortable
- `topic` (string) — the dominant topic label from the dataset
- `valence` (float 0–1) — audio feature, mood proxy
- `energy` (float 0–1) — audio feature
- `danceability` (float 0–1) — audio feature
- `sadness` (float 0–1) — topic score
- `romantic` (float 0–1) — topic score

These stay as structured payload fields, not embedded. They're used for hard filtering before or after vector search.

### Build-Time Pipeline (Python)

```
lyrics_db.csv + hits_filtered.csv
        │
        ▼
   merge_data.py — join lyrics with metadata by artist+title
        │
        ▼
   embed_lyrics.py — sentence-transformers model, outputs vectors
        │
        ▼
   build_index.py — upload vectors + payload to Qdrant Cloud
        │                    │
        ▼                    ▼
   Qdrant Cloud         embeddings.npz (for visualizer)
        │
        ▼
   build_viz.py — UMAP reduction (3D), KMeans clustering, Plotly HTML
        │
        ▼
   timbral_map.html (or embedded in app)
```

### Evaluation Pipeline (Python)

Run after any model or chunking change:

- **Retrieval quality:** Curate 30–50 test queries with expected results. Measure precision@5, precision@10, MRR (mean reciprocal rank).
- **Keyword vs semantic comparison:** Same test queries run through both modes. Show where semantic wins, where keyword wins, where hybrid wins.
- **Cluster quality:** Silhouette score, cluster purity against genre/topic labels (reuse pattern from synthesis project's `evaluate_embeddings.py`).
- **Embedding coverage:** What % of the lyrics_db songs successfully matched with metadata from hits_filtered. Report join rate honestly in the UI.

Output: `eval_results.json` — displayed in an "About" or "How It Works" section of the app.

---

## Architecture

### Stack

| Layer | Technology | Reason |
|-------|-----------|--------|
| Frontend | React + TypeScript + Tailwind | Jamie's strongest stack, signals TS skills to employers |
| Backend API | Bun + Hono (or Express) | Lightweight, fast, shows Bun experience |
| Vector store | Qdrant Cloud (free tier) | Managed hosting, no Python sidecar needed, production-realistic |
| Embedding model | sentence-transformers (Python, server-side) | Build-time embedding + server-side query embedding |
| Visualizer | Plotly.js (3D scatter) or Three.js | Plotly for speed, Three.js if you want it more custom |
| Hosting | Railway or Fly.io | Supports both Node and Python services, free/cheap tier |

### Service Layout

```
┌─────────────────────────────────────┐
│  Frontend (React SPA)               │
│  - Search UI (3 modes)              │
│  - Filter panel                     │
│  - Results list + detail view       │
│  - 3D Visualizer tab                │
│  - "How It Works" explainer tab     │
└──────────┬──────────────────────────┘
           │ REST / fetch
           ▼
┌─────────────────────────────────────┐
│  API Server (Bun + Hono)            │
│  /api/search/keyword                │
│  /api/search/semantic               │
│  /api/search/hybrid                 │
│  /api/filters (decades, genres)     │
│  /api/viz/data (UMAP coords)       │
│  /api/viz/query (project query      │
│   vector into 3D space)             │
│  /api/stats (eval metrics)          │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  Qdrant Cloud (free tier)           │
│  Collection: song_lyrics            │
│  - vectors (384-dim MiniLM)         │
│  - payload (year, genre, topic,     │
│    lyrics text, audio features)     │
└─────────────────────────────────────┘
```

### Query Flow

**Keyword mode:**
1. Frontend sends query string + active filters to `/api/search/keyword`
2. Backend runs the LyricLens v1 parser: scope detection, term extraction, decade/genre filters
3. Scores every song against all terms across title/lyrics/artist dimensions with weighted multipliers
4. Returns top 20 results with score breakdown

**Semantic mode:**
1. Frontend sends query string to `/api/search/semantic`
2. Backend embeds the query server-side with the same MiniLM model (loaded once at startup)
3. Queries Qdrant with the vector, limit=20
4. Returns results with cosine similarity scores

**Hybrid mode:**
1. Frontend sends query string + active filters to `/api/search/hybrid`
2. Backend parses structured filters (decade, genre, mood ranges)
3. Builds Qdrant filter conditions from the structured filters
4. Embeds the remaining natural language query server-side
5. Queries Qdrant with vector + filter conditions
6. Returns filtered, similarity-ranked results

---

## UI Design

### Search Page

```
┌──────────────────────────────────────────────────┐
│  LyricLens                                       │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │ songs that feel like driving at night      │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  [Keyword] [Semantic] [Hybrid]     ← mode toggle │
│                                                  │
│  Filters: [1980s ×] [Rock ×] [High energy ×]    │
│  Query interpretation: "conceptual mood search,  │
│  filtered to 1980s rock with high energy"        │
│                                                  │
│  ┌──────────────────────────────────────────────┐│
│  │ 1. "Running Down a Dream" — Tom Petty       ││
│  │    Similarity: 0.847 | 1989 | Rock          ││
│  │    Why: lyric themes of motion, night,       ││
│  │    freedom closely match query embedding     ││
│  │    [Expand lyrics ▾]                         ││
│  ├──────────────────────────────────────────────┤│
│  │ 2. "Drive" — The Cars                       ││
│  │    Similarity: 0.823 | 1984 | Rock          ││
│  │    ...                                       ││
│  └──────────────────────────────────────────────┘│
└──────────────────────────────────────────────────┘
```

Key UI details:
- Mode toggle is prominent — the point is comparing modes
- "Query interpretation" chip bar (from v1) shows how the query was parsed
- Each result shows WHY it matched — score breakdown for keyword, similarity score for semantic
- Expandable lyrics preview (first verse + chorus)
- Filter chips are the structured metadata filters, work across all modes

### Visualizer Page

```
┌──────────────────────────────────────────────────┐
│  Embedding Space Explorer                        │
│                                                  │
│  ┌──────────────────────────────────────────────┐│
│  │                                              ││
│  │         (3D Plotly/Three.js scatter)          ││
│  │                                              ││
│  │    Each dot = one song                       ││
│  │    Color = genre (or topic, or decade)       ││
│  │    Hover = song details                      ││
│  │                                              ││
│  │    ★ = query vector position                 ││
│  │    Lines from ★ to top 5 matches             ││
│  │                                              ││
│  └──────────────────────────────────────────────┘│
│                                                  │
│  Color by: [Genre ▾]  Highlight: [Search results]│
│                                                  │
│  Cluster info: "Songs cluster by emotional       │
│  theme, not just genre. Notice how 60s soul and  │
│  80s power ballads share a neighbourhood."        │
└──────────────────────────────────────────────────┘
```

Key visualizer details:
- Pre-computed UMAP 3D coords loaded at startup (from `embeddings.npz`)
- When a search is performed, the query vector is projected into the same UMAP space and shown as a star
- Lines connect the star to the top N matches — visually shows "nearest neighbours"
- Color-by dropdown lets you switch between genre, decade, topic, cluster assignment
- Click any dot to see full song details + "find similar" button (re-queries with that song's vector)

### "How It Works" Page

This is the portfolio argument page. It explains:

1. **The three search modes** with a concrete example showing different results for the same query
2. **When to use which** — keyword wins for specific lookups, semantic wins for conceptual/mood queries, hybrid wins for filtered exploration
3. **The embedding model** — what it is, why this one, what the dimensions mean (link to the explainer diagram we already built)
4. **The evaluation results** — precision@k, keyword vs semantic comparison table, honest assessment of where each mode fails
5. **The data pipeline** — how lyrics were cleaned, embedded, indexed. Not code, just the flow diagram
6. **What this maps to in production** — "this same architecture powers help desk chatbots, product search, document retrieval. Swap song lyrics for support tickets and you have a production RAG system."

---

## What Makes This Stand Out

1. **Three-mode comparison** — no other portfolio piece lets you toggle between keyword, semantic, and hybrid on the same data. This is the "I understand the tradeoffs" signal.

2. **Honest about limitations** — the UI explicitly shows where keyword search beats embeddings. This is rare and signals maturity.

3. **The visualizer** — seeing the embedding space is the "oh, I get it" moment. Most RAG demos are black boxes. This one shows you what's happening.

4. **Evaluation metrics** — shipping with precision@k and a test query suite says "I know how to measure retrieval quality, not just build it."

5. **Production-mappable architecture** — Qdrant + metadata filters + API layer. Same pattern as enterprise RAG. The domain is fun (music) but the architecture is serious.

6. **The explainer page** — doubles as "I can communicate technical concepts to non-technical stakeholders," which is what most of these Upwork clients actually need.

---

## Open Questions

None — all resolved. See decisions below.

---

## File Structure (Proposed)

```
lyriclens-v2/
├── README.md
├── data/
│   ├── raw/                    # source CSVs (gitignored)
│   └── processed/              # merged, cleaned JSON
├── pipeline/
│   ├── merge_data.py           # join lyrics + metadata
│   ├── embed_lyrics.py         # generate vectors
│   ├── build_index.py          # populate Qdrant
│   ├── build_viz.py            # UMAP + clustering
│   └── evaluate.py             # retrieval quality metrics
├── server/
│   ├── package.json            # Bun + Hono
│   ├── src/
│   │   ├── index.ts            # API entry point
│   │   ├── routes/
│   │   │   ├── search.ts       # keyword, semantic, hybrid endpoints
│   │   │   ├── filters.ts      # metadata filter options
│   │   │   └── viz.ts          # visualizer data + query projection
│   │   ├── search/
│   │   │   ├── keyword.ts      # LyricLens v1 scoring engine (ported)
│   │   │   ├── semantic.ts     # Qdrant vector query
│   │   │   └── hybrid.ts       # filters + vector
│   │   └── lib/
│   │       ├── qdrant.ts       # Qdrant client wrapper
│   │       └── query-parser.ts # structured query parsing (from v1)
│   └── tsconfig.json
├── web/
│   ├── package.json            # React + Vite
│   ├── src/
│   │   ├── App.tsx
│   │   ├── pages/
│   │   │   ├── Search.tsx      # main search page
│   │   │   ├── Visualizer.tsx  # 3D embedding explorer
│   │   │   └── HowItWorks.tsx  # explainer / portfolio page
│   │   ├── components/
│   │   │   ├── SearchBar.tsx
│   │   │   ├── ModeToggle.tsx
│   │   │   ├── FilterPanel.tsx
│   │   │   ├── ResultCard.tsx
│   │   │   ├── QueryChips.tsx
│   │   │   └── EmbeddingViz.tsx
│   │   └── lib/
│   │       └── api.ts          # fetch wrapper
│   └── tsconfig.json
├── .env.example                # QDRANT_URL, QDRANT_API_KEY
├── Dockerfile
└── docker-compose.yml          # Bun server (Qdrant is hosted externally)
```
