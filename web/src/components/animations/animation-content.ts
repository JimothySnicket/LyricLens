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

  // Hybrid-specific
  filters?: { label: string; value: string }[];
  semanticRemainder?: string;
  filterCountBefore?: number;
  filterCountAfter?: number;

  // Hybrid limitation-specific
  ambiguousWord?: string;
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
      "Hybrid search gets the best of both \u2014 the regex parser pulls out structured filters like decade and genre, then vector search ranks what\u2019s left by meaning.",
    successQuery: "sad rock from the 80s",
    successTokens: ["80s", "rock"],
    filters: [
      { label: "decade", value: "1980s" },
      { label: "genre", value: "rock" },
    ],
    semanticRemainder: "sad",
    filterCountBefore: 2742,
    filterCountAfter: 186,
    successResults: [
      { title: "Every Breath You Take", artist: "The Police", year: 1983 },
      { title: "Total Eclipse of the Heart", artist: "Bonnie Tyler", year: 1983 },
    ],
    successCaption:
      "Filters narrowed the pool, meaning ranked what was left.",

    limitationQuery: "old songs about missing home",
    ambiguousWord: "old",
    limitationResults: [
      { title: "Take Me Home, Country Roads", artist: "John Denver", year: 1971 },
      { title: "Homeward Bound", artist: "Simon & Garfunkel", year: 1966 },
    ],
    limitationCaption:
      "The parser doesn\u2019t know what \u2018old\u2019 means \u2014 it\u2019s not in its vocabulary.",
  },

  natural: {
    id: "natural",
    num: "04",
    label: "Natural Language",
    desc: "LLM + vectors",
    cssVar: "--color-mode-natural",
    fallbackColor: "#2e7d32",

    explanation:
      "LLM-powered query understanding \u2014 coming soon.",
    successQuery: "",
    successResults: [],
    successCaption: "",
    limitationQuery: "",
    limitationResults: [],
    limitationCaption: "",
  },
};

export const ANIMATION_FPS = 30;
export const ANIMATION_DURATION_FRAMES = 1800; // 60s at 30fps — content finishes by frame 270, rest is hold

// Phase boundaries in frames
export const EXPLAIN_END = 90; // 0-3s: explanation appears
export const QUERY_SUCCESS_END = 210; // 3-7s: query enters + success results
export const LIMITATION_END = 270; // 7-9s: limitation example
// 9-10s: hold (270-300)
