import { GoogleGenerativeAI } from "@google/generative-ai";

let genAI: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (!genAI) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY not set");
    genAI = new GoogleGenerativeAI(key);
  }
  return genAI;
}

export async function generateRagAnswer(
  query: string,
  context: { title: string; artist: string; year: number; genre: string; score: number; lyrics: string }[]
): Promise<string> {
  const model = getClient().getGenerativeModel({ model: "gemini-2.5-flash" });

  const contextStr = context
    .map((c, i) => `[${i + 1}] "${c.title}" by ${c.artist} (${c.year}, ${c.genre}) — Score: ${c.score.toFixed(3)}\nLyrics excerpt: ${c.lyrics.substring(0, 300)}`)
    .join("\n\n");

  const prompt = `You are a music expert answering questions about chart hits from 1950-2019. Based ONLY on the following retrieved songs, answer the user's question. Be specific, cite song titles and artists. Keep it concise (2-3 paragraphs max). Do not reproduce full lyrics.

RETRIEVED SONGS:
${contextStr}

QUESTION: ${query}`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}
