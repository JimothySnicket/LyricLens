/**
 * build-embeddings.ts — Regenerate the baked song embedding matrices.
 *
 * Replaces the old Python embed_lyrics.py / embed_summaries.py / build_index.py
 * (Qdrant upload) pipeline. Embeds every song's lyrics and summary with the
 * SAME transformers.js nomic embedder the server uses at query time, then writes
 * two raw little-endian Float32 matrices ([N x 768], row i = song i):
 *
 *   data/processed/lyrics_embeddings.f32
 *   data/processed/summary_embeddings.f32
 *
 * These are baked into the Docker image and loaded into memory at startup by
 * lib/vector-store.ts — no external vector DB. Re-run after dataset changes:
 *   bun scripts/build-embeddings.ts
 */
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { embedDocument } from "../server/src/lib/embedder";

const DIM = 768;
const DATA_DIR = resolve(import.meta.dir, "../data/processed");
const SONGS_PATH = resolve(DATA_DIR, "merged_songs.json");

const songs: Array<{ title: string; artist: string; lyrics?: string; summary?: string }> =
  JSON.parse(readFileSync(SONGS_PATH, "utf-8"));
const N = songs.length;
console.log(`Loaded ${N} songs from ${SONGS_PATH}`);

const lyricsMat = new Float32Array(N * DIM);
const summaryMat = new Float32Array(N * DIM);

let missingSummary = 0;
const t0 = performance.now();

for (let i = 0; i < N; i++) {
  const lyrics = songs[i].lyrics || "";
  const summary = songs[i].summary || "";
  if (!summary) missingSummary++;

  // Sequential, not Promise.all — both calls share one ONNX session, which is
  // not safely re-entrant.
  const lvec = await embedDocument(lyrics);
  const svec = await embedDocument(summary);

  if (lvec.length !== DIM || svec.length !== DIM) {
    throw new Error(`Song ${i} produced wrong dim: lyrics=${lvec.length} summary=${svec.length}`);
  }
  lyricsMat.set(lvec, i * DIM);
  summaryMat.set(svec, i * DIM);

  if ((i + 1) % 250 === 0 || i === N - 1) {
    const elapsed = (performance.now() - t0) / 1000;
    const rate = (i + 1) / elapsed;
    const eta = (N - 1 - i) / rate;
    console.log(`  ${i + 1}/${N} embedded (${elapsed.toFixed(0)}s elapsed, ETA ${eta.toFixed(0)}s)`);
  }
}

if (missingSummary) console.log(`  note: ${missingSummary} songs had no summary (embedded empty string)`);

const lyricsPath = resolve(DATA_DIR, "lyrics_embeddings.f32");
const summaryPath = resolve(DATA_DIR, "summary_embeddings.f32");
writeFileSync(lyricsPath, Buffer.from(lyricsMat.buffer));
writeFileSync(summaryPath, Buffer.from(summaryMat.buffer));

console.log(`\nWrote:`);
console.log(`  ${lyricsPath}  (${(lyricsMat.byteLength / 1e6).toFixed(1)} MB)`);
console.log(`  ${summaryPath}  (${(summaryMat.byteLength / 1e6).toFixed(1)} MB)`);

// --- sanity check: a query should rank thematically-related songs highest ---
const { embedQuery } = await import("../server/src/lib/embedder");
const q = await embedQuery("heartbreak and longing for a lost love");
function dot(mat: Float32Array, row: number, v: number[]): number {
  let s = 0; const off = row * DIM;
  for (let d = 0; d < DIM; d++) s += mat[off + d] * v[d];
  return s;
}
const ranked = Array.from({ length: N }, (_, i) => ({ i, s: dot(lyricsMat, i, q) }))
  .sort((a, b) => b.s - a.s)
  .slice(0, 5);
console.log(`\nSanity — top 5 (lyrics) for "heartbreak and longing":`);
for (const r of ranked) console.log(`  ${r.s.toFixed(4)}  ${songs[r.i].title} — ${songs[r.i].artist}`);
console.log("\nDone.");
