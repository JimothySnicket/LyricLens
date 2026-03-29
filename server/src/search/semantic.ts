import { getQdrantClient, COLLECTION_NAME } from "../lib/qdrant";
import { embedQuery } from "../lib/embedder";
import { payloadToSong } from "./utils";
import type { ParsedQuery, SearchResult } from "../lib/types";

// ---------------------------------------------------------------------------
// Build Qdrant filter from parsed query filters
// ---------------------------------------------------------------------------
function buildQdrantFilter(parsed: ParsedQuery): Record<string, any> | undefined {
  const { decades, genres, moods, artistHint } = parsed.filters;
  const must: any[] = [];

  // Decade filter — exact match on any of the specified decades
  if (decades.length > 0) {
    must.push({ key: "decade", match: { any: decades } });
  }

  // Genre filter — text-indexed, substring match via match.text
  if (genres.length > 0) {
    if (genres.length === 1) {
      must.push({ key: "genre", match: { text: genres[0] } });
    } else {
      // OR across genres — song matches if genre contains any search term
      must.push({
        should: genres.map(g => ({ key: "genre", match: { text: g } })),
      });
    }
  }

  // Mood/emotion filter — range filter on emotion scores
  for (const mood of moods) {
    if (mood.min != null) {
      must.push({ key: mood.key, range: { gte: mood.min } });
    }
  }

  // Artist filter — text-indexed, match on artist name tokens
  if (artistHint.length > 0) {
    for (const token of artistHint) {
      must.push({ key: "artist", match: { text: token } });
    }
  }

  // Title scope — filter to songs where title contains query terms
  if (parsed.scopeTitle && parsed.terms.length > 0) {
    // Each meaningful term should appear in the title
    for (const term of parsed.terms) {
      must.push({ key: "title", match: { text: term } });
    }
  }

  if (must.length === 0) return undefined;
  return { must };
}

// ---------------------------------------------------------------------------
// Semantic search
// ---------------------------------------------------------------------------
export async function semanticSearch(
  parsed: ParsedQuery,
  originalQuery: string,
  limit = 20,
): Promise<{ results: SearchResult[]; totalFiltered: number; timing?: { embedMs: number; qdrantMs: number } }> {
  const client = getQdrantClient();

  const filter = buildQdrantFilter(parsed);

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
