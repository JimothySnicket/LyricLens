"""
merge_data.py — LyricLens v2 data merge pipeline

Joins lyrics_db.csv (full sequential lyrics) with hits_filtered.csv (metadata)
on normalized artist + title. Outputs data/processed/merged_songs.json.
"""

import json
import re
import sys
from pathlib import Path

import pandas as pd

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
REPO_ROOT = Path(__file__).resolve().parent.parent
RAW_DIR = REPO_ROOT / "data" / "raw"
OUT_DIR = REPO_ROOT / "data" / "processed"
OUT_FILE = OUT_DIR / "merged_songs.json"

LYRICS_DB = RAW_DIR / "lyrics_db.csv"
HITS_CSV = RAW_DIR / "hits_filtered.csv"


# ---------------------------------------------------------------------------
# Normalisation helpers
# ---------------------------------------------------------------------------
def normalize(text: str) -> str:
    """Lowercase, strip leading 'the ', collapse whitespace, strip punctuation."""
    if not isinstance(text, str):
        return ""
    t = text.lower().strip()
    t = re.sub(r"^the\s+", "", t)          # strip leading "the "
    t = re.sub(r"[^\w\s]", "", t)          # remove punctuation
    t = re.sub(r"\s+", " ", t).strip()     # collapse whitespace
    return t


def slugify(artist: str, title: str) -> str:
    """Create a URL-safe id: lowercase, hyphens, no special chars."""
    combined = f"{artist}-{title}"
    slug = combined.lower()
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"[\s_]+", "-", slug)
    slug = re.sub(r"-+", "-", slug)
    return slug.strip("-")


def make_join_key(artist: str, title: str) -> str:
    return f"{normalize(artist)}|||{normalize(title)}"


# ---------------------------------------------------------------------------
# Load lyrics_db.csv
# ---------------------------------------------------------------------------
def load_lyrics_db() -> pd.DataFrame:
    """
    lyrics_db.csv has multi-line lyrics wrapped in double-quotes.
    Standard pandas CSV parsing with quotechar='"' handles this correctly.
    Group by (year, pos, artist, title) and concatenate lyrics fragments.
    """
    print(f"Loading {LYRICS_DB} …")
    df = pd.read_csv(
        LYRICS_DB,
        quotechar='"',
        doublequote=True,
        encoding="utf-8",
        dtype={"year": str, "pos": str},
        on_bad_lines="warn",
    )
    print(f"  Raw rows: {len(df):,}")

    # Ensure lyrics column is string
    df["lyrics"] = df["lyrics"].fillna("").astype(str)

    # Group by identity columns, joining any split lyrics fragments
    grouped = (
        df.groupby(["year", "pos", "artist", "title"], sort=False)
        .agg(
            markets=("markets", "first"),
            lyrics=("lyrics", lambda parts: "\n".join(p for p in parts if p)),
        )
        .reset_index()
    )

    print(f"  Unique songs: {len(grouped):,}")
    return grouped


# ---------------------------------------------------------------------------
# Load hits_filtered.csv
# ---------------------------------------------------------------------------
def load_hits() -> pd.DataFrame:
    print(f"Loading {HITS_CSV} …")
    df = pd.read_csv(HITS_CSV, encoding="utf-8")
    print(f"  Rows: {len(df):,}")
    return df


# ---------------------------------------------------------------------------
# Main merge
# ---------------------------------------------------------------------------
def main() -> None:
    lyrics_df = load_lyrics_db()
    hits_df = load_hits()

    total_lyrics_songs = len(lyrics_df)

    # Build lookup from hits: join_key -> row
    hits_lookup: dict[str, dict] = {}
    for _, row in hits_df.iterrows():
        key = make_join_key(row["artist_name"], row["track_name"])
        hits_lookup[key] = row.to_dict()

    # Build result
    records: list[dict] = []
    matched = 0
    unmatched_lyrics = 0

    for _, song in lyrics_df.iterrows():
        key = make_join_key(song["artist"], song["title"])
        meta = hits_lookup.get(key)

        year_raw = song["year"]
        try:
            year = int(year_raw)
        except (ValueError, TypeError):
            year = 0
        decade = (year // 10) * 10

        if meta is not None:
            matched += 1
            record = {
                "id": slugify(song["artist"], song["title"]),
                "title": song["title"],
                "artist": song["artist"],
                "year": year,
                "decade": decade,
                "genre": meta.get("genre", "unknown") or "unknown",
                "chart_position": int(meta["chart_position"]) if pd.notna(meta.get("chart_position")) else None,
                "topic": meta.get("topic", "") or "",
                "lyrics": song["lyrics"],
                # Audio features
                "valence": float(meta["valence"]) if pd.notna(meta.get("valence")) else 0.0,
                "energy": float(meta["energy"]) if pd.notna(meta.get("energy")) else 0.0,
                "danceability": float(meta["danceability"]) if pd.notna(meta.get("danceability")) else 0.0,
                "acousticness": float(meta["acousticness"]) if pd.notna(meta.get("acousticness")) else 0.0,
                # Lyric theme scores
                "sadness": float(meta["sadness"]) if pd.notna(meta.get("sadness")) else 0.0,
                "romantic": float(meta["romantic"]) if pd.notna(meta.get("romantic")) else 0.0,
                "violence": float(meta["violence"]) if pd.notna(meta.get("violence")) else 0.0,
                "dating": float(meta["dating"]) if pd.notna(meta.get("dating")) else 0.0,
                "obscene": float(meta["obscene"]) if pd.notna(meta.get("obscene")) else 0.0,
                "feelings": float(meta["feelings"]) if pd.notna(meta.get("feelings")) else 0.0,
                "night_time": float(meta["night/time"]) if pd.notna(meta.get("night/time")) else 0.0,
                "world_life": float(meta["world/life"]) if pd.notna(meta.get("world/life")) else 0.0,
                "communication": float(meta["communication"]) if pd.notna(meta.get("communication")) else 0.0,
                "music": float(meta["music"]) if pd.notna(meta.get("music")) else 0.0,
            }
        else:
            # Lyrics but no metadata match — include with zeroed scores
            unmatched_lyrics += 1
            record = {
                "id": slugify(song["artist"], song["title"]),
                "title": song["title"],
                "artist": song["artist"],
                "year": year,
                "decade": decade,
                "genre": "unknown",
                "chart_position": None,
                "topic": "",
                "lyrics": song["lyrics"],
                "valence": 0.0,
                "energy": 0.0,
                "danceability": 0.0,
                "acousticness": 0.0,
                "sadness": 0.0,
                "romantic": 0.0,
                "violence": 0.0,
                "dating": 0.0,
                "obscene": 0.0,
                "feelings": 0.0,
                "night_time": 0.0,
                "world_life": 0.0,
                "communication": 0.0,
                "music": 0.0,
            }

        records.append(record)

    # Songs in hits but not in lyrics — just report, don't include
    hits_keys = set(hits_lookup.keys())
    lyrics_keys = {make_join_key(r["artist"], r["title"]) for _, r in lyrics_df.iterrows()}
    meta_only = hits_keys - lyrics_keys

    # Filter: keep only songs with full metadata (genre != "unknown")
    filtered_records = [r for r in records if r["genre"] != "unknown"]
    filtered_out = len(records) - len(filtered_records)

    # Write output
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    with open(OUT_FILE, "w", encoding="utf-8") as f:
        json.dump(filtered_records, f, ensure_ascii=False, indent=2)

    # ---------------------------------------------------------------------------
    # Stats
    # ---------------------------------------------------------------------------
    print()
    print("=" * 60)
    print("MERGE STATS")
    print("=" * 60)
    print(f"  Unique songs in lyrics_db:        {total_lyrics_songs:>6,}")
    print(f"  Matched with metadata:            {matched:>6,}")
    print(f"  Lyrics only (no metadata match):  {unmatched_lyrics:>6,}")
    print(f"  Metadata only (skipped):          {len(meta_only):>6,}")
    print(f"  Total records before filtering:   {len(records):>6,}")
    print(f"  Records with unknown genre:       {filtered_out:>6,}")
    print(f"  Final records in output:          {len(filtered_records):>6,}")
    print(f"  Output file: {OUT_FILE}")
    print("=" * 60)

    # Sample record (first from filtered output)
    if filtered_records:
        sample = filtered_records[0].copy()
        sample["lyrics"] = sample["lyrics"][:120] + "…"
        print("\nSAMPLE RECORD (first):")
        print(json.dumps(sample, indent=2))


if __name__ == "__main__":
    main()
