import { Hono } from "hono";
import { generateAnswer, checkRateLimit, sanitizeInput } from "../lib/deepseek";

const ragRoutes = new Hono();

ragRoutes.post("/answer", async (c) => {
  const ip = c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown";
  const rateCheck = checkRateLimit(ip);
  if (!rateCheck.allowed) {
    return c.json({ error: rateCheck.reason }, 429);
  }

  const { query, results } = await c.req.json<{
    query: string;
    results: { title: string; artist: string; year: number; genre: string }[];
  }>();

  if (!query?.trim()) {
    return c.json({ error: "Query required" }, 400);
  }

  const clean = sanitizeInput(query);
  if (!clean) {
    return c.json({ error: "Invalid query" }, 400);
  }

  if (!results?.length) {
    return c.json({ answer: "No songs matched your search." });
  }

  try {
    const answer = await generateAnswer(clean, results.slice(0, 5));
    return c.json({ answer });
  } catch (err: any) {
    console.error("DeepSeek RAG error:", err.message);
    return c.json({ error: "Failed to generate answer" }, 500);
  }
});

export { ragRoutes };
