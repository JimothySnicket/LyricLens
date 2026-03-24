import { describe, test, expect } from "bun:test";
import { parseQuery } from "../lib/query-parser";

describe("parseQuery", () => {
  test("extracts decade from 'from the 80s'", () => {
    const result = parseQuery("love songs from the 80s");
    expect(result.filters.decades).toContain(1980);
  });

  test("extracts decade from 'in the 1960s'", () => {
    const result = parseQuery("songs in the 1960s");
    expect(result.filters.decades).toContain(1960);
  });

  test("extracts artist from 'by Michael Jackson'", () => {
    const result = parseQuery("songs by Michael Jackson");
    expect(result.filters.artistHint).toEqual(["michael", "jackson"]);
    expect(result.scopeArtist).toBe(true);
  });

  test("extracts genre", () => {
    const result = parseQuery("sad rock songs");
    expect(result.filters.genres).toContain("rock");
  });

  test("handles genre aliases", () => {
    const result = parseQuery("hip hop songs");
    expect(result.filters.genres).toContain("pop");
  });

  test("detects title scope", () => {
    const result = parseQuery("baby in the title");
    expect(result.scopeTitle).toBe(true);
    expect(result.terms).toContain("baby");
  });

  test("detects lyrics scope from 'in the lyrics'", () => {
    const result = parseQuery("rain in the lyrics");
    expect(result.scopeLyrics).toBe(true);
  });

  test("detects lyrics scope from 'about'", () => {
    const result = parseQuery("songs about heartbreak");
    expect(result.scopeLyrics).toBe(true);
  });

  test("extracts mood hints", () => {
    const result = parseQuery("sad romantic songs");
    const moodKeys = result.filters.moods.map(m => m.key);
    expect(moodKeys).toContain("sa");
    expect(moodKeys).toContain("ro");
  });

  test("extracts audio features", () => {
    const result = parseQuery("upbeat danceable songs");
    const audioKeys = result.filters.audioFeatures.map(a => a.key);
    expect(audioKeys).toContain("valence");
    expect(audioKeys).toContain("danceability");
  });

  test("produces semantic text", () => {
    const result = parseQuery("songs about loneliness and rain from the 80s");
    expect(result.semanticText).toContain("loneliness");
    expect(result.semanticText).toContain("rain");
    expect(result.filters.decades).toContain(1980);
  });

  test("handles empty query", () => {
    const result = parseQuery("");
    expect(result.terms).toEqual([]);
    expect(result.semanticText).toBe("");
  });

  test("handles query with only stop words", () => {
    const result = parseQuery("songs with the");
    expect(result.terms).toEqual([]);
  });

  test("multi-word audio features", () => {
    const result = parseQuery("high energy songs");
    const audioKeys = result.filters.audioFeatures.map(a => a.key);
    expect(audioKeys).toContain("energy");
  });

  test("generates interpretations array", () => {
    const result = parseQuery("sad rock from the 80s");
    const types = result.interpretations.map(i => i.type);
    expect(types).toContain("mood");
    expect(types).toContain("genre");
    expect(types).toContain("decade");
  });
});
