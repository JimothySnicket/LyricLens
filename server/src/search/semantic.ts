import { getQdrantClient, COLLECTION_NAME } from "../lib/qdrant";
import { embedQuery } from "../lib/embedder";
import { payloadToSong, buildMatchReason } from "./utils";
import type { ParsedQuery, SearchResult } from "../lib/types";

export async function semanticSearch(
  parsed: ParsedQuery,
  originalQuery: string,
  limit = 20
): Promise<{ results: SearchResult[]; totalFiltered: number }> {
  // Use semanticText if available, otherwise fall back to the original query.
  // Semantic search should always embed something — even if the parser consumed
  // all words as filters/moods, the original query still carries meaning.
  const queryText = parsed.semanticText || parsed.terms.join(" ") || originalQuery;
  if (!queryText.trim()) return { results: [], totalFiltered: 0 };

  const vector = await embedQuery(queryText);
  const client = getQdrantClient();

  // Apply all structured filters in semantic mode
  const must: any[] = [];
  if (parsed.filters.decades.length > 0) {
    must.push({ key: "decade", match: { any: parsed.filters.decades } });
  }
  if (parsed.filters.genres.length > 0) {
    must.push({ key: "genre", match: { any: parsed.filters.genres } });
  }
  // Artist filter — Qdrant doesn't support substring match, so we'll post-filter
  const filter = must.length > 0 ? { must } : undefined;

  const countResult = filter
    ? await client.count(COLLECTION_NAME, { filter, exact: true })
    : { count: 723 };

  const response = await client.query(COLLECTION_NAME, {
    query: vector,
    filter,
    limit,
    with_payload: true,
  });

  let results = response.points.map((point) => ({
    song: payloadToSong(point.id, point.payload),
    score: point.score ?? 0,
    matchReason: buildMatchReason("semantic", parsed, point.score ?? 0),
    mode: "semantic" as const,
  }));

  // Post-filter by artist hint (Qdrant doesn't support substring matching)
  if (parsed.filters.artistHint.length > 0) {
    results = results.filter((r) => {
      const lower = r.song.artist.toLowerCase();
      return parsed.filters.artistHint.every((t) => lower.includes(t));
    });
  }

  return { results, totalFiltered: countResult.count };
}
