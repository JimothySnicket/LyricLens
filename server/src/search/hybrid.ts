import { keywordSearch } from "./keyword";
import { semanticSearch } from "./semantic";
import type { Song, ParsedQuery, SearchResult } from "../lib/types";

const KEYWORD_WEIGHT = 0.4;
const VECTOR_WEIGHT = 0.6;

export async function hybridSearch(
  parsed: ParsedQuery,
  originalQuery: string,
  songs: Song[],
  limit = 20,
): Promise<{ results: SearchResult[]; totalFiltered: number }> {
  // --- Leg 1: Keyword search (sequence scoring) ---
  const keywordResults = keywordSearch(songs, parsed);

  // --- Leg 2: Semantic search (both lyrics + summary vectors) ---
  const semanticResult = await semanticSearch(parsed, originalQuery, 50);
  const vectorResults = semanticResult.results;

  // --- Merge: union by song ID ---
  const merged = new Map<string, {
    song: Song;
    keywordScore: number;
    vectorScore: number;
    keywordReason: string;
    vectorReason: string;
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
      vectorReason: "",
    });
  }

  for (const vr of vectorResults) {
    const existing = merged.get(vr.song.id);
    if (existing) {
      existing.vectorScore = vr.score;
      existing.vectorReason = vr.matchReason;
    } else {
      merged.set(vr.song.id, {
        song: vr.song,
        keywordScore: 0,
        vectorScore: vr.score,
        keywordReason: "",
        vectorReason: vr.matchReason,
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
    if (entry.keywordScore > 0) reasons.push(entry.keywordReason);
    if (entry.vectorScore > 0) reasons.push(entry.vectorReason);

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
