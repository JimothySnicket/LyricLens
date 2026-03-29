import type { ParsedQuery } from "../../lib/types";
import type { DecomposedQuery } from "./types";

const MOOD_TO_FILTER: Record<string, string> = {
  sadness: "emotions.sadness",
  joy: "emotions.joy",
  anger: "emotions.anger",
  fear: "emotions.fear",
  surprise: "emotions.surprise",
};

export function buildParsedQuery(raw: string, decomposed: DecomposedQuery): ParsedQuery {
  const moods: ParsedQuery["filters"]["moods"] = [];
  if (decomposed.mood && MOOD_TO_FILTER[decomposed.mood]) {
    moods.push({
      key: MOOD_TO_FILTER[decomposed.mood],
      label: decomposed.mood,
      min: 0.2,
    });
  }

  return {
    scopeTitle: false,
    scopeLyrics: false,
    scopeArtist: !!decomposed.artist,
    filters: {
      decades: decomposed.decades,
      genres: decomposed.genres,
      moods,
      audioFeatures: [],
      artistHint: decomposed.artist ? decomposed.artist.split(/\s+/) : [],
    },
    searchPhrase: raw.toLowerCase().trim(),
    semanticText: decomposed.semantic || raw,
    terms: (decomposed.semantic || raw).split(/\s+/).filter(t => t.length > 1),
    termsUnfiltered: raw.toLowerCase().trim().split(/\s+/).filter(t => t.length > 1),
    interpretations: [],
  };
}

export function extractJSON(text: string): any | null {
  // Try object first, then array
  const objMatch = text.match(/\{[\s\S]*\}/);
  const arrMatch = text.match(/\[[\s\S]*\]/);

  // Prefer whichever appears first in the string
  const objIndex = objMatch ? text.indexOf(objMatch[0]) : Infinity;
  const arrIndex = arrMatch ? text.indexOf(arrMatch[0]) : Infinity;

  const candidate = objIndex <= arrIndex ? objMatch?.[0] : arrMatch?.[0];
  if (!candidate) return null;
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

export function validateDecomposed(parsed: any, fallbackQuery: string): DecomposedQuery {
  if (typeof parsed !== "object" || parsed === null) {
    return { decades: [], genres: [], mood: null, artist: null, semantic: fallbackQuery };
  }

  const validMoods = ["sadness", "joy", "anger", "fear", "surprise"];
  const validDecade = (d: any) => typeof d === "number" && d >= 1950 && d <= 2020 && d % 10 === 0;

  return {
    decades: Array.isArray(parsed.decades) ? parsed.decades.filter(validDecade) : [],
    genres: Array.isArray(parsed.genres) ? parsed.genres.filter((g: any) => typeof g === "string") : [],
    mood: typeof parsed.mood === "string" && validMoods.includes(parsed.mood) ? parsed.mood : null,
    artist: typeof parsed.artist === "string" ? parsed.artist : null,
    semantic: typeof parsed.semantic === "string" && parsed.semantic.trim() ? parsed.semantic : fallbackQuery,
  };
}
