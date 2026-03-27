import type { Strategy } from "./types";
import type { SearchResult, Song } from "../../lib/types";
import type { LLMClient } from "../llm/types";
import { hybridSearch } from "../../search/hybrid";
import { buildParsedQuery, extractJSON, validateDecomposed } from "./helpers";

const DECOMPOSE_PROMPT = `You parse music search queries into structured JSON. Return ONLY valid JSON matching this exact schema, nothing else:

{"decades":[1960],"genres":["rock"],"mood":"sadness","artist":"elvis presley","semantic":"song about heartbreak"}

Rules:
- decades: array of decade numbers (1950-2020), or empty array. Interpret time hints: "old"/"classic"/"vintage" = [1950,1960,1970], "recent"/"new"/"modern" = [2000,2010,2020], "retro" = [1970,1980]
- genres: array of genre strings, or empty array. Valid: pop, rock, jazz, blues, country, reggae, soul, funk, disco, hip-hop, r&b, electronic, folk, punk, metal, alternative, indie, grunge, latin
- mood: one of "sadness", "joy", "anger", "fear", "surprise", or null. Interpret emotional hints: "chill"/"relaxing" = "joy", "moody"/"lonely" = "sadness", "intense"/"aggressive" = "anger", "eerie"/"haunting" = "fear"
- artist: lowercase artist name string, or null
- semantic: the core meaning/vibe of the search in plain words, always filled. Strip filler words but keep the emotional and topical intent.

Return ONLY the JSON object. No markdown, no explanation.`;

const RERANK_PROMPT = `You are re-ranking music search results for relevance. Given the user's original search intent and a list of candidate songs, return a JSON array of song IDs ordered from best match to worst.

Rules:
- Only include songs that genuinely match the user's intent
- It's fine to return fewer songs than provided if some don't fit
- Consider the mood, theme, era, and genre the user is looking for
- Return ONLY a JSON array of ID strings, e.g. ["id-1", "id-2", "id-3"]
- No markdown, no explanation`;

export const reranker: Strategy = {
  name: "D-reranker",

  async run(query: string, songs: Song[], llm: LLMClient): Promise<SearchResult[]> {
    // --- Pass 1: Decompose ---
    const raw = await llm.call(DECOMPOSE_PROMPT, query, 150);
    const parsed = extractJSON(raw);
    const decomposed = validateDecomposed(parsed, query);
    const pq = buildParsedQuery(query, decomposed);

    const hybridResult = await hybridSearch(pq, decomposed.semantic, songs, 15);
    const candidates = hybridResult.results;

    if (candidates.length === 0) return [];

    // --- Pass 2: Re-rank ---
    const candidateList = candidates
      .map(
        (r, idx) =>
          `${idx + 1}. [${r.song.id}] "${r.song.title}" by ${r.song.artist} (${r.song.year}, ${r.song.genre})`,
      )
      .join("\n");

    const rerankerInput = `User searched for: "${query}"\n\nCandidate songs:\n${candidateList}`;
    const reranked = await llm.call(RERANK_PROMPT, rerankerInput, 300);

    // Parse the re-ranked ID list
    const idArray = extractJSON(reranked);
    if (!Array.isArray(idArray)) {
      return candidates;
    }

    // Build result in re-ranked order
    const resultMap = new Map(candidates.map((r) => [r.song.id, r]));
    const ordered: SearchResult[] = [];
    for (const id of idArray) {
      const r = resultMap.get(id);
      if (r) ordered.push(r);
    }

    // Append any candidates the LLM dropped (at the end, lower priority)
    for (const r of candidates) {
      if (!ordered.some((o) => o.song.id === r.song.id)) {
        ordered.push(r);
      }
    }

    return ordered.slice(0, 20);
  },
};
