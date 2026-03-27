# LyricLens v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-stack portfolio app demonstrating keyword vs semantic vs hybrid search on 691 chart hits (1950–2019) with a 3D embedding visualizer and animated explainer.

**Architecture:** Monorepo with three packages — `web` (React + Vite + Tailwind), `server` (Bun + Hono API), and `pipeline` (Python build-time scripts). Frontend talks to the Hono API, which queries Qdrant Cloud for vector search and runs keyword matching locally. Theme system with light/dark mode via CSS custom properties from day one.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, Motion (framer-motion), Plotly.js, Bun, Hono, Qdrant Cloud, @huggingface/transformers (query-time embedding), Google Generative AI (Gemini Flash for RAG), Python + sentence-transformers (build-time pipeline)

**Ports:** Frontend dev: 5200, Backend: 5201 (not in reserved range)

**Reference docs:**
- Spec: `lyriclens-v2-spec.md`
- Wireframes: `mockups/lyriclens-wireframes-v2.excalidraw`
- Retrieval storyboard: `mockups/retrieval-storyboard.excalidraw`
- Original v1: `C:\Users\Jamie\Documents\Ai Dev Tools\AI-Job-Applications\lyric-search-rag.html`

---

## File Structure

```
Lyric-Lens/
├── package.json                    # root workspace config
├── .gitignore
├── .env.example                    # QDRANT_URL, QDRANT_API_KEY, GEMINI_API_KEY
├── CLAUDE.md                       # project-level instructions
│
├── data/
│   ├── raw/                        # source CSVs (gitignored)
│   │   ├── lyrics_db.csv
│   │   ├── hits_filtered.csv
│   │   ├── all_chart_hits.csv
│   │   └── target_hits.csv
│   └── processed/                  # build-time outputs (gitignored except schema)
│       ├── merged_songs.json       # merged lyrics + metadata
│       ├── embeddings.npz          # vectors for viz
│       └── umap_coords.json        # 3D coordinates for scatter plot
│
├── pipeline/
│   ├── requirements.txt
│   ├── merge_data.py               # join lyrics_db + hits_filtered
│   ├── embed_lyrics.py             # sentence-transformers → vectors
│   ├── build_index.py              # upload to Qdrant Cloud
│   ├── build_viz.py                # UMAP reduction + clustering
│   └── evaluate.py                 # precision@k, MRR metrics
│
├── server/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts                # Hono app entry, CORS, port 5201
│       ├── routes/
│       │   ├── search.ts           # POST /api/search/:mode
│       │   ├── filters.ts          # GET /api/filters
│       │   ├── stats.ts            # GET /api/stats (eval metrics)
│       │   ├── viz.ts              # GET /api/viz/data, POST /api/viz/query
│       │   └── rag.ts              # POST /api/rag/answer
│       ├── search/
│       │   ├── keyword.ts          # weighted term matching (ported from v1)
│       │   ├── semantic.ts         # Qdrant vector query
│       │   ├── hybrid.ts           # filter + vector
│       │   └── utils.ts            # shared: payloadToSong, buildMatchReason
│       ├── lib/
│       │   ├── types.ts            # shared TypeScript interfaces (server-side)
│       │   ├── data.ts             # loads merged_songs.json at startup
│       │   ├── qdrant.ts           # Qdrant client wrapper
│       │   ├── embedder.ts         # @huggingface/transformers query embedding
│       │   ├── query-parser.ts     # NLP query decomposition (ported from v1)
│       │   └── gemini.ts           # Gemini Flash RAG generation
│       └── __tests__/
│           ├── query-parser.test.ts
│           ├── keyword.test.ts
│           ├── semantic.test.ts
│           └── hybrid.test.ts
│
├── web/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── index.html
│   └── src/
│       ├── main.tsx                # entry point
│       ├── App.tsx                 # router + theme provider
│       ├── index.css               # Tailwind imports + CSS custom properties
│       ├── theme/
│       │   └── ThemeProvider.tsx    # dark/light toggle, localStorage persistence
│       ├── pages/
│       │   ├── Search.tsx          # search page (zones 1 + 2 from wireframe)
│       │   ├── Visualizer.tsx      # 3D embedding explorer
│       │   └── HowItWorks.tsx      # animated retrieval explainer
│       ├── components/
│       │   ├── Layout.tsx          # shell with nav
│       │   ├── Nav.tsx             # navigation + theme toggle
│       │   ├── SearchBar.tsx       # input + suggestions
│       │   ├── ModeToggle.tsx      # keyword/semantic/hybrid tabs
│       │   ├── FilterPanel.tsx     # active filters as chips
│       │   ├── ResultCard.tsx      # song result with expandable detail
│       │   ├── QueryChips.tsx      # query interpretation display
│       │   ├── UnderTheHood.tsx    # collapsible pipeline explanation
│       │   ├── EmbeddingViz.tsx    # Plotly 3D scatter wrapper
│       │   └── how-it-works/
│       │       ├── QueryDecomposition.tsx   # animated sequence 1
│       │       ├── TheFunnel.tsx            # animated sequence 2
│       │       ├── EmbeddingMoment.tsx      # animated sequence 3
│       │       └── ModeComparison.tsx       # animated sequence 4
│       └── lib/
│           ├── api.ts              # fetch wrapper for all endpoints
│           └── types.ts            # shared TypeScript interfaces
│
├── docs/
│   └── superpowers/
│       ├── specs/
│       └── plans/
│           └── 2026-03-24-lyriclens-v2.md  # this file
│
└── mockups/                        # Excalidraw wireframes (reference only)
```

---

## Phase 1: Foundation

### Task 1: Git Init + Monorepo Structure

**Files:**
- Create: `package.json`, `.gitignore`, `.env.example`, `CLAUDE.md`

- [ ] **Step 1: Initialize git repo**

```bash
cd "c:/Users/Jamie/Documents/Ai Dev Tools/Portfolio/Lyric-Lens"
git init
```

- [ ] **Step 2: Create root package.json**

```json
{
  "name": "lyric-lens",
  "private": true,
  "workspaces": ["server", "web"],
  "scripts": {
    "dev:server": "cd server && bun run dev",
    "dev:web": "cd web && bun run dev",
    "dev": "concurrently \"bun run dev:server\" \"bun run dev:web\"",
    "build": "cd web && bun run build",
    "typecheck": "cd server && bun run typecheck && cd ../web && bun run typecheck"
  },
  "devDependencies": {
    "concurrently": "^9.0.0"
  }
}
```

- [ ] **Step 3: Create .gitignore**

```
node_modules/
dist/
.env
data/raw/
data/processed/
pipeline/__pycache__/
pipeline/.venv/
*.npz
.firecrawl/
nul
```

- [ ] **Step 4: Create .env.example**

```
QDRANT_URL=https://your-cluster.cloud.qdrant.io
QDRANT_API_KEY=your-key-here
GEMINI_API_KEY=your-google-ai-key
```

- [ ] **Step 5: Create CLAUDE.md**

```markdown
# LyricLens v2

## Project
Portfolio app: keyword vs semantic vs hybrid search on 691 chart hits (1950–2019).
Monorepo: `web/` (React + Vite), `server/` (Bun + Hono), `pipeline/` (Python).

## Ports
- Frontend dev: 5200
- Backend: 5201

## Commands
- `bun run dev` — start both frontend and backend
- `bun run dev:server` — backend only
- `bun run dev:web` — frontend only
- `bun run typecheck` — run tsc --noEmit on both packages

## Key Architecture
- Three search modes: keyword (local scoring), semantic (Qdrant vector), hybrid (filter + vector)
- Query parser decomposes natural language into structured filters + semantic text
- Theme: CSS custom properties in index.css, toggled via .dark class on <html>
- Tailwind v4 with CSS-first config
```

- [ ] **Step 6: Commit**

```bash
git add package.json .gitignore .env.example CLAUDE.md
git commit -m "feat: init monorepo structure"
```

---

### Task 2: Frontend Scaffold

**Files:**
- Create: `web/package.json`, `web/tsconfig.json`, `web/vite.config.ts`, `web/index.html`, `web/src/main.tsx`, `web/src/App.tsx`, `web/src/index.css`, `web/src/theme/ThemeProvider.tsx`

- [ ] **Step 1: Create web/package.json**

```json
{
  "name": "lyric-lens-web",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --port 5200 --strictPort",
    "build": "tsc -b && vite build",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router": "^7.0.0",
    "motion": "^12.0.0",
    "plotly.js-basic-dist-min": "^2.35.0",
    "react-plotly.js": "^2.6.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@types/react-plotly.js": "^2.6.0",
    "@types/plotly.js": "^2.0.0",
    "@vitejs/plugin-react": "^4.0.0",
    "tailwindcss": "^4.0.0",
    "@tailwindcss/vite": "^4.0.0",
    "typescript": "^5.7.0",
    "vite": "^6.0.0"
  }
}
```

Note: Verify all package versions at install time per project policy. Install with `bun install`.

- [ ] **Step 2: Create web/vite.config.ts**

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    port: 5200,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://localhost:5201",
        changeOrigin: true,
      },
    },
  },
});
```

- [ ] **Step 3: Create web/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Create web/index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>LyricLens</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>
```

- [ ] **Step 5: Create web/src/index.css with theme tokens**

This is the design foundation. CSS custom properties define all colors, spacing, and typography tokens. Light mode is default, dark mode activates via `.dark` class on `<html>`.

```css
@import "tailwindcss";

@custom-variant dark (&:where(.dark *));

@theme {
  /* Neutral scale — professional, no AI slop */
  --color-bg: #ffffff;
  --color-bg-secondary: #f8f8f8;
  --color-bg-tertiary: #f0f0f0;
  --color-surface: #ffffff;
  --color-surface-hover: #fafafa;
  --color-border: #e0e0e0;
  --color-border-subtle: #eeeeee;

  --color-text: #1a1a1a;
  --color-text-secondary: #666666;
  --color-text-tertiary: #999999;
  --color-text-inverse: #ffffff;

  /* Accent — single, tasteful, configurable */
  --color-accent: #1a1a1a;
  --color-accent-hover: #333333;
  --color-accent-subtle: #f0f0f0;

  /* Semantic */
  --color-success: #2e7d32;
  --color-success-bg: #e8f5e9;
  --color-warning: #e65100;
  --color-warning-bg: #fff3e0;
  --color-info: #1565c0;
  --color-info-bg: #e3f2fd;

  /* Search mode colors */
  --color-mode-keyword: #e65100;
  --color-mode-semantic: #1565c0;
  --color-mode-hybrid: #6a1b9a;

  /* Genre colors (for visualizer) */
  --color-genre-rock: #4caf50;
  --color-genre-pop: #2196f3;
  --color-genre-country: #ff9800;
  --color-genre-jazz: #9c27b0;
  --color-genre-blues: #f44336;
  --color-genre-reggae: #795548;

  /* Typography */
  --font-sans: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --font-mono: "JetBrains Mono", "SF Mono", Consolas, monospace;

  /* Spacing (using Tailwind defaults, override if needed) */

  /* Radii */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
}

/* Dark mode overrides */
.dark {
  --color-bg: #0f0f0f;
  --color-bg-secondary: #1a1a1a;
  --color-bg-tertiary: #252525;
  --color-surface: #1a1a1a;
  --color-surface-hover: #222222;
  --color-border: #333333;
  --color-border-subtle: #2a2a2a;

  --color-text: #e8e8e8;
  --color-text-secondary: #999999;
  --color-text-tertiary: #666666;
  --color-text-inverse: #1a1a1a;

  --color-accent: #e8e8e8;
  --color-accent-hover: #cccccc;
  --color-accent-subtle: #252525;

  --color-success-bg: #1a2e1a;
  --color-warning-bg: #2e1a0a;
  --color-info-bg: #0a1a2e;
}

body {
  font-family: var(--font-sans);
  background-color: var(--color-bg);
  color: var(--color-text);
  -webkit-font-smoothing: antialiased;
}
```

- [ ] **Step 6: Create web/src/theme/ThemeProvider.tsx**

```tsx
import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  toggle: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "light";
    return (localStorage.getItem("lyriclens-theme") as Theme) || "light";
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    localStorage.setItem("lyriclens-theme", theme);
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "light" ? "dark" : "light"));

  return (
    <ThemeContext value={{ theme, toggle }}>
      {children}
    </ThemeContext>
  );
}

export const useTheme = () => useContext(ThemeContext);
```

- [ ] **Step 7: Create web/src/lib/types.ts**

Shared types used across the frontend:

```ts
export type SearchMode = "keyword" | "semantic" | "hybrid";

export interface Song {
  id: string;
  title: string;
  artist: string;
  year: number;
  decade: number;
  genre: string;
  chartPosition: number;
  topic: string;
  lyrics: string;
  valence: number;
  energy: number;
  danceability: number;
  sadness: number;
  romantic: number;
}

export interface SearchResult {
  song: Song;
  score: number;
  matchReason: string;
  mode: SearchMode;
}

export interface SearchResponse {
  results: SearchResult[];
  mode: SearchMode;
  query: string;
  parsedQuery: ParsedQuery;
  totalFiltered: number;
  searchTimeMs: number;
}

export interface ParsedQuery {
  filters: {
    decades: number[];
    genres: string[];
    moods: string[];
    audioFeatures: string[];
    artistHint: string[];
  };
  semanticText: string;
  terms: string[];
  interpretations: { type: string; label: string }[];
}

export interface VizData {
  points: {
    id: string;
    x: number;
    y: number;
    z: number;
    title: string;
    artist: string;
    genre: string;
    decade: number;
    topic: string;
  }[];
}
```

- [ ] **Step 8: Create web/src/main.tsx**

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

- [ ] **Step 9: Create web/src/App.tsx — router + providers**

Note: Verify react-router import path at install time — may be `react-router` or `react-router-dom` depending on the exact v7.x version installed.

```tsx
import { BrowserRouter, Routes, Route } from "react-router";
import { ThemeProvider } from "./theme/ThemeProvider";
import { Layout } from "./components/Layout";
import { Search } from "./pages/Search";
import { Visualizer } from "./pages/Visualizer";
import { HowItWorks } from "./pages/HowItWorks";

export function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Search />} />
            <Route path="visualizer" element={<Visualizer />} />
            <Route path="how-it-works" element={<HowItWorks />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
```

- [ ] **Step 10: Create stub page components + Layout + Nav**

Create minimal stub components so the app renders and routes work:

`web/src/components/Layout.tsx`:
```tsx
import { Outlet } from "react-router";
import { Nav } from "./Nav";

export function Layout() {
  return (
    <div className="min-h-screen bg-(--color-bg)">
      <Nav />
      <main className="max-w-5xl mx-auto px-6">
        <Outlet />
      </main>
    </div>
  );
}
```

`web/src/components/Nav.tsx`:
```tsx
import { NavLink } from "react-router";
import { useTheme } from "../theme/ThemeProvider";

export function Nav() {
  const { theme, toggle } = useTheme();

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm transition-colors ${
      isActive
        ? "text-(--color-text) border-b-2 border-(--color-accent) pb-1"
        : "text-(--color-text-secondary) hover:text-(--color-text)"
    }`;

  return (
    <nav className="border-b border-(--color-border) bg-(--color-surface)">
      <div className="max-w-5xl mx-auto px-6 flex items-center justify-between h-14">
        <NavLink to="/" className="text-xl font-semibold text-(--color-text)">
          LyricLens
        </NavLink>
        <div className="flex items-center gap-8">
          <NavLink to="/" className={linkClass} end>Search</NavLink>
          <NavLink to="/visualizer" className={linkClass}>Visualizer</NavLink>
          <NavLink to="/how-it-works" className={linkClass}>How It Works</NavLink>
          <button
            onClick={toggle}
            className="text-sm text-(--color-text-secondary) hover:text-(--color-text)"
            aria-label="Toggle theme"
          >
            {theme === "light" ? "Dark" : "Light"}
          </button>
        </div>
      </div>
    </nav>
  );
}
```

Stub pages (`web/src/pages/Search.tsx`, `Visualizer.tsx`, `HowItWorks.tsx`):
```tsx
export function Search() {
  return <div className="py-12"><h1 className="text-2xl font-semibold">Search</h1></div>;
}
```
(Same pattern for Visualizer and HowItWorks with appropriate titles.)

- [ ] **Step 11: Install dependencies and verify**

```bash
cd web && bun install
bun run dev
```

Verify: app loads at http://localhost:5200, routing works for all 3 pages, dark mode toggle works.

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:5200
```
Expected: 200

- [ ] **Step 12: Run typecheck**

```bash
cd web && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 13: Commit**

```bash
git add web/
git commit -m "feat: scaffold frontend with Vite, React, Tailwind, theme system"
```

---

### Task 3: Backend Scaffold

**Files:**
- Create: `server/package.json`, `server/tsconfig.json`, `server/src/index.ts`

- [ ] **Step 1: Create server/package.json**

```json
{
  "name": "lyric-lens-server",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "bun --watch src/index.ts",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "hono": "^4.0.0",
    "@qdrant/js-client-rest": "^1.12.0",
    "@huggingface/transformers": "^3.0.0",
    "@google/generative-ai": "^0.21.0"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "typescript": "^5.7.0"
  }
}
```

Note: Verify all package versions at install time.

- [ ] **Step 2: Create server/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "types": ["bun"]
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create server/src/index.ts**

```ts
import { Hono } from "hono";
import { cors } from "hono/cors";

const app = new Hono();

app.use("/*", cors({ origin: "http://localhost:5200" }));

app.get("/api/health", (c) => c.json({ status: "ok" }));

// Route stubs — filled in Phase 3
// app.route("/api/search", searchRoutes);
// app.route("/api/filters", filterRoutes);
// app.route("/api/viz", vizRoutes);
// app.route("/api/rag", ragRoutes);

const port = 5201;
console.log(`LyricLens API listening on port ${port}`);

export default {
  port,
  fetch: app.fetch,
};
```

- [ ] **Step 4: Install and verify**

```bash
cd server && bun install
bun run dev
```

Verify:
```bash
curl -s http://localhost:5201/api/health
```
Expected: `{"status":"ok"}`

- [ ] **Step 5: Typecheck**

```bash
cd server && npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add server/
git commit -m "feat: scaffold backend with Bun + Hono"
```

---

## Phase 2: Data Pipeline

### Task 4: Merge Data

**Files:**
- Create: `pipeline/requirements.txt`, `pipeline/merge_data.py`
- Create: `data/processed/` (output directory)

- [ ] **Step 1: Create pipeline/requirements.txt**

```
pandas>=2.0
numpy>=1.24
sentence-transformers>=3.0
qdrant-client>=1.12
scikit-learn>=1.5
umap-learn>=0.5
```

- [ ] **Step 2: Create Python venv and install**

```bash
cd pipeline
python -m venv .venv
source .venv/Scripts/activate   # Windows bash
pip install -r requirements.txt
```

- [ ] **Step 3: Write merge_data.py**

This script joins `lyrics_db.csv` (full lyrics) with `hits_filtered.csv` (metadata) on artist + title. Output: `data/processed/merged_songs.json`.

Key logic:
- Parse lyrics_db.csv: group multi-line rows into one record per song (rows share year/pos/artist/title, lyrics are concatenated)
- Parse hits_filtered.csv: extract genre, topic scores, audio features, chart data
- Fuzzy-match join on normalized artist + title (lowercase, strip punctuation)
- Songs with lyrics but no metadata match: keep with default metadata
- Songs with metadata but no lyrics: skip (need lyrics for embedding)
- Output fields: id, title, artist, year, decade, genre, chart_position, topic, lyrics, valence, energy, danceability, acousticness, sadness, romantic, violence, plus all other topic scores

```python
# Core logic outline — implement fully:
# 1. Read lyrics_db.csv, group by (year, artist, title) → concatenate lyrics
# 2. Read hits_filtered.csv for metadata
# 3. Normalize names for matching: lowercase, strip "the ", collapse whitespace
# 4. Join on normalized artist+title
# 5. Assign unique IDs (slugified artist-title)
# 6. Write merged_songs.json
# 7. Print stats: total songs, matched, unmatched
```

- [ ] **Step 4: Run and verify**

```bash
python merge_data.py
```

Check: `data/processed/merged_songs.json` exists, contains ~500-691 records with lyrics + metadata. Print count of songs with full metadata vs lyrics-only.

- [ ] **Step 5: Commit**

```bash
git add pipeline/requirements.txt pipeline/merge_data.py
git commit -m "feat: data merge pipeline — join lyrics with metadata"
```

---

### Task 5: Embed Lyrics

**Files:**
- Create: `pipeline/embed_lyrics.py`

- [ ] **Step 1: Write embed_lyrics.py**

Reads `merged_songs.json`, embeds each song's lyrics using `all-MiniLM-L6-v2`, outputs:
- `data/processed/embeddings.npz` — numpy array of vectors (N × 384)
- Updates `merged_songs.json` with an `embedding_id` field matching the index

```python
# Core logic:
# 1. Load merged_songs.json
# 2. Initialize SentenceTransformer('all-MiniLM-L6-v2')
# 3. Embed all lyrics in batch (model.encode with show_progress_bar=True)
# 4. Save as embeddings.npz
# 5. Print: num embedded, vector dimensions, sample similarity check
```

- [ ] **Step 2: Run and verify**

```bash
python embed_lyrics.py
```

Check: `embeddings.npz` exists, shape is (N, 384). Run a quick sanity check — cosine similarity between two love songs should be higher than between a love song and a protest song.

- [ ] **Step 3: Commit**

```bash
git add pipeline/embed_lyrics.py
git commit -m "feat: lyrics embedding pipeline with MiniLM-L6-v2"
```

---

### Task 6: Build Qdrant Index

**Files:**
- Create: `pipeline/build_index.py`

- [ ] **Step 1: Write build_index.py**

Reads `merged_songs.json` + `embeddings.npz`, creates a Qdrant collection and uploads all vectors with metadata payloads.

```python
# Core logic:
# 1. Load songs and embeddings
# 2. Connect to Qdrant Cloud (env vars: QDRANT_URL, QDRANT_API_KEY)
# 3. Create/recreate collection "song_lyrics" with:
#    - vectors: size=384, distance=Cosine
# 4. Upload points in batches of 100:
#    - id: index
#    - vector: embedding
#    - payload: { artist, title, year, decade, genre, chart_position, topic,
#                 lyrics, valence, energy, danceability, sadness, romantic }
# 5. Print: total uploaded, collection info
```

- [ ] **Step 2: Set up .env with Qdrant credentials**

Create a Qdrant Cloud free tier cluster at cloud.qdrant.io, get URL and API key.

```bash
cp .env.example .env
# Fill in QDRANT_URL and QDRANT_API_KEY
```

- [ ] **Step 3: Run and verify**

```bash
python build_index.py
```

Verify: collection exists with correct point count. Test with a quick search via the Qdrant Cloud dashboard.

- [ ] **Step 4: Commit**

```bash
git add pipeline/build_index.py
git commit -m "feat: Qdrant index builder — upload vectors with metadata"
```

---

## Phase 3: Backend Search

### Task 7: Query Parser

**Files:**
- Create: `server/src/lib/query-parser.ts`, `server/src/__tests__/query-parser.test.ts`

Port the v1 query parser from the original HTML file. Reference: `lyric-search-rag.html` lines 334–450.

- [ ] **Step 1: Write failing tests**

`server/src/__tests__/query-parser.test.ts`:

```ts
import { describe, test, expect } from "bun:test";
import { parseQuery } from "../lib/query-parser";

describe("parseQuery", () => {
  test("extracts decade from 'from the 80s'", () => {
    const result = parseQuery("love songs from the 80s");
    expect(result.filters.decades).toContain(1980);
  });

  test("extracts artist from 'by Michael Jackson'", () => {
    const result = parseQuery("songs by Michael Jackson");
    expect(result.filters.artistHint).toEqual(["michael", "jackson"]);
  });

  test("extracts genre", () => {
    const result = parseQuery("sad rock songs");
    expect(result.filters.genres).toContain("rock");
  });

  test("detects title scope from 'in the title'", () => {
    const result = parseQuery("baby in the title");
    expect(result.scopeTitle).toBe(true);
    expect(result.terms).toContain("baby");
  });

  test("detects lyrics scope from 'in the lyrics'", () => {
    const result = parseQuery("rain in the lyrics");
    expect(result.scopeLyrics).toBe(true);
  });

  test("extracts mood hints", () => {
    const result = parseQuery("sad romantic songs");
    expect(result.filters.moods.length).toBeGreaterThan(0);
  });

  test("extracts audio features", () => {
    const result = parseQuery("upbeat danceable songs");
    expect(result.filters.audioFeatures.length).toBeGreaterThan(0);
  });

  test("produces semantic text (remaining after extraction)", () => {
    const result = parseQuery("songs about loneliness and rain from the 80s");
    expect(result.semanticText).toContain("loneliness");
    expect(result.semanticText).toContain("rain");
    expect(result.filters.decades).toContain(1980);
  });

  test("handles empty/short queries", () => {
    const result = parseQuery("");
    expect(result.terms).toEqual([]);
    expect(result.semanticText).toBe("");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd server && bun test src/__tests__/query-parser.test.ts
```
Expected: FAIL (module not found)

- [ ] **Step 3: Implement query-parser.ts**

Port from v1 (lines 285–450 of lyric-search-rag.html). Key adaptations:
- Return structured `ParsedQuery` type instead of the v1 format
- Add `semanticText` field — the remaining query after extracting filters/scopes
- Same STOP_WORDS, GENRE_SET, GENRE_ALIASES, MOOD_MAP, AUDIO_MAP
- Same extraction logic: artist hints, decades, scope detection, genre, mood, audio features
- Export `parseQuery(raw: string): ParsedQuery`

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd server && bun test src/__tests__/query-parser.test.ts
```
Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add server/src/lib/query-parser.ts server/src/__tests__/query-parser.test.ts
git commit -m "feat: port query parser from v1 with tests"
```

---

### Task 8: Keyword Search Engine

**Files:**
- Create: `server/src/search/keyword.ts`, `server/src/__tests__/keyword.test.ts`

Port the v1 scoring engine from lines 459–591 of the original HTML.

- [ ] **Step 1: Write failing tests**

Test against a small fixture of 5-10 songs loaded from a test JSON file. Test cases:
- "baby in the title" finds songs with "baby" in title
- "by Michael Jackson" filters to that artist
- "sad rock from the 80s" applies genre filter, decade filter, mood scoring
- Scoring: title match > lyrics match in default scope
- Scope boost: "title" scope triples title match weight

- [ ] **Step 2: Create test fixtures**

`server/src/__tests__/fixtures/test-songs.json` — 10 hand-crafted song objects covering different genres, decades, topics with known lyrics.

- [ ] **Step 3: Implement keyword.ts**

Port the `searchTracks` function from v1. Key adaptations:
- Takes `(songs: Song[], parsed: ParsedQuery) => SearchResult[]`
- Same weighted scoring: W_TITLE, W_LYRICS, W_ARTIST with scope multipliers
- Same hard filters (genre, decade, artist)
- Same mood/audio soft scoring
- Returns SearchResult[] with `matchReason` strings
- Uses lowercase index for fast matching (build once, reuse)

- [ ] **Step 4: Run tests, all pass**

- [ ] **Step 5: Commit**

```bash
git add server/src/search/keyword.ts server/src/__tests__/keyword.test.ts server/src/__tests__/fixtures/
git commit -m "feat: keyword search engine with weighted scoring"
```

---

### Task 9: Qdrant Client + Query-Time Embedding

**Files:**
- Create: `server/src/lib/qdrant.ts`, `server/src/lib/embedder.ts`

- [ ] **Step 1: Implement qdrant.ts**

```ts
import { QdrantClient } from "@qdrant/js-client-rest";

let client: QdrantClient | null = null;

export function getQdrantClient(): QdrantClient {
  if (!client) {
    client = new QdrantClient({
      url: process.env.QDRANT_URL,
      apiKey: process.env.QDRANT_API_KEY,
    });
  }
  return client;
}

export const COLLECTION_NAME = "song_lyrics";
```

- [ ] **Step 2: Implement embedder.ts**

Uses `@huggingface/transformers` to run MiniLM-L6-v2 in Bun at runtime. Model downloaded once on first query, cached thereafter.

```ts
import { pipeline } from "@huggingface/transformers";

let embedder: any = null;

export async function getEmbedder() {
  if (!embedder) {
    embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", {
      dtype: "fp32",
    });
  }
  return embedder;
}

export async function embedQuery(text: string): Promise<number[]> {
  const embed = await getEmbedder();
  const output = await embed(text, { pooling: "mean", normalize: true });
  return Array.from(output.data);
}
```

Note: Verify the `@huggingface/transformers` API at install time. The model name may be `Xenova/all-MiniLM-L6-v2` or `sentence-transformers/all-MiniLM-L6-v2` depending on version.

- [ ] **Step 3: Create server/src/lib/types.ts**

Server-side copy of the shared TypeScript interfaces (same content as `web/src/lib/types.ts`). Both packages use their own copy — no cross-package imports.

- [ ] **Step 4: Create server/src/lib/data.ts**

Loads `merged_songs.json` into memory at startup for keyword search:

```ts
import { readFileSync } from "fs";
import { resolve } from "path";
import type { Song } from "./types";

let songs: Song[] | null = null;

export function getSongs(): Song[] {
  if (!songs) {
    const dataPath = resolve(import.meta.dir, "../../../data/processed/merged_songs.json");
    const raw = readFileSync(dataPath, "utf-8");
    songs = JSON.parse(raw);
    console.log(`Loaded ${songs!.length} songs into memory`);
  }
  return songs!;
}
```

Note: `import.meta.dir` is Bun-specific. Verify path resolves correctly at runtime — the server runs from `server/src/`, data is at `data/processed/`.

- [ ] **Step 5: Create server/src/search/utils.ts**

Shared utilities used by semantic.ts and hybrid.ts:

```ts
import type { Song, ParsedQuery, SearchMode } from "../lib/types";

export function payloadToSong(id: any, payload: any): Song {
  return {
    id: String(id),
    title: payload.title,
    artist: payload.artist,
    year: payload.year,
    decade: payload.decade,
    genre: payload.genre || "unknown",
    chartPosition: payload.chart_position || 0,
    topic: payload.topic || "",
    lyrics: payload.lyrics || "",
    valence: payload.valence || 0,
    energy: payload.energy || 0,
    danceability: payload.danceability || 0,
    sadness: payload.sadness || 0,
    romantic: payload.romantic || 0,
  };
}

export function buildMatchReason(
  mode: SearchMode,
  parsed: ParsedQuery,
  score: number
): string {
  const parts: string[] = [];
  if (parsed.filters.decades.length > 0) parts.push(`decade: ${parsed.filters.decades.join(", ")}`);
  if (parsed.filters.genres.length > 0) parts.push(`genre: ${parsed.filters.genres.join(", ")}`);
  if (mode === "semantic" || mode === "hybrid") {
    parts.push(`similarity: ${score.toFixed(3)}`);
  }
  return parts.join(" · ") || `${mode} match`;
}
```

- [ ] **Step 6: Smoke test embedding**

Write a quick test that embeds "hello world" and checks the output is a 384-dim array:

```ts
test("embedQuery returns 384-dim vector", async () => {
  const vec = await embedQuery("hello world");
  expect(vec.length).toBe(384);
  expect(typeof vec[0]).toBe("number");
});
```

- [ ] **Step 4: Commit**

```bash
git add server/src/lib/qdrant.ts server/src/lib/embedder.ts
git commit -m "feat: Qdrant client wrapper + query-time MiniLM embedding"
```

---

### Task 10: Semantic Search

**Files:**
- Create: `server/src/search/semantic.ts`, `server/src/__tests__/semantic.test.ts`

- [ ] **Step 1: Write failing test**

Test that semantic search returns results from Qdrant with similarity scores. This is an integration test requiring a populated Qdrant instance.

- [ ] **Step 2: Implement semantic.ts**

```ts
import { getQdrantClient, COLLECTION_NAME } from "../lib/qdrant";
import { embedQuery } from "../lib/embedder";
import { payloadToSong } from "./utils";
import type { ParsedQuery, SearchResult } from "../lib/types";

export async function semanticSearch(
  parsed: ParsedQuery,
  limit = 20
): Promise<SearchResult[]> {
  const queryText = parsed.semanticText || parsed.terms.join(" ");
  if (!queryText.trim()) return [];

  const vector = await embedQuery(queryText);
  const client = getQdrantClient();

  const response = await client.query(COLLECTION_NAME, {
    query: vector,
    limit,
    with_payload: true,
  });

  return response.points.map((point) => ({
    song: payloadToSong(point.id, point.payload),
    score: point.score,
    matchReason: `Semantic similarity: ${point.score.toFixed(3)}`,
    mode: "semantic" as const,
  }));
}
```

Note: Types are in `server/src/lib/types.ts` (server-side copy of the shared interfaces). The `payloadToSong` utility is in `server/src/search/utils.ts`.


- [ ] **Step 3: Run test, verify pass**

- [ ] **Step 4: Commit**

```bash
git add server/src/search/semantic.ts server/src/__tests__/semantic.test.ts
git commit -m "feat: semantic search via Qdrant vector query"
```

---

### Task 11: Hybrid Search

**Files:**
- Create: `server/src/search/hybrid.ts`, `server/src/__tests__/hybrid.test.ts`

- [ ] **Step 1: Write failing test**

Test that hybrid search applies metadata filters before vector search. E.g., querying "loneliness" with decade=1980 should only return 80s songs.

- [ ] **Step 2: Implement hybrid.ts**

```ts
import { getQdrantClient, COLLECTION_NAME } from "../lib/qdrant";
import { embedQuery } from "../lib/embedder";
import { payloadToSong, buildMatchReason } from "./utils";
import type { ParsedQuery, SearchResult } from "../lib/types";

export async function hybridSearch(
  parsed: ParsedQuery,
  limit = 20
): Promise<{ results: SearchResult[]; totalFiltered: number }> {
  const queryText = parsed.semanticText || parsed.terms.join(" ");
  if (!queryText.trim()) return { results: [], totalFiltered: 0 };

  const vector = await embedQuery(queryText);
  const client = getQdrantClient();

  // Build Qdrant filter from parsed query
  const must: any[] = [];

  if (parsed.filters.decades.length > 0) {
    must.push({
      key: "decade",
      match: { any: parsed.filters.decades },
    });
  }

  if (parsed.filters.genres.length > 0) {
    must.push({
      key: "genre",
      match: { any: parsed.filters.genres },
    });
  }

  // Audio/mood filters as range conditions
  // (implementation: map mood/audio filter keys to payload field ranges)

  const filter = must.length > 0 ? { must } : undefined;

  // Get filtered count for "Under the Hood" display
  const countResult = filter
    ? await client.count(COLLECTION_NAME, { filter, exact: true })
    : { count: 691 }; // total if no filter

  const response = await client.query(COLLECTION_NAME, {
    query: vector,
    filter,
    limit,
    with_payload: true,
  });

  return {
    results: response.points.map((point) => ({
      song: payloadToSong(point.id, point.payload),
      score: point.score,
      matchReason: buildMatchReason("hybrid", parsed, point.score),
      mode: "hybrid" as const,
    })),
    totalFiltered: countResult.count,
  };
}
```

Note: `payloadToSong` and `buildMatchReason` are shared functions in `server/src/search/utils.ts`. `buildMatchReason` generates a human-readable explanation that varies by mode — for hybrid it describes which filters were applied + the similarity score.


- [ ] **Step 3: Run tests, verify pass**

- [ ] **Step 4: Commit**

```bash
git add server/src/search/hybrid.ts server/src/__tests__/hybrid.test.ts
git commit -m "feat: hybrid search — metadata filters + vector similarity"
```

---

### Task 12: API Routes

**Files:**
- Create: `server/src/routes/search.ts`, `server/src/routes/filters.ts`
- Modify: `server/src/index.ts` (wire up routes)

- [ ] **Step 1: Implement search route**

`POST /api/search/:mode` — accepts `{ query: string, filters?: {...} }`, returns `SearchResponse`.

Dispatches to keyword, semantic, or hybrid based on `:mode` param. All three return the same response shape.

- [ ] **Step 2: Implement filters route**

`GET /api/filters` — returns available filter options:
```json
{
  "decades": [1950, 1960, 1970, 1980, 1990, 2000, 2010],
  "genres": ["rock", "pop", "jazz", "blues", "country", "reggae"],
  "moods": ["sad", "romantic", "violent", "obscene", "dark", "emotional"],
  "audioFeatures": ["upbeat", "danceable", "acoustic", "energetic", "mellow"]
}
```

Loaded from the Qdrant collection metadata on startup (or hardcoded for the known dataset).

- [ ] **Step 3: Implement stats route**

`GET /api/stats` — serves evaluation results from `data/processed/eval_results.json`. Returns metrics: precision@5 per mode, MRR, cluster purity, join rate. Initially returns hardcoded placeholder data until the evaluation pipeline (Task 22) is run.

- [ ] **Step 4: Wire routes in index.ts**

Uncomment and connect the route modules.

- [ ] **Step 4: End-to-end test**

```bash
curl -X POST http://localhost:5201/api/search/keyword \
  -H "Content-Type: application/json" \
  -d '{"query": "love songs from the 80s"}'
```

Verify: returns JSON with results array, parsedQuery, mode.

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/ server/src/index.ts
git commit -m "feat: API routes for search and filters"
```

---

## Phase 4: Frontend — Search Page

### Task 13: API Client + SearchBar

**Files:**
- Create: `web/src/lib/api.ts`, `web/src/components/SearchBar.tsx`

- [ ] **Step 1: Implement api.ts**

Fetch wrapper for all API endpoints:

```ts
const BASE = "/api";

export async function search(query: string, mode: SearchMode, filters?: any): Promise<SearchResponse> {
  const res = await fetch(`${BASE}/search/${mode}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, filters }),
  });
  if (!res.ok) throw new Error(`Search failed: ${res.status}`);
  return res.json();
}

export async function getFilters(): Promise<FilterOptions> { ... }
export async function getVizData(): Promise<VizData> { ... }
export async function projectQuery(query: string): Promise<{ x: number; y: number; z: number }> { ... }
export async function generateAnswer(query: string, results: SearchResult[]): Promise<string> { ... }
```

- [ ] **Step 2: Implement SearchBar component**

Per wireframe: large centered input with placeholder, search button, suggestion badges below.

- [ ] **Step 3: Verify rendering**

- [ ] **Step 4: Commit**

---

### Task 14: ModeToggle + FilterPanel

**Files:**
- Create: `web/src/components/ModeToggle.tsx`, `web/src/components/FilterPanel.tsx`

- [ ] **Step 1: Implement ModeToggle**

Tab-style toggle (not buttons) per wireframe v2. Three tabs: Keyword / Semantic / Hybrid. Active tab gets `bg-(--color-surface)` with border, inactive are transparent. One-line description below changes per mode.

- [ ] **Step 2: Implement FilterPanel**

Active filters as removable chips. "Add filter" button opens a dropdown/popover with decade, genre, mood, audio options. Chips use mode colors per wireframe.

- [ ] **Step 3: Commit**

---

### Task 15: ResultCard + QueryChips

**Files:**
- Create: `web/src/components/ResultCard.tsx`, `web/src/components/QueryChips.tsx`

- [ ] **Step 1: Implement ResultCard**

Per wireframe: song title, artist, year/genre, similarity score badge, match reason (changes per mode), tags. Expandable on click to show lyrics + sentiment bars + audio features.

- [ ] **Step 2: Implement QueryChips**

Displays the `parsedQuery.interpretations` array as colored chips. Type determines chip color (decade=blue, genre=green, mood=orange, etc.).

- [ ] **Step 3: Commit**

---

### Task 16: Search Page Assembly + UnderTheHood

**Files:**
- Create: `web/src/components/UnderTheHood.tsx`
- Modify: `web/src/pages/Search.tsx`

- [ ] **Step 1: Implement UnderTheHood**

Collapsible panel below results. Shows the retrieval process steps with actual numbers:
1. Query Parsed — shows decomposition
2. Metadata Filters Applied — shows count reduction
3. Query Embedded (semantic/hybrid only)
4. Results Ranked

Content changes per mode. Uses `parsedQuery` and `searchTimeMs` from the response.

- [ ] **Step 2: Assemble Search page**

Wire all components together in `Search.tsx`:
- State: query, mode, filters, results, loading
- SearchBar triggers search
- ModeToggle switches mode (re-runs same query)
- FilterPanel manages active filters
- QueryChips shows interpretation
- ResultCard list shows results
- UnderTheHood shows pipeline

- [ ] **Step 3: End-to-end test**

Run both frontend and backend. Type a query, verify results appear, switch modes, verify results change.

- [ ] **Step 4: Commit**

---

## Phase 5: Visualizer

### Task 17: UMAP Data Pipeline

**Files:**
- Create: `pipeline/build_viz.py`

- [ ] **Step 1: Write build_viz.py**

Reads `embeddings.npz`, runs UMAP to reduce to 3D, runs KMeans clustering, outputs:
- `data/processed/umap_coords.json` — array of `{ id, x, y, z, title, artist, genre, decade, topic, cluster }`

```python
# 1. Load embeddings
# 2. UMAP(n_components=3, n_neighbors=15, min_dist=0.1)
# 3. KMeans(n_clusters=8) on original embeddings
# 4. Output JSON with 3D coords + metadata
```

- [ ] **Step 2: Run and verify**

```bash
python build_viz.py
```

Check: `umap_coords.json` exists with correct record count.

- [ ] **Step 3: Commit**

---

### Task 18: Visualizer API + Frontend

**Files:**
- Create: `server/src/routes/viz.ts`
- Create: `web/src/components/EmbeddingViz.tsx`
- Modify: `web/src/pages/Visualizer.tsx`

- [ ] **Step 1: Implement viz routes**

- `GET /api/viz/data` — reads and serves `data/processed/umap_coords.json` using `path.resolve(import.meta.dir, "../../../data/processed/umap_coords.json")`. Cache in memory after first load.
- `POST /api/viz/query` — embeds query text, projects into UMAP space (approximate: find nearest song vectors, interpolate position), returns `{ x, y, z }`

- [ ] **Step 2: Implement EmbeddingViz component**

Plotly.js 3D scatter plot:
- Each dot = one song, colored by genre (or decade/topic/cluster via "Color by" toggle)
- Hover shows song name + artist
- Click selects a song (shows detail panel)
- Query vector shown as a star marker
- Dashed lines from star to top 5 matches

Use `react-plotly.js` with `plotly.js-basic-dist-min` for smaller bundle.

- [ ] **Step 3: Assemble Visualizer page**

- Search input + "Project Query" button
- Color-by toggle (Genre / Decade / Topic)
- EmbeddingViz component (fills viewport)
- Legend row
- Selected song detail panel with "Find Similar" button — re-queries Qdrant with that song's vector to find nearest neighbors
- Cluster insight panel

- [ ] **Step 4: Commit**

---

## Phase 6: How It Works

### Task 19: Animated Retrieval Explainer

**Files:**
- Create: `web/src/components/how-it-works/QueryDecomposition.tsx`
- Create: `web/src/components/how-it-works/TheFunnel.tsx`
- Create: `web/src/components/how-it-works/EmbeddingMoment.tsx`
- Create: `web/src/components/how-it-works/ModeComparison.tsx`

Reference: `mockups/retrieval-storyboard.excalidraw` — follow the 4 sequences exactly.

All animations are scroll-driven using Motion's `useScroll` + `useTransform`. The How It Works page uses a sticky container with scroll progress driving the animation state.

- [ ] **Step 1: Set up scroll container scaffold**

In `HowItWorks.tsx`, create a tall scrollable container (5x viewport height). A sticky inner viewport stays fixed while scroll progress drives the animation sequences.

```tsx
const containerRef = useRef(null);
const { scrollYProgress } = useScroll({ target: containerRef });

// Map scroll progress to sequence states:
// 0.0–0.2: intro text
// 0.2–0.45: Sequence 1 (query decomposition)
// 0.45–0.65: Sequence 2 (funnel)
// 0.65–0.85: Sequence 3 (embedding moment)
// 0.85–1.0: Sequence 4 (mode comparison)
```

- [ ] **Step 2: Implement QueryDecomposition**

Sequence 1 from storyboard:
- Query text visible → words highlight with stagger → words sort into FILTERS / MEANING buckets with spring physics
- Motion APIs: `animate`, `stagger`, `spring`, `layout`

- [ ] **Step 3: Implement TheFunnel**

Sequence 2 from storyboard:
- Dense field of dots → filter applies, dots exit with AnimatePresence → remaining settle with layout animation → counter ticks down with animated number
- Dots can be simple div elements with absolute positioning

- [ ] **Step 4: Implement EmbeddingMoment**

Sequence 3 from storyboard:
- Query text bubble → shrinks/morphs into a point (scale + opacity transition) → drops into song space with spring → proximity lines draw with stagger → results emerge

- [ ] **Step 5: Implement ModeComparison**

Sequence 4 from storyboard:
- Three pipeline tracks → steps light up sequentially with stagger → results slide in with AnimatePresence → verdict badges fade in

- [ ] **Step 6: Commit**

---

### Task 20: How It Works Static Sections

**Files:**
- Modify: `web/src/pages/HowItWorks.tsx`

- [ ] **Step 1: Add intro section**

"When do you actually need vector search?" — the honest pitch.

- [ ] **Step 2: Add "But keyword wins too" section**

The honest limitations callout from wireframe.

- [ ] **Step 3: Add metrics section**

Evaluation results display — precision@5, MRR, cluster purity cards. Data from `/api/stats` endpoint (or hardcoded initially).

- [ ] **Step 4: Add production mapping section**

LyricLens → real-world equivalents table.

- [ ] **Step 5: Add CTA**

"Built by Jamie" footer with links.

- [ ] **Step 6: Commit**

---

## Phase 7: RAG + Evaluation

### Task 21: Gemini Flash RAG

**Files:**
- Create: `server/src/lib/gemini.ts`, `server/src/routes/rag.ts`

- [ ] **Step 1: Implement gemini.ts**

```ts
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function generateRagAnswer(
  query: string,
  context: { title: string; artist: string; year: number; lyrics: string; score: number }[]
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const contextStr = context
    .map((c, i) => `[${i + 1}] "${c.title}" by ${c.artist} (${c.year}) — Score: ${c.score.toFixed(3)}\nLyrics excerpt: ${c.lyrics.substring(0, 300)}`)
    .join("\n\n");

  const prompt = `You are a music expert. Based ONLY on these retrieved songs, answer the user's question. Be specific, cite song titles. Keep it concise (2-3 paragraphs max).

RETRIEVED SONGS:
${contextStr}

QUESTION: ${query}`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}
```

- [ ] **Step 2: Implement rag route**

`POST /api/rag/answer` — takes `{ query, results }`, calls Gemini, returns `{ answer }`.

- [ ] **Step 3: Add RAG answer display to Search page**

Below results, show "AI-Generated Answer" section with the Gemini response. Loading state while generating.

- [ ] **Step 4: Commit**

---

### Task 22: Evaluation Pipeline

**Files:**
- Create: `pipeline/evaluate.py`

- [ ] **Step 1: Write evaluate.py**

Creates a test query suite (50 queries with expected results) and measures:
- Precision@5, Precision@10 for each mode
- MRR (Mean Reciprocal Rank) for each mode
- Keyword vs semantic comparison on the same queries
- Cluster purity (silhouette score)
- Embedding coverage: what % of lyrics_db songs matched with metadata from hits_filtered (join rate from merge step)

Outputs `data/processed/eval_results.json`. The `/api/stats` endpoint serves this file.

- [ ] **Step 2: Create test query suite**

Hand-curate 50 queries across categories:
- Specific lookups ("songs with baby in the title from the 60s")
- Conceptual queries ("songs about heartbreak and loneliness")
- Artist queries ("by Queen")
- Mixed ("sad 80s rock")
- Mood-based ("songs that feel like driving at night")

Each has 3-5 expected songs that should appear in top 10.

- [ ] **Step 3: Run and commit**

---

## Phase 8: Polish + Deploy

### Task 23: Responsive Design + Polish

- [ ] **Step 1: Mobile responsive layout**

Test all pages at 375px, 768px, 1024px+ breakpoints. Fix any layout issues.

- [ ] **Step 2: Loading states**

Add skeleton/loading states for search results, visualizer data, RAG generation.

- [ ] **Step 3: Error states**

Handle API errors gracefully in all pages.

- [ ] **Step 4: Commit**

---

### Task 24: Deployment

**Files:**
- Create: `Dockerfile`, `docker-compose.yml`

- [ ] **Step 1: Create Dockerfile**

Multi-stage build:
- Stage 1: Build frontend (`bun install && bun run build`)
- Stage 2: Production server (Bun runtime, serve static + API)

- [ ] **Step 2: Create docker-compose.yml**

Single service (Qdrant is hosted externally). Env vars from `.env`.

- [ ] **Step 3: Ensure pipeline outputs are available**

The Docker image needs `data/processed/merged_songs.json` and `data/processed/umap_coords.json` at runtime. Either:
- (a) Run the pipeline locally and COPY the processed files into the Docker build, or
- (b) Add a pipeline step to the Dockerfile

Option (a) is simpler — add processed JSON files (not embeddings.npz) to the Docker context.

- [ ] **Step 4: Deploy to Railway or Fly.io**

Follow platform-specific deployment guide. Set env vars (QDRANT_URL, QDRANT_API_KEY, GEMINI_API_KEY). Verify.

- [ ] **Step 4: Commit**

```bash
git add Dockerfile docker-compose.yml
git commit -m "feat: Docker + deployment configuration"
```

---

## Dependency Order

```
Phase 1 (Foundation)
  └── Task 1 → Task 2 → Task 3

Phase 2 (Pipeline) — requires .env with Qdrant creds
  └── Task 4 → Task 5 → Task 6

Phase 3 (Backend) — requires Phase 2 complete (Qdrant populated)
  └── Task 7 → Task 8 (keyword, standalone)
  └── Task 9 → Task 10 → Task 11 (semantic/hybrid, need Qdrant)
  └── Task 12 (routes, needs all search engines)

Phase 4 (Frontend Search) — requires Phase 3 API running
  └── Task 13 → Task 14 → Task 15 → Task 16

Phase 5 (Visualizer) — requires Phase 2 embeddings
  └── Task 17 → Task 18

Phase 6 (How It Works) — independent, can parallel with Phase 4/5
  └── Task 19 → Task 20

Phase 7 (RAG + Eval) — requires Phase 3 + Gemini key
  └── Task 21
  └── Task 22

Phase 8 (Deploy) — requires all above
  └── Task 23 → Task 24
```

**Parallelizable:** Phase 6 (animations) can be built independently of Phases 3-5. Task 8 (keyword search) doesn't need Qdrant — can be built with local JSON data.
