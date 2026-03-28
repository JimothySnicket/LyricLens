"""
embed_lyrics.py — Embed cleaned song lyrics with nomic-ai/nomic-embed-text-v1.5.

Model: nomic-ai/nomic-embed-text-v1.5
  - 768-dimensional output
  - 8192-token context window (handles full song lyrics without truncation)
  - Requires "search_document: " prefix on all indexed text
  - Requires trust_remote_code=True in sentence-transformers

Output: data/processed/embeddings.npz  (shape: N x 768)

Run from project root:
  cd pipeline && .venv/Scripts/activate && python embed_lyrics.py
"""

import json
import os
import numpy as np
from sentence_transformers import SentenceTransformer

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
SONGS_PATH = os.path.join(PROJECT_ROOT, "data", "processed", "merged_songs.json")
OUTPUT_PATH = os.path.join(PROJECT_ROOT, "data", "processed", "embeddings.npz")

MODEL_NAME = "nomic-ai/nomic-embed-text-v1.5"
DOCUMENT_PREFIX = "search_document: "
BATCH_SIZE = 32  # nomic is larger than MiniLM — smaller batches avoid OOM


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))


def main() -> None:
    print(f"Loading songs from {SONGS_PATH} ...")
    with open(SONGS_PATH, encoding="utf-8") as f:
        songs = json.load(f)
    print(f"  {len(songs)} songs loaded.")

    lyrics: list[str] = [
        DOCUMENT_PREFIX + (song.get("lyrics") or "")
        for song in songs
    ]

    print(f"\nInitialising {MODEL_NAME} ...")
    model = SentenceTransformer(MODEL_NAME, trust_remote_code=True)

    print(f"\nEncoding {len(lyrics)} lyrics (this will take several minutes) ...")
    embeddings: np.ndarray = model.encode(
        lyrics,
        show_progress_bar=True,
        batch_size=BATCH_SIZE,
        convert_to_numpy=True,
        normalize_embeddings=True,
    )

    print(f"\nSaving to {OUTPUT_PATH} ...")
    np.savez_compressed(OUTPUT_PATH, embeddings=embeddings)

    file_size_kb = os.path.getsize(OUTPUT_PATH) / 1024
    print("\n--- Stats ---")
    print(f"  Songs embedded : {embeddings.shape[0]}")
    print(f"  Vector dims    : {embeddings.shape[1]}")
    print(f"  Matrix shape   : {embeddings.shape}")
    print(f"  File size      : {file_size_kb:.1f} KB")

    # Sanity check
    assert embeddings.shape[1] == 768, f"Expected 768D, got {embeddings.shape[1]}D"

    print("\n--- Cosine similarity sanity check ---")
    import random
    random.seed(42)
    indices = random.sample(range(len(songs)), 6)

    def label(idx: int) -> str:
        s = songs[idx]
        return f'"{s["title"]}" by {s["artist"]}'

    for i in range(0, 5, 2):
        a, b = indices[i], indices[i + 1]
        sim = cosine_similarity(embeddings[a], embeddings[b])
        print(f"  {label(a)}  vs  {label(b)}")
        print(f"    Similarity: {sim:.4f}")

    print("\nDone.")


if __name__ == "__main__":
    main()
