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

  // Apply structured filters (decade, genre) even in semantic mode
  const must: any[] = [];
  if (parsed.filters.decades.length > 0) {
    must.push({ key: "decade", match: { any: parsed.filters.decades } });
  }
  if (parsed.filters.genres.length > 0) {
    must.push({ key: "genre", match: { any: parsed.filters.genres } });
  }
  const filter = must.length > 0 ? { must } : undefined;

  const countResult = filter
    ? await client.count(COLLECTION_NAME, { filter, exact: true })
    : { count: 819 };

  const response = await client.query(COLLECTION_NAME, {
    query: vector,
    filter,
    limit,
    with_payload: true,
  });

  return {
    results: response.points.map((point) => ({
      song: payloadToSong(point.id, point.payload),
      score: point.score ?? 0,
      matchReason: buildMatchReason("semantic", parsed, point.score ?? 0),
      mode: "semantic" as const,
    })),
    totalFiltered: countResult.count,
  };
}
