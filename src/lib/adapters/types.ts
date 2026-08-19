/**
 * Shared adapter types (moved from lib/workflow/types.ts when the graph
 * orchestrator was replaced by the phase router).
 */

/** Flat internal message shape used by the adapters' call/stream APIs. */
export interface Message {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  data?: any;
}

export interface ModelCallRequest {
  modelId: string;
  messages: Message[];
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  thinking?: boolean;
  thinkingBudget?: number;
  signal?: AbortSignal;
}

export interface ModelCallResult {
  text: string;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  latencyMs: number;
  modelUsed: string;
  /** Optional: structured output if the model supports JSON mode */
  structured?: unknown;
}

export interface ModelAdapter {
  /** Provider key: "anthropic" | "openai_compatible" */
  provider: string;
  /** List available models via /v1/models (or hardcoded for Anthropic). */
  listModels(): Promise<{ id: string; displayName: string }[]>;
  /** Non-streaming call. */
  call(req: ModelCallRequest): Promise<ModelCallResult>;
  /** Streaming call — emits text deltas via onToken. */
  stream(
    req: ModelCallRequest,
    onToken: (text: string) => void,
  ): Promise<Omit<ModelCallResult, "text">>;
}

export interface CredentialPayload {
  apiKey: string;
  organization?: string;
  /** Additional headers to send (e.g. for OpenRouter "HTTP-Referer") */
  headers?: Record<string, string>;
}
