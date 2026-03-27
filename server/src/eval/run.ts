import { mkdirSync, writeFileSync } from "fs";
import { resolve } from "path";
import { getSongs } from "../lib/data";
import type { Song, SearchResult } from "../lib/types";
import type { LLMClient } from "./llm/types";
import { deepseekClient } from "./llm/deepseek";
import { geminiClient } from "./llm/gemini";
import type { Strategy } from "./strategies/types";
import { decomposer } from "./strategies/decomposer";
import { orchestrator } from "./strategies/orchestrator";
import { agentic } from "./strategies/agentic";
import { reranker } from "./strategies/reranker";
import { baselineQueries, type EvalQuery } from "./queries/baseline";
import { hardQueries } from "./queries/hard";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const strategies: Strategy[] = [decomposer, orchestrator, agentic, reranker];
const llms: LLMClient[] = [deepseekClient, geminiClient];

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------
function precisionAtK(returned: string[], expected: string[], k: number): number {
  const topK = returned.slice(0, k);
  if (topK.length === 0 || expected.length === 0) return 0;
  const hits = topK.filter(id => expected.includes(id)).length;
  return hits / Math.min(k, expected.length);
}

function mrr(returned: string[], expected: string[]): number {
  for (let i = 0; i < returned.length; i++) {
    if (expected.includes(returned[i])) {
      return 1 / (i + 1);
    }
  }
  return 0;
}

// ---------------------------------------------------------------------------
// Run one strategy+model against one query set
// ---------------------------------------------------------------------------
interface QueryResult {
  query: string;
  category: string;
  expected: string[];
  returned: string[];
  p5: number;
  p10: number;
  mrr: number;
  timeMs: number;
  llmCalls: number;
}

interface ComboResult {
  strategy: string;
  model: string;
  metrics: { p5: number; p10: number; mrr: number; avgTime: number; avgCalls: number };
  queries: QueryResult[];
}

async function runCombo(
  strategy: Strategy,
  llm: LLMClient,
  queries: EvalQuery[],
  songs: Song[],
): Promise<ComboResult> {
  const queryResults: QueryResult[] = [];

  for (const q of queries) {
    const start = performance.now();
    let results: SearchResult[] = [];

    try {
      results = await strategy.run(q.query, songs, llm);
    } catch (err) {
      console.error(`  ERROR: ${strategy.name}/${llm.name} on "${q.query}": ${err}`);
    }

    const elapsed = performance.now() - start;
    const returned = results.map(r => r.song.id);

    queryResults.push({
      query: q.query,
      category: q.category,
      expected: q.expected,
      returned: returned.slice(0, 20),
      p5: precisionAtK(returned, q.expected, 5),
      p10: precisionAtK(returned, q.expected, 10),
      mrr: mrr(returned, q.expected),
      timeMs: Math.round(elapsed),
      llmCalls: 0,
    });

    // Rate limiting — avoid hammering APIs
    await new Promise(r => setTimeout(r, 500));
  }

  const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  return {
    strategy: strategy.name,
    model: llm.name,
    metrics: {
      p5: Number(avg(queryResults.map(q => q.p5)).toFixed(4)),
      p10: Number(avg(queryResults.map(q => q.p10)).toFixed(4)),
      mrr: Number(avg(queryResults.map(q => q.mrr)).toFixed(4)),
      avgTime: Number((avg(queryResults.map(q => q.timeMs)) / 1000).toFixed(2)),
      avgCalls: 0,
    },
    queries: queryResults,
  };
}

// ---------------------------------------------------------------------------
// Console output
// ---------------------------------------------------------------------------
function printTable(title: string, results: ComboResult[]) {
  console.log();
  console.log(`  ${title}`);
  console.log("  " + "─".repeat(65));
  console.log(
    "  " +
    "Strategy".padEnd(20) +
    "Model".padEnd(12) +
    "P@5".padStart(7) +
    "P@10".padStart(7) +
    "MRR".padStart(7) +
    "Time".padStart(7)
  );
  console.log("  " + "─".repeat(65));

  const sorted = [...results].sort((a, b) => b.metrics.mrr - a.metrics.mrr);
  for (const r of sorted) {
    console.log(
      "  " +
      r.strategy.padEnd(20) +
      r.model.padEnd(12) +
      r.metrics.p5.toFixed(3).padStart(7) +
      r.metrics.p10.toFixed(3).padStart(7) +
      r.metrics.mrr.toFixed(3).padStart(7) +
      `${r.metrics.avgTime}s`.padStart(7)
    );
  }
  console.log("  " + "─".repeat(65));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log("LLM Query Strategy Evaluation");
  console.log("=============================\n");

  const songs = getSongs();
  console.log(`Loaded ${songs.length} songs.\n`);

  // Filter to only queries with curated expected results
  const baseline = baselineQueries.filter(q => q.expected.length > 0);
  const hard = hardQueries.filter(q => q.expected.length > 0);
  const allQueries = [...baselineQueries, ...hardQueries];
  const curated = allQueries.filter(q => q.expected.length > 0);
  const uncurated = allQueries.length - curated.length;

  console.log(`Total queries: ${allQueries.length} (${curated.length} curated, ${uncurated} awaiting curation)`);
  console.log(`  Baseline: ${baselineQueries.length} (${baseline.length} curated)`);
  console.log(`  Hard: ${hardQueries.length} (${hard.length} curated)\n`);

  if (curated.length === 0) {
    console.log("No curated queries yet. Run 'bun run server/src/eval/curate.ts' first.");
    console.log("Then add expected song IDs to the query files.");
    return;
  }

  const allBaselineResults: ComboResult[] = [];
  const allHardResults: ComboResult[] = [];

  for (const llm of llms) {
    for (const strategy of strategies) {
      console.log(`Running ${strategy.name} / ${llm.name} ...`);

      const baselineResult = await runCombo(strategy, llm, baseline, songs);
      allBaselineResults.push(baselineResult);
      console.log(
        `  baseline: P@5=${baselineResult.metrics.p5.toFixed(3)} ` +
        `MRR=${baselineResult.metrics.mrr.toFixed(3)} ` +
        `(${baselineResult.metrics.avgTime}s avg)`
      );

      if (hard.length > 0) {
        const hardResult = await runCombo(strategy, llm, hard, songs);
        allHardResults.push(hardResult);
        console.log(
          `  hard:     P@5=${hardResult.metrics.p5.toFixed(3)} ` +
          `MRR=${hardResult.metrics.mrr.toFixed(3)} ` +
          `(${hardResult.metrics.avgTime}s avg)`
        );
      }
    }
  }

  printTable("BASELINE RESULTS", allBaselineResults);
  if (allHardResults.length > 0) {
    printTable("HARD QUERY RESULTS", allHardResults);
  }

  const resultsDir = resolve(import.meta.dir, "results");
  mkdirSync(resultsDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 16);
  const outPath = resolve(resultsDir, `${timestamp}.json`);
  const output = {
    timestamp: new Date().toISOString(),
    results: {
      baseline: Object.fromEntries(allBaselineResults.map(r => [`${r.strategy}-${r.model}`, r])),
      hard: Object.fromEntries(allHardResults.map(r => [`${r.strategy}-${r.model}`, r])),
    },
  };
  writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`\nDetailed results saved to: ${outPath}`);
}

main().catch(console.error);
