// server/src/eval/curate.ts
import { mkdirSync, writeFileSync } from "fs";
import { resolve } from "path";
import { getSongs } from "../lib/data";
import type { LLMClient } from "./llm/types";
import { deepseekClient } from "./llm/deepseek";
import { geminiClient } from "./llm/gemini";
import type { Strategy } from "./strategies/types";
import { decomposer } from "./strategies/decomposer";
import { orchestrator } from "./strategies/orchestrator";
import { agentic } from "./strategies/agentic";
import { reranker } from "./strategies/reranker";
import { hardQueries } from "./queries/hard";
import { baselineQueries, type EvalQuery } from "./queries/baseline";
import type { SearchResult, Song } from "../lib/types";

const strategies: Strategy[] = [decomposer, orchestrator, agentic, reranker];

type Candidate = {
  id: string; title: string; artist: string; year: number; genre: string; foundBy: string[];
};

/** Run all strategies for one LLM on one query */
async function runStrategiesForLLM(
  query: string,
  llm: LLMClient,
  songs: Song[],
): Promise<{ label: string; results: SearchResult[] }[]> {
  const out: { label: string; results: SearchResult[] }[] = [];
  for (const strategy of strategies) {
    const label = `${strategy.name}/${llm.name}`;
    try {
      const results = await strategy.run(query, songs, llm);
      out.push({ label, results });
    } catch (err) {
      console.error(`    ERROR ${label}: ${err}`);
      out.push({ label, results: [] });
    }
  }
  return out;
}

/** Process a single query — both models in parallel */
async function processQuery(
  q: EvalQuery,
  songs: Song[],
  idx: number,
  total: number,
): Promise<{ query: string; category: string; candidates: Candidate[] }> {
  console.log(`[${idx}/${total}] "${q.query}"`);
  const candidateMap = new Map<string, Candidate>();

  // Run both models in parallel
  const [dsResults, gmResults] = await Promise.all([
    runStrategiesForLLM(q.query, deepseekClient, songs),
    runStrategiesForLLM(q.query, geminiClient, songs),
  ]);

  for (const { label, results } of [...dsResults, ...gmResults]) {
    for (const r of results.slice(0, 10)) {
      const existing = candidateMap.get(r.song.id);
      if (existing) {
        existing.foundBy.push(label);
      } else {
        candidateMap.set(r.song.id, {
          id: r.song.id,
          title: r.song.title,
          artist: r.song.artist,
          year: r.song.year,
          genre: r.song.genre,
          foundBy: [label],
        });
      }
    }
  }

  const candidates = [...candidateMap.values()]
    .sort((a, b) => b.foundBy.length - a.foundBy.length);

  console.log(`  → ${candidates.length} candidates`);
  return { query: q.query, category: q.category, candidates };
}

/** Run tasks with concurrency limit */
async function parallelMap<T, R>(
  items: T[],
  fn: (item: T, idx: number) => Promise<R>,
  concurrency: number,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;

  async function worker() {
    while (next < items.length) {
      const idx = next++;
      results[idx] = await fn(items[idx], idx);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

async function main() {
  console.log("Query Curation — Collecting Candidates\n");

  const allQueries: EvalQuery[] = [...baselineQueries, ...hardQueries];
  const songs = getSongs();
  const total = allQueries.length;

  console.log(`${total} queries, running 3 concurrently with both models in parallel\n`);

  const results = await parallelMap(
    allQueries,
    (q, idx) => processQuery(q, songs, idx + 1, total),
    3, // 3 queries at a time, each running 2 models = 6 concurrent LLM streams
  );

  const curationData: Record<string, typeof results[0]> = {};
  for (const r of results) {
    curationData[r.query] = r;
  }

  const resultsDir = resolve(import.meta.dir, "results");
  mkdirSync(resultsDir, { recursive: true });
  const outPath = resolve(resultsDir, "curation-candidates.json");
  writeFileSync(outPath, JSON.stringify(curationData, null, 2));
  console.log(`\nDone! Saved to: ${outPath}`);
}

main().catch(console.error);
