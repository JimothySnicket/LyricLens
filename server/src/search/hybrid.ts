import { getQdrantClient, COLLECTION_NAME } from "../lib/qdrant";
import { embedQuery } from "../lib/embedder";
import { payloadToSong, buildMatchReason } from "./utils";
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
  for (const genre of parsed.filters.genres) {
    must.push({ key: "genre", match: { text: genre } });
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

  // semanticText always has content now
  const queryText = parsed.semanticText || originalQuery;

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

  const results = response.points.map((point) => {
    const song = payloadToSong(point.id, point.payload);
    const vectorScore = point.score ?? 0;

    // Blend keyword signals into the vector score
    let keywordBonus = 0;
    const reasons: string[] = [];

    for (const term of parsed.terms) {
      if (song.title.toLowerCase().includes(term)) {
        keywordBonus += 0.05;
        reasons.push(`"${term}" in title`);
      }
      if (song.lyrics.toLowerCase().includes(term)) {
        keywordBonus += 0.02;
      }
    }

    const blendedScore = vectorScore + keywordBonus;
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
