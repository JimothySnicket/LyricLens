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

const API_URL = "https://api.deepseek.com/chat/completions";
const API_KEY = process.env.DEEPSEEK_API_KEY || "";

export const deepseekClient: LLMClient = {
  name: "deepseek",

  async call(systemPrompt, userMessage, maxTokens = 200) {
    return this.callMultiTurn([
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ], maxTokens);
  },

  async callMultiTurn(messages, maxTokens = 200) {
    const resp = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages,
        max_tokens: maxTokens,
        temperature: 0.3,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!resp.ok) throw new Error(`DeepSeek API error: ${resp.status}`);
    const data = await resp.json() as any;
    return (data.choices?.[0]?.message?.content ?? "").trim();
  },
};
