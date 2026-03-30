import { describe, test, expect } from "bun:test";
import { mergeHybridResults } from "../search/hybrid";
import type { Song, SearchResult } from "../lib/types";

const makeSong = (title: string, artist: string, overrides?: Partial<Song>): Song => ({
  id: `${artist.toLowerCase().replace(/\s+/g, "-")}-${title.toLowerCase().replace(/\s+/g, "-")}`,
  title,
  artist,
  year: 2000,
  decade: 2000,
  genre: "Pop",
  chartPosition: 0,
  lyrics: "",
  album: "",
  writers: "",
  emotions: {},
  ...overrides,
});

const makeResult = (song: Song, score: number, mode: "keyword" | "semantic", reason: string): SearchResult => ({
  song,
  score,
  matchReason: reason,
  scoreBreakdown: [],
  mode,
});

describe("hybrid dedup", () => {
  test("same song from both legs should appear once, not twice", () => {
    // Songs with different IDs but same title+artist (the real bug)
    const kwSong = makeSong("Hey! Baby", "Bruce Channel");
    kwSong.id = "bruce-channel-hey-baby"; // slug ID from JSON

    const semSong = makeSong("Hey! Baby", "Bruce Channel");
    semSong.id = "60"; // Qdrant integer ID

    const keywordResults = [makeResult(kwSong, 5.5, "keyword", 'title: "baby" (1w)')];
    const vectorResults = [makeResult(semSong, 0.55, "semantic", "lyrics: 0.55")];

    const results = mergeHybridResults(keywordResults, vectorResults);

    // Should be 1 result, not 2
    const heyBabyResults = results.filter(r => r.song.title === "Hey! Baby");
    expect(heyBabyResults.length).toBe(1);
    // Should have a blended score > 0
    expect(heyBabyResults[0].score).toBeGreaterThan(0);
  });

  test("songs only in keyword leg appear in output", () => {
    const song = makeSong("Blue Suede Shoes", "Elvis Presley");
    const results = mergeHybridResults(
      [makeResult(song, 8, "keyword", 'title: "blue suede shoes" (3w)')],
      [],
    );
    expect(results.length).toBe(1);
    expect(results[0].song.title).toBe("Blue Suede Shoes");
  });

  test("songs only in semantic leg appear in output", () => {
    const song = makeSong("Great Balls of Fire", "Jerry Lee Lewis");
    const results = mergeHybridResults(
      [],
      [makeResult(song, 0.8, "semantic", "similarity: 0.800")],
    );
    expect(results.length).toBe(1);
    expect(results[0].song.title).toBe("Great Balls of Fire");
  });

  test("results are ranked by blended score descending", () => {
    const strongKw = makeSong("Strong Keyword Song", "Artist A");
    const weakSem = makeSong("Weak Semantic Song", "Artist B");

    // Strong keyword match (high confidence)
    const kwResults = [makeResult(strongKw, 20, "keyword", 'title: "strong keyword song" (3w)')];
    // Weak semantic match
    const semResults = [makeResult(weakSem, 0.3, "semantic", "similarity: 0.300")];

    const results = mergeHybridResults(kwResults, semResults);
    expect(results.length).toBe(2);
    expect(results[0].song.title).toBe("Strong Keyword Song");
  });

  test("merged result combines both reasons in matchReason", () => {
    const kwSong = makeSong("Love Me Tender", "Elvis Presley", { id: "slug-id" });
    const semSong = makeSong("Love Me Tender", "Elvis Presley", { id: "qdrant-42" });

    const results = mergeHybridResults(
      [makeResult(kwSong, 8, "keyword", 'title: "love me tender" (3w)')],
      [makeResult(semSong, 0.75, "semantic", "similarity: 0.750")],
    );

    expect(results.length).toBe(1);
    expect(results[0].matchReason).toContain("title");
    expect(results[0].matchReason).toContain("similarity");
  });
});
