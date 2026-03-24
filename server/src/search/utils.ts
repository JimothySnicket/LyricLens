import type { Song, SearchMode, ParsedQuery } from "../lib/types";

export function payloadToSong(id: any, payload: any): Song {
  return {
    id: String(id),
    title: payload.title ?? "",
    artist: payload.artist ?? "",
    year: payload.year ?? 0,
    decade: payload.decade ?? 0,
    genre: payload.genre ?? "unknown",
    chartPosition: payload.chart_position ?? 0,
    topic: payload.topic ?? "",
    lyrics: payload.lyrics ?? "",
    valence: payload.valence ?? 0,
    energy: payload.energy ?? 0,
    danceability: payload.danceability ?? 0,
    acousticness: payload.acousticness ?? 0,
    scores: {
      sa: payload.sa ?? 0,
      ro: payload.ro ?? 0,
      vi: payload.vi ?? 0,
      da: payload.da ?? 0,
      ob: payload.ob ?? 0,
      fe: payload.fe ?? 0,
      nt: payload.nt ?? 0,
      wl: payload.wl ?? 0,
      co: payload.co ?? 0,
      mu: payload.mu ?? 0,
    },
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
  if (mode === "semantic" || mode === "hybrid") {
    parts.push("similarity: " + score.toFixed(3));
  }
  return parts.join(" · ") || mode + " match";
}
