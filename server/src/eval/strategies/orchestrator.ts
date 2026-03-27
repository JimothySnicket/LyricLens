// server/src/eval/strategies/orchestrator.ts
import type { Strategy } from "./types";
import type { SearchResult, Song } from "../../lib/types";
import type { LLMClient } from "../llm/types";
import { keywordSearch } from "../../search/keyword";
import { semanticSearch } from "../../search/semantic";
import { hybridSearch } from "../../search/hybrid";
import { buildParsedQuery, extractJSON, validateDecomposed } from "./helpers";

const SYSTEM_PROMPT = `You parse music search queries and decide the best search strategy. Return ONLY valid JSON matching this schema:

{"mode":"hybrid","decades":[1960],"genres":["rock"],"mood":"sadness","artist":"elvis presley","semantic":"song about heartbreak"}

The "mode" field is critical. Choose:
- "keyword": for specific title lookups, exact lyric phrases, or known artist names. Best when the user quotes something specific.
- "semantic": for vibes, themes, abstract descriptions, emotional scenarios. Best when the user describes a feeling or situation rather than naming something.
- "hybrid": for queries mixing specific terms (a genre, a decade) with a mood or theme. Best general-purpose choice.
- "both_merge": when genuinely unsure — runs keyword and semantic independently and merges results. Use sparingly.

Other field rules:
- decades: array of decade numbers (1950-2020), or empty. "old"/"classic"/"vintage" = [1950,1960,1970], "recent"/"modern" = [2000,2010,2020]
- genres: array of genre strings, or empty. Valid: pop, rock, jazz, blues, country, reggae, soul, funk, disco, hip-hop, r&b, electronic, folk, punk, metal, alternative, indie, grunge, latin
- mood: one of "sadness", "joy", "anger", "fear", "surprise", or null
- artist: lowercase artist name, or null
- semantic: the core meaning/vibe in plain words, always filled

Return ONLY JSON. No markdown, no explanation.`;

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
