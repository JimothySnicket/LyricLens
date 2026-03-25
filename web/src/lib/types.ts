export type SearchMode = "keyword" | "semantic" | "hybrid";

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
  semanticText: string;
  terms: string[];
  interpretations: { type: string; label: string }[];
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
    decade: number;
    cluster: number;
  }[];
}
