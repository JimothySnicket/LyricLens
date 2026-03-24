export type SearchMode = "keyword" | "semantic" | "hybrid";

// Topic score abbreviation legend (for display layer):
// sa=sadness, ro=romantic, vi=intensity, da=dating,
// ob=mature, fe=feelings, nt=night/time, wl=world/life,
// co=communication, mu=music
export const SCORE_LABELS: Record<string, string> = {
  sa: "Sadness",
  ro: "Romantic",
  vi: "Intensity",
  da: "Dating",
  ob: "Mature",
  fe: "Feelings",
  nt: "Night/Time",
  wl: "World/Life",
  co: "Communication",
  mu: "Music",
};

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
  acousticness: number;
  scores: Record<string, number>;
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
    topic: string;
  }[];
}
