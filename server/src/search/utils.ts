import type { Song, SearchMode, ParsedQuery } from "../lib/types";

/** Stable identity for dedup — both keyword (slug IDs) and semantic (Qdrant int IDs) have title + artist. */
export function songKey(title: string, artist: string): string {
  return `${title.toLowerCase().trim()}::${artist.toLowerCase().trim()}`;
}

export function payloadToSong(id: any, payload: any): Song {
  const title = payload.title ?? "";
  const artist = payload.artist ?? "";
  return {
    id: songKey(title, artist),
    title,
    artist,
    year: payload.year ?? 0,
    decade: payload.decade ?? 0,
    genre: payload.genre ?? "",
    chartPosition: payload.chart_position ?? 0,
    lyrics: payload.lyrics ?? "",
    album: payload.album ?? "",
    writers: payload.writers ?? "",
    emotions: payload.emotions ?? {},
  };
}

export function buildMatchReason(
  mode: SearchMode,
  parsed: ParsedQuery,
  score: number,
): string {
  const parts: string[] = [];
  if (parsed.filters.decades.length > 0) parts.push("decade: " + parsed.filters.decades.join(", "));
  if (parsed.filters.genres.length > 0) parts.push("genre: " + parsed.filters.genres.join(", "));
  if (parsed.filters.artistHint.length > 0) parts.push("artist: " + parsed.filters.artistHint.join(" "));
  if (mode === "semantic" || mode === "hybrid") {
    parts.push("similarity: " + score.toFixed(3));
  }
  return parts.join(" · ") || mode + " match";
}

export interface SequenceMatch {
  length: number;
  phrase: string;
}

// Stop words only score when part of a sequence (len >= 2).
// As single-word matches they're pure noise ("in" matches every song).
const NOISE_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "is", "was", "are", "were", "be", "been",
  "has", "have", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "can", "shall", "it", "its", "he", "she",
  "him", "her", "his", "we", "our", "us", "my", "me", "i", "you", "your",
  "they", "them", "their", "that", "this", "so", "than", "not", "no",
]);

function isAlpha(code: number): boolean {
  return (code >= 97 && code <= 122) || (code >= 65 && code <= 90);
}

/** Check if `phrase` appears in `lower` at a word boundary (both sides). */
function hasPhrase(lower: string, phrase: string): boolean {
  let pos = 0;
  while (true) {
    const idx = lower.indexOf(phrase, pos);
    if (idx === -1) return false;
    const before = idx > 0 ? lower.charCodeAt(idx - 1) : 0;
    const after = idx + phrase.length < lower.length ? lower.charCodeAt(idx + phrase.length) : 0;
    if (!isAlpha(before) && !isAlpha(after)) return true;
    pos = idx + 1;
  }
}

export function longestSequence(
  queryWords: string[],
  text: string,
): SequenceMatch {
  if (queryWords.length === 0 || !text) return { length: 0, phrase: "" };
  const lower = text.toLowerCase();
  for (let len = queryWords.length; len >= 1; len--) {
    for (let start = 0; start <= queryWords.length - len; start++) {
      // Skip sequences where every word is noise — "in the" is worthless,
      // but "be my baby" is fine because "baby" carries meaning
      let allNoise = true;
      for (let j = start; j < start + len; j++) {
        if (!NOISE_WORDS.has(queryWords[j])) { allNoise = false; break; }
      }
      if (allNoise) continue;
      const phrase = queryWords.slice(start, start + len).join(" ");
      if (hasPhrase(lower, phrase)) {
        return { length: len, phrase };
      }
    }
  }
  return { length: 0, phrase: "" };
}
