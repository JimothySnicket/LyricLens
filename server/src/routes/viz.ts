import { Hono } from "hono";
import { readFileSync } from "fs";
import { resolve } from "path";
import { embedQuery } from "../lib/embedder";
import { vectorSearch } from "../lib/vector-store";
import { checkGeneralRateLimit, sanitizeInput } from "../lib/deepseek";

const vizRoutes = new Hono();

let vizCache: any[] | null = null;

function getVizCache(): any[] {
  if (!vizCache) {
    const dataPath = resolve(import.meta.dir, "../../../data/processed/umap_coords.json");
    vizCache = JSON.parse(readFileSync(dataPath, "utf-8"));
    console.log(`Loaded ${vizCache!.length} viz points`);
  }
  return vizCache!;
}

vizRoutes.get("/data", (c) => {
  return c.json(getVizCache());
});

vizRoutes.post("/project", async (c) => {
  const ip = c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown";
  const rateCheck = checkGeneralRateLimit(ip);
  if (!rateCheck.allowed) return c.json({ error: rateCheck.reason }, 429);

  const { query } = await c.req.json<{ query: string }>();
  if (!query?.trim()) return c.json({ error: "query required" }, 400);

  const clean = sanitizeInput(query.trim());
  if (!clean) return c.json({ error: "Invalid query" }, 400);

  // 1. Embed the query
  const vector = await embedQuery(clean);

  // 2. Find 5 nearest songs in-memory (using lyrics vector)
  const hits = vectorSearch(vector, "lyrics", 5);

  // 3. Look up their UMAP coords from viz cache (match by title+artist)
  const vizData = getVizCache();
  const vizByTitleArtist = new Map(
    vizData.map((p: any) => [`${p.title}|||${p.artist}`, p])
  );

  let totalWeight = 0;
  let px = 0, py = 0, pz = 0;
  const nearestSongs: { id: string; title: string; artist: string; sim: number }[] = [];

  for (const hit of hits) {
    const sim = hit.score ?? 0;
    const title = hit.song.title;
    const artist = hit.song.artist;
    const vizPoint = vizByTitleArtist.get(`${title}|||${artist}`);
    if (!vizPoint) continue;

    const weight = sim * sim; // square weighting — closer songs dominate
    px += vizPoint.x * weight;
    py += vizPoint.y * weight;
    pz += vizPoint.z * weight;
    totalWeight += weight;

    nearestSongs.push({
      id: vizPoint.id,
      title,
      artist,
      sim: Math.round(sim * 10000) / 10000,
    });
  }

  if (totalWeight === 0) return c.json({ error: "no matches found" }, 404);

  return c.json({
    x: Math.round((px / totalWeight) * 1000000) / 1000000,
    y: Math.round((py / totalWeight) * 1000000) / 1000000,
    z: Math.round((pz / totalWeight) * 1000000) / 1000000,
    query: clean,
    nearest: nearestSongs,
  });
});

export { vizRoutes };
