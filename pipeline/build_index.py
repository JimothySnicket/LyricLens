"""
build_index.py — Upload 819 song embeddings to Qdrant Cloud.

Collection: song_lyrics
Vectors:    384-dim MiniLM-L6-v2, Cosine distance
Payload:    song metadata with lyrics truncated to 500 chars,
            topic scores flattened to top-level fields.
"""

import json
import os
import random

import numpy as np
from dotenv import load_dotenv
from qdrant_client import QdrantClient, models

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
COLLECTION_NAME = "song_lyrics"
VECTOR_SIZE = 384
BATCH_SIZE = 100
LYRICS_MAX_CHARS = 500
SCORE_KEYS = ("sa", "ro", "vi", "da", "ob", "fe", "nt", "wl", "co", "mu")

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "processed")
SONGS_PATH = os.path.join(DATA_DIR, "merged_songs.json")
EMBEDDINGS_PATH = os.path.join(DATA_DIR, "embeddings.npz")


# ---------------------------------------------------------------------------
# 1. Load environment
# ---------------------------------------------------------------------------
env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
load_dotenv(dotenv_path=env_path)

qdrant_url = os.environ["QDRANT_URL"]
qdrant_api_key = os.environ["QDRANT_API_KEY"]

print(f"Qdrant URL: {qdrant_url}")


# ---------------------------------------------------------------------------
# 2. Load data
# ---------------------------------------------------------------------------
print(f"\nLoading songs from {SONGS_PATH} ...")
with open(SONGS_PATH, "r", encoding="utf-8") as f:
    songs = json.load(f)
print(f"  {len(songs)} songs loaded.")

print(f"Loading embeddings from {EMBEDDINGS_PATH} ...")
data = np.load(EMBEDDINGS_PATH)
embeddings = data["embeddings"]  # shape (819, 384)
print(f"  Embeddings shape: {embeddings.shape}, dtype: {embeddings.dtype}")

assert len(songs) == embeddings.shape[0], (
    f"Song count mismatch: {len(songs)} songs vs {embeddings.shape[0]} embeddings"
)
assert embeddings.shape[1] == VECTOR_SIZE, (
    f"Expected {VECTOR_SIZE}-dim vectors, got {embeddings.shape[1]}"
)


# ---------------------------------------------------------------------------
# 3. Connect to Qdrant Cloud
# ---------------------------------------------------------------------------
print("\nConnecting to Qdrant Cloud ...")
client = QdrantClient(url=qdrant_url, api_key=qdrant_api_key)
print("  Connected.")


# ---------------------------------------------------------------------------
# 4. Create (or recreate) collection
# ---------------------------------------------------------------------------
print(f"\nRecreating collection '{COLLECTION_NAME}' ...")
if client.collection_exists(COLLECTION_NAME):
    print(f"  Collection exists — deleting it first.")
    client.delete_collection(COLLECTION_NAME)

client.create_collection(
    collection_name=COLLECTION_NAME,
    vectors_config=models.VectorParams(
        size=VECTOR_SIZE,
        distance=models.Distance.COSINE,
    ),
)
print(f"  Collection '{COLLECTION_NAME}' created (size={VECTOR_SIZE}, distance=Cosine).")


# ---------------------------------------------------------------------------
# 5. Build and upload points in batches of BATCH_SIZE
# ---------------------------------------------------------------------------
def build_payload(song: dict) -> dict:
    """Flatten song dict into a Qdrant payload, truncating lyrics."""
    scores = song.get("scores", {})
    payload = {
        "title": song.get("title"),
        "artist": song.get("artist"),
        "year": song.get("year"),
        "decade": song.get("decade"),
        "genre": song.get("genre"),
        "chart_position": song.get("chart_position"),
        "topic": song.get("topic"),
        "lyrics": (song.get("lyrics") or "")[:LYRICS_MAX_CHARS],
        "valence": song.get("valence"),
        "energy": song.get("energy"),
        "danceability": song.get("danceability"),
        "acousticness": song.get("acousticness"),
    }
    # Flatten score fields to top level
    for key in SCORE_KEYS:
        payload[key] = scores.get(key)
    return payload


print(f"\nUploading {len(songs)} points in batches of {BATCH_SIZE} ...")
total_uploaded = 0

for batch_start in range(0, len(songs), BATCH_SIZE):
    batch_end = min(batch_start + BATCH_SIZE, len(songs))
    points = [
        models.PointStruct(
            id=i,
            vector=embeddings[i].tolist(),
            payload=build_payload(songs[i]),
        )
        for i in range(batch_start, batch_end)
    ]
    client.upsert(collection_name=COLLECTION_NAME, points=points, wait=True)
    total_uploaded += len(points)
    print(f"  Uploaded {total_uploaded}/{len(songs)} points ...")

print(f"Upload complete: {total_uploaded} points.")


# ---------------------------------------------------------------------------
# 6. Verify: collection info and point count
# ---------------------------------------------------------------------------
print(f"\n--- Collection info ---")
info = client.get_collection(COLLECTION_NAME)
print(f"  Status:      {info.status}")
print(f"  Vector size: {info.config.params.vectors.size}")
print(f"  Distance:    {info.config.params.vectors.distance}")

count_result = client.count(COLLECTION_NAME, exact=True)
print(f"  Point count: {count_result.count}")

assert count_result.count == len(songs), (
    f"Expected {len(songs)} points, found {count_result.count}"
)
print("  Point count matches song count. OK")


# ---------------------------------------------------------------------------
# 7. Quick test search with a random vector
# ---------------------------------------------------------------------------
print(f"\n--- Test search ---")
random_idx = random.randint(0, len(songs) - 1)
query_vector = embeddings[random_idx].tolist()
print(f"  Query: embedding[{random_idx}] ({songs[random_idx]['title']} — {songs[random_idx]['artist']})")

results = client.query_points(
    collection_name=COLLECTION_NAME,
    query=query_vector,
    limit=5,
    with_payload=["title", "artist", "topic"],
)

print("  Top 5 results:")
for hit in results.points:
    print(
        f"    id={hit.id:3d}  score={hit.score:.4f}  "
        f"{hit.payload['title']} — {hit.payload['artist']}  [{hit.payload['topic']}]"
    )

print("\nDone. Qdrant index built successfully.")
