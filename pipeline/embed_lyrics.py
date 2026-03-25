"""
embed_lyrics.py — Task 5: Embed song lyrics with sentence-transformers.

Loads merged_songs.json, encodes all lyrics with all-MiniLM-L6-v2, saves
embeddings to data/processed/embeddings.npz, and runs a cosine-similarity
sanity check.
"""

import json
import os
import numpy as np
from sentence_transformers import SentenceTransformer

# ---------------------------------------------------------------------------
# Paths (relative to the project root, not this file's directory)
# ---------------------------------------------------------------------------
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
SONGS_PATH = os.path.join(PROJECT_ROOT, "data", "processed", "merged_songs.json")
OUTPUT_PATH = os.path.join(PROJECT_ROOT, "data", "processed", "embeddings.npz")


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """Return cosine similarity between two 1-D vectors."""
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))


def main() -> None:
    # ------------------------------------------------------------------
    # 1. Load songs
    # ------------------------------------------------------------------
    print(f"Loading songs from {SONGS_PATH} ...")
    with open(SONGS_PATH, encoding="utf-8") as f:
        songs = json.load(f)

    print(f"Loaded {len(songs)} songs.")

    lyrics: list[str] = [song.get("lyrics", "") for song in songs]

    # ------------------------------------------------------------------
    # 2. Initialise model
    # ------------------------------------------------------------------
    print("\nInitialising SentenceTransformer('all-MiniLM-L6-v2') ...")
    model = SentenceTransformer("all-MiniLM-L6-v2")

    # ------------------------------------------------------------------
    # 3. Encode
    # ------------------------------------------------------------------
    print("\nEncoding lyrics (this may take 1-2 minutes) ...")
    embeddings: np.ndarray = model.encode(
        lyrics,
        show_progress_bar=True,
        batch_size=64,
        convert_to_numpy=True,
    )

    # ------------------------------------------------------------------
    # 4. Save
    # ------------------------------------------------------------------
    print(f"\nSaving embeddings to {OUTPUT_PATH} ...")
    np.savez_compressed(OUTPUT_PATH, embeddings=embeddings)

    # ------------------------------------------------------------------
    # 5. Stats
    # ------------------------------------------------------------------
    file_size_kb = os.path.getsize(OUTPUT_PATH) / 1024
    print("\n--- Stats ---")
    print(f"  Songs embedded : {embeddings.shape[0]}")
    print(f"  Vector dims    : {embeddings.shape[1]}")
    print(f"  Matrix shape   : {embeddings.shape}")
    print(f"  File size      : {file_size_kb:.1f} KB ({OUTPUT_PATH})")

    # ------------------------------------------------------------------
    # 6. Sanity check — cosine similarity between 3 random pairs
    # ------------------------------------------------------------------
    print("\n--- Sanity check: cosine similarities ---")
    import random
    random.seed(42)
    indices = random.sample(range(len(songs)), min(6, len(songs)))

    def label(idx: int) -> str:
        s = songs[idx]
        return f"\"{s['title']}\" by {s['artist']} [{s.get('genre', '?')}]"

    for i in range(0, len(indices) - 1, 2):
        a, b = indices[i], indices[i + 1]
        sim = cosine_similarity(embeddings[a], embeddings[b])
        print(f"  {label(a)}  vs  {label(b)}")
        print(f"    Similarity: {sim:.4f}")
        print()

    print("\nDone.")


if __name__ == "__main__":
    main()
