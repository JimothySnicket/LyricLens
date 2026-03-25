import type { Song, SearchMode, ParsedQuery } from "../lib/types";

export function payloadToSong(id: any, payload: any): Song {
  return {
    id: String(id),
    title: payload.title ?? "",
    artist: payload.artist ?? "",
    year: payload.year ?? 0,
    decade: payload.decade ?? 0,
    genre: payload.genre ?? "",
    chartPosition: payload.chart_position ?? 0,
    lyrics: payload.lyrics ?? "",
    album: payload.album ?? "",
    writers: payload.writers ?? "",
    emotions: payload.emotions ?? {},
  };
}

export function buildMatchReason(
  mode: SearchMode,
  parsed: ParsedQuery,
  score: number,
): string {
  const parts: string[] = [];
  if (parsed.filters.decades.length > 0) parts.push("decade: " + parsed.filters.decades.join(", "));
  if (parsed.filters.genres.length > 0) parts.push("genre: " + parsed.filters.genres.join(", "));
  if (parsed.filters.artistHint.length > 0) parts.push("artist: " + parsed.filters.artistHint.join(" "));
  if (mode === "semantic" || mode === "hybrid") {
    parts.push("similarity: " + score.toFixed(3));
  }
  return parts.join(" · ") || mode + " match";
}
