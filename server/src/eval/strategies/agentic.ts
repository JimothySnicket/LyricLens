import type { Strategy } from "./types";
import type { SearchResult, Song } from "../../lib/types";
import type { LLMClient } from "../llm/types";
import { keywordSearch } from "../../search/keyword";
import { semanticSearch } from "../../search/semantic";
import { hybridSearch } from "../../search/hybrid";
import { buildParsedQuery, extractJSON, validateDecomposed } from "./helpers";

const MAX_TOOL_CALLS = 3;

const SYSTEM_PROMPT = `You are a music search agent with access to a database of 2,742 Billboard chart hits (1950-2019). Your job is to find the songs that best match the user's search intent.

You have three search tools. To call one, return a JSON object:

{"tool":"keyword_search","params":{"decades":[],"genres":[],"mood":null,"artist":null,"semantic":"search terms"}}
{"tool":"semantic_search","params":{"decades":[],"genres":[],"mood":null,"artist":null,"semantic":"descriptive vibe text"}}
{"tool":"hybrid_search","params":{"decades":[],"genres":[],"mood":null,"artist":null,"semantic":"mixed query"}}

Tool strengths:
- keyword_search: Best for specific titles, exact phrases, known artist names. Scores by word sequence matches.
- semantic_search: Best for abstract vibes, moods, thematic descriptions. Uses vector similarity on lyrics.
- hybrid_search: Combines both. Good general-purpose choice.

Param rules:
- decades: array of decade numbers 1950-2020, or empty
- genres: array from [pop, rock, jazz, blues, country, reggae, soul, funk, disco, hip-hop, r&b, electronic, folk, punk, metal, alternative, indie, grunge, latin], or empty
- mood: one of "sadness", "joy", "anger", "fear", "surprise", or null
- artist: lowercase artist name, or null
- semantic: the search text/vibe, always filled

After receiving results, you can:
1. Call another tool with refined params (up to 3 total calls)
2. Finish by returning: {"done":true}

When you finish, the last set of search results will be used. If you want to combine results from multiple searches, that happens automatically — all results are merged.

Return ONLY JSON. No markdown, no explanation.`;

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
