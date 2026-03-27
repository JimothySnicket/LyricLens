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
    expect(result.filters.genres).toContain("hip-hop");
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
    expect(moodKeys).toContain("emotions.sadness");
    expect(moodKeys).toContain("emotions.joy");
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
    expect(result.searchPhrase).toBe("");
  });

  test("handles query with only stop words", () => {
    const result = parseQuery("songs with the");
    expect(result.terms).toEqual([]);
  });

  test("generates interpretations array", () => {
    const result = parseQuery("sad rock from the 80s");
    const types = result.interpretations.map(i => i.type);
    expect(types).toContain("mood");
    expect(types).toContain("genre");
    expect(types).toContain("decade");
  });

  // --- New tests for sequence-first model ---

  test("searchPhrase preserves raw query with stop words", () => {
    const result = parseQuery("dancing in the dark");
    expect(result.searchPhrase).toBe("dancing in the dark");
  });

  test("searchPhrase is lowercased and trimmed", () => {
    const result = parseQuery("  Rock Me Amadeus  ");
    expect(result.searchPhrase).toBe("rock me amadeus");
  });

  test("mood words stay in terms (not consumed)", () => {
    const result = parseQuery("sad love songs");
    expect(result.filters.moods.some(m => m.label === "sadness")).toBe(true);
    expect(result.terms).toContain("sad");
    expect(result.terms).toContain("love");
  });

  test("genre words stay in terms (not consumed)", () => {
    const result = parseQuery("rock love songs");
    expect(result.filters.genres).toContain("rock");
    expect(result.terms).toContain("rock");
    expect(result.terms).toContain("love");
  });
});
