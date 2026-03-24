import { getQdrantClient, COLLECTION_NAME } from "../lib/qdrant";
import { embedQuery } from "../lib/embedder";
import { payloadToSong, buildMatchReason } from "./utils";
import type { ParsedQuery, SearchResult } from "../lib/types";

export async function semanticSearch(
  parsed: ParsedQuery,
  limit = 20
): Promise<SearchResult[]> {
  const queryText = parsed.semanticText || parsed.terms.join(" ");
  if (!queryText.trim()) return [];

  const vector = await embedQuery(queryText);
  const client = getQdrantClient();

  const response = await client.query(COLLECTION_NAME, {
    query: vector,
    limit,
    with_payload: true,
  });

  return response.points.map((point) => ({
    song: payloadToSong(point.id, point.payload),
    score: point.score ?? 0,
    matchReason: buildMatchReason("semantic", parsed, point.score ?? 0),
    mode: "semantic" as const,
  }));
}
