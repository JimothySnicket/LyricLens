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

const GENRE_SET = new Set(["pop", "rock", "jazz", "blues", "country", "reggae"]);

const GENRE_ALIASES: Record<string, string> = {
  "hip hop": "pop",
  "r&b": "pop",
  "rap": "pop",
  "r and b": "pop",
};

interface FeatureSpec {
  key: string;
  label: string;
  min?: number;
  max?: number;
}

// Keys match the abbreviated score fields in Song.scores
const MOOD_MAP: Record<string, FeatureSpec> = {
  sad:         { key: "sa", label: "sadness",    min: 0.25 },
  sadness:     { key: "sa", label: "sadness",    min: 0.25 },
  heartbreak:  { key: "sa", label: "sadness",    min: 0.2  },
  heartbroken: { key: "sa", label: "sadness",    min: 0.2  },
  lonely:      { key: "sa", label: "sadness",    min: 0.2  },
  melancholy:  { key: "sa", label: "sadness",    min: 0.2  },
  romantic:    { key: "ro", label: "romantic",   min: 0.2  },
  romance:     { key: "ro", label: "romantic",   min: 0.2  },
  intense:     { key: "vi", label: "intensity",  min: 0.2  },
  intensity:   { key: "vi", label: "intensity",  min: 0.2  },
  forceful:    { key: "vi", label: "intensity",  min: 0.15 },
  heated:      { key: "vi", label: "intensity",  min: 0.15 },
  mature:      { key: "ob", label: "mature",     min: 0.2  },
  explicit_content: { key: "ob", label: "mature",     min: 0.15 },
  dark:        { key: "nt", label: "night/time", min: 0.15 },
  emotional:   { key: "fe", label: "feelings",   min: 0.15 },
};

const AUDIO_MAP: Record<string, FeatureSpec> = {
  upbeat:     { key: "valence",       label: "high valence",  min: 0.5  },
  cheerful:   { key: "valence",       label: "high valence",  min: 0.5  },
  happy:      { key: "valence",       label: "high valence",  min: 0.45 },
  danceable:  { key: "danceability",  label: "danceable",     min: 0.5  },
  acoustic:   { key: "acousticness",  label: "acoustic",      min: 0.5  },
  energetic:  { key: "energy",        label: "high energy",   min: 0.5  },
  mellow:     { key: "energy",        label: "low energy",    max: 0.35 },
  slow:       { key: "energy",        label: "low energy",    max: 0.35 },
  quiet:      { key: "energy",        label: "low energy",    max: 0.3  },
  // multi-word aliases resolved before single-word scan
  "high energy": { key: "energy",    label: "high energy",   min: 0.5  },
  "low energy":  { key: "energy",    label: "low energy",    max: 0.35 },
};

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
    const artistTokens = artistMatch[1]
      .trim()
      .split(/\s+/)
      .filter(t => t.length > 0);
    result.filters.artistHint = artistTokens;
    result.scopeArtist = true;
    // Remove the matched artist clause from the working string.
    working = working.replace(artistMatch[0], " ").replace(/\s{2,}/g, " ").trim();
    result.interpretations.push({ type: "artist", label: artistMatch[1].trim() });
  }

  // -------------------------------------------------------------------------
  // 2. Decades: "from the 80s", "in the 1960s", "80s", "1980s", etc.
  // -------------------------------------------------------------------------
  const decadeRegex = /\b(?:from\s+the\s+|in\s+the\s+)?(\d{2}|\d{4})s\b/g;
  let decadeMatch: RegExpExecArray | null;
  while ((decadeMatch = decadeRegex.exec(working)) !== null) {
    const raw_num = decadeMatch[1];
    let decade: number;
    if (raw_num.length === 2) {
      // "80s" → 1980, "60s" → 1960
      const prefix = parseInt(raw_num, 10) >= 20 ? 1900 : 2000;
      decade = prefix + parseInt(raw_num, 10);
    } else {
      // "1960s" / "2000s" → floor to decade
      decade = Math.floor(parseInt(raw_num, 10) / 10) * 10;
    }
    if (!result.filters.decades.includes(decade)) {
      result.filters.decades.push(decade);
      result.interpretations.push({ type: "decade", label: `${decade}s` });
    }
  }
  // Strip decade expressions from working string.
  working = working
    .replace(/\b(?:from\s+the\s+|in\s+the\s+)?(\d{2}|\d{4})s\b/g, " ")
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
  // 7. Remaining tokens: filter stop words → terms & semanticText
  // -------------------------------------------------------------------------
  const remaining = tokens.filter((t, i) => !consumed[i]);
  const meaningful = remaining.filter(t => !STOP_WORDS.has(t) && t.length > 1);

  result.terms = meaningful;
  result.semanticText = meaningful.join(" ");

  return result;
}
