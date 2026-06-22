/**
 * vector-store.ts — In-memory vector search over the song embeddings.
 *
 * At this scale (2,742 songs) an external vector DB buys nothing — Qdrant was
 * doing a flat scan anyway (below its HNSW threshold). So we bake the embedding
 * matrices into the image (data/processed/*.f32, built by scripts/build-embeddings.ts)
 * and do cosine similarity in-process. Vectors are L2-normalised, so cosine == dot.
 *
 * ~17 MB of float32 in memory; a query scans 2,742 × 768 mults per vector space
 * (sub-millisecond) and beats the old Qdrant network round-trip end-to-end.
 */
import { readFileSync } from "fs";
import { resolve } from "path";
import { getSongs } from "./data";
import type { Song } from "./types";

const DIM = 768;
const DATA_DIR = resolve(import.meta.dir, "../../../data/processed");

export type VecSpace = "lyrics" | "summary";

let lyricsMat: Float32Array | null = null;
let summaryMat: Float32Array | null = null;
let count = 0;

function loadMatrix(name: string, expectedRows: number): Float32Array {
  const buf = readFileSync(resolve(DATA_DIR, name));
  // Copy out of the (possibly unaligned) Buffer into a fresh ArrayBuffer.
  const arr = new Float32Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  if (arr.length !== expectedRows * DIM) {
    throw new Error(`${name}: expected ${expectedRows * DIM} floats, got ${arr.length}`);
  }
  return arr;
}

export function loadVectors(): void {
  if (lyricsMat) return;
  count = getSongs().length;
  lyricsMat = loadMatrix("lyrics_embeddings.f32", count);
  summaryMat = loadMatrix("summary_embeddings.f32", count);
  console.log(`Loaded ${count} song vectors (lyrics + summary, ${DIM}d) into memory`);
}

// Eagerly warm at import time so the first request isn't slowed by disk read.
try {
  loadVectors();
} catch (e) {
  console.error("[vector-store] failed to load embeddings:", e instanceof Error ? e.message : e);
}

export interface VecHit {
  index: number;
  score: number;
  song: Song;
}

/**
 * Top-`limit` songs by cosine similarity in the given vector space.
 * `predicate` (optional) restricts the candidate set — the in-memory equivalent
 * of a Qdrant payload filter.
 */
export function vectorSearch(
  query: number[],
  space: VecSpace,
  limit: number,
  predicate?: (song: Song, index: number) => boolean,
): VecHit[] {
  loadVectors();
  const mat = space === "lyrics" ? lyricsMat! : summaryMat!;
  const songs = getSongs();

  const hits: VecHit[] = [];
  for (let i = 0; i < count; i++) {
    if (predicate && !predicate(songs[i], i)) continue;
    let s = 0;
    const off = i * DIM;
    for (let d = 0; d < DIM; d++) s += mat[off + d] * query[d];
    hits.push({ index: i, score: s, song: songs[i] });
  }

  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, limit);
}
