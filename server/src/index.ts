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
