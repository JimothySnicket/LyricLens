"""
generate_summaries.py — Generate song profile summaries using DeepSeek V3.
Parallelized: 20 concurrent requests. Resumable. Progress visible.

Run from project root:
  cd pipeline && .venv/Scripts/activate && python -u generate_summaries.py
"""

import json
import time
import sys
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests

REPO_ROOT = Path(__file__).resolve().parent.parent
DATA_FILE = REPO_ROOT / "data" / "processed" / "merged_songs.json"

API_KEY = "sk-aba54643a6ca417899a7d32701ebfaa5"
API_URL = "https://api.deepseek.com/chat/completions"
WORKERS = 20
SAVE_EVERY = 50

SYSTEM_PROMPT = """You are a music curator writing short descriptions for a search index.
Describe songs using natural, evocative language.
Do NOT mention the song title or artist name.
Do NOT quote or reference specific lyrics.
Focus on genre, mood, vibe, energy, and cultural context.
Write 2-3 sentences as if describing the song for a playlist."""


def call_deepseek(prompt: str) -> str:
    for attempt in range(3):
        try:
            resp = requests.post(
                API_URL,
                json={
                    "model": "deepseek-chat",
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": prompt},
                    ],
                    "max_tokens": 150,
                    "temperature": 0.7,
                },
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {API_KEY}",
                },
                timeout=30,
            )
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"].strip()
        except Exception as e:
            if attempt == 2:
                return f"[Error: {e}]"
            time.sleep(2 ** attempt)
    return "[Error]"


def build_prompt(song: dict) -> str:
    emotions = song.get("emotions", {})
    top_emotions = sorted(emotions.items(), key=lambda x: x[1], reverse=True)[:3]
    emotion_str = ", ".join(f"{k} ({v:.2f})" for k, v in top_emotions)
    lyrics_preview = (song.get("lyrics") or "")[:300]

    return f"""Describe this song's genre, mood, vibe, and cultural context in 2-3 sentences.
Do NOT mention the title, artist name, or quote any lyrics.
Focus on how the song FEELS — its energy, emotional tone, musical style, and the kind of moment or setting it fits.
Write as if describing it to someone picking music for a playlist.

Context:
- Genre: {song.get('genre', 'Unknown')}
- Year: {song.get('year', 'Unknown')}
- Top emotions detected: {emotion_str}
- Lyrics excerpt: {lyrics_preview}"""


def process_song(idx_song):
    idx, song = idx_song
    prompt = build_prompt(song)
    summary = call_deepseek(prompt)
    return idx, summary


def main():
    print("Loading songs...", flush=True)
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        songs = json.load(f)

    to_process = [(i, s) for i, s in enumerate(songs) if not s.get("summary")]
    total = len(to_process)
    print(f"  {len(songs)} total, {total} need summaries, {WORKERS} workers", flush=True)

    if not to_process:
        print("All done already.")
        return

    done = 0
    errors = 0
    start = time.time()

    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        futures = {pool.submit(process_song, item): item for item in to_process}

        for future in as_completed(futures):
            idx, summary = future.result()
            songs[idx]["summary"] = summary
            done += 1

            if summary.startswith("[Error"):
                errors += 1

            if done % 10 == 0 or done == total:
                elapsed = time.time() - start
                rate = done / elapsed
                remaining = (total - done) / rate if rate > 0 else 0
                print(
                    f"  {done}/{total} ({rate:.1f}/sec, ~{remaining:.0f}s left, {errors} err)",
                    flush=True,
                )

            if done % SAVE_EVERY == 0:
                with open(DATA_FILE, "w", encoding="utf-8") as f:
                    json.dump(songs, f, ensure_ascii=False, indent=2)

    # Final save
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(songs, f, ensure_ascii=False, indent=2)

    elapsed = time.time() - start
    print(f"\nDone: {done} summaries in {elapsed:.0f}s ({errors} errors)", flush=True)

    print("\nSamples:", flush=True)
    for s in [s for s in songs if s.get("summary") and not s["summary"].startswith("[Error")][:3]:
        print(f"  {s['title']} - {s['artist']}", flush=True)
        print(f"    {s['summary']}", flush=True)


if __name__ == "__main__":
    main()
