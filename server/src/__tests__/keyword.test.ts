import { describe, test, expect } from "bun:test";
import { keywordSearch } from "../search/keyword";
import type { Song, ParsedQuery } from "../lib/types";

const makeSong = (overrides: Partial<Song>): Song => ({
  id: "0",
  title: "",
  artist: "Unknown",
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

const makeParsed = (overrides: Partial<ParsedQuery>): ParsedQuery => ({
  scopeTitle: false,
  scopeLyrics: false,
  scopeArtist: false,
  filters: { decades: [], genres: [], moods: [], audioFeatures: [], artistHint: [] },
  searchPhrase: "",
  semanticText: "",
  terms: [],
  interpretations: [],
  ...overrides,
});

describe("keywordSearch — sequence scoring", () => {
  test("4-word title phrase scores n²×2 = 32", () => {
    const songs = [
      makeSong({ id: "1", title: "Dancing in the Dark" }),
    ];
    const parsed = makeParsed({ searchPhrase: "dancing in the dark" });
    const results = keywordSearch(songs, parsed);
    expect(results.length).toBe(1);
    expect(results[0].score).toBe(32);
  });

  test("exact title phrase beats scattered single-word matches", () => {
    const songs = [
      makeSong({ id: "exact", title: "Dancing in the Dark", lyrics: "verse one" }),
      makeSong({ id: "scatter", title: "Dark Night", lyrics: "she was dancing alone" }),
    ];
    const parsed = makeParsed({ searchPhrase: "dancing in the dark" });
    const results = keywordSearch(songs, parsed);
    expect(results[0].song.id).toBe("exact");
    expect(results[0].score).toBeGreaterThan(results[1].score * 3);
  });

  test("longer lyrics sequence beats shorter title sequence", () => {
    const songs = [
      makeSong({
        id: "long-lyrics",
        title: "Untitled",
        lyrics: "we played sad rock love songs by the fire all night",
      }),
      makeSong({
        id: "short-title",
        title: "Sad Rock",
        lyrics: "no matching words here",
      }),
    ];
    const parsed = makeParsed({ searchPhrase: "sad rock love songs" });
    const results = keywordSearch(songs, parsed);
    expect(results[0].song.id).toBe("long-lyrics");
  });

  test("genre is a soft boost, not a hard filter", () => {
    const songs = [
      makeSong({ id: "synth", title: "Rock Me Amadeus", genre: "Synth-Pop" }),
      makeSong({ id: "rock", title: "Rock Anthem", genre: "Rock" }),
    ];
    const parsed = makeParsed({
      searchPhrase: "rock me amadeus",
      filters: { decades: [], genres: ["rock"], moods: [], audioFeatures: [], artistHint: [] },
    });
    const results = keywordSearch(songs, parsed);
    expect(results[0].song.id).toBe("synth");
  });

  test("chart position has no effect on score", () => {
    const songs = [
      makeSong({ id: "chart1", title: "Love", chartPosition: 1 }),
      makeSong({ id: "chart99", title: "Love", chartPosition: 99 }),
    ];
    const parsed = makeParsed({ searchPhrase: "love" });
    const results = keywordSearch(songs, parsed);
    expect(results[0].score).toBe(results[1].score);
  });

  test("decade hard filter still excludes non-matching decades", () => {
    const songs = [
      makeSong({ id: "80s", title: "Love Song", decade: 1980 }),
      makeSong({ id: "90s", title: "Love Song", decade: 1990 }),
    ];
    const parsed = makeParsed({
      searchPhrase: "love song",
      filters: { decades: [1980], genres: [], moods: [], audioFeatures: [], artistHint: [] },
    });
    const results = keywordSearch(songs, parsed);
    expect(results.length).toBe(1);
    expect(results[0].song.id).toBe("80s");
  });

  test("artist hard filter still excludes non-matching artists", () => {
    const songs = [
      makeSong({ id: "ej", title: "Sad Songs", artist: "Elton John" }),
      makeSong({ id: "other", title: "Sad Songs", artist: "Someone Else" }),
    ];
    const parsed = makeParsed({
      searchPhrase: "sad songs by elton john",
      scopeArtist: true,
      filters: { decades: [], genres: [], moods: [], audioFeatures: [], artistHint: ["elton", "john"] },
    });
    const results = keywordSearch(songs, parsed);
    expect(results.length).toBe(1);
    expect(results[0].song.id).toBe("ej");
  });

  test("decade match adds +2 bonus", () => {
    const songs = [
      makeSong({ id: "1", title: "Love", decade: 1980 }),
    ];
    const parsed = makeParsed({
      searchPhrase: "love",
      filters: { decades: [1980], genres: [], moods: [], audioFeatures: [], artistHint: [] },
    });
    const results = keywordSearch(songs, parsed);
    expect(results[0].score).toBe(4);
  });

  test("genre match adds +2 bonus", () => {
    const songs = [
      makeSong({ id: "1", title: "Love", genre: "Rock" }),
    ];
    const parsed = makeParsed({
      searchPhrase: "love",
      filters: { decades: [], genres: ["rock"], moods: [], audioFeatures: [], artistHint: [] },
    });
    const results = keywordSearch(songs, parsed);
    expect(results[0].score).toBe(4);
  });

  test("songs with score 0 are excluded from results", () => {
    const songs = [
      makeSong({ id: "1", title: "Completely Unrelated", lyrics: "nothing here" }),
    ];
    const parsed = makeParsed({ searchPhrase: "dancing in the dark" });
    const results = keywordSearch(songs, parsed);
    expect(results.length).toBe(0);
  });

  test("match reason includes sequence info", () => {
    const songs = [
      makeSong({ id: "1", title: "Love Song", lyrics: "love is all around" }),
    ];
    const parsed = makeParsed({ searchPhrase: "love song" });
    const results = keywordSearch(songs, parsed);
    expect(results[0].matchReason).toContain("title");
    expect(results[0].matchReason).toContain("love song");
  });

  test("scope enforcement still works — scopeTitle excludes lyrics-only matches", () => {
    const songs = [
      makeSong({ id: "title-hit", title: "Rain Song", lyrics: "sunny day" }),
      makeSong({ id: "lyrics-only", title: "Sunny Day", lyrics: "walking in the rain" }),
    ];
    const parsed = makeParsed({
      searchPhrase: "rain",
      scopeTitle: true,
    });
    const results = keywordSearch(songs, parsed);
    expect(results.length).toBe(1);
    expect(results[0].song.id).toBe("title-hit");
  });
});
