import type { Strategy } from "./types";
import type { SearchResult, Song } from "../../lib/types";
import type { LLMClient } from "../llm/types";
import { hybridSearch } from "../../search/hybrid";
import { buildParsedQuery, extractJSON, validateDecomposed } from "./helpers";

const SYSTEM_PROMPT = `You parse music search queries into structured JSON. Return ONLY valid JSON matching this exact schema, nothing else:

{"decades":[1960],"genres":["rock"],"mood":"sadness","artist":"elvis presley","semantic":"song about heartbreak"}

Rules:
- decades: array of decade numbers (1950-2020), or empty array. Interpret time hints: "old"/"classic"/"vintage" = [1950,1960,1970], "recent"/"new"/"modern" = [2000,2010,2020], "retro" = [1970,1980]
- genres: array of genre strings, or empty array. Valid: pop, rock, jazz, blues, country, reggae, soul, funk, disco, hip-hop, r&b, electronic, folk, punk, metal, alternative, indie, grunge, latin
- mood: one of "sadness", "joy", "anger", "fear", "surprise", or null. Interpret emotional hints: "chill"/"relaxing" = "joy", "moody"/"lonely" = "sadness", "intense"/"aggressive" = "anger", "eerie"/"haunting" = "fear"
- artist: lowercase artist name string, or null
- semantic: the core meaning/vibe of the search in plain words, always filled. Strip filler words but keep the emotional and topical intent.

Return ONLY the JSON object. No markdown, no explanation.`;

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
