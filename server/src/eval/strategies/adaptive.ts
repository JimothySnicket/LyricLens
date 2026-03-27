import type { Strategy } from "./types";
import type { SearchResult, Song } from "../../lib/types";
import type { LLMClient } from "../llm/types";
import { keywordSearch } from "../../search/keyword";
import { semanticSearch } from "../../search/semantic";
import { hybridSearch } from "../../search/hybrid";
import { buildParsedQuery, extractJSON, validateDecomposed } from "./helpers";

const INTENT_PROMPT = `You interpret music search queries. Your job is to understand what the user is actually looking for and express that as structured search parameters.

Return a JSON object with these fields. Only include a field when you can reasonably infer it from the query — leave fields null or empty when the user hasn't indicated a preference:

{"decades":[],"genres":[],"mood":null,"artist":null,"semantic":""}

- decades: decade numbers (1950-2020). Only set if a time period is mentioned or clearly implied.
- genres: from [pop, rock, jazz, blues, country, reggae, soul, funk, disco, hip-hop, r&b, electronic, folk, punk, metal, alternative, indie, grunge, latin]. Only set if a genre is named or strongly implied.
- mood: one of "sadness", "joy", "anger", "fear", "surprise". Only set if emotional intent is clear.
- artist: lowercase name. Only set if the user names or refers to a specific artist.
- semantic: ALWAYS filled. Rewrite the query as a clear description of what the user wants to find — not just their words echoed back, but what they actually mean, in language that would match against song lyrics.

The semantic field is the most important. Capture the real intent.

Return ONLY JSON, no markdown.`;

const DECIDE_PROMPT = `You are evaluating music search results for a user query. Three different search methods have returned results. Your job is to decide what to do next.

You will see:
- The user's original query
- Your interpretation of their intent
- Results from keyword search (matches exact words in titles/lyrics/artist)
- Results from semantic search (matches meaning via lyrics embeddings)
- Results from hybrid search (combines both)

Respond with JSON. Choose one action:

1. Pick the best result set as-is:
{"action":"pick","source":"keyword|semantic|hybrid"}

2. Rerank one of the result sets — reorder by how well each song matches the user's actual intent, dropping songs that don't fit:
{"action":"rerank","source":"keyword|semantic|hybrid","ranking":["song-id-1","song-id-2",...]}

3. None of the results capture the intent well — refine the search with new params:
{"action":"refine","params":{"decades":[],"genres":[],"mood":null,"artist":null,"semantic":"better search text"}}

Choose "pick" when a result set clearly got it right.
Choose "rerank" when the right songs are in there but the order is wrong or some don't fit.
Choose "refine" only when the results genuinely miss the mark.

Return ONLY JSON, no markdown.`;

function formatResults(results: SearchResult[], label: string, limit = 8): string {
  if (results.length === 0) return `${label}: (no results)`;
  const lines = results.slice(0, limit).map((r, i) =>
    `  ${i + 1}. [${r.song.id}] "${r.song.title}" by ${r.song.artist} (${r.song.year}, ${r.song.genre})`
  );
  return `${label}:\n${lines.join("\n")}`;
}

export const adaptive: Strategy = {
  name: "E-adaptive",

  async run(query: string, songs: Song[], llm: LLMClient): Promise<SearchResult[]> {
    // --- Phase 1: Run all searches + LLM intent in parallel ---
    const intentPromise = llm.call(INTENT_PROMPT, query, 150);

    // We need parsed query for searches — build a minimal one from raw query
    const minimalParsed = buildParsedQuery(query, {
      decades: [], genres: [], mood: null, artist: null, semantic: query,
    });

    const [intentRaw, kwResults, semResult, hybResult] = await Promise.all([
      intentPromise,
      Promise.resolve(keywordSearch(songs, minimalParsed)),
      semanticSearch(minimalParsed, query),
      hybridSearch(minimalParsed, query, songs),
    ]);

    // Parse the LLM's intent
    const intentParsed = extractJSON(intentRaw);
    const decomposed = validateDecomposed(intentParsed, query);

    // Also run searches with the LLM's refined params if they differ
    const refinedParsed = buildParsedQuery(query, decomposed);
    let kwRefined = kwResults;
    let semRefined = semResult.results;
    let hybRefined = hybResult.results;

    // If the LLM extracted meaningful filters, re-run with those
    const hasFilters = decomposed.decades.length > 0 ||
      decomposed.genres.length > 0 ||
      decomposed.mood !== null ||
      decomposed.artist !== null;

    if (hasFilters) {
      const [kw2, sem2, hyb2] = await Promise.all([
        Promise.resolve(keywordSearch(songs, refinedParsed)),
        semanticSearch(refinedParsed, decomposed.semantic),
        hybridSearch(refinedParsed, decomposed.semantic, songs),
      ]);
      kwRefined = kw2;
      semRefined = sem2.results;
      hybRefined = hyb2.results;
    }

    // Use the best version of each (refined if we have filters, otherwise original)
    const kw = kwRefined;
    const sem = semRefined;
    const hyb = hybRefined;

    // --- Phase 2: LLM decides what to do with the results ---
    const decideInput = [
      `User query: "${query}"`,
      `Your interpretation: ${JSON.stringify(decomposed)}`,
      "",
      formatResults(kw, "KEYWORD results"),
      "",
      formatResults(sem, "SEMANTIC results"),
      "",
      formatResults(hyb, "HYBRID results"),
    ].join("\n");

    const decisionRaw = await llm.call(DECIDE_PROMPT, decideInput, 400);
    const decision = extractJSON(decisionRaw);

    if (!decision) return hyb; // fallback

    // --- Phase 3: Execute the decision ---
    const sources: Record<string, SearchResult[]> = { keyword: kw, semantic: sem, hybrid: hyb };

    switch (decision.action) {
      case "pick":
        return sources[decision.source] || hyb;

      case "rerank": {
        const base = sources[decision.source] || hyb;
        const ranking = decision.ranking;
        if (!Array.isArray(ranking)) return base;

        const resultMap = new Map(base.map(r => [r.song.id, r]));
        const ordered: SearchResult[] = [];
        for (const id of ranking) {
          const r = resultMap.get(id);
          if (r) ordered.push(r);
        }
        // Append anything the LLM didn't mention
        for (const r of base) {
          if (!ordered.some(o => o.song.id === r.song.id)) {
            ordered.push(r);
          }
        }
        return ordered.slice(0, 20);
      }

      case "refine": {
        const params = decision.params;
        if (!params) return hyb;
        const refined = validateDecomposed(params, query);
        const pq = buildParsedQuery(query, refined);
        const result = await hybridSearch(pq, refined.semantic, songs);
        return result.results;
      }

      default:
        return hyb;
    }
  },
};
