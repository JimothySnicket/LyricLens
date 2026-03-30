import { longestSequence } from "./utils";
import type { Song, ParsedQuery, SearchResult, ScoreComponent } from "../lib/types";

const TITLE_WEIGHT = 2;
const LYRICS_WEIGHT = 1.5;
const ARTIST_WEIGHT = 2;
const DECADE_BONUS = 2;
const GENRE_BONUS = 2;
const ARTIST_HINT_BONUS = 10;

const MAX_RESULTS = 30;

/** Short queries keep stop words — "be my baby" must stay intact. */
const SHORT_QUERY_THRESHOLD = 4;

/** Minimum sequence length for unfiltered path to beat stripped path.
 *  Prevents structural query words (e.g. "in the title from the 60s")
 *  from creating false sequence matches in lyrics. */
const UNFILTERED_MIN_SEQUENCE = 5;

export function keywordSearch(
  songs: Song[],
  parsed: ParsedQuery,
): SearchResult[] {
  const { scopeTitle, scopeLyrics, scopeArtist, filters } = parsed;
  const { decades, genres, artistHint } = filters;

  const stripped = parsed.terms;
  const unfiltered = parsed.termsUnfiltered;

  // Short queries: hard rule — never strip stop words
  const isShort = unfiltered.length <= SHORT_QUERY_THRESHOLD;
  // Primary words: unfiltered for short queries, stripped for long
  const primary = isShort ? unfiltered : stripped;
  // For long queries, we also test unfiltered and take the better score
  const testBoth = !isShort && stripped.length > 0 && stripped.length !== unfiltered.length;

  if (primary.length === 0 && decades.length === 0 && genres.length === 0 && artistHint.length === 0) {
    return [];
  }

  const results: SearchResult[] = [];

  for (const song of songs) {
    // --- Score with primary terms ---
    let titleMatch = longestSequence(primary, song.title);
    let lyricsMatch = longestSequence(primary, song.lyrics);
    let artistMatch = longestSequence(primary, song.artist);

    let score =
      (titleMatch.length ** 2) * TITLE_WEIGHT +
      (lyricsMatch.length ** 2) * LYRICS_WEIGHT +
      (artistMatch.length ** 2) * ARTIST_WEIGHT;

    // --- For long queries, also try unfiltered and take the better score ---
    // Only accept the unfiltered result if its best sequence is >= UNFILTERED_MIN_SEQUENCE
    // words. Short matches like "baby in" from structural query syntax are noise.
    if (testBoth) {
      const altTitle = longestSequence(unfiltered, song.title);
      const altLyrics = longestSequence(unfiltered, song.lyrics);
      const altArtist = longestSequence(unfiltered, song.artist);
      const bestAltLen = Math.max(altTitle.length, altLyrics.length, altArtist.length);
      if (bestAltLen >= UNFILTERED_MIN_SEQUENCE) {
        const altScore =
          (altTitle.length ** 2) * TITLE_WEIGHT +
          (altLyrics.length ** 2) * LYRICS_WEIGHT +
          (altArtist.length ** 2) * ARTIST_WEIGHT;
        if (altScore > score) {
          score = altScore;
          titleMatch = altTitle;
          lyricsMatch = altLyrics;
          artistMatch = altArtist;
        }
      }
    }

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

    const breakdown: ScoreComponent[] = [];
    if (titleMatch.length > 0) {
      breakdown.push({
        label: "Title match",
        detail: `"${titleMatch.phrase}" (${titleMatch.length}-word)`,
        value: `${(titleMatch.length ** 2 * TITLE_WEIGHT).toFixed(1)} pts`,
      });
    }
    if (lyricsMatch.length > 0) {
      breakdown.push({
        label: "Lyrics match",
        detail: `"${lyricsMatch.phrase}" (${lyricsMatch.length}-word)`,
        value: `${(lyricsMatch.length ** 2 * LYRICS_WEIGHT).toFixed(1)} pts`,
      });
    }
    if (artistMatch.length > 0) {
      breakdown.push({
        label: "Artist match",
        detail: `"${artistMatch.phrase}" (${artistMatch.length}-word)`,
        value: `${(artistMatch.length ** 2 * ARTIST_WEIGHT).toFixed(1)} pts`,
      });
    }
    if (artistHint.length > 0) {
      const lowerArtist = song.artist.toLowerCase();
      if (artistHint.every((token) => lowerArtist.includes(token))) {
        breakdown.push({ label: "Artist bonus", value: `+${ARTIST_HINT_BONUS} pts` });
      }
    }
    if (decades.length > 0 && decades.includes(song.decade)) {
      breakdown.push({ label: "Decade bonus", detail: `${song.decade}s`, value: `+${DECADE_BONUS} pts` });
    }
    if (genres.length > 0) {
      const songGenre = song.genre.toLowerCase();
      if (genres.some((g) => songGenre.includes(g.toLowerCase()))) {
        breakdown.push({ label: "Genre bonus", detail: song.genre, value: `+${GENRE_BONUS} pts` });
      }
    }
    breakdown.push({ label: "Total", value: `${score.toFixed(1)} pts` });

    results.push({
      song,
      score,
      matchReason: reasons.join(" · ") || "match",
      scoreBreakdown: breakdown,
      mode: "keyword",
    });
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, MAX_RESULTS);
}
