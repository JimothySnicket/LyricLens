import { getQdrantClient, COLLECTION_NAME } from "../lib/qdrant";
import { embedQuery } from "../lib/embedder";
import { payloadToSong, buildMatchReason, longestSequence } from "./utils";
import { GENRE_TO_QDRANT } from "../lib/nlp-helpers";
import type { ParsedQuery, SearchResult } from "../lib/types";

export async function hybridSearch(
  parsed: ParsedQuery,
  originalQuery: string,
  limit = 20
): Promise<{ results: SearchResult[]; totalFiltered: number }> {
  const client = getQdrantClient();

  // Build Qdrant filter from ALL structured fields
  const must: any[] = [];
  if (parsed.filters.decades.length > 0) {
    must.push({ key: "decade", match: { any: parsed.filters.decades } });
  }
  if (parsed.filters.genres.length === 1) {
    const g = GENRE_TO_QDRANT[parsed.filters.genres[0]] ?? parsed.filters.genres[0];
    must.push({ key: "genre", match: { text: g } });
  } else if (parsed.filters.genres.length > 1) {
    must.push({
      should: parsed.filters.genres.map(g => ({
        key: "genre",
        match: { text: GENRE_TO_QDRANT[g] ?? g },
      })),
    });
  }
  if (parsed.filters.artistHint.length > 0) {
    must.push({ key: "artist", match: { text: parsed.filters.artistHint.join(" ") } });
  }
  for (const mood of parsed.filters.moods) {
    if (mood.min !== undefined) {
      must.push({ key: mood.key, range: { gte: mood.min } });
    }
  }
  const filter = must.length > 0 ? { must } : undefined;

  // Count filtered pool
  const countResult = filter
    ? await client.count(COLLECTION_NAME, { filter, exact: true })
    : { count: 723 };

  // Use raw query for embedding — natural language embeds better than keyword soup
  const queryText = originalQuery || parsed.semanticText;

  if (!queryText.trim()) {
    // Pure filter query — scroll with filters, sort by chart position
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
        matchReason: buildMatchReason("hybrid", parsed, 0),
        mode: "hybrid" as const,
      })),
      totalFiltered: countResult.count,
    };
  }

  // Over-fetch for re-ranking
  const fetchLimit = Math.min(limit * 3, 60);
  const vector = await embedQuery(queryText);

  const response = await client.query(COLLECTION_NAME, {
    query: vector,
    using: "summary",
    filter,
    limit: fetchLimit,
    with_payload: true,
  });

  const queryWords = parsed.searchPhrase
    ? parsed.searchPhrase.split(/\s+/)
    : [];

  const results = response.points.map((point) => {
    const song = payloadToSong(point.id, point.payload);
    const vectorScore = point.score ?? 0;

    // Sequence-based keyword bonus (n² scaled to vector range)
    const titleMatch = longestSequence(queryWords, song.title);
    const lyricsMatch = longestSequence(queryWords, song.lyrics);
    const keywordBonus =
      (titleMatch.length ** 2) * 0.015 +
      (lyricsMatch.length ** 2) * 0.01;

    const blendedScore = vectorScore + keywordBonus;

    // Build match reason
    const reasons: string[] = [];
    if (titleMatch.length > 0) {
      reasons.push(`"${titleMatch.phrase}" in title (${titleMatch.length}w)`);
    }
    if (lyricsMatch.length > 0) {
      reasons.push(`"${lyricsMatch.phrase}" in lyrics (${lyricsMatch.length}w)`);
    }
    const matchReason = buildMatchReason("hybrid", parsed, vectorScore) +
      (reasons.length > 0 ? " · " + reasons.join(", ") : "");

    return {
      song,
      score: blendedScore,
      matchReason,
      mode: "hybrid" as const,
    };
  });

  results.sort((a, b) => b.score - a.score);

  return {
    results: results.slice(0, limit),
    totalFiltered: countResult.count,
  };
}
