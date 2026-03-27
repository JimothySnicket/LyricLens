// web/src/components/animations/animation-content.ts

export interface SuccessResult {
  title: string;
  artist: string;
  year: number;
  highlight?: string; // word to highlight in title (keyword mode)
}

export interface LimitationResult {
  title: string;
  artist: string;
  year?: number;
}

export interface ModeAnimationContent {
  id: string;
  num: string;
  label: string;
  desc: string;
  cssVar: string;
  fallbackColor: string;

  explanation: string;
  successQuery: string;
  successTokens?: string[]; // highlighted tokens after parsing (keyword/hybrid)
  stopWords?: string[]; // words that grey out (keyword)
  successResults: SuccessResult[];
  successCaption: string;
  limitationQuery: string;
  limitationTokens?: string[]; // highlighted tokens after parsing (keyword limitation)
  limitationStopWords?: string[]; // words that grey out (keyword limitation)
  limitationResults: LimitationResult[];
  limitationCaption: string;

  // Hybrid-specific — three-way comparison (same query, different modes)
  filters?: { label: string; value: string }[];
  semanticRemainder?: string;
  filterCountBefore?: number;
  filterCountAfter?: number;
  keywordOnlyResults?: LimitationResult[]; // keyword results for same query
  semanticOnlyResults?: LimitationResult[]; // semantic results for same query
  keywordCaption?: string;
  semanticCaption?: string;

  // Hybrid limitation-specific (legacy)
  ambiguousWord?: string;

  // NL-specific
  llmExpansion?: string[]; // semantic terms the LLM generates
  llmChosenMode?: string; // mode the LLM picked for success
  limitationLlmChosenMode?: string; // mode the LLM picked for limitation
  llmTimingMs?: number; // how long the LLM took (limitation)
  keywordTimingMs?: number; // how fast keyword was (limitation)
}

export const animationContent: Record<string, ModeAnimationContent> = {
  keyword: {
    id: "keyword",
    num: "01",
    label: "Keyword Search",
    desc: "Regex + exact matching",
    cssVar: "--color-mode-keyword",
    fallbackColor: "#e65100",

    explanation:
      "Traditional keyword search \u2014 a regex parser breaks your query into individual words and scans every song title, lyric, and artist name for exact matches.",
    successQuery: "baby in the title from the 60s",
    stopWords: ["in", "the", "from", "the"],
    successTokens: ["baby", "title", "60s"],
    successResults: [
      { title: "Baby Love", artist: "The Supremes", year: 1964, highlight: "Baby" },
      { title: "Be My Baby", artist: "The Ronettes", year: 1963, highlight: "Baby" },
      { title: "Baby It's You", artist: "The Shirelles", year: 1962, highlight: "Baby" },
    ],
    successCaption: "When you know exactly what you\u2019re looking for \u2014 instant match.",

    limitationQuery: "songs about heartbreak",
    limitationStopWords: ["songs", "about"],
    limitationTokens: ["heartbreak"],
    limitationResults: [
      { title: "I Will Always Love You", artist: "Dolly Parton", year: 1974 },
      { title: "Nothing Compares 2 U", artist: "Sinead O'Connor", year: 1990 },
      { title: "Tears in Heaven", artist: "Eric Clapton", year: 1992 },
    ],
    limitationCaption:
      "The song is about heartbreak, but the word isn\u2019t there.",
  },

  semantic: {
    id: "semantic",
    num: "02",
    label: "Semantic Search",
    desc: "Vector similarity",
    cssVar: "--color-mode-semantic",
    fallbackColor: "#1565c0",

    explanation:
      "Semantic search converts your query into a vector \u2014 a point in meaning-space \u2014 and finds songs whose summaries land nearby, regardless of the exact words used.",
    successQuery: "songs about heartbreak",
    successResults: [
      { title: "I Will Always Love You", artist: "Dolly Parton", year: 1974 },
      { title: "Un-Break My Heart", artist: "Toni Braxton", year: 1996 },
      { title: "Nothing Compares 2 U", artist: "Sinead O'Connor", year: 1990 },
    ],
    successCaption:
      "None contain the word \u2018heartbreak\u2019 \u2014 but they\u2019re all about it.",

    limitationQuery: "baby in the title from the 60s",
    limitationResults: [
      { title: "My Girl", artist: "The Temptations", year: 1964 },
      { title: "Stand By Me", artist: "Ben E. King", year: 1961 },
      { title: "Be My Baby", artist: "The Ronettes", year: 1963 },
    ],
    limitationCaption:
      "\u2018In the title\u2019 and \u2018from the 60s\u2019 are facts, not feelings \u2014 vectors can\u2019t filter on them.",
  },

  hybrid: {
    id: "hybrid",
    num: "03",
    label: "Hybrid Search",
    desc: "Filters + vectors",
    cssVar: "--color-mode-hybrid",
    fallbackColor: "#6a1b9a",

    explanation:
      "Keyword finds the words. Semantic finds the feeling. Hybrid runs both and merges the results \u2014 so you get precision and understanding in one search.",
    successQuery: "heartbreak 90s r&b",
    successResults: [
      { title: "Heartbreak Hotel", artist: "Whitney Houston", year: 1999 },
      { title: "On Bended Knee", artist: "Boyz II Men", year: 1995 },
      { title: "Another Sad Love Song", artist: "Toni Braxton", year: 1993 },
    ],
    successCaption:
      "Title matches from keyword, emotional matches from semantic \u2014 merged.",

    keywordOnlyResults: [
      { title: "Heartbreak Hotel", artist: "Whitney Houston", year: 1999 },
      { title: "Jump", artist: "Kris Kross", year: 1992 },
      { title: "Dazzey Duks", artist: "Duice", year: 1993 },
    ],
    keywordCaption: "Found \u2018heartbreak\u2019 in titles, but Kris Kross and Duice aren\u2019t heartbreak songs.",
    semanticOnlyResults: [
      { title: "On Bended Knee", artist: "Boyz II Men", year: 1995 },
      { title: "Another Sad Love Song", artist: "Toni Braxton", year: 1993 },
      { title: "I Get Lonely", artist: "Janet", year: 1998 },
    ],
    semanticCaption: "Right feeling, but no title match \u2014 misses the obvious Heartbreak Hotel.",

    limitationQuery: "",
    limitationResults: [],
    limitationCaption: "",
  },

  natural: {
    id: "natural",
    num: "04",
    label: "Natural Language",
    desc: "LLM + vectors",
    cssVar: "--color-mode-natural",
    fallbackColor: "#2e7d32",

    explanation:
      "Sometimes a query isn\u2019t keywords or filters \u2014 it\u2019s a scene. An LLM interprets scenarios that no parser or embedding can handle alone.",
    successQuery: "dive bar at 2am",
    llmExpansion: ["drinking alone", "heartbreak", "regret", "loneliness", "whiskey", "neon lights", "last call"],
    successResults: [
      { title: "So Sick", artist: "Ne-Yo", year: 2006 },
      { title: "Queen Of Hearts", artist: "Juice Newton", year: 1981 },
      { title: "You Are Not Alone", artist: "Michael Jackson", year: 1995 },
    ],
    successCaption:
      "The LLM understood the scene \u2014 no other mode could.",

    limitationQuery: "dive bar at 2am",
    limitationResults: [
      { title: "West End Girls", artist: "Pet Shop Boys", year: 1986 },
      { title: "Got Money", artist: "Lil Wayne feat. T-Pain", year: 2008 },
      { title: "Fiesta", artist: "R. Kelly feat. Jay-Z", year: 2001 },
    ],
    limitationCaption:
      "Keyword matched random words. Semantic found party songs. Neither understood the scene.",
  },
};

export const ANIMATION_FPS = 30;
export const ANIMATION_DURATION_FRAMES = 1800; // 60s at 30fps — content finishes by frame 270, rest is hold

// Phase boundaries in frames
export const EXPLAIN_END = 22; // 0-0.75s: explanation appears
export const QUERY_SUCCESS_END = 142; // 0.75-4.75s: query enters + success results
export const LIMITATION_END = 202; // 4.75-6.75s: limitation example
// 6.75-7.5s: hold
