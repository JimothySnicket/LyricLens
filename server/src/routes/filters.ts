import { Hono } from "hono";
import { getSongs } from "../lib/data";

const filterRoutes = new Hono();

filterRoutes.get("/", (c) => {
  const songs = getSongs();
  const genres = Array.from(new Set(songs.map((s) => s.genre))).sort();
  const decades = Array.from(new Set(songs.map((s) => s.decade))).sort();

  return c.json({ decades, genres });
});

export { filterRoutes };
