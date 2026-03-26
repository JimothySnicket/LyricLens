// web/src/components/animations/animation-content.ts

export interface AnimationResult {
  title: string;
  artist: string;
  year: number;
}

export interface ModeAnimationContent {
  id: string;
  num: string;
  label: string;
  desc: string;
  cssVar: string;
  fallbackColor: string;
  query: string;
  heroQuery: string;
  pipelineSteps: string[];
  results: AnimationResult[];
  verdict: string;
}

export const animationContent: Record<string, ModeAnimationContent> = {
  keyword: {
    id: "keyword",
    num: "01",
    label: "Keyword Search",
    desc: "Regex + exact matching",
    cssVar: "--color-mode-keyword",
    fallbackColor: "#e65100",
    query: "baby in the title from the 60s",
    heroQuery: "baby in the title from the 60s",
    pipelineSteps: [
      "Parse query into tokens",
      "Remove stop words",
      "Match against title, lyrics, artist",
      "Score by match weight",
    ],
    results: [
      { title: "Baby Love", artist: "The Supremes", year: 1964 },
      { title: "Be My Baby", artist: "The Ronettes", year: 1963 },
      { title: "Baby It's You", artist: "The Shirelles", year: 1962 },
    ],
    verdict: "Fast and literal — if the words are there, it finds them.",
  },
  semantic: {
    id: "semantic",
    num: "02",
    label: "Semantic Search",
    desc: "Vector similarity",
    cssVar: "--color-mode-semantic",
    fallbackColor: "#1565c0",
    query: "baby in the title from the 60s",
    heroQuery: "songs that feel like driving at night",
    pipelineSteps: [
      "Embed query with MiniLM",
      "Search summary vectors in Qdrant",
      "Rank by cosine similarity",
      "Return nearest neighbors",
    ],
    results: [
      { title: "You've Lost That Lovin' Feeling", artist: "The Righteous Brothers", year: 1965 },
      { title: "My Girl", artist: "The Temptations", year: 1965 },
      { title: "Stand By Me", artist: "Ben E. King", year: 1961 },
    ],
    verdict: "Finds the feeling — but can't filter by facts.",
  },
  hybrid: {
    id: "hybrid",
    num: "03",
    label: "Hybrid Search",
    desc: "Filters + vectors",
    cssVar: "--color-mode-hybrid",
    fallbackColor: "#6a1b9a",
    query: "baby in the title from the 60s",
    heroQuery: "sad rock from the 80s",
    pipelineSteps: [
      "Parse → extract filters",
      "Apply as Qdrant constraints",
      "Embed remaining text",
      "Vector search within filtered set",
    ],
    results: [
      { title: "Baby Love", artist: "The Supremes", year: 1964 },
      { title: "Be My Baby", artist: "The Ronettes", year: 1963 },
      { title: "Maybe Baby", artist: "Buddy Holly", year: 1958 },
    ],
    verdict: "Best of both — limited by what the parser understands.",
  },
  natural: {
    id: "natural",
    num: "04",
    label: "Natural Language",
    desc: "LLM + vectors",
    cssVar: "--color-mode-natural",
    fallbackColor: "#2e7d32",
    query: "baby in the title from the 60s",
    heroQuery: "old songs about missing home",
    pipelineSteps: [
      "Send query to DeepSeek",
      "LLM returns structured JSON",
      "Validate + fallback to regex",
      "Vector search with LLM filters",
    ],
    results: [
      { title: "Baby Love", artist: "The Supremes", year: 1964 },
      { title: "Be My Baby", artist: "The Ronettes", year: 1963 },
      { title: "Baby It's You", artist: "The Shirelles", year: 1962 },
    ],
    verdict: "Understands anything — at the cost of latency.",
  },
};

export const ANIMATION_FPS = 30;
export const ANIMATION_DURATION_FRAMES = 300; // 10s at 30fps

// Act boundaries in frames
export const ACT_1_END = 60;   // 0–2s: query enters
export const ACT_2_END = 180;  // 2–6s: pipeline processes
export const ACT_3_END = 270;  // 6–9s: results + verdict
// 9–10s: hold / outro
