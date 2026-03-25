import type { Song, ParsedQuery, SearchResult } from "../lib/types";

const WEIGHT_TITLE_BASE = 6;
const WEIGHT_TITLE_SCOPED = 12;
const WEIGHT_LYRICS_BASE = 2;
const WEIGHT_LYRICS_SCOPED = 8;
const WEIGHT_ARTIST_BASE = 4;
const WEIGHT_ARTIST_SCOPED = 10;
const WEIGHT_DECADE = 3;

const MAX_RESULTS = 30;

export function keywordSearch(
  songs: Song[],
  parsed: ParsedQuery,
): SearchResult[] {
  const { scopeTitle, scopeLyrics, scopeArtist, filters, terms } = parsed;
  const { genres, decades, artistHint } = filters;

  const titleWeight = scopeTitle ? WEIGHT_TITLE_SCOPED : WEIGHT_TITLE_BASE;
  const lyricsWeight = scopeLyrics ? WEIGHT_LYRICS_SCOPED : WEIGHT_LYRICS_BASE;
  const artistWeight = scopeArtist ? WEIGHT_ARTIST_SCOPED : WEIGHT_ARTIST_BASE;

  const results: SearchResult[] = [];

  for (const song of songs) {
    // Hard filters
    if (genres.length > 0) {
      const songGenre = song.genre.toLowerCase();
      const match = genres.some((g) => songGenre.includes(g.toLowerCase()));
      if (!match) continue;
    }

    if (decades.length > 0 && !decades.includes(song.decade)) {
      continue;
    }

    if (artistHint.length > 0) {
      const lowerArtist = song.artist.toLowerCase();
      const allMatch = artistHint.every((token) => lowerArtist.includes(token));
      if (!allMatch) continue;
    }

    const lowerTitle = song.title.toLowerCase();
    const lowerLyrics = song.lyrics.toLowerCase();
    const lowerArtist = song.artist.toLowerCase();

    let score = 0;
    const reasons: string[] = [];

    let titleTermMatches = 0;
    let lyricsTermMatches = 0;
    let artistTermMatches = 0;

    for (const term of terms) {
      const inTitle = lowerTitle.includes(term);
      const inLyrics = lowerLyrics.includes(term);
      const inArtist = lowerArtist.includes(term);

      if (inTitle) { score += titleWeight; titleTermMatches++; }
      if (inLyrics) { score += lyricsWeight; lyricsTermMatches++; }
      if (inArtist) { score += artistWeight; artistTermMatches++; }
    }

    // Scope enforcement
    if (terms.length > 0) {
      if (scopeTitle && titleTermMatches === 0) continue;
      if (scopeLyrics && lyricsTermMatches === 0) continue;
      if (scopeArtist && artistHint.length === 0 && artistTermMatches === 0) continue;
    }

    // Decade bonus
    if (decades.length > 0 && decades.includes(song.decade)) {
      score += WEIGHT_DECADE;
      reasons.push(`decade: ${song.decade}s`);
    }

    // Match reasons
    if (terms.length > 0) {
      const inT = terms.filter((t) => lowerTitle.includes(t));
      const inL = terms.filter((t) => lowerLyrics.includes(t));
      const inA = terms.filter((t) => lowerArtist.includes(t));
      if (inT.length > 0) reasons.push(`title: ${inT.join(", ")}`);
      if (inL.length > 0) reasons.push(`lyrics: ${inL.join(", ")}`);
      if (inA.length > 0) reasons.push(`artist: ${inA.join(", ")}`);
    }

    if (artistHint.length > 0) reasons.push(`artist: ${song.artist}`);
    if (genres.length > 0) reasons.push(`genre: ${song.genre}`);

    // Chart position tiebreaker
    if (song.chartPosition >= 1 && song.chartPosition <= 5) {
      score += 0.3;
    } else if (song.chartPosition >= 6 && song.chartPosition <= 10) {
      score += 0.15;
    }

    // Need some scoring criteria to have been active
    const hasCriteria = terms.length > 0 || artistHint.length > 0;
    if (hasCriteria && score <= 0) continue;

    // For filter-only queries (genre, decade), include all matches
    if (!hasCriteria && genres.length === 0 && decades.length === 0) continue;

    results.push({
      song,
      score,
      matchReason: reasons.join("; ") || "filter match",
      mode: "keyword",
    });
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, MAX_RESULTS);
}
