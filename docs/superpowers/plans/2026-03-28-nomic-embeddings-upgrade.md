# Nomic Embeddings Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade all lyric and summary embeddings from `all-MiniLM-L6-v2` (384D, 256-token limit, 91% songs truncated) to `nomic-ai/nomic-embed-text-v1.5` (768D, 8192-token context, full songs), clean structural noise from lyrics, rebuild Qdrant, and update the server query embedder to match.

**Architecture:** Clean lyrics in-place in `merged_songs.json`, regenerate both `.npz` embedding files with the new model and correct `search_document:` prefix, rebuild the Qdrant collection at 768D, update the server-side query embedder with the mandatory `search_query:` prefix and `layer_norm` normalization step nomic requires, then regenerate the UMAP viz coords. The collection vector names (`"lyrics"`, `"summary"`) and distance metric (COSINE) stay the same — only the dimension and model change.

**Tech Stack:** Python `sentence-transformers>=3.0`, `nomic-ai/nomic-embed-text-v1.5` (Python + ONNX), `@huggingface/transformers` v3+ (Node.js), Qdrant Cloud, `umap-learn`, `scikit-learn`

---

## Context & Key Constraints

- **Working directory for Python tasks:** `pipeline/` — activate venv first: `cd pipeline && .venv/Scripts/activate`
- **`summary_embeddings.npz` has no source script** — it exists in `data/processed/` but the script that generated it is missing. Task 4 creates `embed_summaries.py`.
- **Mandatory nomic prefixes:**
  - All indexed text (lyrics, summaries) → prepend `"search_document: "`
  - All query text at search time → prepend `"search_query: "`
  - Omitting these causes significant quality degradation
- **nomic requires special normalisation in JS** — after mean pooling, apply `layer_norm` then `.normalize(2, -1)`. The Python `sentence-transformers` path handles this internally when `trust_remote_code=True` and `normalize_embeddings=True`.
- **Qdrant collection is recreated** by `build_index.py` (it deletes then recreates) — no manual migration needed
- **Do not touch:** `server/src/search/semantic.ts`, `server/src/search/hybrid.ts`, or anything in `web/` — only the embedder and pipeline change

---

## File Map

| File | Action | What changes |
|------|--------|-------------|
| `pipeline/clean_lyrics.py` | **Create** | Strips `[Verse 1]`, `[Chorus]` etc from all songs in `merged_songs.json`, saves in-place |
| `pipeline/embed_lyrics.py` | **Modify** | Switch model to nomic, add `search_document:` prefix, reduce batch size to 32 |
| `pipeline/embed_summaries.py` | **Create** | New script — embeds `song["summary"]` fields with nomic, saves `summary_embeddings.npz` |
| `pipeline/build_index.py` | **Modify** | `VECTOR_SIZE = 384` → `VECTOR_SIZE = 768` |
| `server/src/lib/embedder.ts` | **Modify** | Switch to nomic model, add `search_query:` prefix, add `layer_norm` normalisation |
| `pipeline/build_viz.py` | **No code change** — just re-run | Loads `embeddings.npz` agnostically; picks up new 768D data automatically |

---

## Task 1: Create `pipeline/clean_lyrics.py`

Strips structural section headers (`[Verse 1]`, `[Chorus]`, `[Bridge]`, etc.) from all lyrics in `merged_songs.json` and saves in-place. These tags take up tokens and add no semantic value.

**Files:**
- Create: `pipeline/clean_lyrics.py`

- [ ] **Step 1: Write `pipeline/clean_lyrics.py`**

```python
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
```

- [ ] **Step 2: Run the cleaning script**

```bash
cd pipeline && .venv/Scripts/activate && python clean_lyrics.py
```

Expected output:
```
Loading .../data/processed/merged_songs.json ...
  2742 songs loaded.
  2123 songs had structural tags removed.
  Sanity check passed: no remaining bracket tags found.
Saving in-place to .../data/processed/merged_songs.json ...
Done.
```

If "WARNING: Brackets still found" appears, investigate — may be non-structural brackets in older lyrics (e.g. `[ad lib]`). These are acceptable to leave since they're not section headers consuming meaningless tokens at the start of the content.

- [ ] **Step 3: Spot-check the result**

```bash
python -c "
import json, re
with open('../data/processed/merged_songs.json', encoding='utf-8') as f:
    songs = json.load(f)
with_tags = sum(1 for s in songs if re.search(r'\[(Verse|Chorus|Bridge|Hook|Intro|Outro|Pre-Chorus|Refrain)', s.get('lyrics',''), re.I))
print(f'Songs still containing section headers: {with_tags}')
s = next(s for s in songs if s.get('lyrics'))
print('First 300 chars of first song lyrics:')
print(s['lyrics'][:300])
"
```

Expected: `Songs still containing section headers: 0`

- [ ] **Step 4: Commit**

```bash
git add pipeline/clean_lyrics.py data/processed/merged_songs.json
git commit -m "feat: strip structural section tags from lyrics"
```

---

## Task 2: Update `pipeline/embed_lyrics.py` for nomic

Replace `all-MiniLM-L6-v2` with `nomic-ai/nomic-embed-text-v1.5`. Add `search_document:` prefix to all lyrics. Reduce batch size to 32 (nomic is a larger model). Output is now 768D.

**Files:**
- Modify: `pipeline/embed_lyrics.py`

- [ ] **Step 1: Replace `pipeline/embed_lyrics.py` entirely**

```python
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
```

- [ ] **Step 2: Run the embedding script**

```bash
cd pipeline && .venv/Scripts/activate && python embed_lyrics.py
```

Expected output (abridged):
```
Loading songs from .../merged_songs.json ...
  2742 songs loaded.

Initialising nomic-ai/nomic-embed-text-v1.5 ...
  (first run downloads model weights ~550MB)

Encoding 2742 lyrics (this will take several minutes) ...
  100%|████████████████| 86/86 [XX:XX<00:00]

Saving to .../embeddings.npz ...

--- Stats ---
  Songs embedded : 2742
  Vector dims    : 768
  Matrix shape   : (2742, 768)
  File size      : XXXX.X KB
```

If you see `assert` failure on dims — stop, the model output is wrong. Check that `trust_remote_code=True` is accepted (may need `pip install -U sentence-transformers`).

- [ ] **Step 3: Verify output shape**

```bash
python -c "
import numpy as np
e = np.load('../data/processed/embeddings.npz')
print('Shape:', e['embeddings'].shape)
assert e['embeddings'].shape == (2742, 768), 'WRONG SHAPE'
print('OK')
"
```

Expected: `Shape: (2742, 768)`

- [ ] **Step 4: Commit**

```bash
git add pipeline/embed_lyrics.py data/processed/embeddings.npz
git commit -m "feat: re-embed lyrics with nomic-embed-text-v1.5 (768D, 8192-token context)"
```

---

## Task 3: Create `pipeline/embed_summaries.py`

The script that generated `summary_embeddings.npz` is missing from the repo. Create it now using the same nomic model and `search_document:` prefix.

**Files:**
- Create: `pipeline/embed_summaries.py`

- [ ] **Step 1: Create `pipeline/embed_summaries.py`**

```python
"""
embed_summaries.py — Embed song profile summaries with nomic-ai/nomic-embed-text-v1.5.

Summaries are 2-3 sentence DeepSeek-generated descriptions of each song's mood,
vibe, and cultural context. They complement raw lyric embeddings — capturing
higher-level semantic meaning in a compact, model-friendly form.

Model: nomic-ai/nomic-embed-text-v1.5
  - 768-dimensional output
  - 8192-token context window
  - Requires "search_document: " prefix on all indexed text
  - Requires trust_remote_code=True in sentence-transformers

Output: data/processed/summary_embeddings.npz  (shape: N x 768)

Run from project root:
  cd pipeline && .venv/Scripts/activate && python embed_summaries.py
"""

import json
import os
import numpy as np
from sentence_transformers import SentenceTransformer

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
SONGS_PATH = os.path.join(PROJECT_ROOT, "data", "processed", "merged_songs.json")
OUTPUT_PATH = os.path.join(PROJECT_ROOT, "data", "processed", "summary_embeddings.npz")

MODEL_NAME = "nomic-ai/nomic-embed-text-v1.5"
DOCUMENT_PREFIX = "search_document: "
BATCH_SIZE = 32


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))


def main() -> None:
    print(f"Loading songs from {SONGS_PATH} ...")
    with open(SONGS_PATH, encoding="utf-8") as f:
        songs = json.load(f)
    print(f"  {len(songs)} songs loaded.")

    # Summaries are short (2-3 sentences) — well within nomic's context window.
    # Fall back to empty string for any song missing a summary.
    summaries: list[str] = [
        DOCUMENT_PREFIX + (song.get("summary") or "")
        for song in songs
    ]

    missing = sum(1 for s in songs if not s.get("summary"))
    if missing:
        print(f"  WARNING: {missing} songs have no summary — will embed empty string.")

    print(f"\nInitialising {MODEL_NAME} ...")
    # Model weights are already cached from embed_lyrics.py — fast load.
    model = SentenceTransformer(MODEL_NAME, trust_remote_code=True)

    print(f"\nEncoding {len(summaries)} summaries ...")
    embeddings: np.ndarray = model.encode(
        summaries,
        show_progress_bar=True,
        batch_size=BATCH_SIZE,
        convert_to_numpy=True,
        normalize_embeddings=True,
    )

    print(f"\nSaving to {OUTPUT_PATH} ...")
    np.savez_compressed(OUTPUT_PATH, embeddings=embeddings)

    file_size_kb = os.path.getsize(OUTPUT_PATH) / 1024
    print("\n--- Stats ---")
    print(f"  Summaries embedded : {embeddings.shape[0]}")
    print(f"  Vector dims        : {embeddings.shape[1]}")
    print(f"  Matrix shape       : {embeddings.shape}")
    print(f"  File size          : {file_size_kb:.1f} KB")

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
```

- [ ] **Step 2: Run the summary embedding script**

```bash
cd pipeline && .venv/Scripts/activate && python embed_summaries.py
```

Expected output (abridged):
```
Loading songs from .../merged_songs.json ...
  2742 songs loaded.
Initialising nomic-ai/nomic-embed-text-v1.5 ...
  (weights already cached — fast load)
Encoding 2742 summaries ...
  100%|████████████████| 86/86 [XX:XX<00:00]
--- Stats ---
  Summaries embedded : 2742
  Vector dims        : 768
  Matrix shape       : (2742, 768)
```

- [ ] **Step 3: Verify output shape**

```bash
python -c "
import numpy as np
s = np.load('../data/processed/summary_embeddings.npz')
print('Shape:', s['embeddings'].shape)
assert s['embeddings'].shape == (2742, 768), 'WRONG SHAPE'
print('OK')
"
```

Expected: `Shape: (2742, 768)`

- [ ] **Step 4: Commit**

```bash
git add pipeline/embed_summaries.py data/processed/summary_embeddings.npz
git commit -m "feat: add embed_summaries.py, re-embed summaries with nomic-embed-text-v1.5"
```

---

## Task 4: Update `pipeline/build_index.py` and Rebuild Qdrant

Change `VECTOR_SIZE` from 384 to 768. The script already deletes and recreates the collection — no manual Qdrant migration needed.

**Files:**
- Modify: `pipeline/build_index.py` (line 21 only)

- [ ] **Step 1: Change `VECTOR_SIZE`**

In `pipeline/build_index.py`, find line:
```python
VECTOR_SIZE = 384
```
Replace with:
```python
VECTOR_SIZE = 768
```

That is the only code change needed. The rest of the script is already correct.

- [ ] **Step 2: Run `build_index.py`**

```bash
cd pipeline && .venv/Scripts/activate && python build_index.py
```

Expected output (abridged):
```
Qdrant URL: https://...qdrant.io
Loading songs from .../merged_songs.json ...
  2742 songs loaded.
Loading lyrics embeddings ...
  Lyrics embeddings: (2742, 768)
Loading summary embeddings ...
  Summary embeddings: (2742, 768)
Connecting to Qdrant Cloud ...
  Connected.
Recreating collection 'song_lyrics' with named vectors ...
  Collection exists - deleting it first.
  Collection created with 'lyrics' + 'summary' vectors (768-dim each).
Uploading 2742 points in batches of 100 ...
  Uploaded 2742/2742 points ...
Upload complete: 2742 points.
--- Collection info ---
  Status:      green
  Vectors:     lyrics (768d) + summary (768d)
  Point count: 2742
  Point count matches. OK
--- Test search ---
  Top 3 by 'lyrics' vector: ...
  Top 3 by 'summary' vector: ...
Done. Qdrant index built successfully.
```

If upload fails mid-way (network timeout), re-run — the script deletes and recreates from scratch.

- [ ] **Step 3: Commit**

```bash
git add pipeline/build_index.py
git commit -m "feat: rebuild Qdrant index with 768D nomic vectors"
```

---

## Task 5: Update `server/src/lib/embedder.ts`

Switch the server's query embedder to nomic. Three changes:
1. Model name: `Xenova/all-MiniLM-L6-v2` → `nomic-ai/nomic-embed-text-v1.5`
2. Add `"search_query: "` prefix to all query text
3. Replace `normalize: true` with manual `layer_norm().normalize(2, -1)` — nomic requires this specific normalisation in JS (Python sentence-transformers handles it internally via `trust_remote_code`; JS does not have that mechanism)

**Files:**
- Modify: `server/src/lib/embedder.ts`

- [ ] **Step 1: Replace `server/src/lib/embedder.ts` entirely**

```typescript
import { pipeline, layer_norm } from "@huggingface/transformers";

let embedder: Awaited<ReturnType<typeof pipeline>> | null = null;

export async function getEmbedder() {
  if (!embedder) {
    embedder = await pipeline("feature-extraction", "nomic-ai/nomic-embed-text-v1.5", {
      dtype: "fp32",
    });
  }
  return embedder;
}

export async function embedQuery(text: string): Promise<number[]> {
  const embed = await getEmbedder();

  // nomic requires "search_query: " prefix at query time.
  // "search_document: " is used for indexed text (in the Python pipeline).
  const output = await embed(["search_query: " + text], { pooling: "mean" });

  // nomic requires layer_norm before L2 normalisation.
  // (Python sentence-transformers handles this internally via trust_remote_code;
  //  transformers.js does not, so we apply it manually.)
  const lastDim = output.dims[output.dims.length - 1];
  const normalized = layer_norm(output, [lastDim]).normalize(2, -1);

  return Array.from(normalized.data as Float32Array);
}
```

- [ ] **Step 2: Run typecheck**

```bash
cd c:/Users/Jamie/Documents/Ai Dev Tools/Portfolio/Lyric-Lens && bun run typecheck
```

Expected: no errors in `server/src/lib/embedder.ts`. Any pre-existing errors in other files (e.g. `EmbeddingViz.tsx`) are unrelated and can be ignored.

- [ ] **Step 3: Start dev server and run a search smoke test**

```bash
# Kill any existing server on 5201 first if needed:
netstat -ano | grep :5201 | awk '{print $5}' | xargs taskkill //PID //F 2>/dev/null || true

bun run dev:server
```

Wait for: `Server running on http://localhost:5201`

Then in a separate terminal:
```bash
curl -s "http://localhost:5201/api/search?q=heartbreak+love+80s&mode=semantic" | python -m json.tool | head -40
```

Expected: JSON response with `results` array containing songs. Scores should be in roughly `0.5–0.85` range (nomic cosine similarity). If scores are all near 0 or all near 1, the normalisation step is wrong.

**Important:** The first request will be slow (10–60s) while the ONNX model downloads and caches (~550MB). Subsequent requests will be fast.

- [ ] **Step 4: Commit**

```bash
git add server/src/lib/embedder.ts
git commit -m "feat: update query embedder to nomic-embed-text-v1.5 with search_query prefix and layer_norm"
```

---

## Task 6: Regenerate Viz Data

Re-run `build_viz.py` to generate new `umap_coords.json` from the 768D embeddings. No code changes needed — UMAP works with any input dimensionality. Increase `n_clusters` from 8 to 10 to better reflect the larger, higher-quality embedding space over 2742 songs.

**Files:**
- Modify: `pipeline/build_viz.py` (cluster count and comment only)
- Regenerate: `data/processed/umap_coords.json`

- [ ] **Step 1: Update cluster count and header comment in `build_viz.py`**

Find and replace the header comment:
```python
# OLD:
# Loads 819x384 embeddings and song metadata, reduces to 3D with UMAP, assigns
# cluster labels with KMeans on the original high-dim embeddings, then writes
```
Replace with:
```python
# Loads 2742x768 embeddings and song metadata, reduces to 3D with UMAP, assigns
# cluster labels with KMeans on the original high-dim embeddings, then writes
```

Find:
```python
    kmeans = KMeans(n_clusters=8, random_state=42, n_init="auto")
```
Replace with:
```python
    kmeans = KMeans(n_clusters=10, random_state=42, n_init="auto")
```

Find:
```python
    print(f"  Number of clusters: 8")
```
Replace with:
```python
    print(f"  Number of clusters: 10")
```

- [ ] **Step 2: Run `build_viz.py`**

```bash
cd pipeline && .venv/Scripts/activate && python build_viz.py
```

Expected output (abridged):
```
Loading embeddings from .../embeddings.npz ...
  Embeddings shape : (2742, 768)

Loading songs from .../merged_songs.json ...
  Songs loaded     : 2742

Running UMAP (n_components=3, n_neighbors=15, min_dist=0.1) ...
  UMAP completed in XX.Xs
  Output shape     : (2742, 3)

Running KMeans (n_clusters=10) on original embeddings ...
  Unique clusters  : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
```

UMAP on 768D × 2742 points takes 2–5 minutes. This is normal.

- [ ] **Step 3: Verify output**

```bash
python -c "
import json
with open('../data/processed/umap_coords.json', encoding='utf-8') as f:
    d = json.load(f)
print(f'Points: {len(d)}')
print(f'Sample: {d[0]}')
clusters = set(p[\"cluster\"] for p in d)
print(f'Clusters: {sorted(clusters)}')
"
```

Expected:
```
Points: 2742
Sample: {"id": "...", "x": ..., "y": ..., "z": ..., "title": "...", "artist": "...", "genre": "...", "decade": ..., "topic": "", "cluster": N}
Clusters: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
```

- [ ] **Step 4: Commit**

```bash
git add pipeline/build_viz.py data/processed/umap_coords.json
git commit -m "feat: regenerate UMAP coords with 768D nomic embeddings, 10 clusters"
```

---

## Task 7: End-to-End Smoke Test

Verify all four search modes work and the visualizer loads with the new data.

**Files:** None — read-only verification

- [ ] **Step 1: Ensure both servers are running**

```bash
bun run dev
```

Wait for both:
- Frontend: `http://localhost:5200`
- Backend: `http://localhost:5201`

- [ ] **Step 2: Test all four search modes via API**

```bash
# Keyword
curl -s "http://localhost:5201/api/search?q=love+in+the+rain&mode=keyword" | python -m json.tool | grep -E '"title"|"score"' | head -10

# Semantic
curl -s "http://localhost:5201/api/search?q=love+in+the+rain&mode=semantic" | python -m json.tool | grep -E '"title"|"score"' | head -10

# Hybrid
curl -s "http://localhost:5201/api/search?q=love+in+the+rain&mode=hybrid" | python -m json.tool | grep -E '"title"|"score"' | head -10

# Natural language
curl -s "http://localhost:5201/api/search?q=sad+songs+about+missing+someone&mode=natural" | python -m json.tool | grep -E '"title"|"score"' | head -10
```

Expected: each returns a non-empty `results` array with songs and sensible scores.

- [ ] **Step 3: Check visualizer loads with new data**

```bash
curl -s "http://localhost:5201/api/viz/data" | python -c "
import sys, json
d = json.load(sys.stdin)
print(f'Points: {len(d)}')
clusters = set(p[\"cluster\"] for p in d)
print(f'Clusters: {sorted(clusters)}')
print(f'Sample: {d[0][\"title\"]} — {d[0][\"artist\"]}')
"
```

Expected: 2742 points, clusters [0–9].

Navigate to `http://localhost:5200/visualizer` — the 3D scatter should render with 10 colour groups and full rotate/pan/zoom working.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete nomic embedding upgrade — 768D, full lyric context, clean lyrics"
```

---

## Self-Review

### Spec coverage
- ✅ Lyrics cleaned (Task 1) — strips [Verse 1], [Chorus] etc.
- ✅ nomic-ai/nomic-embed-text-v1.5 used for lyrics (Task 2)
- ✅ nomic-ai/nomic-embed-text-v1.5 used for summaries (Task 3)
- ✅ `search_document:` prefix on all indexed text (Tasks 2, 3)
- ✅ `search_query:` prefix on all query text (Task 5)
- ✅ `layer_norm().normalize(2,-1)` in JS embedder (Task 5)
- ✅ `normalize_embeddings=True` in Python pipeline (Tasks 2, 3)
- ✅ Qdrant rebuilt at 768D (Task 4)
- ✅ Viz regenerated with new embeddings (Task 6)
- ✅ Search engines (semantic.ts, hybrid.ts) not touched
- ✅ embed_summaries.py created (was missing from repo, Task 3)

### Placeholders
None — every step has exact commands, exact code, exact expected output.

### Type consistency
- `embedder` type annotation updated to use proper `ReturnType<typeof pipeline>` in Task 5
- `Float32Array` cast on `normalized.data` ensures correct return type
- `layer_norm` import matches `@huggingface/transformers` v3 export
