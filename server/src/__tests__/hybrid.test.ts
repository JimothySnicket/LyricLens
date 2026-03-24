import { describe, test, expect } from "bun:test";
import { hybridSearch } from "../search/hybrid";
import { parseQuery } from "../lib/query-parser";

describe("hybridSearch", () => {
  test("applies decade filter before vector search", async () => {
    const parsed = parseQuery("love songs from the 80s");
    const { results, totalFiltered } = await hybridSearch(parsed);
    expect(results.length).toBeGreaterThan(0);
    // All results should be from the 1980s
    for (const r of results) {
      expect(r.song.decade).toBe(1980);
    }
    // Filtered count should be less than total
    expect(totalFiltered).toBeLessThan(819);
  }, 30000);

  test("applies genre filter", async () => {
    const parsed = parseQuery("rock songs about driving");
    const { results } = await hybridSearch(parsed);
    for (const r of results) {
      expect(r.song.genre).toBe("rock");
    }
  }, 30000);

  test("returns totalFiltered count", async () => {
    const parsed = parseQuery("happy songs from the 60s");
    const { totalFiltered } = await hybridSearch(parsed);
    expect(totalFiltered).toBeGreaterThan(0);
    expect(totalFiltered).toBeLessThan(819);
  }, 30000);
});
