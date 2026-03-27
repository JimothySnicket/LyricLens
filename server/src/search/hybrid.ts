import { getQdrantClient, COLLECTION_NAME } from "../lib/qdrant";
import { embedQuery } from "../lib/embedder";
import { payloadToSong } from "./utils";
import { keywordSearch } from "./keyword";
import type { Song, ParsedQuery, SearchResult } from "../lib/types";

const KEYWORD_WEIGHT = 0.4;
const VECTOR_WEIGHT = 0.6;
const VECTOR_LIMIT = 50;

export async function hybridSearch(
  parsed: ParsedQuery,
  originalQuery: string,
  songs: Song[],
  limit = 20,
): Promise<{ results: SearchResult[]; totalFiltered: number }> {
  // --- Leg 1: Keyword search (full scan, sequence scoring) ---
  const keywordResults = keywordSearch(songs, parsed);

  // --- Leg 2: Vector search (unfiltered except artist) ---
  const client = getQdrantClient();
  const must: any[] = [];
  if (parsed.filters.artistHint.length > 0) {
    must.push({ key: "artist", match: { text: parsed.filters.artistHint.join(" ") } });
  }
  const filter = must.length > 0 ? { must } : undefined;

  const queryText = originalQuery || parsed.semanticText;
  let vectorResults: { song: Song; score: number }[] = [];

  if (queryText.trim()) {
    const vector = await embedQuery(queryText);
    const response = await client.query(COLLECTION_NAME, {
      query: vector,
      using: "summary",
      filter,
      limit: VECTOR_LIMIT,
      with_payload: true,
    });
    vectorResults = response.points.map((point) => ({
      song: payloadToSong(point.id, point.payload),
      score: point.score ?? 0,
    }));
  }

  // --- Merge: union by song ID ---
  const merged = new Map<string, {
    song: Song;
    keywordScore: number;
    vectorScore: number;
    keywordReason: string;
  }>();

  // Normalize keyword scores to 0–1 range
  const maxKeyword = keywordResults.length > 0
    ? keywordResults[0].score
    : 1;

  for (const kr of keywordResults) {
    merged.set(kr.song.id, {
      song: kr.song,
      keywordScore: kr.score / maxKeyword,
      vectorScore: 0,
      keywordReason: kr.matchReason,
    });
  }

  for (const vr of vectorResults) {
    const existing = merged.get(vr.song.id);
    if (existing) {
      // Song found by BOTH legs — strongest signal
      existing.vectorScore = vr.score;
    } else {
      merged.set(vr.song.id, {
        song: vr.song,
        keywordScore: 0,
        vectorScore: vr.score,
        keywordReason: "",
      });
    }
  }

  // --- Score and rank ---
  const results: SearchResult[] = [];

  for (const entry of merged.values()) {
    const blended =
      entry.keywordScore * KEYWORD_WEIGHT +
      entry.vectorScore * VECTOR_WEIGHT;

    const reasons: string[] = [];
    if (entry.keywordScore > 0) {
      reasons.push(entry.keywordReason);
    }
    if (entry.vectorScore > 0) {
      reasons.push(`similarity: ${entry.vectorScore.toFixed(3)}`);
    }

    results.push({
      song: entry.song,
      score: blended,
      matchReason: reasons.join(" · ") || "hybrid match",
      mode: "hybrid",
    });
  }

  results.sort((a, b) => b.score - a.score);

  return {
    results: results.slice(0, limit),
    totalFiltered: songs.length,
  };
}
