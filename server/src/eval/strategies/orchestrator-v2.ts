import type { Strategy } from "./types";
import type { SearchResult, Song } from "../../lib/types";
import type { LLMClient } from "../llm/types";
import { keywordSearch } from "../../search/keyword";
import { semanticSearch } from "../../search/semantic";
import { hybridSearch } from "../../search/hybrid";
import { buildParsedQuery, extractJSON, validateDecomposed } from "./helpers";

const SYSTEM_PROMPT = `You interpret music search queries against a database of Billboard chart hits (1950-2019) with full lyrics. Your job is to understand what the user actually wants and translate that into search parameters.

Return JSON. Only set fields you can genuinely infer — leave null/empty otherwise:

{"mode":"hybrid","decades":[],"genres":[],"mood":null,"artist":null,"semantic":""}

mode (required) — how to search:
- "keyword": the user wants something specific — a title, exact phrase, or named artist.
- "semantic": the user is describing a feeling, scenario, or vibe. Use this for abstract or poetic queries.
- "hybrid": the query mixes specific terms with mood or theme.
- "both_merge": genuinely ambiguous — use sparingly.

Filters — only when clearly implied:
- decades: 1950-2020. Only if a time period is mentioned or implied.
- genres: [pop, rock, jazz, blues, country, reggae, soul, funk, disco, hip-hop, r&b, electronic, folk, punk, metal, alternative, indie, grunge, latin]. Only if named or strongly implied.
- mood: "sadness"|"joy"|"anger"|"fear"|"surprise". Only if emotional intent is clear.
- artist: lowercase. Only if named.

semantic (ALWAYS filled) — this is the most important field. It gets matched against song lyrics via embedding similarity. Write it as what the LYRICS of the ideal matching song would be about — not a description of the playlist, but the themes, words, and feelings that would appear in the actual lyrics.

If the query is abstract or hard to map directly, reframe it:
- "songs you'd hear at a dive bar" → think about what those lyrics contain: drinking, heartache, regret, being alone
- "something my grandma would dance to" → think about the era and style: classic rhythm, joy, dancing, love, good times
- "villain walking in" → think about lyric themes: power, darkness, danger, confidence, intimidation

The semantic field should read like a description of lyric content, not a playlist name.

Return ONLY JSON, no markdown.`;

export const orchestratorV2: Strategy = {
  name: "B2-orchestrator-v2",

  async run(query: string, songs: Song[], llm: LLMClient): Promise<SearchResult[]> {
    const raw = await llm.call(SYSTEM_PROMPT, query, 200);
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
