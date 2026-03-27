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

const strategies: Strategy[] = [decomposer, orchestrator, agentic, reranker];
const llms: LLMClient[] = [deepseekClient, geminiClient];

async function main() {
  console.log("Query Curation — Collecting Candidates\n");

  const allQueries: EvalQuery[] = [...baselineQueries, ...hardQueries];

  const songs = getSongs();
  const curationData: Record<string, {
    query: string;
    category: string;
    candidates: { id: string; title: string; artist: string; year: number; genre: string; foundBy: string[] }[];
  }> = {};

  for (const q of allQueries) {
    console.log(`\nQuery: "${q.query}"`);
    const candidateMap = new Map<string, {
      id: string; title: string; artist: string; year: number; genre: string; foundBy: string[];
    }>();

    for (const llm of llms) {
      for (const strategy of strategies) {
        const label = `${strategy.name}/${llm.name}`;
        console.log(`  Running ${label} ...`);

        try {
          const results = await strategy.run(q.query, songs, llm);
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
        } catch (err) {
          console.error(`    ERROR: ${err}`);
        }

        // Rate limiting
        await new Promise(r => setTimeout(r, 500));
      }
    }

    const candidates = [...candidateMap.values()]
      .sort((a, b) => b.foundBy.length - a.foundBy.length);

    curationData[q.query] = { query: q.query, category: q.category, candidates };
    console.log(`  ${candidates.length} unique candidates collected`);
  }

  const resultsDir = resolve(import.meta.dir, "results");
  mkdirSync(resultsDir, { recursive: true });
  const outPath = resolve(resultsDir, "curation-candidates.json");
  writeFileSync(outPath, JSON.stringify(curationData, null, 2));
  console.log(`\nCuration candidates saved to: ${outPath}`);
  console.log("Review the file and mark which songs fit each query.");
  console.log("Then copy the approved IDs into server/src/eval/queries/hard.ts");
}

main().catch(console.error);
