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
- Theme: CSS custom properties in index.css, toggled via .dark class on html
- Tailwind v4 with CSS-first config
