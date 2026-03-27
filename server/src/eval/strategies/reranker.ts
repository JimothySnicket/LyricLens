import type { Strategy } from "./types";
import type { SearchResult, Song } from "../../lib/types";
import type { LLMClient } from "../llm/types";
import { hybridSearch } from "../../search/hybrid";
import { buildParsedQuery, extractJSON, validateDecomposed } from "./helpers";

const DECOMPOSE_PROMPT = `You interpret music search queries. Your job is to understand what the user is actually looking for and express that as structured search parameters.

Return a JSON object with these fields. Only include a field when you can reasonably infer it from the query — leave fields null or empty when the user hasn't indicated a preference:

{"decades":[],"genres":[],"mood":null,"artist":null,"semantic":""}

- decades: decade numbers (1950-2020). Only set if a time period is mentioned or clearly implied.
- genres: from [pop, rock, jazz, blues, country, reggae, soul, funk, disco, hip-hop, r&b, electronic, folk, punk, metal, alternative, indie, grunge, latin]. Only set if a genre is named or strongly implied.
- mood: one of "sadness", "joy", "anger", "fear", "surprise". Only set if emotional intent is clear.
- artist: lowercase name. Only set if the user names or refers to a specific artist.
- semantic: ALWAYS filled. Rewrite the query as a clear description of what the user wants to find — not just their words echoed back, but what they actually mean, in language that would match against song lyrics.

The semantic field is the most important. Capture the real intent.

Return ONLY JSON, no markdown.`;

const RERANK_PROMPT = `You are re-ranking music search results based on how well they match the user's actual intent. Think about what the user is really looking for — not just surface-level keyword matches, but whether each song genuinely fits what they want.

Return a JSON array of song IDs, best match first. Drop songs that don't fit — returning fewer is better than including bad matches.

Return ONLY a JSON array of ID strings, e.g. ["id-1", "id-2"]. No markdown.`;

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
