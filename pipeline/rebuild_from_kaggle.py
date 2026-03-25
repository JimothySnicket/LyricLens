"""
rebuild_from_kaggle.py — Rebuild merged_songs.json from the clean Kaggle lyrics
dataset + Jamie's genre classifications.

Sources:
  - data/raw/all_songs_data.csv (6500 Billboard songs with REAL lyrics from Genius)
  - songs_classified.csv (Jamie's genre classifications for the subset)

Output:
  - data/processed/merged_songs.json
"""

import json
import re
from pathlib import Path

import pandas as pd

REPO_ROOT = Path(__file__).resolve().parent.parent
LYRICS_CSV = REPO_ROOT / "data" / "raw" / "all_songs_data.csv"
GENRES_CSV = REPO_ROOT / "songs_classified.csv"
OUT_DIR = REPO_ROOT / "data" / "processed"
OUT_FILE = OUT_DIR / "merged_songs.json"


def slugify(artist: str, title: str) -> str:
    """Create a URL-safe ID from artist + title."""
    raw = f"{artist}-{title}".lower()
    raw = re.sub(r"[^a-z0-9\s-]", "", raw)
    raw = re.sub(r"\s+", "-", raw).strip("-")
    return raw[:80]


def main() -> None:
    # Load lyrics
    print(f"Loading {LYRICS_CSV} ...")
    lyrics_df = pd.read_csv(LYRICS_CSV)
    print(f"  {len(lyrics_df)} songs")

    # Load genre classifications
    print(f"Loading {GENRES_CSV} ...")
    genres_df = pd.read_csv(GENRES_CSV)
    print(f"  {len(genres_df)} classified songs")

    # Build genre lookup by (artist_lower, title_lower)
    genre_lookup = {}
    for _, row in genres_df.iterrows():
        key = (str(row["Artist"]).lower().strip(), str(row["Song Title"]).lower().strip())
        genre_lookup[key] = str(row["Genre"]).strip()

    # Filter lyrics to only classified songs (our subset)
    records = []
    matched = 0
    skipped_no_lyrics = 0
    skipped_no_genre = 0

    for _, row in lyrics_df.iterrows():
        artist = str(row["Artist"]).strip()
        title = str(row["Song Title"]).strip()
        lyrics = str(row.get("Lyrics", ""))

        # Skip songs without real lyrics
        if pd.isna(row.get("Lyrics")) or len(lyrics) < 50:
            skipped_no_lyrics += 1
            continue

        # Look up genre
        key = (artist.lower().strip(), title.lower().strip())
        genre = genre_lookup.get(key)
        if genre is None:
            skipped_no_genre += 1
            continue

        matched += 1
        year = int(row["Year"]) if pd.notna(row.get("Year")) else 0
        decade = (year // 10) * 10
        rank = int(row["Rank"]) if pd.notna(row.get("Rank")) else 0

        record = {
            "id": slugify(artist, title),
            "title": title,
            "artist": artist,
            "year": year,
            "decade": decade,
            "genre": genre,
            "chart_position": rank,
            "lyrics": lyrics,
            "album": str(row.get("Album", "")) if pd.notna(row.get("Album")) else "",
            "writers": str(row.get("Writers", "")) if pd.notna(row.get("Writers")) else "",
        }
        records.append(record)

    # Deduplicate by normalized artist+title
    def normalize(s):
        s = s.lower().strip()
        s = re.sub(r"[^a-z0-9\s]", "", s)
        s = re.sub(r"\s+", " ", s)
        return s.strip()

    seen = set()
    deduped = []
    for r in records:
        key = (normalize(r["artist"]), normalize(r["title"]))
        if key not in seen:
            seen.add(key)
            deduped.append(r)
    dup_count = len(records) - len(deduped)
    records = deduped

    # Write output
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    with open(OUT_FILE, "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)

    # Stats
    print()
    print("=" * 60)
    print("REBUILD STATS")
    print("=" * 60)
    print(f"  Songs in lyrics CSV:      {len(lyrics_df):>6,}")
    print(f"  Classified songs:         {len(genres_df):>6,}")
    print(f"  Matched:                  {matched:>6,}")
    print(f"  Duplicates removed:       {dup_count:>6,}")
    print(f"  Final output:             {len(records):>6,}")
    print(f"  Skipped (no lyrics):      {skipped_no_lyrics:>6,}")
    print(f"  Skipped (no genre):       {skipped_no_genre:>6,}")
    print(f"  Unique genres:            {len(set(r['genre'] for r in records)):>6,}")
    print(f"  Year range:               {min(r['year'] for r in records)} - {max(r['year'] for r in records)}")
    print(f"  Output: {OUT_FILE}")

    # Genre distribution
    from collections import Counter
    genre_counts = Counter(r["genre"] for r in records)
    print()
    print("Genre distribution:")
    for genre, count in genre_counts.most_common(20):
        print(f"  {genre:<35} {count:>5}")
    if len(genre_counts) > 20:
        print(f"  ... and {len(genre_counts) - 20} more genres")

    # Sample record
    print()
    sample = dict(records[0])
    sample["lyrics"] = sample["lyrics"][:120] + "..."
    print("Sample record:")
    print(json.dumps(sample, indent=2))


if __name__ == "__main__":
    main()
