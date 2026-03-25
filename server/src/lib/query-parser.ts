import type { ParsedQuery } from "./types";
import { extractDecades, extractArtist, extractGenres } from "./nlp-helpers";

// ---------------------------------------------------------------------------
// Stop words — stripped from keyword terms (not from semanticText)
// ---------------------------------------------------------------------------
const STOP_WORDS = new Set([
  "songs", "song", "with", "the", "a", "an", "and", "or", "that", "this",
  "are", "is", "was", "were", "been", "be", "have", "has", "had", "do",
  "does", "did", "will", "would", "could", "should", "may", "might", "can",
  "shall", "about", "for", "on", "at", "to", "of", "it", "its", "they",
  "them", "their", "he", "she", "him", "her", "his", "we", "our", "us",
  "my", "me", "i", "you", "your", "which", "what", "where", "when", "how",
  "who", "some", "any", "all", "most", "many", "much", "more", "very",
  "really", "just", "also", "too", "so", "than", "but", "if", "not", "no",
  "only", "other", "each", "every", "both", "few", "several", "top", "best",
  "greatest", "tracks", "track", "hits", "hit", "chart", "charts", "classic",
  "classics", "find", "show", "get", "list", "give", "sung", "performed",
  "featuring", "feat", "ft", "named", "by", "from", "title", "titles",
  "lyrics", "chorus", "verse", "artist", "called", "titled",
  "something", "anything", "nothing", "kinda", "kind", "like", "think",
  "maybe", "probably", "know", "want", "need", "looking", "search",
  "music", "sounds", "sounding", "style", "type", "sorta", "bit",
]);

// ---------------------------------------------------------------------------
// Mood map — maps natural language mood words to Qdrant emotion filters
// ---------------------------------------------------------------------------
interface FeatureSpec {
  key: string;
  label: string;
  min?: number;
  max?: number;
}

const MOOD_MAP: Record<string, FeatureSpec> = {
  // Sadness
  sad: { key: "emotions.sadness", label: "sadness", min: 0.3 },
  sadness: { key: "emotions.sadness", label: "sadness", min: 0.3 },
  heartbreak: { key: "emotions.sadness", label: "sadness", min: 0.25 },
  heartbroken: { key: "emotions.sadness", label: "sadness", min: 0.25 },
  lonely: { key: "emotions.sadness", label: "sadness", min: 0.25 },
  melancholy: { key: "emotions.sadness", label: "sadness", min: 0.25 },
  mellow: { key: "emotions.sadness", label: "sadness", min: 0.2 },
  moody: { key: "emotions.sadness", label: "sadness", min: 0.2 },
  somber: { key: "emotions.sadness", label: "sadness", min: 0.25 },
  bittersweet: { key: "emotions.sadness", label: "sadness", min: 0.2 },
  nostalgic: { key: "emotions.sadness", label: "sadness", min: 0.15 },
  wistful: { key: "emotions.sadness", label: "sadness", min: 0.15 },
  emotional: { key: "emotions.sadness", label: "sadness", min: 0.2 },
  cry: { key: "emotions.sadness", label: "sadness", min: 0.25 },
  crying: { key: "emotions.sadness", label: "sadness", min: 0.25 },
  tearful: { key: "emotions.sadness", label: "sadness", min: 0.25 },
  romantic: { key: "emotions.joy", label: "joy", min: 0.15 },
  chill: { key: "emotions.joy", label: "joy", min: 0.15 },
  relax: { key: "emotions.joy", label: "joy", min: 0.15 },
  relaxing: { key: "emotions.joy", label: "joy", min: 0.15 },
  peaceful: { key: "emotions.joy", label: "joy", min: 0.15 },
  soothing: { key: "emotions.joy", label: "joy", min: 0.15 },
  // Joy
  happy: { key: "emotions.joy", label: "joy", min: 0.3 },
  joyful: { key: "emotions.joy", label: "joy", min: 0.3 },
  cheerful: { key: "emotions.joy", label: "joy", min: 0.25 },
  upbeat: { key: "emotions.joy", label: "joy", min: 0.25 },
  fun: { key: "emotions.joy", label: "joy", min: 0.2 },
  playful: { key: "emotions.joy", label: "joy", min: 0.2 },
  euphoric: { key: "emotions.joy", label: "joy", min: 0.3 },
  celebratory: { key: "emotions.joy", label: "joy", min: 0.25 },
  // Anger
  angry: { key: "emotions.anger", label: "anger", min: 0.3 },
  intense: { key: "emotions.anger", label: "anger", min: 0.25 },
  aggressive: { key: "emotions.anger", label: "anger", min: 0.25 },
  furious: { key: "emotions.anger", label: "anger", min: 0.3 },
  rebellious: { key: "emotions.anger", label: "anger", min: 0.2 },
  loud: { key: "emotions.anger", label: "anger", min: 0.2 },
  // Fear
  scary: { key: "emotions.fear", label: "fear", min: 0.3 },
  dark: { key: "emotions.fear", label: "fear", min: 0.25 },
  eerie: { key: "emotions.fear", label: "fear", min: 0.2 },
  haunting: { key: "emotions.fear", label: "fear", min: 0.2 },
  creepy: { key: "emotions.fear", label: "fear", min: 0.25 },
  // Surprise
  surprising: { key: "emotions.surprise", label: "surprise", min: 0.25 },
};

// Multi-word mood phrases
const MULTI_WORD_MOODS: Record<string, FeatureSpec> = {
  "feel good": { key: "emotions.joy", label: "joy", min: 0.2 },
  "feel-good": { key: "emotions.joy", label: "joy", min: 0.2 },
  "broken heart": { key: "emotions.sadness", label: "sadness", min: 0.25 },
  "broken hearted": { key: "emotions.sadness", label: "sadness", min: 0.25 },
  "road trip": { key: "emotions.joy", label: "joy", min: 0.15 },
  "party anthem": { key: "emotions.joy", label: "joy", min: 0.2 },
};

// All known filter words (for stripping from artist hints)
const ALL_FILTER_WORDS = new Set([
  ...Object.keys(MOOD_MAP),
  ...Object.keys(MULTI_WORD_MOODS),
]);

// ---------------------------------------------------------------------------
// Main parser
// ---------------------------------------------------------------------------

export function parseQuery(raw: string): ParsedQuery {
  const result: ParsedQuery = {
    scopeTitle: false,
    scopeLyrics: false,
    scopeArtist: false,
    filters: {
      decades: [],
      genres: [],
      moods: [],
      audioFeatures: [],
      artistHint: [],
    },
    semanticText: "",
    terms: [],
    interpretations: [],
  };

  if (!raw || !raw.trim()) return result;

  const lower = raw.toLowerCase().trim();

  // ── 1. Decades (NLP-powered — handles "sixties", "80's", "1975", etc.) ──
  result.filters.decades = extractDecades(lower);
  for (const decade of result.filters.decades) {
    result.interpretations.push({ type: "decade", label: `${decade}s` });
  }

  // ── 2. Artist (NLP-powered — handles "by X", "from X", name detection) ──
  const artistTokens = extractArtist(lower);
  if (artistTokens.length > 0) {
    // Strip trailing mood/genre words from artist
    while (artistTokens.length > 0 && ALL_FILTER_WORDS.has(artistTokens[artistTokens.length - 1])) {
      artistTokens.pop();
    }
    if (artistTokens.length > 0) {
      result.filters.artistHint = artistTokens;
      result.scopeArtist = true;
      result.interpretations.push({ type: "artist", label: artistTokens.join(" ") });
    }
  }

  // ── 3. Genres (fuzzy match against known genre words) ──
  result.filters.genres = extractGenres(lower);
  for (const genre of result.filters.genres) {
    result.interpretations.push({ type: "genre", label: genre });
  }

  // ── 4. Scope detection ──
  if (/\bin\s+the\s+title\b/.test(lower)) {
    result.scopeTitle = true;
    result.interpretations.push({ type: "scope", label: "title" });
  }
  if (/\bin\s+the\s+lyrics\b/.test(lower) || /\babout\b/.test(lower)) {
    result.scopeLyrics = true;
  }

  // ── 5. Moods — multi-word first, then single-word ──
  let working = lower;
  for (const [phrase, spec] of Object.entries(MULTI_WORD_MOODS)) {
    if (working.includes(phrase)) {
      const alreadyKeyed = result.filters.moods.some(m => m.key === spec.key);
      if (!alreadyKeyed) {
        result.filters.moods.push({ ...spec });
        result.interpretations.push({ type: "mood", label: spec.label });
      }
    }
  }

  const words = working.split(/\s+/).filter(w => w.length > 0);
  for (const word of words) {
    const clean = word.replace(/[^a-z-]/g, "");
    if (MOOD_MAP[clean]) {
      const spec = MOOD_MAP[clean];
      const alreadyKeyed = result.filters.moods.some(m => m.key === spec.key);
      if (!alreadyKeyed) {
        result.filters.moods.push({ ...spec });
        result.interpretations.push({ type: "mood", label: spec.label });
      }
    }
  }

  // ── 6. Terms — for keyword matching (stop words removed) ──
  const allWords = lower.split(/\s+/).filter(w => w.length > 1);
  const meaningful = allWords.filter(w => {
    const clean = w.replace(/[^a-z-]/g, "");
    return clean.length > 1
      && !STOP_WORDS.has(clean)
      && !MOOD_MAP[clean]
      && !result.filters.genres.includes(clean);
  });
  result.terms = meaningful;

  // ── 7. Semantic text — ALL meaningful words from original query ──
  const rawTokens = raw.toLowerCase().trim().split(/\s+/).filter(t => t.length > 0);
  const allMeaningful = rawTokens.filter(t => {
    const clean = t.replace(/[^a-z'-]/g, "");
    return clean.length > 1 && !STOP_WORDS.has(clean);
  });
  result.semanticText = allMeaningful.join(" ");

  return result;
}
