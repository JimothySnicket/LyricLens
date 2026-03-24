import { readFileSync } from "fs";
import { resolve } from "path";
import type { Song } from "./types";

let songs: Song[] | null = null;

export function getSongs(): Song[] {
  if (!songs) {
    const dataPath = resolve(
      import.meta.dir,
      "../../../data/processed/merged_songs.json",
    );
    const raw = readFileSync(dataPath, "utf-8");
    const parsed = JSON.parse(raw);
    // Map snake_case JSON fields to camelCase Song interface
    songs = parsed.map((s: any) => ({
      id: s.id,
      title: s.title,
      artist: s.artist,
      year: s.year,
      decade: s.decade,
      genre: s.genre,
      chartPosition: s.chart_position ?? 0,
      topic: s.topic ?? "",
      lyrics: s.lyrics ?? "",
      valence: s.valence ?? 0,
      energy: s.energy ?? 0,
      danceability: s.danceability ?? 0,
      acousticness: s.acousticness ?? 0,
      scores: s.scores ?? {},
    }));
    console.log(`Loaded ${songs!.length} songs into memory`);
  }
  return songs!;
}
