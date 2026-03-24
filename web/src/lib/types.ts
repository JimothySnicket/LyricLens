export type SearchMode = "keyword" | "semantic" | "hybrid";

export interface Song {
  id: string;
  title: string;
  artist: string;
  year: number;
  decade: number;
  genre: string;
  chartPosition: number;
  topic: string;
  lyrics: string;
  valence: number;
  energy: number;
  danceability: number;
  sadness: number;
  romantic: number;
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
  filters: {
    decades: number[];
    genres: string[];
    moods: string[];
    audioFeatures: string[];
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
    topic: string;
  }[];
}
