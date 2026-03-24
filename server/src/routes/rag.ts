import { Hono } from "hono";
import { generateRagAnswer } from "../lib/gemini";

const ragRoutes = new Hono();

// Simple rate limiter
const requestLog: number[] = [];
const MAX_REQUESTS_PER_MINUTE = 30;

ragRoutes.post("/answer", async (c) => {
  // Rate limiting
  const now = Date.now();
  const oneMinuteAgo = now - 60000;
  while (requestLog.length > 0 && requestLog[0] < oneMinuteAgo) {
    requestLog.shift();
  }
  if (requestLog.length >= MAX_REQUESTS_PER_MINUTE) {
    return c.json({ error: "Rate limit exceeded. Try again in a minute." }, 429);
  }
  requestLog.push(now);

  const { query, results } = await c.req.json<{
    query: string;
    results: { title: string; artist: string; year: number; genre: string; score: number; lyrics: string }[];
  }>();

  if (!query?.trim()) {
    return c.json({ error: "Query required" }, 400);
  }

  if (!results?.length) {
    return c.json({ error: "No results to generate answer from" }, 400);
  }

  // Limit context to top 5 results
  const topResults = results.slice(0, 5);

  try {
    const answer = await generateRagAnswer(query, topResults);
    return c.json({ answer });
  } catch (err: any) {
    console.error("Gemini error:", err.message);
    return c.json({ error: "Failed to generate answer" }, 500);
  }
});

export { ragRoutes };
