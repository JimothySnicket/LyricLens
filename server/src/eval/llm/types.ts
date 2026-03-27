export type LLMProvider = "deepseek" | "gemini";

export interface LLMClient {
  name: LLMProvider;
  call(systemPrompt: string, userMessage: string, maxTokens?: number): Promise<string>;
  callMultiTurn(messages: { role: "system" | "user" | "assistant"; content: string }[], maxTokens?: number): Promise<string>;
}
