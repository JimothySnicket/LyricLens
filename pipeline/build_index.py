"""
build_index.py — Upload song embeddings to Qdrant Cloud.

Collection: song_lyrics
Named vectors:
  - "lyrics"  (384-dim) — MiniLM on raw lyrics text
  - "summary" (384-dim) — MiniLM on generated song profile summaries
Payload: song metadata, emotions, lyrics preview
"""

import json
import os
import random

import numpy as np
from dotenv import load_dotenv
from qdrant_client import QdrantClient, models

COLLECTION_NAME = "song_lyrics"
VECTOR_SIZE = 384
BATCH_SIZE = 100
LYRICS_MAX_CHARS = 500

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "processed")
SONGS_PATH = os.path.join(DATA_DIR, "merged_songs.json")
LYRICS_EMBEDDINGS_PATH = os.path.join(DATA_DIR, "embeddings.npz")
SUMMARY_EMBEDDINGS_PATH = os.path.join(DATA_DIR, "summary_embeddings.npz")

# Load environment
env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
load_dotenv(dotenv_path=env_path)

qdrant_url = os.environ["QDRANT_URL"]
qdrant_api_key = os.environ["QDRANT_API_KEY"]

print(f"Qdrant URL: {qdrant_url}")

# Load data
print(f"\nLoading songs from {SONGS_PATH} ...")
with open(SONGS_PATH, "r", encoding="utf-8") as f:
    songs = json.load(f)
print(f"  {len(songs)} songs loaded.")

print(f"Loading lyrics embeddings ...")
lyrics_emb = np.load(LYRICS_EMBEDDINGS_PATH)["embeddings"]
print(f"  Lyrics embeddings: {lyrics_emb.shape}")

print(f"Loading summary embeddings ...")
summary_emb = np.load(SUMMARY_EMBEDDINGS_PATH)["embeddings"]
print(f"  Summary embeddings: {summary_emb.shape}")

assert len(songs) == lyrics_emb.shape[0] == summary_emb.shape[0], (
    f"Count mismatch: {len(songs)} songs, {lyrics_emb.shape[0]} lyrics emb, {summary_emb.shape[0]} summary emb"
)

# Connect
print("\nConnecting to Qdrant Cloud ...")
client = QdrantClient(url=qdrant_url, api_key=qdrant_api_key)
print("  Connected.")

# Create collection with named vectors
print(f"\nRecreating collection '{COLLECTION_NAME}' with named vectors ...")
if client.collection_exists(COLLECTION_NAME):
    print(f"  Collection exists - deleting it first.")
    client.delete_collection(COLLECTION_NAME)

client.create_collection(
    collection_name=COLLECTION_NAME,
    vectors_config={
        "lyrics": models.VectorParams(size=VECTOR_SIZE, distance=models.Distance.COSINE),
        "summary": models.VectorParams(size=VECTOR_SIZE, distance=models.Distance.COSINE),
    },
)
print(f"  Collection created with 'lyrics' + 'summary' vectors ({VECTOR_SIZE}-dim each).")


def build_payload(song: dict) -> dict:
    payload = {
        "title": song.get("title"),
        "artist": song.get("artist"),
        "year": song.get("year"),
        "decade": song.get("decade"),
        "genre": song.get("genre"),
        "chart_position": song.get("chart_position"),
        "lyrics": (song.get("lyrics") or "")[:LYRICS_MAX_CHARS],
        "album": song.get("album", ""),
        "summary": song.get("summary", ""),
    }
    emotions = song.get("emotions")
    if emotions:
        payload["emotions"] = emotions
    return payload


# Upload
print(f"\nUploading {len(songs)} points in batches of {BATCH_SIZE} ...")
total_uploaded = 0

for batch_start in range(0, len(songs), BATCH_SIZE):
    batch_end = min(batch_start + BATCH_SIZE, len(songs))
    points = [
        models.PointStruct(
            id=i,
            vector={
                "lyrics": lyrics_emb[i].tolist(),
                "summary": summary_emb[i].tolist(),
            },
            payload=build_payload(songs[i]),
        )
        for i in range(batch_start, batch_end)
    ]
    client.upsert(collection_name=COLLECTION_NAME, points=points, wait=True)
    total_uploaded += len(points)
    print(f"  Uploaded {total_uploaded}/{len(songs)} points ...")

print(f"Upload complete: {total_uploaded} points.")

# Verify
print(f"\n--- Collection info ---")
info = client.get_collection(COLLECTION_NAME)
print(f"  Status:      {info.status}")
print(f"  Vectors:     lyrics ({VECTOR_SIZE}d) + summary ({VECTOR_SIZE}d)")

count_result = client.count(COLLECTION_NAME, exact=True)
print(f"  Point count: {count_result.count}")
assert count_result.count == len(songs)
print("  Point count matches. OK")

# Test search on both vectors
print(f"\n--- Test search ---")
test_idx = random.randint(0, len(songs) - 1)
test_song = songs[test_idx]
print(f"  Test song: {test_song['title']} by {test_song['artist']}")

for vec_name in ["lyrics", "summary"]:
    results = client.query_points(
        collection_name=COLLECTION_NAME,
        query=lyrics_emb[test_idx].tolist() if vec_name == "lyrics" else summary_emb[test_idx].tolist(),
        using=vec_name,
        limit=3,
        with_payload=["title", "artist"],
    )
    print(f"\n  Top 3 by '{vec_name}' vector:")
    for hit in results.points:
        print(f"    score={hit.score:.4f}  {hit.payload['title']} by {hit.payload['artist']}")

print("\nDone. Qdrant index built successfully.")
