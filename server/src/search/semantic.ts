import { getQdrantClient, COLLECTION_NAME } from "../lib/qdrant";
import { embedQuery } from "../lib/embedder";
import { payloadToSong } from "./utils";
import type { ParsedQuery, SearchResult } from "../lib/types";

export async function semanticSearch(
  parsed: ParsedQuery,
  originalQuery: string,
  limit = 20,
): Promise<{ results: SearchResult[]; totalFiltered: number; timing?: { embedMs: number; qdrantMs: number } }> {
  const client = getQdrantClient();

  // No pre-filtering — let the vector do its job
  const filter = undefined;

  const queryText = originalQuery || parsed.semanticText;

  if (!queryText.trim()) {
    return { results: [], totalFiltered: 2742 };
  }

  const t0 = performance.now();
  const vector = await embedQuery(queryText);
  const embedMs = Math.round(performance.now() - t0);

  // Query both vectors in parallel
  const t1 = performance.now();
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

  const qdrantMs = Math.round(performance.now() - t1);

  const results = [...merged.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return { results, totalFiltered: 2742, timing: { embedMs, qdrantMs } };
}
