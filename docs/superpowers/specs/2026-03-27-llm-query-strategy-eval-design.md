# LLM Query Strategy Evaluation — Design Spec

**Date:** 2026-03-27
**Goal:** Determine the best way to use an LLM at query time to understand user intent and drive search, by testing four strategies across two models against curated ground truth.

---

## Context

LyricLens has three search modes: keyword (sequence matching on local data), semantic (Qdrant vector search on lyrics/summary embeddings), and hybrid (weighted merge of both). A fourth "natural" mode exists that calls DeepSeek to extract structured filters before running hybrid — but it's minimal.

The current pipeline generates LLM summaries (DeepSeek V3) per song at build time. These summaries are embedded as a second vector. This is not query understanding — it's static enrichment.

**The opportunity:** An LLM at query time can interpret ambiguous intent ("songs you'd hear at a dive bar at 2am") in a way that regex parsing and raw vector similarity cannot. We need to find the right strategy and the right model for this.

---

## What We're Testing

### Four Strategies

All strategies share the same interface:

```typescript
type LLMProvider = "deepseek" | "gemini";

interface Strategy {
  name: string;
  run(query: string, songs: Song[], provider: LLMProvider): Promise<SearchResult[]>;
}
```

Each imports the real `keywordSearch`, `semanticSearch`, `hybridSearch` from `server/src/search/`.

#### Strategy A — Decomposer (baseline)

What "natural" mode already does. One LLM call extracts structured params, hybrid search runs with those.

**LLM output schema:**
```json
{"decades": [], "genres": [], "mood": null, "artist": null, "semantic": "..."}
```

#### Strategy B — Orchestrator

Same extraction as A, plus the LLM chooses which search mode to run.

**LLM output schema:**
```json
{"mode": "keyword|semantic|hybrid|both_merge", "decades": [], "genres": [], "mood": null, "artist": null, "semantic": "..."}
```

- `keyword`: specific title/artist/lyric lookups
- `semantic`: vibes, themes, abstract descriptions
- `hybrid`: queries mixing specific terms with mood/era
- `both_merge`: runs keyword + semantic independently, merges by union

#### Strategy C — Agentic (tool use)

LLM gets three tools: `keyword_search`, `semantic_search`, `hybrid_search`. It calls one, sees the top 5 results (title, artist, year, genre, score), then decides whether to refine with another search or stop. Max 3 tool calls.

Implemented as a simple loop: LLM outputs a JSON tool call, we execute it, feed results back, repeat until it returns `{"done": true, "final_ids": [...]}` or hits the 3-call limit.

**System prompt describes:**
- The dataset (2,742 Billboard hits, 1950-2019)
- What each tool is good at
- That it should call one, review, then decide

#### Strategy D — Decompose + Re-rank

Two LLM calls:
1. First call uses Strategy A's decomposer prompt → hybrid search returns top 15
2. Second call sees the 15 results (title, artist, year, genre, matchReason) and re-ranks by intent fit. Returns ordered array of song IDs. May drop songs that don't fit.

### Two Models

- **DeepSeek V3** (`deepseek-chat`) — already integrated, cheap, fast
- **Gemini Flash** (`gemini-2.0-flash`) — new, needs a thin client

Both use the same prompts per strategy. The `GEMINI_API_KEY` is already in `.env`.

### Combinations

4 strategies x 2 models = **8 combinations**, each run against all queries.

---

## Query Sets

### Baseline (32 queries)

Ported from `pipeline/evaluate.py`. These have hardcoded expected song IDs and cover: specific lookup, artist lookup, conceptual, decade-specific, mood-based, genre-specific, and compound queries.

### Hard Queries (10-15)

Ambiguous, vibes-based queries that test intent understanding. Examples:

- "songs you'd hear at a dive bar at 2am"
- "something my grandma would dance to"
- "driving down the highway with the windows down"
- "the kind of song that plays when the villain walks in"
- "breakup songs that don't make you cry, they make you angry"
- "a song to slow dance to at a wedding"
- "music for staring out a rainy window"
- "songs that sound like summer in the 90s"
- "what would play in a montage of someone getting their life together"
- "songs that feel like 3am alone in a city"

**Curation process:** A utility script runs each hard query through all 8 strategy+model combos, collects the unique songs returned across all of them, and presents them as a checklist. Jamie marks which songs genuinely fit each query. Those become the expected results.

---

## Eval Harness

### Structure

```
server/src/eval/
├── run.ts              # Entry point: bun run server/src/eval/run.ts
├── strategies/
│   ├── types.ts        # Strategy interface, LLMProvider type
│   ├── decomposer.ts   # Strategy A
│   ├── orchestrator.ts # Strategy B
│   ├── agentic.ts      # Strategy C
│   └── reranker.ts     # Strategy D
├── llm/
│   ├── deepseek.ts     # DeepSeek client (reuse/refactor from lib/deepseek.ts)
│   └── gemini.ts       # Gemini Flash client (same interface)
├── queries/
│   ├── baseline.ts     # 32 existing queries + expected song IDs
│   └── hard.ts         # 10-15 hard queries + curated expected IDs
├── curate.ts           # Utility: run hard queries, present candidates for approval
└── results/            # Output dir (gitignored)
```

### How It Runs

1. Load songs from `data/processed/merged_songs.json`
2. For each query set (baseline, hard):
   - For each model (deepseek, gemini):
     - For each strategy (A, B, C, D):
       - Execute strategy, collect ranked song IDs
       - Compute P@5, P@10, MRR against expected results
       - Record wall-clock time and LLM call count
3. Print comparison table to console
4. Save detailed JSON to `server/src/eval/results/`

### Metrics

| Metric | What it measures |
|--------|-----------------|
| P@5 | Precision in top 5 results — are the right songs showing up? |
| P@10 | Precision in top 10 — broader relevance |
| MRR | Mean Reciprocal Rank — how high is the first correct result? |
| Avg Time | Wall-clock seconds per query (includes LLM latency) |
| LLM Calls | Number of LLM API calls per query (1 for A/B, 1-3 for C, 2 for D) |

---

## Output

### Console Summary

```
                        BASELINE (32 queries)
Strategy          Model      P@5   P@10  MRR   Time   Calls
────────────────────────────────────────────────────────────
D-reranker        gemini     0.72  0.65  0.81  2.4s   2.0
C-agentic         gemini     0.68  0.61  0.78  3.1s   2.3
...

                        HARD (15 queries)
Strategy          Model      P@5   P@10  MRR   Time   Calls
────────────────────────────────────────────────────────────
...
```

### Detailed JSON

Saved to `server/src/eval/results/YYYY-MM-DD-HH-MM.json`:

```json
{
  "timestamp": "2026-03-28T14:30:00Z",
  "results": {
    "baseline": {
      "A-decomposer-deepseek": {
        "metrics": { "p5": 0.6, "p10": 0.55, "mrr": 0.71, "avgTime": 0.9, "avgCalls": 1 },
        "queries": [
          {
            "query": "sad rock songs from the 80s",
            "expected": ["song-id-1", "song-id-2"],
            "returned": ["song-id-1", "song-id-3", "song-id-2"],
            "p5": 0.4,
            "mrr": 1.0,
            "timeMs": 890,
            "llmCalls": 1
          }
        ]
      }
    },
    "hard": { }
  }
}
```

This data feeds directly into the portfolio tech writeup.

---

## What This Does NOT Cover

- Changing the production search routes (that comes after we pick a winner)
- The RAG summary at the end of results (separate concern, already has `generateAnswer`)
- Removing the pipeline summary step (`generate_summaries.py`) — depends on whether the summary vector is still useful
- UI changes
