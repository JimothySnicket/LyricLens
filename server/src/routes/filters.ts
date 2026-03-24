import { Hono } from "hono";

const filterRoutes = new Hono();

filterRoutes.get("/", (c) => {
  return c.json({
    decades: [1950, 1960, 1970, 1980, 1990, 2000, 2010],
    genres: ["rock", "pop", "jazz", "blues", "country", "reggae"],
  });
});

export { filterRoutes };
