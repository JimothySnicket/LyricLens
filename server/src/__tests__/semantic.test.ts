import { describe, test, expect } from "bun:test";
import { semanticSearch } from "../search/semantic";
import { parseQuery } from "../lib/query-parser";

describe("semanticSearch", () => {
  test("returns results for a conceptual query", async () => {
    const parsed = parseQuery("songs about heartbreak and loneliness");
    const results = await semanticSearch(parsed);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].score).toBeGreaterThan(0);
    expect(results[0].song.title).toBeTruthy();
    expect(results[0].mode).toBe("semantic");
  }, 30000);

  test("returns empty for empty query", async () => {
    const parsed = parseQuery("");
    const results = await semanticSearch(parsed);
    expect(results).toEqual([]);
  }, 30000);
});
