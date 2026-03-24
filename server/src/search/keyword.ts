import type { Song, ParsedQuery, SearchResult } from "../lib/types";

// ---------------------------------------------------------------------------
// Weight constants
// ---------------------------------------------------------------------------

const WEIGHT_TITLE_BASE = 6;
const WEIGHT_TITLE_SCOPED = 12;
const WEIGHT_LYRICS_BASE = 2;
const WEIGHT_LYRICS_SCOPED = 8;
const WEIGHT_ARTIST_BASE = 4;
const WEIGHT_ARTIST_SCOPED = 10;
const WEIGHT_DECADE = 3;

const MAX_RESULTS = 30;

// ---------------------------------------------------------------------------
// Audio feature fields on the Song object that can be addressed by key
// ---------------------------------------------------------------------------

type AudioKey = "valence" | "energy" | "danceability" | "acousticness";

const AUDIO_FIELDS: Set<string> = new Set([
  "valence",
  "energy",
  "danceability",
  "acousticness",
]);

// ---------------------------------------------------------------------------
// keywordSearch
// ---------------------------------------------------------------------------

export function keywordSearch(
  songs: Song[],
  parsed: ParsedQuery,
): SearchResult[] {
  const { scopeTitle, scopeLyrics, scopeArtist, filters, terms } = parsed;
  const { genres, decades, moods, audioFeatures, artistHint } = filters;

  // Determine effective weights based on scope flags
  const titleWeight = scopeTitle ? WEIGHT_TITLE_SCOPED : WEIGHT_TITLE_BASE;
  const lyricsWeight = scopeLyrics ? WEIGHT_LYRICS_SCOPED : WEIGHT_LYRICS_BASE;
  const artistWeight = scopeArtist ? WEIGHT_ARTIST_SCOPED : WEIGHT_ARTIST_BASE;

  const results: SearchResult[] = [];

  for (const song of songs) {
    // -----------------------------------------------------------------------
    // Hard filters — skip songs that don't match
    // -----------------------------------------------------------------------

    // Genre filter
    if (genres.length > 0 && !genres.includes(song.genre.toLowerCase())) {
      continue;
    }

    // Decade filter
    if (decades.length > 0 && !decades.includes(song.decade)) {
      continue;
    }

    // Artist hint filter — all hint tokens must appear in the artist name
    if (artistHint.length > 0) {
      const lowerArtist = song.artist.toLowerCase();
      const allMatch = artistHint.every((token) => lowerArtist.includes(token));
      if (!allMatch) continue;
    }

    // -----------------------------------------------------------------------
    // Per-term scoring
    // -----------------------------------------------------------------------

    const lowerTitle = song.title.toLowerCase();
    const lowerLyrics = song.lyrics.toLowerCase();
    const lowerArtist = song.artist.toLowerCase();

    let score = 0;
    const reasons: string[] = [];

    // Track per-scope matches for scope enforcement
    let titleTermMatches = 0;
    let lyricsTermMatches = 0;
    let artistTermMatches = 0;

    for (const term of terms) {
      const inTitle = lowerTitle.includes(term);
      const inLyrics = lowerLyrics.includes(term);
      const inArtist = lowerArtist.includes(term);

      if (inTitle) {
        score += titleWeight;
        titleTermMatches++;
      }
      if (inLyrics) {
        score += lyricsWeight;
        lyricsTermMatches++;
      }
      if (inArtist) {
        score += artistWeight;
        artistTermMatches++;
      }
    }

    // Scope enforcement: if a scope is active and there are terms, require
    // at least one term to match in that scope.
    if (terms.length > 0) {
      if (scopeTitle && titleTermMatches === 0) continue;
      if (scopeLyrics && lyricsTermMatches === 0) continue;
      // scopeArtist is covered by the artistHint filter above; if there are
      // no artistHint tokens but scopeArtist is set, enforce term match.
      if (scopeArtist && artistHint.length === 0 && artistTermMatches === 0) {
        continue;
      }
    }

    // -----------------------------------------------------------------------
    // Decade scoring (bonus for matching the requested decade)
    // -----------------------------------------------------------------------

    if (decades.length > 0 && decades.includes(song.decade)) {
      score += WEIGHT_DECADE;
      reasons.push(`decade: ${song.decade}s`);
    }

    // -----------------------------------------------------------------------
    // Build match reasons from term hits
    // -----------------------------------------------------------------------

    if (terms.length > 0) {
      const matchedInTitle = terms.filter((t) =>
        lowerTitle.includes(t),
      );
      const matchedInLyrics = terms.filter((t) =>
        lowerLyrics.includes(t),
      );
      const matchedInArtist = terms.filter((t) =>
        lowerArtist.includes(t),
      );

      if (matchedInTitle.length > 0) {
        reasons.push(`title matches: ${matchedInTitle.join(", ")}`);
      }
      if (matchedInLyrics.length > 0) {
        reasons.push(`lyrics matches: ${matchedInLyrics.join(", ")}`);
      }
      if (matchedInArtist.length > 0) {
        reasons.push(`artist matches: ${matchedInArtist.join(", ")}`);
      }
    }

    if (artistHint.length > 0) {
      reasons.push(`artist: ${song.artist}`);
    }

    // -----------------------------------------------------------------------
    // Mood scoring
    // -----------------------------------------------------------------------

    for (const mood of moods) {
      const value = song.scores[mood.key] ?? 0;
      const min = mood.min ?? 0;
      const max = mood.max ?? 1;
      if (value >= min && value <= max) {
        score += value * 3;
        reasons.push(`mood: ${mood.label} (${value.toFixed(2)})`);
      }
    }

    // -----------------------------------------------------------------------
    // Audio feature scoring
    // -----------------------------------------------------------------------

    for (const af of audioFeatures) {
      if (!AUDIO_FIELDS.has(af.key)) continue;
      const value = song[af.key as AudioKey];
      const min = af.min ?? 0;
      const max = af.max ?? 1;
      if (value >= min && value <= max) {
        // Score contribution proportional to how well the value fits the range
        const mid = (min + max) / 2;
        const span = (max - min) / 2 || 0.5;
        const proximity = 1 - Math.abs(value - mid) / (span + 0.001);
        score += proximity * 2;
        reasons.push(`audio: ${af.label} (${value.toFixed(2)})`);
      }
    }

    // -----------------------------------------------------------------------
    // Genre match reason (already filtered, so if genre filter is active it matched)
    // -----------------------------------------------------------------------

    if (genres.length > 0) {
      reasons.push(`genre: ${song.genre}`);
    }

    // -----------------------------------------------------------------------
    // Skip songs with zero primary score when scoring criteria exist.
    // The chart tiebreaker is only applied after a song earns primary score,
    // so it cannot rescue a song that matched no terms / moods / audio.
    // -----------------------------------------------------------------------

    const hasScoringCriteria =
      terms.length > 0 || moods.length > 0 || audioFeatures.length > 0;

    if (hasScoringCriteria && score <= 0) continue;

    // -----------------------------------------------------------------------
    // Chart position tiebreaker (applied after primary score check)
    // -----------------------------------------------------------------------

    if (song.chartPosition >= 1 && song.chartPosition <= 5) {
      score += 0.3;
      reasons.push(`chart: #${song.chartPosition}`);
    } else if (song.chartPosition >= 6 && song.chartPosition <= 10) {
      score += 0.15;
      reasons.push(`chart: #${song.chartPosition}`);
    }

    results.push({
      song,
      score,
      matchReason: reasons.length > 0 ? reasons.join("; ") : "filter match",
      mode: "keyword",
    });
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);

  return results.slice(0, MAX_RESULTS);
}
