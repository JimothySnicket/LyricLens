import { describe, test, expect } from "bun:test";
import { keywordSearch } from "../search/keyword";
import type { Song, ParsedQuery } from "../lib/types";
import testSongsRaw from "./fixtures/test-songs.json";

const testSongs = testSongsRaw as Song[];

// ---------------------------------------------------------------------------
// Helpers to build minimal ParsedQuery objects for each test
// ---------------------------------------------------------------------------

function emptyParsed(overrides: Partial<ParsedQuery> = {}): ParsedQuery {
  return {
    scopeTitle: false,
    scopeLyrics: false,
    scopeArtist: false,
    filters: {
      decades: [],
      genres: [],
      moods: [],
      audioFeatures: [],
      artistHint: [],
    },
    semanticText: "",
    terms: [],
    interpretations: [],
    ...overrides,
  };
}

function withFilters(
  overrides: Partial<ParsedQuery["filters"]>,
): ParsedQuery["filters"] {
  return {
    decades: [],
    genres: [],
    moods: [],
    audioFeatures: [],
    artistHint: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Title matching
// ---------------------------------------------------------------------------

describe("title matching", () => {
  test("returns songs whose title contains a search term", () => {
    const parsed = emptyParsed({ terms: ["midnight"] });
    const results = keywordSearch(testSongs, parsed);
    expect(results.length).toBeGreaterThan(0);
    const ids = results.map((r) => r.song.id);
    expect(ids).toContain("song-002"); // "Midnight Rain"
  });

  test("title match scores higher than lyrics-only match", () => {
    // "dream" appears in both lyrics everywhere AND in "Summer Dream" title
    const parsed = emptyParsed({ terms: ["dream"] });
    const results = keywordSearch(testSongs, parsed);
    // song-006 "Summer Dream" should be near the top because title weight > lyrics weight
    const titleMatchIdx = results.findIndex((r) => r.song.id === "song-006");
    // At minimum it must appear in results
    expect(titleMatchIdx).toBeGreaterThanOrEqual(0);
    // Find a song where "dream" is only in lyrics, not the title
    const lyricsOnlyResult = results.find(
      (r) => !r.song.title.toLowerCase().includes("dream"),
    );
    if (lyricsOnlyResult) {
      expect(results[titleMatchIdx].score).toBeGreaterThan(
        lyricsOnlyResult.score,
      );
    }
  });

  test("title scope: only songs with term in title are returned", () => {
    const parsed = emptyParsed({
      scopeTitle: true,
      terms: ["rain"],
    });
    const results = keywordSearch(testSongs, parsed);
    // Every result must have "rain" in its title
    for (const r of results) {
      expect(r.song.title.toLowerCase()).toContain("rain");
    }
  });

  test("title scope: excludes songs where term only appears in lyrics", () => {
    // "rain" appears in several lyrics but only in "Midnight Rain" and "Fire and Rain" titles
    const parsed = emptyParsed({
      scopeTitle: true,
      terms: ["rain"],
    });
    const results = keywordSearch(testSongs, parsed);
    const ids = results.map((r) => r.song.id);
    // song-007 "City Lights" has "rain" in lyrics but not title — must be excluded
    expect(ids).not.toContain("song-007");
  });
});

// ---------------------------------------------------------------------------
// Artist filtering
// ---------------------------------------------------------------------------

describe("artist filtering", () => {
  test("artistHint filters to songs by that artist", () => {
    const parsed = emptyParsed({
      filters: withFilters({ artistHint: ["sara", "monroe"] }),
    });
    const results = keywordSearch(testSongs, parsed);
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(r.song.artist.toLowerCase()).toContain("sara");
      expect(r.song.artist.toLowerCase()).toContain("monroe");
    }
  });

  test("artistHint excludes songs by other artists", () => {
    const parsed = emptyParsed({
      filters: withFilters({ artistHint: ["sara", "monroe"] }),
    });
    const results = keywordSearch(testSongs, parsed);
    const ids = results.map((r) => r.song.id);
    expect(ids).not.toContain("song-001"); // The Heartbreakers
    expect(ids).not.toContain("song-002"); // Blue Echo
  });

  test("partial artistHint token still matches", () => {
    // single token "heartbreakers" should match "The Heartbreakers"
    const parsed = emptyParsed({
      filters: withFilters({ artistHint: ["heartbreakers"] }),
    });
    const results = keywordSearch(testSongs, parsed);
    const ids = results.map((r) => r.song.id);
    expect(ids).toContain("song-001");
    expect(ids).toContain("song-008");
  });
});

// ---------------------------------------------------------------------------
// Genre + decade filtering
// ---------------------------------------------------------------------------

describe("genre and decade filtering", () => {
  test("genre filter returns only songs of that genre", () => {
    const parsed = emptyParsed({
      filters: withFilters({ genres: ["jazz"] }),
    });
    const results = keywordSearch(testSongs, parsed);
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(r.song.genre).toBe("jazz");
    }
  });

  test("decade filter returns only songs from that decade", () => {
    const parsed = emptyParsed({
      filters: withFilters({ decades: [1980] }),
    });
    const results = keywordSearch(testSongs, parsed);
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(r.song.decade).toBe(1980);
    }
  });

  test("combined genre + decade filter narrows results", () => {
    const parsed = emptyParsed({
      filters: withFilters({ genres: ["pop"], decades: [1980] }),
    });
    const results = keywordSearch(testSongs, parsed);
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(r.song.genre).toBe("pop");
      expect(r.song.decade).toBe(1980);
    }
  });

  test("genre + decade combo excludes non-matching songs", () => {
    const parsed = emptyParsed({
      filters: withFilters({ genres: ["rock"], decades: [2000] }),
    });
    const results = keywordSearch(testSongs, parsed);
    // No rock songs in the 2000s in our fixture set
    expect(results.length).toBe(0);
  });

  test("multiple decades in filter returns songs from any of those decades", () => {
    const parsed = emptyParsed({
      filters: withFilters({ decades: [1960, 2000] }),
    });
    const results = keywordSearch(testSongs, parsed);
    for (const r of results) {
      expect([1960, 2000]).toContain(r.song.decade);
    }
  });
});

// ---------------------------------------------------------------------------
// Mood boosting
// ---------------------------------------------------------------------------

describe("mood boosting", () => {
  test("mood filter boosts songs with high sadness score", () => {
    const parsed = emptyParsed({
      filters: withFilters({
        moods: [{ key: "sa", label: "sadness", min: 0.25 }],
      }),
    });
    const results = keywordSearch(testSongs, parsed);
    // song-004 "Broken Heart Ballad" has sa=0.88 — should score well
    const brokenHeart = results.find((r) => r.song.id === "song-004");
    expect(brokenHeart).toBeDefined();
    if (brokenHeart) {
      expect(brokenHeart.score).toBeGreaterThan(0);
    }
  });

  test("mood filter excludes songs below the min threshold from scoring", () => {
    const parsed = emptyParsed({
      filters: withFilters({
        moods: [{ key: "sa", label: "sadness", min: 0.5 }],
      }),
    });
    const results = keywordSearch(testSongs, parsed);
    // song-003 "Dance All Night" has sa=0.04 — should not appear in results
    // because score would be 0 with no terms/audio, and hasScoringCriteria = true
    const danceNight = results.find((r) => r.song.id === "song-003");
    expect(danceNight).toBeUndefined();
  });

  test("higher mood score produces higher result score", () => {
    const parsed = emptyParsed({
      filters: withFilters({
        moods: [{ key: "ro", label: "romantic", min: 0.2 }],
      }),
    });
    const results = keywordSearch(testSongs, parsed);
    // song-001 (ro=0.82) should outscore song-007 (ro=0.28)
    const song001Idx = results.findIndex((r) => r.song.id === "song-001");
    const song007Idx = results.findIndex((r) => r.song.id === "song-007");
    expect(song001Idx).toBeGreaterThanOrEqual(0);
    expect(song007Idx).toBeGreaterThanOrEqual(0);
    expect(song001Idx).toBeLessThan(song007Idx);
  });

  test("matchReason includes mood info", () => {
    const parsed = emptyParsed({
      filters: withFilters({
        moods: [{ key: "sa", label: "sadness", min: 0.25 }],
      }),
    });
    const results = keywordSearch(testSongs, parsed);
    const sadSong = results.find((r) => r.song.id === "song-002");
    expect(sadSong).toBeDefined();
    if (sadSong) {
      expect(sadSong.matchReason).toContain("sadness");
    }
  });
});

// ---------------------------------------------------------------------------
// Audio feature scoring
// ---------------------------------------------------------------------------

describe("audio feature scoring", () => {
  test("high energy filter boosts energetic songs", () => {
    const parsed = emptyParsed({
      filters: withFilters({
        audioFeatures: [{ key: "energy", label: "high energy", min: 0.5 }],
      }),
    });
    const results = keywordSearch(testSongs, parsed);
    // song-003 energy=0.92, song-005 energy=0.89 should be in results
    const ids = results.map((r) => r.song.id);
    expect(ids).toContain("song-003");
    expect(ids).toContain("song-005");
  });

  test("low energy (max) filter excludes high-energy songs", () => {
    const parsed = emptyParsed({
      filters: withFilters({
        audioFeatures: [{ key: "energy", label: "low energy", max: 0.35 }],
      }),
    });
    const results = keywordSearch(testSongs, parsed);
    // song-003 energy=0.92 should not appear
    const ids = results.map((r) => r.song.id);
    expect(ids).not.toContain("song-003");
    // song-009 energy=0.18 should appear
    expect(ids).toContain("song-009");
  });

  test("acoustic filter boosts high-acousticness songs", () => {
    const parsed = emptyParsed({
      filters: withFilters({
        audioFeatures: [{ key: "acousticness", label: "acoustic", min: 0.5 }],
      }),
    });
    const results = keywordSearch(testSongs, parsed);
    // song-009 acousticness=0.88 should score highest on this filter
    const song009 = results.find((r) => r.song.id === "song-009");
    expect(song009).toBeDefined();
  });

  test("audio feature match reason included in result", () => {
    const parsed = emptyParsed({
      filters: withFilters({
        audioFeatures: [{ key: "danceability", label: "danceable", min: 0.5 }],
      }),
    });
    const results = keywordSearch(testSongs, parsed);
    const danceResult = results.find((r) => r.song.id === "song-003");
    expect(danceResult).toBeDefined();
    if (danceResult) {
      expect(danceResult.matchReason).toContain("danceable");
    }
  });
});

// ---------------------------------------------------------------------------
// Scope weighting
// ---------------------------------------------------------------------------

describe("scope weighting", () => {
  test("lyrics scope applies higher lyrics weight", () => {
    // "feeling" appears in all lyrics; use scopeLyrics to verify weight is applied
    const parsedBase = emptyParsed({ terms: ["feeling"] });
    const parsedScoped = emptyParsed({ scopeLyrics: true, terms: ["feeling"] });

    const baseResults = keywordSearch(testSongs, parsedBase);
    const scopedResults = keywordSearch(testSongs, parsedScoped);

    // Both should return results; scoped scores should be higher for lyrics hits
    expect(baseResults.length).toBeGreaterThan(0);
    expect(scopedResults.length).toBeGreaterThan(0);

    // A song that has "feeling" in lyrics but not title should score more in scoped mode
    const songId = "song-002"; // "Midnight Rain" — "feeling" in lyrics, not title
    const baseEntry = baseResults.find((r) => r.song.id === songId);
    const scopedEntry = scopedResults.find((r) => r.song.id === songId);
    expect(baseEntry).toBeDefined();
    expect(scopedEntry).toBeDefined();
    if (baseEntry && scopedEntry) {
      expect(scopedEntry.score).toBeGreaterThan(baseEntry.score);
    }
  });

  test("lyrics scope excludes songs where term is not in lyrics", () => {
    // "city" appears in "City Lights" title and lyrics, but use a term that is ONLY in one place
    const parsed = emptyParsed({
      scopeLyrics: true,
      terms: ["midnight"],
    });
    const results = keywordSearch(testSongs, parsed);
    // "midnight" is only in the title of song-002, not lyrics — scope requires lyrics match
    const ids = results.map((r) => r.song.id);
    expect(ids).not.toContain("song-002");
  });

  test("artist scope excludes songs where term is not in artist name", () => {
    const parsed = emptyParsed({
      scopeArtist: true,
      terms: ["echo"],
    });
    const results = keywordSearch(testSongs, parsed);
    // Only "Blue Echo" (song-002) has "echo" in the artist name
    const ids = results.map((r) => r.song.id);
    expect(ids).toContain("song-002");
    // Others should be excluded
    for (const r of results) {
      expect(r.song.artist.toLowerCase()).toContain("echo");
    }
  });
});

// ---------------------------------------------------------------------------
// Empty queries
// ---------------------------------------------------------------------------

describe("empty queries", () => {
  test("empty query with no filters returns all songs (no scoring criteria)", () => {
    const parsed = emptyParsed();
    const results = keywordSearch(testSongs, parsed);
    // No hard filters and no scoring criteria — all songs pass through
    expect(results.length).toBe(testSongs.length);
  });

  test("empty terms with genre filter returns only genre-matching songs", () => {
    const parsed = emptyParsed({
      filters: withFilters({ genres: ["jazz"] }),
    });
    const results = keywordSearch(testSongs, parsed);
    const jazzSongs = testSongs.filter((s) => s.genre === "jazz");
    expect(results.length).toBe(jazzSongs.length);
  });

  test("no results when genre filter matches nothing", () => {
    const parsed = emptyParsed({
      filters: withFilters({ genres: ["reggae"] }),
    });
    const results = keywordSearch(testSongs, parsed);
    expect(results.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Sort order
// ---------------------------------------------------------------------------

describe("sort order", () => {
  test("results are sorted by score descending", () => {
    const parsed = emptyParsed({ terms: ["dream"] });
    const results = keywordSearch(testSongs, parsed);
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
    }
  });

  test("chart position tiebreaker: top-5 chart song ranks above lower-charted song with same base score", () => {
    // Use a term that matches both song-001 (chart #2) and song-008 (chart #5)
    // Both are rock songs by The Heartbreakers and both have "dream" in lyrics
    const parsed = emptyParsed({ terms: ["dream"] });
    const results = keywordSearch(testSongs, parsed);
    const idx001 = results.findIndex((r) => r.song.id === "song-001");
    const idx007 = results.findIndex((r) => r.song.id === "song-007");
    // song-007 is chart #12, so should rank below #2 when scores are otherwise equal
    if (idx001 >= 0 && idx007 >= 0) {
      expect(results[idx001].score).toBeGreaterThanOrEqual(
        results[idx007].score,
      );
    }
  });

  test("returns at most 30 results", () => {
    // Create a large song set by cloning our fixtures multiple times
    const manySongs: Song[] = [];
    for (let i = 0; i < 10; i++) {
      manySongs.push(
        ...testSongs.map((s) => ({ ...s, id: `${s.id}-clone-${i}` })),
      );
    }
    const parsed = emptyParsed({ terms: ["dream"] });
    const results = keywordSearch(manySongs, parsed);
    expect(results.length).toBeLessThanOrEqual(30);
  });
});

// ---------------------------------------------------------------------------
// Match reasons
// ---------------------------------------------------------------------------

describe("match reasons", () => {
  test("matchReason includes 'title matches' when term found in title", () => {
    const parsed = emptyParsed({ terms: ["midnight"] });
    const results = keywordSearch(testSongs, parsed);
    const song002 = results.find((r) => r.song.id === "song-002");
    expect(song002).toBeDefined();
    if (song002) {
      expect(song002.matchReason).toContain("title matches");
      expect(song002.matchReason).toContain("midnight");
    }
  });

  test("matchReason includes 'lyrics matches' when term found in lyrics", () => {
    const parsed = emptyParsed({ terms: ["heart"] });
    const results = keywordSearch(testSongs, parsed);
    // song-001 "Love Will Find a Way" has "heart" in lyrics but not in title
    const song001 = results.find((r) => r.song.id === "song-001");
    expect(song001).toBeDefined();
    if (song001) {
      expect(song001.matchReason).toContain("lyrics matches");
    }
  });

  test("matchReason includes 'artist' when artistHint filter matches", () => {
    const parsed = emptyParsed({
      filters: withFilters({ artistHint: ["ellie"] }),
    });
    const results = keywordSearch(testSongs, parsed);
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(r.song.artist.toLowerCase()).toContain("ellie");
      expect(r.matchReason).toContain("artist");
    }
  });

  test("matchReason includes 'genre' when genre filter is active", () => {
    const parsed = emptyParsed({
      filters: withFilters({ genres: ["rock"] }),
    });
    const results = keywordSearch(testSongs, parsed);
    for (const r of results) {
      expect(r.matchReason).toContain("genre");
    }
  });

  test("matchReason includes 'decade' when decade filter matches", () => {
    const parsed = emptyParsed({
      filters: withFilters({ decades: [1960] }),
    });
    const results = keywordSearch(testSongs, parsed);
    for (const r of results) {
      expect(r.matchReason).toContain("decade");
    }
  });

  test("matchReason includes 'chart' for top 10 chart songs", () => {
    const parsed = emptyParsed({ terms: ["dream"] });
    const results = keywordSearch(testSongs, parsed);
    const song001 = results.find((r) => r.song.id === "song-001");
    // song-001 chart #2 should mention chart in reason
    if (song001) {
      expect(song001.matchReason).toContain("chart");
    }
  });

  test("mode is always 'keyword'", () => {
    const parsed = emptyParsed({ terms: ["love"] });
    const results = keywordSearch(testSongs, parsed);
    for (const r of results) {
      expect(r.mode).toBe("keyword");
    }
  });
});
