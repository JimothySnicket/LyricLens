import type { LLMClient } from "./types";
import { readFileSync } from "fs";
import { resolve } from "path";

const envPath = resolve(import.meta.dir, "../../../../.env");
try {
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const match = line.match(/^(\w+)=(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].trim();
    }
  }
} catch {}

const API_KEY = process.env.GEMINI_API_KEY || "";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

export const geminiClient: LLMClient = {
  name: "gemini",

  async call(systemPrompt, userMessage, maxTokens = 200) {
    return this.callMultiTurn([
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ], maxTokens);
  },

  async callMultiTurn(messages, maxTokens = 200) {
    const systemMsg = messages.find(m => m.role === "system");
    const contents = messages
      .filter(m => m.role !== "system")
      .map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    const resp = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: systemMsg
          ? { parts: [{ text: systemMsg.content }] }
          : undefined,
        contents,
        generationConfig: {
          maxOutputTokens: maxTokens,
          temperature: 0.3,
        },
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Gemini API error: ${resp.status} — ${text}`);
    }
    const data = await resp.json() as any;
    return (data.candidates?.[0]?.content?.parts?.[0]?.text ?? "").trim();
  },
};
