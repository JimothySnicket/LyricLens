import { describe, test, expect } from "bun:test";
import { longestSequence } from "../search/utils";

describe("longestSequence", () => {
  test("finds exact full phrase match", () => {
    const result = longestSequence(
      ["dancing", "in", "the", "dark"],
      "I was dancing in the dark all night",
    );
    expect(result.length).toBe(4);
    expect(result.phrase).toBe("dancing in the dark");
  });

  test("finds longest sub-phrase when full doesn't match", () => {
    const result = longestSequence(
      ["sad", "rock", "love", "songs"],
      "These are love songs for everyone",
    );
    expect(result.length).toBe(2);
    expect(result.phrase).toBe("love songs");
  });

  test("returns single word match when no multi-word sequence found", () => {
    const result = longestSequence(
      ["dancing", "summer"],
      "The summer breeze was warm",
    );
    expect(result.length).toBe(1);
    expect(result.phrase).toBe("summer");
  });

  test("returns length 0 when nothing matches", () => {
    const result = longestSequence(
      ["xyz", "abc"],
      "nothing matches here",
    );
    expect(result.length).toBe(0);
    expect(result.phrase).toBe("");
  });

  test("is case insensitive against the text", () => {
    const result = longestSequence(
      ["rock", "me", "amadeus"],
      "Rock Me Amadeus was a hit",
    );
    expect(result.length).toBe(3);
    expect(result.phrase).toBe("rock me amadeus");
  });

  test("handles empty query words", () => {
    const result = longestSequence([], "any text here");
    expect(result.length).toBe(0);
    expect(result.phrase).toBe("");
  });

  test("handles empty text", () => {
    const result = longestSequence(["hello"], "");
    expect(result.length).toBe(0);
    expect(result.phrase).toBe("");
  });

  test("stops at first longest match found", () => {
    const result = longestSequence(
      ["love", "me", "tender"],
      "Love me tender, love me sweet",
    );
    expect(result.length).toBe(3);
    expect(result.phrase).toBe("love me tender");
  });
});
