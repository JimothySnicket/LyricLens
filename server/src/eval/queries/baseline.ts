export interface EvalQuery {
  query: string;
  category: string;
  /** Song IDs that count as correct results — populated after curation */
  expected: string[];
}

export const baselineQueries: EvalQuery[] = [
  // --- Specific title lookups ---
  { query: "songs with love in the title", category: "specific_lookup", expected: [] },
  { query: "songs with heart in the title", category: "specific_lookup", expected: [] },
  { query: "songs with moon in the title", category: "specific_lookup", expected: [] },
  { query: "songs with night in the title", category: "specific_lookup", expected: [] },
  // --- Artist lookups ---
  { query: "songs by Elvis Presley", category: "artist_lookup", expected: [] },
  { query: "songs by Michael Jackson", category: "artist_lookup", expected: [] },
  { query: "songs by ABBA", category: "artist_lookup", expected: [] },
  { query: "songs by Queen", category: "artist_lookup", expected: [] },
  { query: "songs by The Rolling Stones", category: "artist_lookup", expected: [] },
  // --- Conceptual / thematic ---
  { query: "songs about heartbreak", category: "conceptual", expected: [] },
  { query: "sad songs", category: "conceptual", expected: [] },
  { query: "songs about loneliness and missing someone", category: "conceptual", expected: [] },
  { query: "songs about freedom and rebellion", category: "conceptual", expected: [] },
  { query: "songs about faith and hope", category: "conceptual", expected: [] },
  { query: "songs about war and conflict", category: "conceptual", expected: [] },
  // --- Decade-specific ---
  { query: "rock from the 80s", category: "decade_specific", expected: [] },
  { query: "jazz from the 50s", category: "decade_specific", expected: [] },
  { query: "pop from the 90s", category: "decade_specific", expected: [] },
  { query: "rock from the 70s", category: "decade_specific", expected: [] },
  { query: "pop songs from the 60s", category: "decade_specific", expected: [] },
  { query: "music from the 2000s", category: "decade_specific", expected: [] },
  // --- Mood-based ---
  { query: "upbeat dance music", category: "mood_based", expected: [] },
  { query: "romantic songs", category: "mood_based", expected: [] },
  { query: "energetic rock songs", category: "mood_based", expected: [] },
  { query: "slow acoustic songs", category: "mood_based", expected: [] },
  // --- Atmosphere ---
  { query: "driving at night music", category: "atmosphere", expected: [] },
  { query: "summer party music", category: "atmosphere", expected: [] },
  // --- Genre-specific ---
  { query: "reggae songs", category: "genre_specific", expected: [] },
  { query: "blues songs", category: "genre_specific", expected: [] },
  // --- Mixed / compound ---
  { query: "romantic pop from the 90s", category: "mixed", expected: [] },
  { query: "sad rock songs", category: "mixed", expected: [] },
  { query: "upbeat pop from the 80s", category: "mixed", expected: [] },
];
