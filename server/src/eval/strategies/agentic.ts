import type { Strategy } from "./types";
import type { SearchResult, Song } from "../../lib/types";
import type { LLMClient } from "../llm/types";
import { keywordSearch } from "../../search/keyword";
import { semanticSearch } from "../../search/semantic";
import { hybridSearch } from "../../search/hybrid";
import { buildParsedQuery, extractJSON, validateDecomposed } from "./helpers";

const MAX_TOOL_CALLS = 3;

const SYSTEM_PROMPT = `You are a music search agent with access to a database of 2,742 Billboard chart hits (1950-2019). Your job is to understand what the user is looking for and find the best matching songs.

You have three search tools. To use one, return JSON:

{"tool":"keyword_search","params":{"decades":[],"genres":[],"mood":null,"artist":null,"semantic":""}}
{"tool":"semantic_search","params":{"decades":[],"genres":[],"mood":null,"artist":null,"semantic":""}}
{"tool":"hybrid_search","params":{"decades":[],"genres":[],"mood":null,"artist":null,"semantic":""}}

Choose the right tool based on the user's intent:
- keyword_search: they want something specific — a title, phrase, or named artist.
- semantic_search: they're describing a vibe, feeling, or scenario — meaning matters more than exact words.
- hybrid_search: their query mixes specific terms with mood or theme.

For params, only set fields you can genuinely infer from the query:
- decades (1950-2020), genres, mood ("sadness"|"joy"|"anger"|"fear"|"surprise"), artist — only when clearly implied.
- semantic: ALWAYS fill this. Express what the user actually wants in language that would match song lyrics.

After seeing results, you can refine with another tool call (up to 3 total) or return {"done":true}. All results across calls are merged automatically.

Return ONLY JSON.`;

export const agentic: Strategy = {
  name: "C-agentic",

  async run(query: string, songs: Song[], llm: LLMClient): Promise<SearchResult[]> {
    const allResults = new Map<string, SearchResult>();
    const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: query },
    ];

    for (let i = 0; i < MAX_TOOL_CALLS; i++) {
      const raw = await llm.callMultiTurn(messages, 200);
      messages.push({ role: "assistant", content: raw });

      const parsed = extractJSON(raw);
      if (!parsed) break;
      if (parsed.done) break;

      const tool = parsed.tool;
      const params = parsed.params;
      if (!tool || !params) break;

      const decomposed = validateDecomposed(params, query);
      const pq = buildParsedQuery(query, decomposed);

      let results: SearchResult[] = [];
      switch (tool) {
        case "keyword_search":
          results = keywordSearch(songs, pq);
          break;
        case "semantic_search":
          results = (await semanticSearch(pq, decomposed.semantic)).results;
          break;
        case "hybrid_search":
          results = (await hybridSearch(pq, decomposed.semantic, songs)).results;
          break;
        default:
          break;
      }

      for (const r of results) {
        const existing = allResults.get(r.song.id);
        if (!existing || r.score > existing.score) {
          allResults.set(r.song.id, r);
        }
      }

      const summary = results.slice(0, 5).map((r, idx) =>
        `${idx + 1}. "${r.song.title}" by ${r.song.artist} (${r.song.year}, ${r.song.genre}) [score: ${r.score.toFixed(2)}]`
      ).join("\n");
      messages.push({
        role: "user",
        content: `Results from ${tool}:\n${summary}\n\nCall another tool with different params, or return {"done":true} if satisfied.`,
      });
    }

    return [...allResults.values()].sort((a, b) => b.score - a.score).slice(0, 20);
  },
};
