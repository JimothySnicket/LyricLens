import { Hono } from "hono";
import { cors } from "hono/cors";
import { searchRoutes } from "./routes/search";
import { filterRoutes } from "./routes/filters";
import { statsRoutes } from "./routes/stats";
import { vizRoutes } from "./routes/viz";

const app = new Hono();

app.use("/*", cors({ origin: "http://localhost:5200" }));

app.get("/api/health", (c) => c.json({ status: "ok" }));
app.route("/api/search", searchRoutes);
app.route("/api/filters", filterRoutes);
app.route("/api/stats", statsRoutes);
app.route("/api/viz", vizRoutes);

const port = 5201;
console.log(`LyricLens API listening on port ${port}`);

export default {
  port,
  fetch: app.fetch,
};
