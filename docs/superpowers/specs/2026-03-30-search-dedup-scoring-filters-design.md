# Search: Dedup, Keyword Scoring & Semantic Filters

**Date:** 2026-03-30
**Status:** Approved
**Trigger:** Query "baby in the title from the 60s" exposed three bugs across keyword, semantic, and hybrid search.

---

## Problem

Three distinct issues degrade search quality:

1. **Hybrid dedup is broken** — Keyword uses slug IDs (`"bruce-channel-hey-baby"`), semantic uses Qdrant integer IDs (`"60"`). The Map-based merge in hybrid never matches, so every song found by both legs appears twice and never gets its scores combined.

2. **Keyword `testBoth` path rewards noise** — For structured queries like "baby in the title from the 60s", the parser correctly extracts `terms: ["baby"]`. But the `testBoth` fallback tries the full unfiltered query, finds "baby in" as a 2-word lyrics sequence in Milli Vanilli (1989), and scores it higher than genuine 1960s matches. Filter syntax is being treated as searchable text.

3. **Semantic applies hard Qdrant filters** — `buildQdrantFilter` creates `must` conditions for decade, genre, mood, artist, and title-scope. This over-constrains semantic search — for the test query, only 4 songs in the entire collection match "1960s + baby in title". Semantic should surface the best vector-similar results, not pre-exclude by metadata.

## Fix 1: Hybrid identity via `title + artist`

**What:** Replace `song.id` as the dedup key in hybrid merge with a key derived from `song.title + song.artist` (lowercased, trimmed).

**Why:** Both search legs always have title and artist in the payload. This is what actually makes a song "the same song" regardless of which backend produced it.

**Where:** `server/src/search/hybrid.ts` — the `merged` Map key.

**Side effect:** Songs found by both legs naturally get boosted — keyword weight + vector weight combined > either alone. This is correct behaviour: appearing in both results is a strong relevance signal.

Also update `payloadToSong` in `server/src/search/utils.ts` to generate a consistent slug-style ID from title + artist, so downstream consumers (UI, dedup in other modes) all use the same identity.

## Fix 2: Noise floor on `testBoth` unfiltered path

**What:** Keep the `testBoth` path in keyword search, but only let the unfiltered score beat the stripped score if the best sequence match is >= 5 words.

**Why:** Short coincidental matches like "baby in" (2 words) are noise from filter syntax landing in lyrics. A 5-word consecutive match against the raw query is genuinely significant and should surface. The threshold prevents structural words from polluting scoring while preserving the value of long phrase matches.

**Where:** `server/src/search/keyword.ts` — the `testBoth` block (lines 51-65).

**Tuning:** Test with representative queries after implementation. The threshold may need adjustment — start at 5, verify that it eliminates noise without suppressing genuine long-phrase matches.

**Note:** Short queries (<=4 words) are unaffected — they already bypass `testBoth` and use unfiltered terms as primary.

## Fix 3: Soft filters in semantic mode

**What:** Remove decade, genre, and mood from Qdrant `must` conditions in `buildQdrantFilter`. Keep title-scope (`scopeTitle`) and artist (`artistHint`) as hard filters — these reflect explicit user intent ("in the title", "by Artist").

**Why:** Decade/genre/mood are contextual preferences, not hard constraints. "From the 60s" should narrow context but not exclude a perfect semantic match from 1959 or 1971. The decade signal is already baked into the embedding since the full query text is vectorised.

**Where:** `server/src/search/semantic.ts` — `buildQdrantFilter` function.

**Impact on hybrid:** In hybrid mode, the semantic leg runs with relaxed filters (more results, broader similarity pool), while the keyword leg handles decade/genre ranking explicitly via bonuses. The merge combines both signals.

**Testing:** Baseline current semantic results for a set of test queries, apply the change, compare. Key queries to test:
- "baby in the title from the 60s" (decade + title scope)
- "heartbreak 90s r&b" (mood + decade + genre)
- "songs about heartbreak" (pure semantic, no filters — should be unchanged)
- "dive bar at 2am" (vibes query — should be unchanged)

## Files changed

| File | Change |
|------|--------|
| `server/src/search/hybrid.ts` | Dedup key: `title + artist` instead of `song.id` |
| `server/src/search/utils.ts` | `payloadToSong` generates consistent ID from title + artist |
| `server/src/search/keyword.ts` | `testBoth`: minimum 5-word sequence to beat stripped score |
| `server/src/search/semantic.ts` | `buildQdrantFilter`: remove decade/genre/mood from `must` |

## Out of scope

- Re-uploading Qdrant vectors (not needed — payload already has title + artist)
- Changes to natural/deep search modes (they build their own ParsedQuery via LLM)
- Query parser changes (parser is working correctly)
- UI changes
