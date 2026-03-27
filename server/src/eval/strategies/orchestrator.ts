// server/src/eval/strategies/orchestrator.ts
import type { Strategy } from "./types";
import type { SearchResult, Song } from "../../lib/types";
import type { LLMClient } from "../llm/types";
import { keywordSearch } from "../../search/keyword";
import { semanticSearch } from "../../search/semantic";
import { hybridSearch } from "../../search/hybrid";
import { buildParsedQuery, extractJSON, validateDecomposed } from "./helpers";

const SYSTEM_PROMPT = `You interpret music search queries. Your job is to understand what the user is actually looking for, choose the best search strategy, and express their intent as structured search parameters.

Return a JSON object. Only include fields when you can reasonably infer them — leave null/empty otherwise:

{"mode":"hybrid","decades":[],"genres":[],"mood":null,"artist":null,"semantic":""}

mode (required) — choose the search approach:
- "keyword": the user wants something specific — a title, exact phrase, or named artist. The words themselves matter.
- "semantic": the user is describing a vibe, feeling, or scenario. Meaning matters more than words.
- "hybrid": the query mixes specific terms with mood or theme.
- "both_merge": genuinely ambiguous — run both and merge. Use sparingly.

Other fields — only set when the intent is clear:
- decades: decade numbers (1950-2020). Only if a time period is mentioned or implied.
- genres: from [pop, rock, jazz, blues, country, reggae, soul, funk, disco, hip-hop, r&b, electronic, folk, punk, metal, alternative, indie, grunge, latin]. Only if named or strongly implied.
- mood: one of "sadness", "joy", "anger", "fear", "surprise". Only if emotional intent is clear.
- artist: lowercase name. Only if the user names or refers to someone specific.
- semantic: ALWAYS filled. Rewrite the query as what the user actually means — in language that would match song lyrics.

Return ONLY JSON, no markdown.`;

export const orchestrator: Strategy = {
  name: "B-orchestrator",

  async run(query: string, songs: Song[], llm: LLMClient): Promise<SearchResult[]> {
    const raw = await llm.call(SYSTEM_PROMPT, query, 150);
    const parsed = extractJSON(raw);
    if (!parsed) {
      const pq = buildParsedQuery(query, { decades: [], genres: [], mood: null, artist: null, semantic: query });
      return (await hybridSearch(pq, query, songs)).results;
    }

    const mode = typeof parsed.mode === "string" ? parsed.mode : "hybrid";
    const decomposed = validateDecomposed(parsed, query);
    const pq = buildParsedQuery(query, decomposed);

    switch (mode) {
      case "keyword":
        return keywordSearch(songs, pq);

      case "semantic":
        return (await semanticSearch(pq, decomposed.semantic)).results;

      case "both_merge": {
        const kw = keywordSearch(songs, pq);
        const sem = await semanticSearch(pq, decomposed.semantic);
        const merged = new Map<string, SearchResult>();
        for (const r of kw) merged.set(r.song.id, r);
        for (const r of sem.results) {
          const existing = merged.get(r.song.id);
          if (!existing || r.score > existing.score) {
            merged.set(r.song.id, r);
          }
        }
        return [...merged.values()].sort((a, b) => b.score - a.score).slice(0, 20);
      }

      case "hybrid":
      default:
        return (await hybridSearch(pq, decomposed.semantic, songs)).results;
    }
  },
};
