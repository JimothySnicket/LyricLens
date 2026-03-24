import { getQdrantClient, COLLECTION_NAME } from "../lib/qdrant";
import { embedQuery } from "../lib/embedder";
import { payloadToSong, buildMatchReason } from "./utils";
import type { ParsedQuery, SearchResult } from "../lib/types";

export async function hybridSearch(
  parsed: ParsedQuery,
  originalQuery: string,
  limit = 20
): Promise<{ results: SearchResult[]; totalFiltered: number }> {
  const queryText = parsed.semanticText || parsed.terms.join(" ") || originalQuery;
  const client = getQdrantClient();

  // Build Qdrant filter conditions from all parsed filters
  const must: any[] = [];
  if (parsed.filters.decades.length > 0) {
    must.push({ key: "decade", match: { any: parsed.filters.decades } });
  }
  if (parsed.filters.genres.length > 0) {
    must.push({ key: "genre", match: { any: parsed.filters.genres } });
  }
  const filter = must.length > 0 ? { must } : undefined;

  // Count filtered pool
  const countResult = filter
    ? await client.count(COLLECTION_NAME, { filter, exact: true })
    : { count: 819 };

  // If there's no text to embed, just return the count
  if (!queryText.trim()) {
    return { results: [], totalFiltered: countResult.count };
  }

  // Fetch more results than needed so we can re-rank after blending
  const fetchLimit = Math.min(limit * 3, 60);
  const vector = await embedQuery(queryText);

  const response = await client.query(COLLECTION_NAME, {
    query: vector,
    filter,
    limit: fetchLimit,
    with_payload: true,
  });

  let results = response.points.map((point) => {
    const song = payloadToSong(point.id, point.payload);
    const vectorScore = point.score ?? 0;

    // Blend keyword signals into the vector score
    let keywordBonus = 0;
    const reasons: string[] = [];

    // Term matching bonus
    for (const term of parsed.terms) {
      if (song.title.toLowerCase().includes(term)) {
        keywordBonus += 0.05;
        reasons.push(`"${term}" in title`);
      }
      if (song.lyrics.toLowerCase().includes(term)) {
        keywordBonus += 0.02;
      }
    }

    // Mood score bonus
    for (const mood of parsed.filters.moods) {
      const val = song.scores[mood.key] ?? 0;
      if (val >= (mood.min ?? 0)) {
        keywordBonus += val * 0.03;
        reasons.push(`${mood.label}: ${val.toFixed(2)}`);
      }
    }

    // Audio feature bonus
    for (const af of parsed.filters.audioFeatures) {
      const audioKey = af.key as keyof typeof song;
      const val = typeof song[audioKey] === "number" ? (song[audioKey] as number) : 0;
      if (af.min !== undefined && val >= af.min) {
        keywordBonus += val * 0.02;
      }
      if (af.max !== undefined && val <= af.max) {
        keywordBonus += (1 - val) * 0.02;
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

  // Post-filter by artist hint
  if (parsed.filters.artistHint.length > 0) {
    results = results.filter((r) => {
      const lower = r.song.artist.toLowerCase();
      return parsed.filters.artistHint.every((t) => lower.includes(t));
    });
  }

  // Re-sort by blended score
  results.sort((a, b) => b.score - a.score);

  return {
    results: results.slice(0, limit),
    totalFiltered: countResult.count,
  };
}
