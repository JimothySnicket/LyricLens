"""
evaluate.py — LyricLens v2 evaluation pipeline.

Measures retrieval quality across keyword, semantic, and hybrid search modes,
plus cluster quality and embedding coverage metrics.

Outputs: data/processed/eval_results.json
"""

import csv
import json
import os
import re
import sys
import time
from collections import Counter

import numpy as np
from dotenv import load_dotenv
from qdrant_client import QdrantClient
from qdrant_client.http import models as qdrant_models
from sentence_transformers import SentenceTransformer
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score

# ---------------------------------------------------------------------------
# Paths & config
# ---------------------------------------------------------------------------

BASE_DIR = os.path.join(os.path.dirname(__file__), "..")
DATA_PROCESSED = os.path.join(BASE_DIR, "data", "processed")
DATA_RAW = os.path.join(BASE_DIR, "data", "raw")
SONGS_PATH = os.path.join(DATA_PROCESSED, "merged_songs.json")
EMBEDDINGS_PATH = os.path.join(DATA_PROCESSED, "embeddings.npz")
OUTPUT_PATH = os.path.join(DATA_PROCESSED, "eval_results.json")

COLLECTION_NAME = "song_lyrics"
EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
N_CLUSTERS = 8
TOP_K = 10  # retrieve top-K from Qdrant for P@5 and P@10

# ---------------------------------------------------------------------------
# 1. Load environment and connect to Qdrant
# ---------------------------------------------------------------------------

env_path = os.path.join(BASE_DIR, ".env")
load_dotenv(dotenv_path=env_path)

qdrant_url = os.environ["QDRANT_URL"]
qdrant_api_key = os.environ["QDRANT_API_KEY"]

print("Connecting to Qdrant Cloud ...")
qdrant = QdrantClient(url=qdrant_url, api_key=qdrant_api_key)
print("  Connected.")

# ---------------------------------------------------------------------------
# 2. Load songs and embeddings
# ---------------------------------------------------------------------------

print(f"\nLoading songs from {SONGS_PATH} ...")
with open(SONGS_PATH, encoding="utf-8") as f:
    songs: list[dict] = json.load(f)
print(f"  {len(songs)} songs loaded.")

print(f"Loading embeddings from {EMBEDDINGS_PATH} ...")
emb_data = np.load(EMBEDDINGS_PATH)
embeddings: np.ndarray = emb_data["embeddings"]  # (819, 384)
print(f"  Embeddings shape: {embeddings.shape}")

# ---------------------------------------------------------------------------
# 3. Load sentence-transformer model
# ---------------------------------------------------------------------------

print(f"\nLoading embedding model: {EMBEDDING_MODEL} ...")
model = SentenceTransformer(EMBEDDING_MODEL)
print("  Model loaded.")


def embed(text: str) -> list[float]:
    """Embed a single query string into a 384-dim vector."""
    vec = model.encode(text, normalize_embeddings=True)
    return vec.tolist()


# ---------------------------------------------------------------------------
# 4. Keyword search (Python re-implementation matching server logic)
# ---------------------------------------------------------------------------

# --- Query parser (ported from server/src/lib/query-parser.ts) ---

STOP_WORDS = {
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
}

GENRE_SET = {"pop", "rock", "jazz", "blues", "country", "reggae"}

GENRE_ALIASES: dict[str, str] = {
    "hip hop": "pop",
    "r&b": "pop",
    "rap": "pop",
    "r and b": "pop",
}

MOOD_MAP: dict[str, dict] = {
    "sad":         {"key": "sa", "label": "sadness",    "min": 0.25},
    "sadness":     {"key": "sa", "label": "sadness",    "min": 0.25},
    "heartbreak":  {"key": "sa", "label": "sadness",    "min": 0.2},
    "heartbroken": {"key": "sa", "label": "sadness",    "min": 0.2},
    "lonely":      {"key": "sa", "label": "sadness",    "min": 0.2},
    "melancholy":  {"key": "sa", "label": "sadness",    "min": 0.2},
    "romantic":    {"key": "ro", "label": "romantic",   "min": 0.2},
    "romance":     {"key": "ro", "label": "romantic",   "min": 0.2},
    "intense":     {"key": "vi", "label": "intensity",  "min": 0.2},
    "intensity":   {"key": "vi", "label": "intensity",  "min": 0.2},
    "dark":        {"key": "nt", "label": "night/time", "min": 0.15},
    "emotional":   {"key": "fe", "label": "feelings",   "min": 0.15},
}

AUDIO_MAP: dict[str, dict] = {
    "upbeat":      {"key": "valence",      "label": "high valence",  "min": 0.5},
    "cheerful":    {"key": "valence",      "label": "high valence",  "min": 0.5},
    "happy":       {"key": "valence",      "label": "high valence",  "min": 0.45},
    "danceable":   {"key": "danceability", "label": "danceable",     "min": 0.5},
    "acoustic":    {"key": "acousticness", "label": "acoustic",      "min": 0.5},
    "energetic":   {"key": "energy",       "label": "high energy",   "min": 0.5},
    "mellow":      {"key": "energy",       "label": "low energy",    "max": 0.35},
    "slow":        {"key": "energy",       "label": "low energy",    "max": 0.35},
    "quiet":       {"key": "energy",       "label": "low energy",    "max": 0.3},
    "high energy": {"key": "energy",       "label": "high energy",   "min": 0.5},
    "low energy":  {"key": "energy",       "label": "low energy",    "max": 0.35},
}


def parse_query(raw: str) -> dict:
    """
    Parse a query string into structured filters + terms.
    Mirrors server/src/lib/query-parser.ts logic.
    """
    result = {
        "scope_title": False,
        "scope_lyrics": False,
        "scope_artist": False,
        "decades": [],
        "genres": [],
        "moods": [],
        "audio_features": [],
        "artist_hint": [],
        "terms": [],
        "semantic_text": "",
    }

    if not raw or not raw.strip():
        return result

    working = raw.lower().strip()

    # 1. Artist: "by <Name>"
    artist_match = re.search(
        r"\bby\s+([a-z][a-z0-9 '&.-]*?)(?:\s+(?:from|in the|about|in)\b|$)",
        working,
    )
    if artist_match:
        tokens = [t for t in artist_match.group(1).strip().split() if t]
        result["artist_hint"] = tokens
        result["scope_artist"] = True
        working = working.replace(artist_match.group(0), " ")
        working = re.sub(r"\s{2,}", " ", working).strip()

    # 2. Decades
    decade_re = re.compile(r"\b(?:from\s+the\s+|in\s+the\s+)?(\d{2}|\d{4})s\b")
    for m in decade_re.finditer(working):
        raw_num = m.group(1)
        if len(raw_num) == 2:
            prefix = 1900 if int(raw_num) >= 20 else 2000
            decade = prefix + int(raw_num)
        else:
            decade = (int(raw_num) // 10) * 10
        if decade not in result["decades"]:
            result["decades"].append(decade)
    working = decade_re.sub(" ", working)
    working = re.sub(r"\s{2,}", " ", working).strip()

    # 3. Scope markers
    if re.search(r"\bin\s+the\s+title\b", working):
        result["scope_title"] = True
        working = re.sub(r"\bin\s+the\s+title\b", " ", working)
        working = re.sub(r"\s{2,}", " ", working).strip()
    if re.search(r"\bin\s+the\s+lyrics\b", working):
        result["scope_lyrics"] = True
        working = re.sub(r"\bin\s+the\s+lyrics\b", " ", working)
        working = re.sub(r"\s{2,}", " ", working).strip()
    if re.search(r"\babout\b", working):
        result["scope_lyrics"] = True
        working = re.sub(r"\babout\b", " ", working)
        working = re.sub(r"\s{2,}", " ", working).strip()

    # 4. Multi-word genre aliases
    multi_genre_aliases = sorted(
        [k for k in GENRE_ALIASES if " " in k], key=len, reverse=True
    )
    for alias in multi_genre_aliases:
        escaped = re.escape(alias)
        if re.search(r"\b" + escaped + r"\b", working):
            mapped = GENRE_ALIASES[alias]
            if mapped not in result["genres"]:
                result["genres"].append(mapped)
            working = re.sub(r"\b" + escaped + r"\b", " ", working)
            working = re.sub(r"\s{2,}", " ", working).strip()

    # 5. Multi-word audio features
    multi_audio = sorted(
        [k for k in AUDIO_MAP if " " in k], key=len, reverse=True
    )
    for phrase in multi_audio:
        escaped = re.escape(phrase)
        if re.search(r"\b" + escaped + r"\b", working):
            spec = AUDIO_MAP[phrase]
            already = any(
                f["key"] == spec["key"] and f["label"] == spec["label"]
                for f in result["audio_features"]
            )
            if not already:
                result["audio_features"].append(dict(spec))
            working = re.sub(r"\b" + escaped + r"\b", " ", working)
            working = re.sub(r"\s{2,}", " ", working).strip()

    # 6. Tokenise
    tokens = [t for t in working.split() if t]
    consumed = [False] * len(tokens)

    # Single-word genres
    for i, t in enumerate(tokens):
        if consumed[i]:
            continue
        if t in GENRE_SET:
            if t not in result["genres"]:
                result["genres"].append(t)
            consumed[i] = True

    # Single-word genre aliases
    for i, t in enumerate(tokens):
        if consumed[i]:
            continue
        if t in GENRE_ALIASES:
            mapped = GENRE_ALIASES[t]
            if mapped not in result["genres"]:
                result["genres"].append(mapped)
            consumed[i] = True

    # Mood words
    for i, t in enumerate(tokens):
        if consumed[i]:
            continue
        if t in MOOD_MAP:
            spec = MOOD_MAP[t]
            already = any(m["key"] == spec["key"] for m in result["moods"])
            if not already:
                result["moods"].append(dict(spec))
            consumed[i] = True

    # Single-word audio features
    for i, t in enumerate(tokens):
        if consumed[i]:
            continue
        if t in AUDIO_MAP:
            spec = AUDIO_MAP[t]
            already = any(
                f["key"] == spec["key"] and f["label"] == spec["label"]
                for f in result["audio_features"]
            )
            if not already:
                result["audio_features"].append(dict(spec))
            consumed[i] = True

    # 7. Remaining → terms
    remaining = [t for i, t in enumerate(tokens) if not consumed[i]]
    meaningful = [t for t in remaining if t not in STOP_WORDS and len(t) > 1]
    result["terms"] = meaningful
    result["semantic_text"] = " ".join(meaningful)

    return result


# --- Keyword scoring (ported from server/src/search/keyword.ts) ---

WEIGHT_TITLE_BASE   = 6
WEIGHT_TITLE_SCOPED = 12
WEIGHT_LYRICS_BASE  = 2
WEIGHT_LYRICS_SCOPED = 8
WEIGHT_ARTIST_BASE  = 4
WEIGHT_ARTIST_SCOPED = 10
WEIGHT_DECADE       = 3
KEYWORD_MAX_RESULTS = 30


def keyword_search(songs: list[dict], parsed: dict) -> list[dict]:
    """
    Run keyword search over songs list, returning top results sorted by score.
    Each result dict: {"title": str, "artist": str, "score": float}
    """
    scope_title  = parsed["scope_title"]
    scope_lyrics = parsed["scope_lyrics"]
    scope_artist = parsed["scope_artist"]
    genres       = parsed["genres"]
    decades      = parsed["decades"]
    moods        = parsed["moods"]
    audio_feats  = parsed["audio_features"]
    artist_hint  = parsed["artist_hint"]
    terms        = parsed["terms"]

    title_weight  = WEIGHT_TITLE_SCOPED  if scope_title  else WEIGHT_TITLE_BASE
    lyrics_weight = WEIGHT_LYRICS_SCOPED if scope_lyrics else WEIGHT_LYRICS_BASE
    artist_weight = WEIGHT_ARTIST_SCOPED if scope_artist else WEIGHT_ARTIST_BASE

    results = []

    for song in songs:
        # Hard filters
        if genres and song.get("genre", "").lower() not in genres:
            continue
        if decades and song.get("decade") not in decades:
            continue
        if artist_hint:
            lower_artist = song.get("artist", "").lower()
            if not all(tok in lower_artist for tok in artist_hint):
                continue

        lower_title  = song.get("title",  "").lower()
        lower_lyrics = song.get("lyrics", "").lower()
        lower_artist = song.get("artist", "").lower()

        score = 0.0
        title_matches  = 0
        lyrics_matches = 0
        artist_matches = 0

        for term in terms:
            if term in lower_title:
                score += title_weight
                title_matches += 1
            if term in lower_lyrics:
                score += lyrics_weight
                lyrics_matches += 1
            if term in lower_artist:
                score += artist_weight
                artist_matches += 1

        # Scope enforcement
        if terms:
            if scope_title  and title_matches == 0:
                continue
            if scope_lyrics and lyrics_matches == 0:
                continue
            if scope_artist and not artist_hint and artist_matches == 0:
                continue

        # Decade bonus
        if decades and song.get("decade") in decades:
            score += WEIGHT_DECADE

        # Mood scoring
        song_scores = song.get("scores", {})
        for mood in moods:
            val = song_scores.get(mood["key"], 0)
            min_v = mood.get("min", 0)
            max_v = mood.get("max", 1)
            if min_v <= val <= max_v:
                score += val * 3

        # Audio feature scoring
        for af in audio_feats:
            key = af["key"]
            val = song.get(key, 0) or 0
            min_v = af.get("min", 0)
            max_v = af.get("max", 1)
            if min_v <= val <= max_v:
                mid  = (min_v + max_v) / 2
                span = (max_v - min_v) / 2 or 0.5
                proximity = 1 - abs(val - mid) / (span + 0.001)
                score += proximity * 2

        has_scoring = bool(terms or moods or audio_feats)
        if has_scoring and score <= 0:
            continue

        # Chart tiebreaker
        chart_pos = song.get("chart_position", 999) or 999
        if 1 <= chart_pos <= 5:
            score += 0.3
        elif 6 <= chart_pos <= 10:
            score += 0.15

        results.append({
            "title":  song.get("title",  ""),
            "artist": song.get("artist", ""),
            "score":  score,
        })

    results.sort(key=lambda x: x["score"], reverse=True)
    return results[:KEYWORD_MAX_RESULTS]


# ---------------------------------------------------------------------------
# 5. Semantic and hybrid search via Qdrant
# ---------------------------------------------------------------------------

def semantic_search(query_text: str, limit: int = TOP_K) -> list[dict]:
    """Embed query and retrieve top results from Qdrant."""
    vector = embed(query_text)
    response = qdrant.query_points(
        collection_name=COLLECTION_NAME,
        query=vector,
        limit=limit,
        with_payload=True,
    )
    return [
        {
            "title":  pt.payload.get("title",  "") if pt.payload else "",
            "artist": pt.payload.get("artist", "") if pt.payload else "",
            "score":  pt.score,
        }
        for pt in response.points
    ]


def hybrid_search(query_text: str, parsed: dict, limit: int = TOP_K) -> list[dict]:
    """Embed query and retrieve from Qdrant with decade/genre filters applied."""
    vector = embed(query_text)

    must = []
    if parsed["decades"]:
        must.append(
            qdrant_models.FieldCondition(
                key="decade",
                match=qdrant_models.MatchAny(any=parsed["decades"]),
            )
        )
    if parsed["genres"]:
        must.append(
            qdrant_models.FieldCondition(
                key="genre",
                match=qdrant_models.MatchAny(any=parsed["genres"]),
            )
        )

    query_filter = qdrant_models.Filter(must=must) if must else None

    response = qdrant.query_points(
        collection_name=COLLECTION_NAME,
        query=vector,
        query_filter=query_filter,
        limit=limit,
        with_payload=True,
    )
    return [
        {
            "title":  pt.payload.get("title",  "") if pt.payload else "",
            "artist": pt.payload.get("artist", "") if pt.payload else "",
            "score":  pt.score,
        }
        for pt in response.points
    ]


# ---------------------------------------------------------------------------
# 6. Test query suite
# ---------------------------------------------------------------------------
# Each entry: query string + list of (title_fragment, artist_fragment) pairs.
# A result is considered relevant if EITHER the title OR artist fragment
# appears (case-insensitive) in the returned song's title or artist field.
# ---------------------------------------------------------------------------

TEST_QUERIES = [
    # --- Specific title lookups ---
    {
        "query": "songs with love in the title",
        "category": "specific_lookup",
        "expected": [
            ("Love Me Tender", "Elvis"),
            ("Baby Love", "Supremes"),
            ("All You Need Is Love", "Beatles"),
            ("Everlasting Love", ""),
            ("Where Did Our Love Go", "Supremes"),
        ],
    },
    {
        "query": "songs with heart in the title",
        "category": "specific_lookup",
        "expected": [
            ("Cold, Cold Heart", "Tony Bennett"),
            ("Heartbreak Hotel", "Elvis"),
            ("Broken Hearted Melody", ""),
            ("Heart of Gold", "Neil Young"),
        ],
    },
    {
        "query": "songs with moon in the title",
        "category": "specific_lookup",
        "expected": [
            ("Blue Moon", "Elvis"),
            ("Walking On The Moon", "The Police"),
            ("Fly Me to the Moon", ""),
        ],
    },
    {
        "query": "songs with night in the title",
        "category": "specific_lookup",
        "expected": [
            ("Let's Spend The Night Together", "Rolling Stones"),
            ("All Night Long", ""),
            ("Goodnight", ""),
        ],
    },
    # --- Artist lookups ---
    {
        "query": "songs by Elvis Presley",
        "category": "artist_lookup",
        "expected": [
            ("Heartbreak Hotel", "Elvis"),
            ("Jailhouse Rock", "Elvis"),
            ("Blue Suede Shoes", "Elvis"),
            ("Love Me Tender", "Elvis"),
            ("Suspicious Minds", "Elvis"),
        ],
    },
    {
        "query": "songs by Michael Jackson",
        "category": "artist_lookup",
        "expected": [
            ("Black Or White", "Michael Jackson"),
            ("Heal The World", "Michael Jackson"),
            ("Off The Wall", "Michael Jackson"),
            ("Dirty Diana", "Michael Jackson"),
        ],
    },
    {
        "query": "songs by ABBA",
        "category": "artist_lookup",
        "expected": [
            ("Waterloo", "ABBA"),
            ("The Winner Takes It All", "ABBA"),
            ("Chiquitita", "ABBA"),
            ("Money, Money, Money", "ABBA"),
        ],
    },
    {
        "query": "songs by Queen",
        "category": "artist_lookup",
        "expected": [
            ("Somebody To Love", "Queen"),
            ("We Are The Champions", "Queen"),
            ("Radio Ga Ga", "Queen"),
            ("You're My Best Friend", "Queen"),
        ],
    },
    {
        "query": "songs by The Rolling Stones",
        "category": "artist_lookup",
        "expected": [
            ("Start Me Up", "Rolling Stones"),
            ("Let's Spend The Night Together", "Rolling Stones"),
            ("The Last Time", "Rolling Stones"),
        ],
    },
    # --- Conceptual / thematic ---
    {
        "query": "songs about heartbreak",
        "category": "conceptual",
        "expected": [
            ("Heartbreak Hotel", "Elvis"),
            ("Broken Hearted Melody", ""),
            ("How Can You Mend A Broken Heart", "Bee Gees"),
            ("It's A Heartache", "Bonnie Tyler"),
            ("Cold, Cold Heart", "Tony Bennett"),
        ],
    },
    {
        "query": "sad songs",
        "category": "conceptual",
        "expected": [
            ("Hello", "Lionel Richie"),
            ("Skyfall", "Adele"),
            ("Jar Of Hearts", "Christina Perri"),
            ("Three Times A Lady", "Commodores"),
            ("The Reason", "Hoobastank"),
        ],
    },
    {
        "query": "songs about loneliness and missing someone",
        "category": "conceptual",
        "expected": [
            ("Only The Lonely", "Roy Orbison"),
            ("So Lonely", "The Police"),
            ("Hello", "Lionel Richie"),
            ("Missing You", ""),
        ],
    },
    {
        "query": "songs about freedom and rebellion",
        "category": "conceptual",
        "expected": [
            ("American Idiot", "Green Day"),
            ("Born To Run", ""),
            ("Jailhouse Rock", "Elvis"),
            ("Roll With It", "Oasis"),
        ],
    },
    {
        "query": "songs about faith and hope",
        "category": "conceptual",
        "expected": [
            ("Heal The World", "Michael Jackson"),
            ("Spirit In The Sky", "Norman Greenbaum"),
            ("I Have A Dream", "ABBA"),
            ("Let It Be", "Beatles"),
        ],
    },
    {
        "query": "songs about war and conflict",
        "category": "conceptual",
        "expected": [
            ("Buffalo Soldier", "Bob Marley"),
            ("Two Minutes To Midnight", "Iron Maiden"),
            ("Invisible Sun", "The Police"),
            ("American Idiot", "Green Day"),
        ],
    },
    # --- Decade-specific ---
    {
        "query": "rock from the 80s",
        "category": "decade_specific",
        "expected": [
            ("Don't Stand So Close To Me", "The Police"),
            ("Start Me Up", "Rolling Stones"),
            ("Radio Ga Ga", "Queen"),
            ("Goody Two Shoes", "Adam Ant"),
            ("You Better You Bet", "The Who"),
        ],
    },
    {
        "query": "jazz from the 50s",
        "category": "decade_specific",
        "expected": [
            ("Cold, Cold Heart", "Tony Bennett"),
            ("Pretend", "Nat King Cole"),
            ("Kiss", "Dean Martin"),
            ("Memories Are Made Of This", "Dean Martin"),
        ],
    },
    {
        "query": "pop from the 90s",
        "category": "decade_specific",
        "expected": [
            ("Fantasy", "Mariah Carey"),
            ("Black Or White", "Michael Jackson"),
            ("Blue Savannah", "Erasure"),
            ("The Shoop Shoop Song", "Cher"),
        ],
    },
    {
        "query": "rock from the 70s",
        "category": "decade_specific",
        "expected": [
            ("Let It Be", "Beatles"),
            ("Spirit In The Sky", "Norman Greenbaum"),
            ("Heart Of Gold", "Neil Young"),
            ("25 Or 6 To 4", "Chicago"),
        ],
    },
    {
        "query": "pop songs from the 60s",
        "category": "decade_specific",
        "expected": [
            ("All You Need Is Love", "Beatles"),
            ("Baby Love", "Supremes"),
            ("Stop! In The Name Of Love", "Supremes"),
            ("Mr Tambourine Man", "The Byrds"),
        ],
    },
    {
        "query": "music from the 2000s",
        "category": "decade_specific",
        "expected": [
            ("American Idiot", "Green Day"),
            ("Hollaback Girl", "Gwen Stefani"),
            ("The Reason", "Hoobastank"),
            ("Milkshake", "Kelis"),
        ],
    },
    # --- Mood-based ---
    {
        "query": "upbeat dance music",
        "category": "mood_based",
        "expected": [
            ("Buffalo Soldier", "Bob Marley"),
            ("Hollaback Girl", "Gwen Stefani"),
            ("Milkshake", "Kelis"),
            ("Disco Inferno", "50 Cent"),
        ],
    },
    {
        "query": "romantic songs",
        "category": "mood_based",
        "expected": [
            ("Have You Ever Really Loved A Woman?", "Bryan Adams"),
            ("When A Man Loves A Woman", ""),
            ("Fantasy", "Mariah Carey"),
            ("I'll Be Loving You (Forever)", "New Kids"),
        ],
    },
    {
        "query": "energetic rock songs",
        "category": "mood_based",
        "expected": [
            ("American Idiot", "Green Day"),
            ("You Could Be Mine", "Guns N' Roses"),
            ("Holy Smoke", "Iron Maiden"),
            ("Roll With It", "Oasis"),
        ],
    },
    {
        "query": "slow acoustic songs",
        "category": "mood_based",
        "expected": [
            ("Hello", "Lionel Richie"),
            ("Three Times A Lady", "Commodores"),
            ("Jar Of Hearts", "Christina Perri"),
            ("Bedshaped", "Keane"),
        ],
    },
    # --- Driving / atmosphere ---
    {
        "query": "driving at night music",
        "category": "atmosphere",
        "expected": [
            ("All Night Long", ""),
            ("Let's Spend The Night Together", "Rolling Stones"),
            ("Suspicious Minds", "Elvis"),
            ("Running Up That Hill", ""),
        ],
    },
    {
        "query": "summer party music",
        "category": "atmosphere",
        "expected": [
            ("Hollaback Girl", "Gwen Stefani"),
            ("Waterloo", "ABBA"),
            ("Buffalo Soldier", "Bob Marley"),
            ("Disco Inferno", "50 Cent"),
        ],
    },
    # --- Genre-specific ---
    {
        "query": "reggae songs",
        "category": "genre_specific",
        "expected": [
            ("Buffalo Soldier", "Bob Marley"),
            ("Everything I Own", "Ken Boothe"),
            ("Don't Break My Heart", "UB40"),
            ("Please Don't Make Me Cry", "UB40"),
        ],
    },
    {
        "query": "blues songs",
        "category": "genre_specific",
        "expected": [
            ("Heartbreak Hotel", "Elvis"),
            ("Blue Suede Shoes", "Elvis"),
            ("Blue Moon", "Elvis"),
        ],
    },
    # --- Mixed / compound ---
    {
        "query": "romantic pop from the 90s",
        "category": "mixed",
        "expected": [
            ("Have You Ever Really Loved A Woman?", "Bryan Adams"),
            ("Fantasy", "Mariah Carey"),
            ("The Shoop Shoop Song", "Cher"),
            ("When A Man Loves A Woman", "Michael Bolton"),
        ],
    },
    {
        "query": "sad rock songs",
        "category": "mixed",
        "expected": [
            ("Stop Crying Your Heart Out", "Oasis"),
            ("Bedshaped", "Keane"),
            ("The Reason", "Hoobastank"),
            ("It's A Heartache", "Bonnie Tyler"),
        ],
    },
    {
        "query": "upbeat pop from the 80s",
        "category": "mixed",
        "expected": [
            ("You Came", "Kim Wilde"),
            ("Suedehead", "Morrissey"),
            ("Goody Two Shoes", "Adam Ant"),
            ("The Winner Takes It All", "ABBA"),
        ],
    },
]

print(f"\nTest suite: {len(TEST_QUERIES)} queries.")


# ---------------------------------------------------------------------------
# 7. Evaluation helpers
# ---------------------------------------------------------------------------

def normalise(s: str) -> str:
    """Lowercase and strip punctuation for fuzzy matching."""
    return re.sub(r"[^a-z0-9 ]", "", s.lower()).strip()


def is_relevant(result: dict, expected: list[tuple[str, str]]) -> bool:
    """
    Return True if the result matches any expected (title_frag, artist_frag).
    A match requires BOTH non-empty fragments to be present, or the one
    non-empty fragment to appear in the corresponding field.
    """
    r_title  = normalise(result.get("title",  ""))
    r_artist = normalise(result.get("artist", ""))

    for title_frag, artist_frag in expected:
        t_norm = normalise(title_frag)
        a_norm = normalise(artist_frag)

        title_ok  = (not t_norm) or (t_norm in r_title)
        artist_ok = (not a_norm) or (a_norm in r_artist)

        if title_ok and artist_ok and (t_norm or a_norm):
            return True

    return False


def precision_at_k(results: list[dict], expected: list[tuple[str, str]], k: int) -> float:
    """Fraction of top-k results that are relevant."""
    if not results:
        return 0.0
    top = results[:k]
    hits = sum(1 for r in top if is_relevant(r, expected))
    return hits / k


def reciprocal_rank(results: list[dict], expected: list[tuple[str, str]]) -> float:
    """1/rank of the first relevant result, or 0 if none found in results."""
    for rank, r in enumerate(results, start=1):
        if is_relevant(r, expected):
            return 1.0 / rank
    return 0.0


# ---------------------------------------------------------------------------
# 8. Run evaluation across all queries and modes
# ---------------------------------------------------------------------------

print("\nRunning evaluation ...")
print("-" * 60)

p5_scores:  dict[str, list[float]] = {"keyword": [], "semantic": [], "hybrid": []}
p10_scores: dict[str, list[float]] = {"keyword": [], "semantic": [], "hybrid": []}
mrr_scores: dict[str, list[float]] = {"keyword": [], "semantic": [], "hybrid": []}

for i, tq in enumerate(TEST_QUERIES, start=1):
    q       = tq["query"]
    cat     = tq["category"]
    exp     = tq["expected"]
    parsed  = parse_query(q)
    sem_txt = parsed["semantic_text"] or q  # fallback to raw if parser strips everything

    print(f"  [{i:2d}/{len(TEST_QUERIES)}] {cat}: {q!r}")

    # Keyword
    kw_results = keyword_search(songs, parsed)

    # Semantic
    sem_results = semantic_search(sem_txt, limit=TOP_K)

    # Hybrid  (uses semantic text + qdrant filters)
    hyb_results = hybrid_search(sem_txt, parsed, limit=TOP_K)

    for mode, res in [("keyword", kw_results), ("semantic", sem_results), ("hybrid", hyb_results)]:
        p5  = precision_at_k(res, exp, 5)
        p10 = precision_at_k(res, exp, 10)
        rr  = reciprocal_rank(res, exp)
        p5_scores[mode].append(p5)
        p10_scores[mode].append(p10)
        mrr_scores[mode].append(rr)

    # Small delay to avoid hammering Qdrant (two calls per query)
    time.sleep(0.05)

print("-" * 60)

def mean(lst: list[float]) -> float:
    return round(sum(lst) / len(lst), 4) if lst else 0.0

precision_at_5  = {m: mean(p5_scores[m])  for m in ("keyword", "semantic", "hybrid")}
precision_at_10 = {m: mean(p10_scores[m]) for m in ("keyword", "semantic", "hybrid")}
mrr             = {m: mean(mrr_scores[m]) for m in ("keyword", "semantic", "hybrid")}

print("\nRetrieval results:")
print(f"  Precision@5:  keyword={precision_at_5['keyword']:.3f}  "
      f"semantic={precision_at_5['semantic']:.3f}  hybrid={precision_at_5['hybrid']:.3f}")
print(f"  Precision@10: keyword={precision_at_10['keyword']:.3f}  "
      f"semantic={precision_at_10['semantic']:.3f}  hybrid={precision_at_10['hybrid']:.3f}")
print(f"  MRR:          keyword={mrr['keyword']:.3f}  "
      f"semantic={mrr['semantic']:.3f}  hybrid={mrr['hybrid']:.3f}")


# ---------------------------------------------------------------------------
# 9. Cluster quality
# ---------------------------------------------------------------------------

print("\nCalculating cluster quality ...")

km = KMeans(n_clusters=N_CLUSTERS, random_state=42, n_init=10)
cluster_labels = km.fit_predict(embeddings)

sil_score = float(silhouette_score(embeddings, cluster_labels, sample_size=500, random_state=42))
print(f"  Silhouette score: {sil_score:.4f}")

# Cluster purity against genre labels
genre_list = [s.get("genre", "unknown") for s in songs]
purity_total = 0
for c in range(N_CLUSTERS):
    members = [genre_list[j] for j in range(len(cluster_labels)) if cluster_labels[j] == c]
    if members:
        most_common_count = Counter(members).most_common(1)[0][1]
        purity_total += most_common_count

purity = purity_total / len(cluster_labels)
print(f"  Cluster purity (genre): {purity:.4f}")

cluster_quality = {
    "silhouette": round(sil_score, 4),
    "purity": round(purity, 4),
}


# ---------------------------------------------------------------------------
# 10. Embedding coverage
# ---------------------------------------------------------------------------

print("\nCalculating embedding coverage ...")

total_lyrics = 0
with open(os.path.join(DATA_RAW, "all_songs_data.csv"), encoding="utf-8", errors="replace", newline="") as f:
    reader = csv.reader(f)
    for row in reader:
        total_lyrics += 1
total_lyrics -= 1  # subtract header row

matched = len(songs)
coverage_rate = round(matched / total_lyrics, 4)

print(f"  Total in all_songs_data: {total_lyrics}")
print(f"  Matched & indexed:       {matched}")
print(f"  Coverage rate:           {coverage_rate:.1%}")

embedding_coverage = {
    "total_lyrics": total_lyrics,
    "matched": matched,
    "rate": coverage_rate,
}


# ---------------------------------------------------------------------------
# 11. Build notes string summarising findings
# ---------------------------------------------------------------------------

# Determine which mode won each metric
best_p5  = max(precision_at_5,  key=precision_at_5.get)
best_p10 = max(precision_at_10, key=precision_at_10.get)
best_mrr = max(mrr,              key=mrr.get)

# Category breakdown: which mode had highest P@5 per category
cat_scores: dict[str, dict[str, list[float]]] = {}
for i, tq in enumerate(TEST_QUERIES):
    cat = tq["category"]
    if cat not in cat_scores:
        cat_scores[cat] = {"keyword": [], "semantic": [], "hybrid": []}
    for mode in ("keyword", "semantic", "hybrid"):
        cat_scores[cat][mode].append(p5_scores[mode][i])

cat_winners = {}
for cat, scores in cat_scores.items():
    winner = max(scores, key=lambda m: mean(scores[m]))
    cat_winners[cat] = winner

notes_parts = []
if cat_winners.get("specific_lookup") == "keyword" or cat_winners.get("artist_lookup") == "keyword":
    notes_parts.append("Keyword excels at specific/artist lookups")
if cat_winners.get("conceptual") == "semantic":
    notes_parts.append("semantic wins on conceptual queries")
if best_mrr == "hybrid" or cat_winners.get("mixed") == "hybrid":
    notes_parts.append("hybrid is best general-purpose mode")

notes = "; ".join(notes_parts) if notes_parts else (
    f"Best P@5: {best_p5}; best MRR: {best_mrr}"
)


# ---------------------------------------------------------------------------
# 12. Write output
# ---------------------------------------------------------------------------

output = {
    "precision_at_5":      precision_at_5,
    "precision_at_10":     precision_at_10,
    "mrr":                 mrr,
    "cluster_quality":     cluster_quality,
    "embedding_coverage":  embedding_coverage,
    "test_queries_count":  len(TEST_QUERIES),
    "notes":               notes,
}

os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
    json.dump(output, f, indent=2)

print(f"\nResults written to {OUTPUT_PATH}")
print("\nFinal JSON:")
print(json.dumps(output, indent=2))
print("\nDone.")
