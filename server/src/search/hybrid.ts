import { keywordSearch } from "./keyword";
import { semanticSearch } from "./semantic";
import { songKey } from "./utils";
import type { Song, ParsedQuery, SearchResult } from "../lib/types";

const BASE_KEYWORD_WEIGHT = 0.4;

// When keyword's best score is below this, keyword matches are weak
// (e.g. just "bar" in lyrics) and shouldn't dominate the blend.
// A 2-word lyrics match = 4 * 1.5 = 6, a 1-word title = 1 * 2 = 2.
// A strong keyword match (3+ word title) = 9 * 2 = 18+.
const KEYWORD_CONFIDENCE_THRESHOLD = 8;

// Title-match bonus: keyword results that matched in the song title get a
// score boost so they can break through the semantic ceiling (0.40 max for
// keyword-only songs). Scaled by match length so exact titles rank highest.
const TITLE_BONUS_PER_WORD = 0.10; // 1w → +0.10, 2w → +0.20
const TITLE_BONUS_CAP = 0.30;      // 3+ words capped
const ARTIST_MATCH_BONUS = 0.15;

function titleMatchWords(matchReason: string): number {
  const m = matchReason.match(/title:.*?\((\d+)w\)/);
  return m ? parseInt(m[1]) : 0;
}

function hasArtistMatch(matchReason: string): boolean {
  return /artist:/.test(matchReason);
}

/**
 * Pure merge step: union keyword and vector results by title+artist key,
 * blend scores, apply bonuses, and return ranked SearchResults.
 * Exported for unit testing.
 */
export function mergeHybridResults(
  keywordResults: SearchResult[],
  vectorResults: SearchResult[],
  limit = 20,
): SearchResult[] {
  const merged = new Map<string, {
    song: Song;
    keywordScore: number;
    vectorScore: number;
    keywordReason: string;
    vectorReason: string;
  }>();

  const maxKeyword = keywordResults.length > 0 ? keywordResults[0].score : 1;
  const keywordConfidence = maxKeyword >= KEYWORD_CONFIDENCE_THRESHOLD ? 1.0 : maxKeyword / KEYWORD_CONFIDENCE_THRESHOLD;
  const kwWeight = BASE_KEYWORD_WEIGHT * keywordConfidence;
  const vecWeight = 1 - kwWeight;

  for (const kr of keywordResults) {
    merged.set(songKey(kr.song.title, kr.song.artist), {
      song: kr.song,
      keywordScore: kr.score / maxKeyword,
      vectorScore: 0,
      keywordReason: kr.matchReason,
      vectorReason: "",
    });
  }

  for (const vr of vectorResults) {
    const key = songKey(vr.song.title, vr.song.artist);
    const existing = merged.get(key);
    if (existing) {
      existing.vectorScore = vr.score;
      existing.vectorReason = vr.matchReason;
    } else {
      merged.set(key, {
        song: vr.song,
        keywordScore: 0,
        vectorScore: vr.score,
        keywordReason: "",
        vectorReason: vr.matchReason,
      });
    }
  }

  const results: SearchResult[] = [];

  for (const entry of merged.values()) {
    let bonus = 0;
    if (entry.keywordScore > 0) {
      const titleWords = titleMatchWords(entry.keywordReason);
      if (titleWords > 0) {
        bonus += Math.min(titleWords * TITLE_BONUS_PER_WORD, TITLE_BONUS_CAP);
      }
      if (hasArtistMatch(entry.keywordReason)) {
        bonus += ARTIST_MATCH_BONUS;
      }
    }

    const blended =
      entry.keywordScore * kwWeight +
      entry.vectorScore * vecWeight +
      bonus;

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
  return results.slice(0, limit);
}

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

  return {
    results: mergeHybridResults(keywordResults, vectorResults, limit),
    totalFiltered: songs.length,
  };
}
