import { getQdrantClient, COLLECTION_NAME } from "../lib/qdrant";
import { embedQuery } from "../lib/embedder";
import { payloadToSong, buildMatchReason } from "./utils";
import type { ParsedQuery, SearchResult } from "../lib/types";

export async function semanticSearch(
  parsed: ParsedQuery,
  originalQuery: string,
  limit = 20
): Promise<{ results: SearchResult[]; totalFiltered: number }> {
  const client = getQdrantClient();

  // Build Qdrant filter from all structured fields
  const must: any[] = [];
  if (parsed.filters.decades.length > 0) {
    must.push({ key: "decade", match: { any: parsed.filters.decades } });
  }
  if (parsed.filters.genres.length > 0) {
    must.push({ key: "genre", match: { any: parsed.filters.genres } });
  }
  if (parsed.filters.artistHint.length > 0) {
    must.push({ key: "artist", match: { text: parsed.filters.artistHint.join(" ") } });
  }
  // Mood/audio as range filters
  for (const mood of parsed.filters.moods) {
    if (mood.min !== undefined) {
      must.push({ key: mood.key, range: { gte: mood.min } });
    }
  }
  for (const af of parsed.filters.audioFeatures) {
    if (af.min !== undefined) must.push({ key: af.key, range: { gte: af.min } });
    if (af.max !== undefined) must.push({ key: af.key, range: { lte: af.max } });
  }
  const filter = must.length > 0 ? { must } : undefined;

  // semanticText always has content now (parser doesn't consume words)
  const queryText = parsed.semanticText || originalQuery;

  // If there's truly nothing to embed, just scroll with filters
  if (!queryText.trim()) {
    if (!filter) return { results: [], totalFiltered: 723 };
    const scrollResult = await client.scroll(COLLECTION_NAME, {
      filter,
      limit,
      with_payload: true,
    });
    return {
      results: scrollResult.points.map((point) => ({
        song: payloadToSong(point.id, point.payload),
        score: 0,
        matchReason: buildMatchReason("semantic", parsed, 0),
        mode: "semantic" as const,
      })),
      totalFiltered: scrollResult.points.length,
    };
  }

  const vector = await embedQuery(queryText);

  const countResult = filter
    ? await client.count(COLLECTION_NAME, { filter, exact: true })
    : { count: 723 };

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
