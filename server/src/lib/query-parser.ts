import type { ParsedQuery } from "./types";

// ---------------------------------------------------------------------------
// Lookup tables (ported from v1)
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
]);

// All genre words that appear in our dataset — used for filter detection
const GENRE_SET = new Set([
  "pop", "rock", "jazz", "blues", "country", "reggae", "soul", "funk",
  "disco", "hip-hop", "r&b", "electronic", "folk", "punk", "metal",
  "alternative", "indie", "grunge", "latin", "reggaeton", "ska",
  "gospel", "classical", "dance", "synth-pop", "k-pop", "afrobeats",
  "neo-soul", "doo-wop", "glam", "garage", "progressive", "trap",
  "salsa", "exotica", "instrumental", "orchestral", "choral",
]);

// Multi-word genre phrases
const GENRE_ALIASES: Record<string, string> = {
  "hip hop": "hip-hop",
  "r and b": "r&b",
  "hard rock": "rock",
  "soft rock": "rock",
  "art rock": "rock",
  "arena rock": "rock",
  "punk rock": "punk",
  "pop rock": "rock",
  "folk rock": "folk",
  "country rock": "country",
  "blues rock": "blues",
  "new wave": "alternative",
  "boy band": "pop",
  "girl group": "pop",
  "drum and bass": "electronic",
};

interface FeatureSpec {
  key: string;
  label: string;
  min?: number;
  max?: number;
}

// Keys map to Qdrant payload fields under emotions.*
const MOOD_MAP: Record<string, FeatureSpec> = {
  // Sadness
  sad:         { key: "emotions.sadness",  label: "sadness",  min: 0.3 },
  sadness:     { key: "emotions.sadness",  label: "sadness",  min: 0.3 },
  heartbreak:  { key: "emotions.sadness",  label: "sadness",  min: 0.25 },
  heartbroken: { key: "emotions.sadness",  label: "sadness",  min: 0.25 },
  lonely:      { key: "emotions.sadness",  label: "sadness",  min: 0.25 },
  melancholy:  { key: "emotions.sadness",  label: "sadness",  min: 0.25 },
  mellow:      { key: "emotions.sadness",  label: "sadness",  min: 0.2 },
  // Joy
  happy:       { key: "emotions.joy",      label: "joy",      min: 0.3 },
  joyful:      { key: "emotions.joy",      label: "joy",      min: 0.3 },
  cheerful:    { key: "emotions.joy",      label: "joy",      min: 0.25 },
  upbeat:      { key: "emotions.joy",      label: "joy",      min: 0.25 },
  fun:         { key: "emotions.joy",      label: "joy",      min: 0.2 },
  // Anger
  angry:       { key: "emotions.anger",    label: "anger",    min: 0.3 },
  intense:     { key: "emotions.anger",    label: "anger",    min: 0.25 },
  aggressive:  { key: "emotions.anger",    label: "anger",    min: 0.25 },
  // Fear
  scary:       { key: "emotions.fear",     label: "fear",     min: 0.3 },
  dark:        { key: "emotions.fear",     label: "fear",     min: 0.25 },
  eerie:       { key: "emotions.fear",     label: "fear",     min: 0.2 },
  // Surprise
  surprising:  { key: "emotions.surprise", label: "surprise", min: 0.25 },
};

// No audio feature fields in current dataset — AUDIO_MAP is empty.
// Mood words that could be confused with audio terms are handled in MOOD_MAP.
const AUDIO_MAP: Record<string, FeatureSpec> = {};

// Multi-word audio phrases sorted longest-first so they are matched before
// their constituent single words.
const MULTI_WORD_AUDIO = Object.keys(AUDIO_MAP)
  .filter(k => k.includes(" "))
  .sort((a, b) => b.length - a.length);

// Multi-word genre aliases sorted longest-first.
const MULTI_WORD_GENRE_ALIASES = Object.keys(GENRE_ALIASES)
  .filter(k => k.includes(" "))
  .sort((a, b) => b.length - a.length);

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

  // Work on a lower-cased mutable string for sequential extraction.
  let working = raw.toLowerCase().trim();

  // -------------------------------------------------------------------------
  // 1. Artist: "by <Name>" — capture everything after "by" until end or a
  //    known structural keyword.
  // -------------------------------------------------------------------------
  const artistMatch = working.match(
    /\bby\s+([a-z][a-z0-9 '&.-]*?)(?:\s+(?:from|in the|about|in)\b|$)/,
  );
  if (artistMatch) {
    const rawTokens = artistMatch[1]
      .trim()
      .split(/\s+/)
      .filter(t => t.length > 0);
    // Strip trailing tokens that are actually mood, genre, or audio keywords
    const knownKeywords = new Set([
      ...Object.keys(MOOD_MAP),
      ...GENRE_SET,
      ...Object.keys(GENRE_ALIASES),
    ]);
    const strippedKeywords: string[] = [];
    while (rawTokens.length > 0 && knownKeywords.has(rawTokens[rawTokens.length - 1])) {
      strippedKeywords.push(rawTokens.pop()!);
    }
    if (rawTokens.length > 0) {
      result.filters.artistHint = rawTokens;
      result.scopeArtist = true;
      result.interpretations.push({ type: "artist", label: rawTokens.join(" ") });
    }
    // Remove the artist clause but put stripped keywords back into working
    working = working.replace(artistMatch[0], " ").replace(/\s{2,}/g, " ").trim();
    if (strippedKeywords.length > 0) {
      working = (working + " " + strippedKeywords.join(" ")).trim();
    }
  }

  // -------------------------------------------------------------------------
  // 2. Decades: "from the 80s", "in the 1960s", "80s", "1980s", etc.
  // -------------------------------------------------------------------------
  // Match decade patterns: "80s", "1980s", "from the 80s"
  const decadeRegex = /\b(?:from\s+the\s+|in\s+the\s+)?(\d{2}|\d{4})s\b/g;
  let decadeMatch: RegExpExecArray | null;
  while ((decadeMatch = decadeRegex.exec(working)) !== null) {
    const raw_num = decadeMatch[1];
    let decade: number;
    if (raw_num.length === 2) {
      const prefix = parseInt(raw_num, 10) >= 20 ? 1900 : 2000;
      decade = prefix + parseInt(raw_num, 10);
    } else {
      decade = Math.floor(parseInt(raw_num, 10) / 10) * 10;
    }
    if (!result.filters.decades.includes(decade)) {
      result.filters.decades.push(decade);
      result.interpretations.push({ type: "decade", label: `${decade}s` });
    }
  }
  working = working
    .replace(/\b(?:from\s+the\s+|in\s+the\s+)?(\d{2}|\d{4})s\b/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

  // Match bare years: "1986", "2003" — map to decade
  const yearRegex = /\b(19[5-9]\d|20[0-2]\d)\b/g;
  let yearMatch: RegExpExecArray | null;
  while ((yearMatch = yearRegex.exec(working)) !== null) {
    const year = parseInt(yearMatch[1], 10);
    const decade = Math.floor(year / 10) * 10;
    if (!result.filters.decades.includes(decade)) {
      result.filters.decades.push(decade);
      result.interpretations.push({ type: "decade", label: `${decade}s (from ${year})` });
    }
  }
  working = working
    .replace(/\b(19[5-9]\d|20[0-2]\d)\b/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

  // -------------------------------------------------------------------------
  // 3. Scope: "in the title" / "in the lyrics" / "about" (implies lyrics)
  // -------------------------------------------------------------------------
  if (/\bin\s+the\s+title\b/.test(working)) {
    result.scopeTitle = true;
    working = working.replace(/\bin\s+the\s+title\b/, " ").replace(/\s{2,}/g, " ").trim();
    result.interpretations.push({ type: "scope", label: "title" });
  }
  if (/\bin\s+the\s+lyrics\b/.test(working)) {
    result.scopeLyrics = true;
    working = working.replace(/\bin\s+the\s+lyrics\b/, " ").replace(/\s{2,}/g, " ").trim();
    result.interpretations.push({ type: "scope", label: "lyrics" });
  }
  if (/\babout\b/.test(working)) {
    result.scopeLyrics = true;
    // "about" is a structural word — strip it but keep what follows.
    working = working.replace(/\babout\b/g, " ").replace(/\s{2,}/g, " ").trim();
  }

  // -------------------------------------------------------------------------
  // 4. Multi-word genre aliases (e.g. "hip hop", "r and b")
  // -------------------------------------------------------------------------
  for (const alias of MULTI_WORD_GENRE_ALIASES) {
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`\\b${escaped}\\b`, "g");
    if (re.test(working)) {
      const mapped = GENRE_ALIASES[alias];
      if (!result.filters.genres.includes(mapped)) {
        result.filters.genres.push(mapped);
        result.interpretations.push({ type: "genre", label: alias });
      }
      working = working.replace(re, " ").replace(/\s{2,}/g, " ").trim();
    }
  }

  // -------------------------------------------------------------------------
  // 5. Multi-word audio features (e.g. "high energy", "low energy")
  // -------------------------------------------------------------------------
  for (const phrase of MULTI_WORD_AUDIO) {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`\\b${escaped}\\b`, "g");
    if (re.test(working)) {
      const spec = AUDIO_MAP[phrase];
      const alreadyKeyed = result.filters.audioFeatures.some(f => f.key === spec.key && f.label === spec.label);
      if (!alreadyKeyed) {
        result.filters.audioFeatures.push({ ...spec });
        result.interpretations.push({ type: "audio", label: spec.label });
      }
      working = working.replace(re, " ").replace(/\s{2,}/g, " ").trim();
    }
  }

  // -------------------------------------------------------------------------
  // 6. Tokenise the remaining working string for single-word matching.
  //    We'll process tokens, marking consumed positions.
  // -------------------------------------------------------------------------
  const tokens = working.split(/\s+/).filter(t => t.length > 0);
  const consumed = new Array<boolean>(tokens.length).fill(false);

  // Single-word genre set
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (consumed[i]) continue;
    if (GENRE_SET.has(t)) {
      if (!result.filters.genres.includes(t)) {
        result.filters.genres.push(t);
        result.interpretations.push({ type: "genre", label: t });
      }
      consumed[i] = true;
    }
  }

  // Single-word genre aliases (single-token ones like "rap", "r&b")
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (consumed[i]) continue;
    if (GENRE_ALIASES[t] !== undefined) {
      const mapped = GENRE_ALIASES[t];
      if (!result.filters.genres.includes(mapped)) {
        result.filters.genres.push(mapped);
        result.interpretations.push({ type: "genre", label: t });
      }
      consumed[i] = true;
    }
  }

  // Mood words
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (consumed[i]) continue;
    if (MOOD_MAP[t] !== undefined) {
      const spec = MOOD_MAP[t];
      const alreadyKeyed = result.filters.moods.some(m => m.key === spec.key);
      if (!alreadyKeyed) {
        result.filters.moods.push({ ...spec });
        result.interpretations.push({ type: "mood", label: spec.label });
      }
      consumed[i] = true;
    }
  }

  // Single-word audio features
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (consumed[i]) continue;
    if (AUDIO_MAP[t] !== undefined) {
      const spec = AUDIO_MAP[t];
      const alreadyKeyed = result.filters.audioFeatures.some(
        f => f.key === spec.key && f.label === spec.label,
      );
      if (!alreadyKeyed) {
        result.filters.audioFeatures.push({ ...spec });
        result.interpretations.push({ type: "audio", label: spec.label });
      }
      consumed[i] = true;
    }
  }

  // -------------------------------------------------------------------------
  // 7. Remaining tokens: filter stop words → terms (for keyword matching)
  // -------------------------------------------------------------------------
  const remaining = tokens.filter((t, i) => !consumed[i]);
  const meaningful = remaining.filter(t => !STOP_WORDS.has(t) && t.length > 1);

  result.terms = meaningful;

  // semanticText = ALL meaningful words from the original query, not just
  // unconsumed ones. A word can be both a filter trigger AND carry semantic
  // meaning. "sad rock" should embed as "sad rock", not "".
  const rawTokens = raw.toLowerCase().trim().split(/\s+/).filter(t => t.length > 0);
  const allMeaningful = rawTokens.filter(t => !STOP_WORDS.has(t) && t.length > 1);
  result.semanticText = allMeaningful.join(" ");

  return result;
}
