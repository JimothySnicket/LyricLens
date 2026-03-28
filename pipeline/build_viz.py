"""
build_viz.py — Task 17: UMAP 3D reduction + KMeans clustering for the visualizer.

Loads 2742x768 embeddings and song metadata, reduces to 3D with UMAP, assigns
cluster labels with KMeans on the original high-dim embeddings, then writes
data/processed/umap_coords.json for the frontend visualizer.
"""

import json
import os
import time
from collections import Counter

import numpy as np
from sklearn.cluster import KMeans
from umap import UMAP

# ---------------------------------------------------------------------------
# Paths (resolved from project root regardless of cwd)
# ---------------------------------------------------------------------------
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
EMBEDDINGS_PATH = os.path.join(PROJECT_ROOT, "data", "processed", "embeddings.npz")
SONGS_PATH = os.path.join(PROJECT_ROOT, "data", "processed", "merged_songs.json")
OUTPUT_PATH = os.path.join(PROJECT_ROOT, "data", "processed", "umap_coords.json")


def main() -> None:
    # ------------------------------------------------------------------
    # 1. Load data
    # ------------------------------------------------------------------
    print(f"Loading embeddings from {EMBEDDINGS_PATH} ...")
    data = np.load(EMBEDDINGS_PATH)
    embeddings: np.ndarray = data["embeddings"]  # shape (819, 384)
    print(f"  Embeddings shape : {embeddings.shape}")

    print(f"\nLoading songs from {SONGS_PATH} ...")
    with open(SONGS_PATH, encoding="utf-8") as f:
        songs: list[dict] = json.load(f)
    print(f"  Songs loaded     : {len(songs)}")

    if len(songs) != embeddings.shape[0]:
        raise ValueError(
            f"Mismatch: {len(songs)} songs but {embeddings.shape[0]} embeddings."
        )

    # ------------------------------------------------------------------
    # 2. UMAP — reduce 384-dim → 3D
    # ------------------------------------------------------------------
    print("\nRunning UMAP (n_components=3, n_neighbors=15, min_dist=0.1) ...")
    reducer = UMAP(
        n_components=3,
        n_neighbors=15,
        min_dist=0.1,
        random_state=42,
    )
    t0 = time.time()
    coords_3d: np.ndarray = reducer.fit_transform(embeddings)  # shape (819, 3)
    umap_elapsed = time.time() - t0
    print(f"  UMAP completed in {umap_elapsed:.1f}s")
    print(f"  Output shape     : {coords_3d.shape}")

    # ------------------------------------------------------------------
    # 3. KMeans — cluster on original 384-dim embeddings
    # ------------------------------------------------------------------
    print("\nRunning KMeans (n_clusters=8) on original embeddings ...")
    kmeans = KMeans(n_clusters=10, random_state=42, n_init="auto")
    cluster_labels: np.ndarray = kmeans.fit_predict(embeddings)  # shape (819,)
    print(f"  Unique clusters  : {sorted(set(cluster_labels.tolist()))}")

    # ------------------------------------------------------------------
    # 4. Build output records
    # ------------------------------------------------------------------
    print("\nBuilding output records ...")
    records = []
    for i, song in enumerate(songs):
        x, y, z = coords_3d[i]
        records.append(
            {
                "id": song.get("id", ""),
                "x": round(float(x), 6),
                "y": round(float(y), 6),
                "z": round(float(z), 6),
                "title": song.get("title", ""),
                "artist": song.get("artist", ""),
                "genre": song.get("genre", ""),
                "decade": song.get("decade"),
                "topic": song.get("topic", ""),
                "cluster": int(cluster_labels[i]),
            }
        )

    # ------------------------------------------------------------------
    # 5. Write output
    # ------------------------------------------------------------------
    print(f"\nWriting {len(records)} records to {OUTPUT_PATH} ...")
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(records, f, indent=2, ensure_ascii=False)
    file_size_kb = os.path.getsize(OUTPUT_PATH) / 1024
    print(f"  File size        : {file_size_kb:.1f} KB")

    # ------------------------------------------------------------------
    # 6. Stats
    # ------------------------------------------------------------------
    print("\n--- Stats ---")
    print(f"  UMAP time        : {umap_elapsed:.1f}s")
    print(f"  Total songs      : {len(records)}")
    print(f"  Number of clusters: 10")

    cluster_counter = Counter(int(lbl) for lbl in cluster_labels)
    print("\n  Songs per cluster:")
    for cluster_id in sorted(cluster_counter):
        print(f"    Cluster {cluster_id}: {cluster_counter[cluster_id]} songs")

    print("\n  Genre distribution per cluster:")
    cluster_genres: dict[int, Counter] = {i: Counter() for i in range(10)}
    for record in records:
        cluster_genres[record["cluster"]][record["genre"]] += 1
    for cluster_id in sorted(cluster_genres):
        top = cluster_genres[cluster_id].most_common(3)
        top_str = ", ".join(f"{g}({n})" for g, n in top)
        print(f"    Cluster {cluster_id}: {top_str}")

    print("\nDone.")


if __name__ == "__main__":
    main()
