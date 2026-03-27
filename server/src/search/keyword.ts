import { longestSequence } from "./utils";
import type { Song, ParsedQuery, SearchResult } from "../lib/types";

const TITLE_WEIGHT = 2;
const LYRICS_WEIGHT = 1.5;
const ARTIST_WEIGHT = 2;
const DECADE_BONUS = 2;
const GENRE_BONUS = 2;
const ARTIST_HINT_BONUS = 10;

const MAX_RESULTS = 30;

export function keywordSearch(
  songs: Song[],
  parsed: ParsedQuery,
): SearchResult[] {
  const { scopeTitle, scopeLyrics, scopeArtist, filters } = parsed;
  const { decades, genres, artistHint } = filters;
  const queryWords = parsed.searchPhrase
    ? parsed.searchPhrase.split(/\s+/)
    : [];

  if (queryWords.length === 0 && decades.length === 0 && genres.length === 0 && artistHint.length === 0) {
    return [];
  }

  const results: SearchResult[] = [];

  for (const song of songs) {
    // --- Sequence scoring ---
    const titleMatch = longestSequence(queryWords, song.title);
    const lyricsMatch = longestSequence(queryWords, song.lyrics);
    const artistMatch = longestSequence(queryWords, song.artist);

    let score =
      (titleMatch.length ** 2) * TITLE_WEIGHT +
      (lyricsMatch.length ** 2) * LYRICS_WEIGHT +
      (artistMatch.length ** 2) * ARTIST_WEIGHT;

    // --- Scope enforcement ---
    if (scopeTitle && titleMatch.length === 0) continue;
    if (scopeLyrics && lyricsMatch.length === 0) continue;
    if (scopeArtist && artistHint.length === 0 && artistMatch.length === 0) continue;

    // --- Filter bonuses (additive, never exclusionary) ---
    if (artistHint.length > 0) {
      const lowerArtist = song.artist.toLowerCase();
      if (artistHint.every((token) => lowerArtist.includes(token))) {
        score += ARTIST_HINT_BONUS;
      }
    }
    if (decades.length > 0 && decades.includes(song.decade)) {
      score += DECADE_BONUS;
    }
    if (genres.length > 0) {
      const songGenre = song.genre.toLowerCase();
      if (genres.some((g) => songGenre.includes(g.toLowerCase()))) {
        score += GENRE_BONUS;
      }
    }

    // Skip zero-score songs
    if (score <= 0) continue;

    // --- Build match reason ---
    const reasons: string[] = [];
    if (titleMatch.length > 0) {
      reasons.push(`title: "${titleMatch.phrase}" (${titleMatch.length}w)`);
    }
    if (lyricsMatch.length > 0) {
      reasons.push(`lyrics: "${lyricsMatch.phrase}" (${lyricsMatch.length}w)`);
    }
    if (artistMatch.length > 0) {
      reasons.push(`artist: "${artistMatch.phrase}" (${artistMatch.length}w)`);
    }
    if (decades.length > 0 && decades.includes(song.decade)) {
      reasons.push(`decade: ${song.decade}s`);
    }
    if (genres.length > 0) {
      const songGenre = song.genre.toLowerCase();
      if (genres.some((g) => songGenre.includes(g.toLowerCase()))) {
        reasons.push(`genre: ${song.genre}`);
      }
    }

    results.push({
      song,
      score,
      matchReason: reasons.join(" · ") || "match",
      mode: "keyword",
    });
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, MAX_RESULTS);
}
