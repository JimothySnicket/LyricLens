export type SearchMode = "keyword" | "semantic" | "hybrid" | "natural" | "deep";

export interface Song {
  id: string;
  title: string;
  artist: string;
  year: number;
  decade: number;
  genre: string;
  chartPosition: number;
  lyrics: string;
  album: string;
  writers: string;
  emotions: Record<string, number>;
}

export interface SearchResult {
  song: Song;
  score: number;
  matchReason: string;
  mode: SearchMode;
}

export interface SearchResponse {
  results: SearchResult[];
  mode: SearchMode;
  query: string;
  parsedQuery: ParsedQuery;
  totalFiltered: number;
  searchTimeMs: number;
}

export interface ParsedQuery {
  scopeTitle: boolean;
  scopeLyrics: boolean;
  scopeArtist: boolean;
  filters: {
    decades: number[];
    genres: string[];
    moods: { key: string; label: string; min?: number; max?: number }[];
    audioFeatures: { key: string; label: string; min?: number; max?: number }[];
    artistHint: string[];
  };
  searchPhrase: string;
  semanticText: string;
  terms: string[];
  termsUnfiltered: string[];
  interpretations: { type: string; label: string }[];
}

export interface VizNeighbor {
  id: string;
  title: string;
  artist: string;
  sim: number;
}

export interface VizData {
  points: {
    id: string;
    x: number;
    y: number;
    z: number;
    title: string;
    artist: string;
    genre: string;
    metaGenre: string;
    year: number;
    decade: number;
    chartPosition: number;
    cluster: number;
    dominantEmotion: string;
    emotions: Record<string, number>;
    summary: string;
    neighbors: VizNeighbor[];
  }[];
}
