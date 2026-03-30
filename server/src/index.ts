import { resolve } from "path";
import { readFileSync, existsSync } from "fs";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { serveStatic } from "hono/bun";
import { searchRoutes } from "./routes/search";
import { filterRoutes } from "./routes/filters";
import { statsRoutes } from "./routes/stats";
import { vizRoutes } from "./routes/viz";
import { ragRoutes } from "./routes/rag";

// Load .env from project root (parent of server/)
const envPath = resolve(import.meta.dir, "../../.env");
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

const app = new Hono();

const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:5200";
app.use("/api/*", cors({ origin: corsOrigin }));

// API routes
app.get("/api/health", (c) => c.json({ status: "ok" }));
app.route("/api/search", searchRoutes);
app.route("/api/filters", filterRoutes);
app.route("/api/stats", statsRoutes);
app.route("/api/viz", vizRoutes);
app.route("/api/rag", ragRoutes);

// Static file serving (production — serves built frontend)
const staticRoot = resolve(import.meta.dir, "../../web/dist");
if (existsSync(staticRoot)) {
  app.use("/*", serveStatic({ root: staticRoot }));
  app.get("/*", serveStatic({ path: resolve(staticRoot, "index.html") }));
}

const port = parseInt(process.env.PORT || "5201", 10);
console.log(`LyricLens API listening on port ${port}`);

export default {
  port,
  fetch: app.fetch,
};
