import { getQdrantClient, COLLECTION_NAME } from "../lib/qdrant";
import { embedQuery } from "../lib/embedder";
import { payloadToSong, buildMatchReason } from "./utils";
import type { ParsedQuery, SearchResult } from "../lib/types";

export async function hybridSearch(
  parsed: ParsedQuery,
  originalQuery: string,
  limit = 20
): Promise<{ results: SearchResult[]; totalFiltered: number }> {
  // Fall back to original query if parser consumed all words
  const queryText = parsed.semanticText || parsed.terms.join(" ") || originalQuery;
  const client = getQdrantClient();

  // Build Qdrant filter conditions from parsed query
  const must: any[] = [];

  if (parsed.filters.decades.length > 0) {
    must.push({ key: "decade", match: { any: parsed.filters.decades } });
  }

  if (parsed.filters.genres.length > 0) {
    must.push({ key: "genre", match: { any: parsed.filters.genres } });
  }

  const filter = must.length > 0 ? { must } : undefined;

  // If there is no semantic text, return the filtered count with no results
  if (!queryText.trim()) {
    const countResult = filter
      ? await client.count(COLLECTION_NAME, { filter, exact: true })
      : { count: 819 };
    return { results: [], totalFiltered: countResult.count };
  }

  const vector = await embedQuery(queryText);

  // Count how many songs remain after filtering (for "Under the Hood" display)
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
      matchReason: buildMatchReason("hybrid", parsed, point.score ?? 0),
      mode: "hybrid" as const,
    })),
    totalFiltered: countResult.count,
  };
}
