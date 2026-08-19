/**
 * OpenAI-compatible chat completions adapter.
 *
 * One adapter to cover all providers that implement the OpenAI Chat Completions API:
 * - Z.ai (GLM): https://api.z.ai/api/paas/v4
 * - DeepSeek: https://api.deepseek.com/v1
 * - OpenRouter: https://openrouter.ai/api/v1
 * - Ollama (local): http://localhost:11434/v1
 * - LocalAI, vLLM, LM Studio, Together, Groq, Mistral, Moonshot, etc.
 *
 * Converts Anthropic-format messages → OpenAI-format messages internally so the
 * workflow engine can stay Anthropic-native (since Claude Code is the front door).
 *
 * Supports:
 * - /v1/models for discovery (so the user can pick from real models after entering credentials)
 * - /v1/chat/completions for both non-streaming and streaming calls
 * - Reasoning via "reasoning_effort" parameter when supported (DeepSeek R1, GLM thinking, etc.)
 */
import type {
  CredentialPayload,
  Message,
  ModelAdapter,
  ModelCallRequest,
  ModelCallResult,
} from "@/lib/adapters/types";

export interface OpenAICompatibleOptions {
  apiKey: string;
  baseUrl: string; // e.g. https://api.z.ai/api/paas/v4
  organization?: string;
  headers?: Record<string, string>;
}

interface OpenAIModel {
  id: string;
  object: string;
  created?: number;
  owned_by?: string;
}

export class OpenAICompatibleAdapter implements ModelAdapter {
  readonly provider = "openai_compatible";
  private apiKey: string;
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(opts: OpenAICompatibleOptions) {
    this.apiKey = opts.apiKey;
    this.baseUrl = opts.baseUrl.replace(/\/$/, "");
    this.headers = {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
      ...(opts.organization ? { "OpenAI-Organization": opts.organization } : {}),
      ...(opts.headers || {}),
    };
  }

  static fromCredential(payload: CredentialPayload, baseUrl: string): OpenAICompatibleAdapter {
    return new OpenAICompatibleAdapter({
      apiKey: payload.apiKey,
      baseUrl,
      organization: payload.organization,
      headers: payload.headers,
    });
  }

  async listModels(): Promise<{ id: string; displayName: string }[]> {
    try {
      const res = await fetch(`${this.baseUrl}/models`, {
        method: "GET",
        headers: this.headers,
      });
      if (!res.ok) {
        throw new Error(`listModels HTTP ${res.status}: ${await res.text()}`);
      }
      const data = await res.json();
      const models: OpenAIModel[] = data.data || data.models || [];
      return models
        .filter((m) => m && m.id)
        .map((m) => ({
          id: m.id,
          displayName: m.id,
        }));
    } catch (e) {
      throw new Error(`Failed to list models from ${this.baseUrl}/models: ${(e as Error).message}`);
    }
  }

  /** Convert Anthropic-style messages to OpenAI-style. */
  private toOpenAIMessages(req: ModelCallRequest): unknown[] {
    const out: unknown[] = [];
    if (req.systemPrompt) {
      out.push({ role: "system", content: req.systemPrompt });
    }
    for (const m of req.messages) {
      if (m.role === "system") {
        // Already handled above if first; if a system appears mid-stream, keep it.
        out.push({ role: "system", content: m.content });
      } else if (m.role === "tool") {
        out.push({ role: "tool", content: m.content });
      } else {
        out.push({ role: m.role, content: m.content });
      }
    }
    return out;
  }

  private buildBody(req: ModelCallRequest, stream: boolean): Record<string, unknown> {
    const body: Record<string, unknown> = {
      model: req.modelId,
      messages: this.toOpenAIMessages(req),
      max_tokens: req.maxTokens ?? 4096,
      stream,
    };
    if (typeof req.temperature === "number") body.temperature = req.temperature;
    if (typeof req.topP === "number") body.top_p = req.topP;
    if (req.thinking) {
      // Different providers use different keys — we set the most common ones.
      body.reasoning_effort = "medium";
      body.thinking = { type: "enabled", budget_tokens: req.thinkingBudget ?? 4096 };
    }
    return body;
  }

  async call(req: ModelCallRequest): Promise<ModelCallResult> {
    const start = Date.now();
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(this.buildBody(req, false)),
      signal: req.signal,
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenAI-compatible API error ${res.status}: ${errText}`);
    }
    const data = await res.json();
    const choice = data.choices?.[0];
    const text = choice?.message?.content || "";
    const latencyMs = Date.now() - start;
    const tokensIn = data.usage?.prompt_tokens ?? 0;
    const tokensOut = data.usage?.completion_tokens ?? 0;
    return {
      text,
      tokensIn,
      tokensOut,
      costUsd: 0, // Unknown — discovery-time pricing is optional in DB
      latencyMs,
      modelUsed: data.model || req.modelId,
    };
  }

  async stream(
    req: ModelCallRequest,
    onToken: (text: string) => void,
  ): Promise<Omit<ModelCallResult, "text">> {
    const start = Date.now();
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(this.buildBody(req, true)),
      signal: req.signal,
    });
    if (!res.ok || !res.body) {
      const errText = await res.text().catch(() => "");
      throw new Error(`OpenAI-compatible stream error ${res.status}: ${errText}`);
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    let tokensIn = 0;
    let tokensOut = 0;
    let modelUsed = req.modelId;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() || "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const payload = trimmed.slice(5).trim();
          if (payload === "[DONE]") continue;
          try {
            const evt = JSON.parse(payload);
            const delta = evt.choices?.[0]?.delta;
            if (delta?.content) onToken(delta.content);
            if (evt.usage) {
              tokensIn = evt.usage.prompt_tokens ?? tokensIn;
              tokensOut = evt.usage.completion_tokens ?? tokensOut;
            }
            if (evt.model) modelUsed = evt.model;
          } catch {
            // keep-alive
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
    const latencyMs = Date.now() - start;
    return {
      tokensIn,
      tokensOut,
      costUsd: 0,
      latencyMs,
      modelUsed,
    };
  }
}

/** Helper to extract a Message[] from a list, useful for the engine. */
export function messagesToText(messages: Message[]): string {
  return messages
    .filter((m) => m.role !== "system")
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n\n");
}
