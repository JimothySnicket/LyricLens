import { Hono } from "hono";

const statsRoutes = new Hono();

statsRoutes.get("/", (c) => {
  return c.json({
    totalSongs: 819,
    precision: { keyword: null, semantic: null, hybrid: null },
    mrr: null,
    clusterPurity: null,
    note: "Evaluation metrics will be populated after running the eval pipeline",
  });
});

export { statsRoutes };
