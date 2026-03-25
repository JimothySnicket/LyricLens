// @ts-ignore — compromise types are bundled but ESM import can be wonky
import nlp from "compromise";
import { getSongs } from "./data";

// ---------------------------------------------------------------------------
// Decade word map — compromise doesn't handle these
// ---------------------------------------------------------------------------
const DECADE_WORDS: Record<string, number> = {
  fifties: 1950, "50s": 1950,
  sixties: 1960, "60s": 1960,
  seventies: 1970, "70s": 1970,
  eighties: 1980, "80s": 1980,
  nineties: 1990, "90s": 1990,
  "two thousands": 2000, "2000s": 2000, "oughts": 2000, "noughties": 2000,
  "twenty tens": 2010, "2010s": 2010, "tens": 2010,
  "twenty twenties": 2020, "2020s": 2020, "twenties": 2020,
};

/**
 * Extract decades from natural language, including word forms.
 * Returns array of decade numbers (e.g., [1960, 1990]).
 */
export function extractDecades(text: string): number[] {
  const lower = text.toLowerCase();
  const decades: number[] = [];

  // Check word-based decades
  for (const [word, decade] of Object.entries(DECADE_WORDS)) {
    if (lower.includes(word) && !decades.includes(decade)) {
      decades.push(decade);
    }
  }

  // Check digit patterns: "80s", "80's", "1980s", "from the 80s"
  const digitRegex = /\b(?:from\s+the\s+|in\s+the\s+)?(\d{2}|\d{4})'?s\b/g;
  let m: RegExpExecArray | null;
  while ((m = digitRegex.exec(lower)) !== null) {
    const num = m[1];
    let decade: number;
    if (num.length === 2) {
      decade = (parseInt(num) >= 20 ? 1900 : 2000) + parseInt(num);
    } else {
      decade = Math.floor(parseInt(num) / 10) * 10;
    }
    if (!decades.includes(decade)) decades.push(decade);
  }

  // Bare years: "1975", "2003"
  const yearRegex = /\b(19[5-9]\d|20[0-2]\d)\b/g;
  while ((m = yearRegex.exec(lower)) !== null) {
    const decade = Math.floor(parseInt(m[1]) / 10) * 10;
    if (!decades.includes(decade)) decades.push(decade);
  }

  return decades;
}

// ---------------------------------------------------------------------------
// Artist detection — fuzzy match against known artist names
// ---------------------------------------------------------------------------
let artistIndex: Map<string, string> | null = null;

function getArtistIndex(): Map<string, string> {
  if (!artistIndex) {
    artistIndex = new Map();
    const songs = getSongs();
    for (const song of songs) {
      const name = song.artist.toLowerCase().trim();
      artistIndex.set(name, song.artist);
      // Also index individual significant words (>4 chars) for partial matching
      const words = name.split(/\s+/).filter(w => w.length > 4);
      // Don't index common words that happen to be in artist names
      const skip = new Set(["featuring", "presents", "versus"]);
      for (const w of words) {
        if (!skip.has(w) && !artistIndex.has(w)) {
          artistIndex.set(w, song.artist);
        }
      }
    }
  }
  return artistIndex;
}

/**
 * Detect artist names using compromise NLP people detection
 * + fuzzy matching against known artist list.
 */
export function extractArtist(text: string): string[] {
  const lower = text.toLowerCase().trim();
  const index = getArtistIndex();

  // 1. Check "by <name>" pattern first (most explicit)
  const byMatch = lower.match(/\bby\s+([a-z][a-z0-9 '&.-]+?)(?:\s+(?:from|in|about|songs?|track|music)\b|$)/);
  if (byMatch) {
    const name = byMatch[1].trim();
    // Check if it's a known artist
    if (index.has(name)) {
      return name.split(/\s+/).filter(t => t.length > 0);
    }
    // Try as tokens
    return name.split(/\s+/).filter(t => t.length > 0);
  }

  // 2. Check "from <name>" pattern (but not "from the 80s" etc.)
  const fromMatch = lower.match(/\bfrom\s+([a-z][a-z '&.-]+?)(?:\s+(?:in|about|songs?|track)\b|$)/);
  if (fromMatch) {
    const name = fromMatch[1].trim();
    // Don't treat decade words as artists
    if (name.match(/\b(the\s+)?\d{2,4}'?s\b/) || DECADE_WORDS[name]) {
      // It's a decade, not an artist
    } else if (index.has(name)) {
      return name.split(/\s+/).filter(t => t.length > 0);
    }
  }

  // 3. Use compromise to detect people names
  const doc = nlp(text);
  const people = doc.people().out("array") as string[];
  for (const person of people) {
    const personLower = person.toLowerCase();
    // Check if this person name matches a known artist
    if (index.has(personLower)) {
      return personLower.split(/\s+/).filter(t => t.length > 0);
    }
    // Check individual words
    for (const word of personLower.split(/\s+/)) {
      if (word.length > 4 && index.has(word)) {
        const fullArtist = index.get(word)!.toLowerCase();
        return fullArtist.split(/\s+/).filter(t => t.length > 0);
      }
    }
  }

  return [];
}

// ---------------------------------------------------------------------------
// Genre detection — fuzzy substring match
// ---------------------------------------------------------------------------
const GENRE_WORDS = new Set([
  "pop", "rock", "jazz", "blues", "country", "reggae", "soul", "funk",
  "disco", "hip-hop", "r&b", "electronic", "folk", "punk", "metal",
  "alternative", "indie", "grunge", "latin", "reggaeton", "ska",
  "gospel", "classical", "dance", "synth-pop", "k-pop", "afrobeats",
  "neo-soul", "doo-wop", "glam", "garage", "progressive", "trap",
  "salsa", "exotica", "instrumental", "orchestral", "choral",
  "rnb", // alias for r&b
]);

const GENRE_NORMALIZE: Record<string, string> = {
  "hip hop": "hip-hop",
  "hiphop": "hip-hop",
  "r and b": "r&b",
  "rnb": "r&b",
  "rhythm and blues": "r&b",
};

// Map genre names to Qdrant-searchable terms
// "r&b" can't be text-matched in Qdrant (& breaks tokenizer), so we map to alternatives
export const GENRE_TO_QDRANT: Record<string, string> = {
  "r&b": "soul",  // R&B songs are tagged as R&B/Soul, Soul/R&B etc — "soul" matches them
};

export function extractGenres(text: string): string[] {
  const lower = text.toLowerCase();
  const genres: string[] = [];

  // Check multi-word aliases first
  for (const [phrase, mapped] of Object.entries(GENRE_NORMALIZE)) {
    if (lower.includes(phrase) && !genres.includes(mapped)) {
      genres.push(mapped);
    }
  }

  // Check single-word genres
  const words = lower.split(/\s+/);
  for (const word of words) {
    const clean = word.replace(/[^a-z&-]/g, "");
    if (GENRE_WORDS.has(clean) && !genres.includes(clean)) {
      const mapped = GENRE_NORMALIZE[clean] ?? clean;
      if (!genres.includes(mapped)) {
        genres.push(mapped);
      }
    }
  }

  return genres;
}
