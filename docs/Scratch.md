# Animation Scripts — Full Stage Directions

Each animation ~10s. Text accumulates — nothing fades out. End state is a static summary you can read at your own pace. Scrolling to the next section moves on.

---

## 01 — Keyword Search

**[0:00–0:03] Explain**
Text appears top-centre, stays:
> "A regex parser breaks your query into tokens and scans for exact word matches across titles, lyrics, and artist names."

**[0:03–0:05] Query enters**
Below the text, the query "baby in the title from the 60s" types in.
Words separate. Stop words ("in", "the", "from") grey out.
Remaining tokens float as pills: **baby** · **title** · **60s**

**[0:05–0:07] Success — green checks**
Three song cards animate in below the tokens:
- "Baby Love — The Supremes, 1964" ✓
- "Be My Baby — The Ronettes, 1963" ✓
- "Baby It's You — The Shirelles, 1962" ✓

The word "Baby" highlights in each title. Green check on each card.
Caption appears below cards: "The word is literally there — instant match."

**[0:07–0:09] Limitation — red cross**
Second query appears to the right or below: "songs about heartbreak"
One card: "I Will Always Love You — Dolly Parton" ✗
"heartbreak" shown scanning the title — no match.
Caption: "The song is about heartbreak, but the word isn't there."

**[0:09–0:10] Hold**
Everything stays on screen. Full picture visible. User scrolls when ready.

---

## 02 — Semantic Search

**[0:00–0:03] Explain**
Text appears top-centre, stays:
> "Your query is converted into a vector — a point in meaning-space — and compared against every song's pre-computed summary embedding."

**[0:03–0:05] Query enters**
The query "songs about heartbreak" appears.
Instead of splitting into words, the whole phrase contracts into a single glowing dot labelled "query vector". A field of smaller dots appears below — the song database.

**[0:05–0:07] Success — green checks**
Dashed lines draw from query dot to nearest songs. Cards appear:
- "I Will Always Love You — Dolly Parton, 1974" ✓
- "Un-Break My Heart — Toni Braxton, 1996" ✓
- "Nothing Compares 2 U — Sinead O'Connor, 1990" ✓

Caption: "None contain the word 'heartbreak' — but they're all about it."

**[0:07–0:09] Limitation — red cross**
Second query: "baby in the title from the 60s"
Vector dot formed. Nearest songs:
- "My Girl — The Temptations, 1965" ✗
- "Stand By Me — Ben E. King, 1961" ✗

Caption: "'In the title' and 'from the 60s' are facts, not feelings — vectors can't filter on them."

**[0:09–0:10] Hold**

---

## 03 — Hybrid Search

**[0:00–0:03] Explain**
Text appears top-centre, stays:
> "The regex parser extracts structured filters — decade, genre, artist — then vector search ranks what's left by meaning."

**[0:03–0:05] Query enters**
The query "sad rock from the 80s" appears.
Words animate into two groups:
- LEFT panel "Filters": **80s** → "decade: 1980s", **rock** → "genre: rock"
- RIGHT panel "Meaning": **sad** remains as the semantic query

**[0:05–0:07] Success — green checks**
Left: counter "2,742 → 186 songs"
Right: "sad" becomes a vector dot searching the 186.
Cards:
- "Every Breath You Take — The Police, 1983" ✓
- "Total Eclipse of the Heart — Bonnie Tyler, 1983" ✓

Caption: "Filters narrowed the pool, meaning ranked what was left."

**[0:07–0:09] Limitation — red cross**
Second query: "old songs about missing home"
Parser tries to split — "old" flashes with "?" — doesn't map to a decade.
Falls into the meaning side unfiltered.
Caption: "The parser doesn't know what 'old' means — it's not in its vocabulary."

**[0:09–0:10] Hold**

---

## 04 — Natural Language

**Status: LLM pipeline not yet working correctly. Script TBD.**

Placeholder concept: query → LLM interprets "old" as 1950s–70s → structured JSON → search.
Will script once DeepSeek intent extraction is properly wired.

---

## Design Notes

- Text accumulates, never fades — end state is a readable summary
- Green ✓ / red ✗ pattern is the visual through-line
- Each mode's failure is the next mode's success:
  - Keyword fails on "heartbreak" → Semantic finds it
  - Semantic fails on "baby in title from 60s" → Keyword found it
  - Hybrid fails on "old" → NL would understand it
- Regex is explicitly named in Keyword and Hybrid explanations
- All explanatory text is 1–2 sentences, ~3s reading time
