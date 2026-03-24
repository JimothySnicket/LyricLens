# Search Logic — 5 Mock Queries

For each query, trace what should happen in all 3 modes.

---

## Query 1: "love songs from the 80s"

**Parser extracts:**
- Decade filter: 1980
- Semantic text: "love"
- Terms: ["love"]

### Keyword
1. Load all 723 songs from memory
2. Hard filter: only 1980s songs remain (~180)
3. Score each: check "love" against title, lyrics, artist — add weights
4. Sort by score → return top 30

### Semantic
1. Embed "love" → 384-dim vector
2. Query Qdrant with vector + filter `decade=1980`
3. Qdrant returns top 20 songs from the 1980s ranked by similarity to "love"

### Hybrid
1. Embed "love" → 384-dim vector
2. Query Qdrant with vector + filter `decade=1980`
3. Also score results for keyword matches ("love" in title gets a bonus)
4. Re-rank by blended score → return top 20

**Expected difference:** Keyword finds songs with "love" literally in the text. Semantic finds songs about love even without the word. Hybrid does both — ranks by meaning but boosts exact matches.

---

## Query 2: "by Michael Jackson"

**Parser extracts:**
- Artist hint: ["michael", "jackson"]
- Semantic text: "" (empty — "by" is a stop word, rest consumed by artist)
- Terms: []

### Keyword
1. Load all 723 songs
2. Hard filter: artist must contain "michael" AND "jackson" → ~12 songs
3. No terms to score against, so chart position tiebreaker only
4. Return all 12

### Semantic
1. No semantic text to embed — this is a pure filter query
2. ???

### Hybrid
1. Same problem — no text to embed
2. ???

**The question:** What should semantic/hybrid do when there's no semantic content? Options:
- A) Embed the original query "by Michael Jackson" and filter by artist
- B) Skip vector search, just filter and return all matches sorted by chart position
- C) Return nothing (current behavior — broken)

---

## Query 3: "sad rock"

**Parser extracts:**
- Genre filter: rock
- Mood: sadness (min 0.25)
- Semantic text: "" (empty — both words consumed)
- Terms: []

### Keyword
1. Load all 723 songs
2. Hard filter: genre=rock (~240 songs)
3. Soft score: add sadness score * 3 for each song
4. Sort by mood score → return top 30 saddest rock songs

### Semantic
1. No semantic text — another pure filter query
2. ???

### Hybrid
1. Same problem
2. ???

**The question:** "sad rock" has no semantic component after parsing. But the USER intent is semantic — they want rock songs with a sad VIBE. Should we:
- A) Embed "sad rock" as the vector query, filter by genre=rock, let Qdrant find sad-vibing rock songs
- B) Just filter genre=rock + mood score >= 0.25 (no vectors needed)
- C) Something else?

---

## Query 4: "songs that feel like driving at night"

**Parser extracts:**
- No filters (no decade, genre, artist, mood, audio matches)
- Semantic text: "feel like driving night"
- Terms: ["feel", "like", "driving", "night"]

### Keyword
1. Load all 723 songs
2. No hard filters — search all
3. Score: check each term against title/lyrics/artist
4. Finds songs literally containing "feel", "like", "night", "driving"

### Semantic
1. Embed "feel like driving night" → vector
2. Query Qdrant with vector, no filters
3. Returns songs semantically similar to the concept of driving at night

### Hybrid
1. Embed "feel like driving night" → vector
2. Query Qdrant with vector, no filters
3. Boost results that also contain the literal words
4. Re-rank

**This is the showcase query** — keyword fails (finds "I Gotta Feeling"), semantic wins (finds nocturnal/driving mood songs). No ambiguity in the logic here.

---

## Query 5: "baby in the title from the 60s"

**Parser extracts:**
- Decade filter: 1960
- Scope: scopeTitle = true
- Semantic text: "baby"
- Terms: ["baby"]

### Keyword
1. Load all 723 songs
2. Hard filter: decade=1960
3. Score: "baby" checked against title (12x weight because scopeTitle), lyrics (2x), artist (4x)
4. Scope enforcement: require at least one title match
5. Returns songs from the 60s with "baby" in the title

### Semantic
1. Embed "baby" → vector
2. Query Qdrant with vector + filter `decade=1960`
3. Returns 60s songs semantically similar to "baby"
4. Has NO concept of "in the title" — scope is meaningless to vectors

### Hybrid
1. Embed "baby" → vector
2. Query Qdrant with vector + filter `decade=1960`
3. Boost results where "baby" appears in the title
4. Re-rank — title matches rise to the top

**This is the other showcase** — keyword nails it (exact title match), semantic misses the point ("baby" as a concept is too vague). Hybrid should perform in between.

---

## Open Questions

1. When there's no semantic text (queries 2 and 3), what should semantic/hybrid mode do?
2. Should mood/audio features be Qdrant filters or client-side scoring?
3. For artist queries in semantic mode — is "similarity to Michael Jackson songs" meaningful, or should it just be a filter?
