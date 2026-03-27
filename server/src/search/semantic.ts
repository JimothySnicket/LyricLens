import { getQdrantClient, COLLECTION_NAME } from "../lib/qdrant";
import { embedQuery } from "../lib/embedder";
import { payloadToSong } from "./utils";
import type { ParsedQuery, SearchResult } from "../lib/types";

export async function semanticSearch(
  parsed: ParsedQuery,
  originalQuery: string,
  limit = 20,
): Promise<{ results: SearchResult[]; totalFiltered: number }> {
  const client = getQdrantClient();

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

  // Query both vectors in parallel
  const [lyricsResponse, summaryResponse] = await Promise.all([
    client.query(COLLECTION_NAME, {
      query: vector,
      using: "lyrics",
      filter,
      limit,
      with_payload: true,
    }),
    client.query(COLLECTION_NAME, {
      query: vector,
      using: "summary",
      filter,
      limit,
      with_payload: true,
    }),
  ]);

  // Merge by song ID — keep whichever score is higher
  const merged = new Map<string, SearchResult>();

  for (const point of lyricsResponse.points) {
    const song = payloadToSong(point.id, point.payload);
    merged.set(song.id, {
      song,
      score: point.score ?? 0,
      matchReason: `lyrics: ${(point.score ?? 0).toFixed(3)}`,
      mode: "semantic" as const,
    });
  }

  for (const point of summaryResponse.points) {
    const song = payloadToSong(point.id, point.payload);
    const score = point.score ?? 0;
    const existing = merged.get(song.id);
    if (!existing || score > existing.score) {
      merged.set(song.id, {
        song,
        score,
        matchReason: existing
          ? `lyrics: ${existing.score.toFixed(3)} · summary: ${score.toFixed(3)}`
          : `summary: ${score.toFixed(3)}`,
        mode: "semantic" as const,
      });
    } else if (existing) {
      // Song found in both — note it in the reason
      existing.matchReason = `lyrics: ${existing.score.toFixed(3)} · summary: ${score.toFixed(3)}`;
    }
  }

  const results = [...merged.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return { results, totalFiltered: 2742 };
}
