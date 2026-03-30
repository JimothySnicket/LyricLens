# Cloud Run Deployment Design

## Overview

Deploy LyricLens as a single container on Google Cloud Run, serving both the Hono API and the static Vite-built frontend. Deployed via the `@google-cloud/cloud-run-mcp` server from Claude Code — no local Docker or gcloud CLI required.

## GCP Infrastructure (Already Set Up)

- **Project ID:** `lyric-lens-491614`
- **Region:** `europe-west2` (London)
- **Artifact Registry:** `europe-west2-docker.pkg.dev/lyric-lens-491614/lyric-lens/`
- **Cloud Run service:** `lyric-lens` (currently running hello-world placeholder)
- **Service URL:** `https://lyric-lens-567745482176.europe-west2.run.app`
- **APIs enabled:** Cloud Run, Artifact Registry, Cloud Build
- **Billing:** Paid account with budget alert at £20/month

## Container Architecture

Single container running Bun:

- **Build stage:** `bun install` (both server and web workspaces) + `bun run build` (Vite builds frontend to `web/dist/`)
- **Runtime:** Bun serves the Hono API on port 8080 (Cloud Run default). Static file middleware serves `web/dist/` for all non-`/api` routes, with catch-all fallback to `index.html` for client-side routing.
- **Data files baked in:** `data/processed/merged_songs.json` and `data/processed/umap_coords.json` (~15MB total)
- **Embedding model:** fp32 nomic-embed-text-v1.5 (~550MB) downloads via `@huggingface/transformers` auto-cache on first request. With min-instances=1, this happens once per deploy — the model stays cached in the running container.
- **Env vars via Cloud Run config (not in image):** `QDRANT_URL`, `QDRANT_API_KEY`, `DEEPSEEK_API_KEY`, `CORS_ORIGIN`

## Cloud Run Configuration

| Setting | Value | Reason |
|---------|-------|--------|
| Memory | 2Gi | fp32 model ~550MB + songs data + Bun runtime |
| CPU | 1 vCPU | Sufficient for embedding inference |
| Min instances | 1 | Keeps model warm, no cold starts |
| Max instances | 3 | Caps cost for portfolio piece |
| Billing mode | Instance-based | Idle min-instance gets full CPU |
| Concurrency | 20 | Embedding inference is CPU-bound |
| Port | 8080 | Cloud Run default |

## Deployment Pipeline

1. **Auth:** Service account key JSON created in GCP console, referenced via `GOOGLE_APPLICATION_CREDENTIALS`
2. **MCP server:** `@google-cloud/cloud-run-mcp` added to Claude Code config
3. **Deploy:** `deploy-local-folder` tool zips project → Cloud Storage → Cloud Build builds from Dockerfile → Artifact Registry → Cloud Run

## Server Changes Required

1. **Port:** Read `PORT` env var (Cloud Run sets to 8080), fall back to 5201 for local dev
2. **Static serving:** Add Hono middleware to serve `web/dist/` for non-API routes, with `index.html` fallback for SPA routing
3. **CORS:** Already configurable via `CORS_ORIGIN` env var — set to Cloud Run URL in deployment config

## Dockerfile

Multi-stage build:
- **Stage 1 (build):** Install all deps, build Vite frontend
- **Stage 2 (runtime):** Copy server source, built frontend, data files. No model baked in.

## What We Skip

- Custom domain (use `*.run.app` URL — add subdomain later when main site exists)
- Model quantization (fp32 fine with min-instances=1)
- CI/CD pipeline (manual deploy via MCP tool)
- Health check (already exists at `/api/health`)

## Cost Estimate

With min-instances=1, instance-based billing, 1 vCPU, 2Gi memory:
- Idle instance: ~£5-10/month
- With moderate traffic: ~£10-15/month
- Well within £20/month budget alert
