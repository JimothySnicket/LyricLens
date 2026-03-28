"""
clean_lyrics.py — Strip structural section tags from song lyrics in merged_songs.json.

Removes patterns like [Verse 1], [Chorus], [Pre-Chorus], [Bridge], [Intro], [Outro],
[Hook], [Refrain], [Instrumental], and any other [bracketed] section labels.
Collapses excess blank lines. Saves in-place.

Run from project root:
  cd pipeline && .venv/Scripts/activate && python clean_lyrics.py
"""

import json
import os
import re

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
SONGS_PATH = os.path.join(PROJECT_ROOT, "data", "processed", "merged_songs.json")


def clean_lyrics(text: str) -> str:
    """Remove section headers and normalise whitespace."""
    if not text:
        return text
    # Remove anything in square brackets: [Verse 1], [Chorus], [Pre-Chorus], etc.
    text = re.sub(r"\[.*?\]", "", text)
    # Collapse 3+ consecutive newlines to 2
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def main() -> None:
    print(f"Loading {SONGS_PATH} ...")
    with open(SONGS_PATH, encoding="utf-8") as f:
        songs = json.load(f)
    print(f"  {len(songs)} songs loaded.")

    changed = 0
    for song in songs:
        original = song.get("lyrics", "")
        cleaned = clean_lyrics(original)
        if cleaned != original:
            song["lyrics"] = cleaned
            changed += 1

    print(f"  {changed} songs had structural tags removed.")

    # Sanity check: show before/after for first changed song
    for song in songs:
        raw = song.get("lyrics", "")
        if re.search(r"\[", raw):
            print("\nWARNING: Brackets still found in:", song["title"])
            break
    else:
        print("  Sanity check passed: no remaining bracket tags found.")

    print(f"\nSaving in-place to {SONGS_PATH} ...")
    with open(SONGS_PATH, "w", encoding="utf-8") as f:
        json.dump(songs, f, ensure_ascii=False, indent=2)
    print("Done.")


if __name__ == "__main__":
    main()
