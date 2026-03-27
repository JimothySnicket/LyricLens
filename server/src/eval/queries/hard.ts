import type { EvalQuery } from "./baseline";

export const hardQueries: EvalQuery[] = [
  { query: "songs you'd hear at a dive bar at 2am", category: "vibes", expected: [] },
  { query: "something my grandma would dance to", category: "vibes", expected: [] },
  { query: "driving down the highway with the windows down", category: "vibes", expected: [] },
  { query: "the kind of song that plays when the villain walks in", category: "vibes", expected: [] },
  { query: "breakup songs that don't make you cry, they make you angry", category: "vibes", expected: [] },
  { query: "a song to slow dance to at a wedding", category: "vibes", expected: [] },
  { query: "music for staring out a rainy window", category: "vibes", expected: [] },
  { query: "songs that sound like summer in the 90s", category: "vibes", expected: [] },
  { query: "what would play in a montage of someone getting their life together", category: "vibes", expected: [] },
  { query: "songs that feel like 3am alone in a city", category: "vibes", expected: [] },
];
