import { describe, test, expect } from "bun:test";
import { embedQuery } from "../lib/embedder";

describe("embedder", () => {
  test("embedQuery returns 768-dim vector", async () => {
    const vec = await embedQuery("hello world");
    expect(vec.length).toBe(768);
    expect(typeof vec[0]).toBe("number");
  }, 30000); // 30s timeout for first model load
});
