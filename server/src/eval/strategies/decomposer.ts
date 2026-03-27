import type { Strategy } from "./types";
import type { SearchResult, Song } from "../../lib/types";
import type { LLMClient } from "../llm/types";
import { hybridSearch } from "../../search/hybrid";
import { buildParsedQuery, extractJSON, validateDecomposed } from "./helpers";

const SYSTEM_PROMPT = `You interpret music search queries. Your job is to understand what the user is actually looking for and express that as structured search parameters.

Return a JSON object with these fields. Only include a field when you can reasonably infer it from the query — leave fields null or empty when the user hasn't indicated a preference:

{"decades":[],"genres":[],"mood":null,"artist":null,"semantic":""}

- decades: decade numbers (1950-2020). Only set if a time period is mentioned or clearly implied.
- genres: from [pop, rock, jazz, blues, country, reggae, soul, funk, disco, hip-hop, r&b, electronic, folk, punk, metal, alternative, indie, grunge, latin]. Only set if a genre is named or strongly implied.
- mood: one of "sadness", "joy", "anger", "fear", "surprise". Only set if emotional intent is clear.
- artist: lowercase name. Only set if the user names or refers to a specific artist.
- semantic: ALWAYS filled. Rewrite the query as a clear description of what the user wants to find — not just their words echoed back, but what they actually mean, in language that would match against song lyrics.

The semantic field is the most important. Capture the real intent.

Return ONLY JSON, no markdown.`;

export const decomposer: Strategy = {
  name: "A-decomposer",

  async run(query: string, songs: Song[], llm: LLMClient): Promise<SearchResult[]> {
    const raw = await llm.call(SYSTEM_PROMPT, query, 150);
    const parsed = extractJSON(raw);
    const decomposed = validateDecomposed(parsed, query);
    const pq = buildParsedQuery(query, decomposed);
    const result = await hybridSearch(pq, decomposed.semantic, songs);
    return result.results;
  },
};
