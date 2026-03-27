import type { SearchResult, Song } from "../../lib/types";
import type { LLMClient } from "../llm/types";

export interface Strategy {
  name: string;
  run(query: string, songs: Song[], llm: LLMClient): Promise<SearchResult[]>;
}

export interface DecomposedQuery {
  decades: number[];
  genres: string[];
  mood: string | null;
  artist: string | null;
  semantic: string;
}
