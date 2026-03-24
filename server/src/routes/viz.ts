import { Hono } from "hono";
import { readFileSync } from "fs";
import { resolve } from "path";

const vizRoutes = new Hono();

let vizCache: any = null;

vizRoutes.get("/data", (c) => {
  if (!vizCache) {
    const dataPath = resolve(import.meta.dir, "../../../data/processed/umap_coords.json");
    vizCache = JSON.parse(readFileSync(dataPath, "utf-8"));
    console.log(`Loaded ${vizCache.length} viz points`);
  }
  return c.json(vizCache);
});

export { vizRoutes };
