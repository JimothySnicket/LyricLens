# ---- Build stage ----
FROM oven/bun:1 AS build
WORKDIR /app

# Install dependencies
COPY package.json bun.lock ./
COPY server/package.json server/
COPY web/package.json web/
RUN bun install --frozen-lockfile

# Copy source and build frontend
COPY server/ server/
COPY web/ web/
RUN cd web && bun run build

# Pre-download the embedding model so it's baked into the image
RUN cd server && bun -e "const{pipeline}=require('@huggingface/transformers');await pipeline('feature-extraction','nomic-ai/nomic-embed-text-v1.5',{dtype:'fp32'})"

# ---- Runtime stage ----
FROM oven/bun:1-slim
WORKDIR /app

# Copy server dependencies
COPY --from=build /app/node_modules node_modules/
COPY --from=build /app/server/node_modules server/node_modules/

# Copy server source
COPY --from=build /app/server/src server/src/
COPY --from=build /app/server/package.json server/

# Copy built frontend
COPY --from=build /app/web/dist web/dist/

# Copy data files
COPY data/processed/merged_songs.json data/processed/merged_songs.json
COPY data/processed/umap_coords.json data/processed/umap_coords.json

EXPOSE 8080
ENV PORT=8080

CMD ["bun", "run", "server/src/index.ts"]
