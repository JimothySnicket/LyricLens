"""
classify_emotions.py — Classify song lyrics by emotion using DistilRoBERTa.

Model: j-hartmann/emotion-english-distilroberta-base
Labels: anger, disgust, fear, joy, neutral, sadness, surprise (7 Ekman emotions)

Reads: data/processed/merged_songs.json
Writes: data/processed/merged_songs.json (adds emotion scores to each record)
"""

import json
import time
from pathlib import Path

from transformers import pipeline

REPO_ROOT = Path(__file__).resolve().parent.parent
DATA_FILE = REPO_ROOT / "data" / "processed" / "merged_songs.json"


def main() -> None:
    print("Loading songs...")
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        songs = json.load(f)
    print(f"  {len(songs)} songs loaded")

    print("Loading emotion classifier (j-hartmann/emotion-english-distilroberta-base)...")
    classifier = pipeline(
        "text-classification",
        model="j-hartmann/emotion-english-distilroberta-base",
        top_k=None,
        device=-1,
        truncation=True,
        max_length=512,
    )
    print("  Model loaded")

    # Process in batches
    batch_size = 32
    lyrics_list = [s["lyrics"][:2000] for s in songs]  # Truncate very long lyrics
    all_results = []

    print(f"Classifying {len(songs)} songs in batches of {batch_size}...")
    start = time.time()

    for i in range(0, len(lyrics_list), batch_size):
        batch = lyrics_list[i : i + batch_size]
        batch_results = classifier(batch)
        all_results.extend(batch_results)

        done = min(i + batch_size, len(songs))
        if done % 200 < batch_size or done == len(songs):
            elapsed = time.time() - start
            rate = done / elapsed if elapsed > 0 else 0
            print(f"  {done}/{len(songs)} ({rate:.1f} songs/sec)")

    elapsed = time.time() - start
    print(f"  Done in {elapsed:.1f}s ({len(songs) / elapsed:.1f} songs/sec)")

    # Add emotion scores to each song
    for song, result in zip(songs, all_results):
        emotions = {item["label"]: round(item["score"], 4) for item in result}
        song["emotions"] = emotions

    # Write back
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(songs, f, ensure_ascii=False, indent=2)
    print(f"  Written to {DATA_FILE}")

    # Stats
    print()
    print("Emotion distribution (average scores across all songs):")
    labels = ["anger", "disgust", "fear", "joy", "neutral", "sadness", "surprise"]
    for label in labels:
        avg = sum(s["emotions"][label] for s in songs) / len(songs)
        bar = "█" * int(avg * 50)
        print(f"  {label:<10} {avg:.3f} {bar}")

    # Top 3 songs per emotion
    print()
    for label in ["sadness", "joy", "anger", "fear"]:
        top = sorted(songs, key=lambda s: s["emotions"][label], reverse=True)[:3]
        print(f"Top 3 {label}:")
        for s in top:
            print(f"  {s['emotions'][label]:.3f}  {s['title']} — {s['artist']}")
        print()


if __name__ == "__main__":
    main()
