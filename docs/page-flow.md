# LyricLens — Final Page Structure

## Navigation Header
- **How It Works** (dropdown: Keyword | Semantic | Hybrid | Natural Language) — jumps to animation sections
- **Search** — scrolls to search section on same page
- **Deep Dive** — separate page: technical explanation + 3D visualizer

---

## Page 1: Main (single scrolling page)

### Section 1: Intro

> Welcome to LyricLens — this application demonstrates different methods
> of RAG retrieval and the relative merits of each depending on your use case.

Tech stack card here — brief visual showing the key technologies.

[Skip to Search ↓] button.

### Section 2: Scroll Animations (skippable)
Four animated sequences, properly timed, no overlap:

1. **Keyword Search** — good/bad examples showing exact match strength/weakness
2. **Semantic Search** — good/bad examples showing conceptual search
3. **Hybrid Search** — good/bad examples showing combined approach
4. **Natural Language** — good/bad examples showing LLM-powered understanding

Each sequence: brief explanation → animated diagram → example query → results

### Section 3: Search (anchor target)
- **Search bar** with pre-selected suggested query
- **Agentic summary** — separate DeepSeek call that receives the top 3 results from ALL 4 columns (12 songs total) plus the original query. No prior context. Writes a comparative breakdown.
- **Four columns** — Keyword | Semantic | Hybrid | Natural Language

---

## Page 2: Deep Dive (separate route)
- Extended technical explanation of the architecture
- How embeddings work (lyrics vs summaries, what gets embedded and why)
- The query parser pipeline (regex → NLP → LLM, each layer explained)
- 3D visualizer (actual 3D, interactive, query projection working)
- Evaluation metrics
- Production mapping table (this pattern in the real world)
- Built by Jamie CTA

---

## Agentic Summary Spec

**Trigger:** Separate DeepSeek call after all 4 search modes return.

**Input:** Original query + top 3 results from each column (12 songs total with title, artist, year, genre). No context about having just parsed the query — fresh call.

**System prompt:**
"Compare these four sets of search results for the same query. In 3-4 sentences, explain what each approach found differently and why. Be specific about which songs appeared where. Do not use technical jargon — describe what happened in plain language."

**Output:** Max 500 chars, plain text, sanitized.
