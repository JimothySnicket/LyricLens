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
    songs = parsed.map((s: any) => ({
      id: s.id,
      title: s.title,
      artist: s.artist,
      year: s.year,
      decade: s.decade,
      genre: s.genre,
      chartPosition: s.chart_position ?? 0,
      lyrics: s.lyrics ?? "",
      album: s.album ?? "",
      writers: s.writers ?? "",
    }));
    console.log(`Loaded ${songs!.length} songs into memory`);
  }
  return songs!;
}
