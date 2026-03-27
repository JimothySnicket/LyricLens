import { getQdrantClient, COLLECTION_NAME } from "../lib/qdrant";
import { embedQuery } from "../lib/embedder";
import { payloadToSong } from "./utils";
import type { ParsedQuery, SearchResult } from "../lib/types";

export async function semanticSearch(
  parsed: ParsedQuery,
  originalQuery: string,
  limit = 20
): Promise<{ results: SearchResult[]; totalFiltered: number }> {
  const client = getQdrantClient();

  // Only filter on artist — "by prince" is unambiguous intent.
  // Everything else (decade, genre, mood) the vector handles semantically.
  const must: any[] = [];
  if (parsed.filters.artistHint.length > 0) {
    must.push({ key: "artist", match: { text: parsed.filters.artistHint.join(" ") } });
  }
  const filter = must.length > 0 ? { must } : undefined;

  const queryText = originalQuery || parsed.semanticText;

  if (!queryText.trim()) {
    return { results: [], totalFiltered: 2742 };
  }

  const vector = await embedQuery(queryText);

  const response = await client.query(COLLECTION_NAME, {
    query: vector,
    using: "summary",
    filter,
    limit,
    with_payload: true,
  });

  return {
    results: response.points.map((point) => ({
      song: payloadToSong(point.id, point.payload),
      score: point.score ?? 0,
      matchReason: `similarity: ${(point.score ?? 0).toFixed(3)}`,
      mode: "semantic" as const,
    })),
    totalFiltered: 2742,
  };
}
