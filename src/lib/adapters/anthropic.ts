/**
 * Anthropic Messages API adapter.
 *
 * Native format — no conversion needed. Used when the user creates a
 * credential with provider="anthropic".
 *
 * Supports streaming via Anthropic SSE format. Also supports "extended thinking"
 * via the thinking parameter (when enabled on the node).
 */
import type {
  CredentialPayload,
  ModelAdapter,
  ModelCallRequest,
  ModelCallResult,
} from "@/lib/workflow/types";

export interface AnthropicAdapterOptions {
  apiKey: string;
  baseUrl?: string; // default https://api.anthropic.com
  organization?: string;
  headers?: Record<string, string>;
}

const ANTHROPIC_DEFAULT_BASE = "https://api.anthropic.com";

// Anthropic model catalog (subset — Anthropic doesn't expose a /v1/models list
// in the same way as OpenAI, so we hardcode the common ones).
const ANTHROPIC_MODELS = [
  { id: "claude-opus-4-1-20250805", displayName: "Claude Opus 4.1" },
  { id: "claude-opus-4-5", displayName: "Claude Opus 4.5" },
  { id: "claude-sonnet-4-5", displayName: "Claude Sonnet 4.5" },
  { id: "claude-sonnet-4-5-20250929", displayName: "Claude Sonnet 4.5 (dated)" },
  { id: "claude-haiku-4-5", displayName: "Claude Haiku 4.5" },
  { id: "claude-3-7-sonnet-20250219", displayName: "Claude 3.7 Sonnet" },
  { id: "claude-3-5-haiku-20241022", displayName: "Claude 3.5 Haiku" },
];

export class AnthropicAdapter implements ModelAdapter {
  readonly provider = "anthropic";
  private apiKey: string;
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(opts: AnthropicAdapterOptions) {
    this.apiKey = opts.apiKey;
    this.baseUrl = (opts.baseUrl || ANTHROPIC_DEFAULT_BASE).replace(/\/$/, "");
    this.headers = {
      "x-api-key": this.apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
      ...(opts.organization ? { "anthropic-organization": opts.organization } : {}),
      ...(opts.headers || {}),
    };
  }

  static fromCredential(payload: CredentialPayload, baseUrl?: string): AnthropicAdapter {
    return new AnthropicAdapter({
      apiKey: payload.apiKey,
      baseUrl,
      organization: payload.organization,
      headers: payload.headers,
    });
  }

  async listModels() {
    return ANTHROPIC_MODELS;
  }

  private buildBody(req: ModelCallRequest): Record<string, unknown> {
    const body: Record<string, unknown> = {
      model: req.modelId,
      max_tokens: req.maxTokens ?? 4096,
      messages: req.messages.map((m) => ({ role: m.role, content: m.content })),
    };
    if (req.systemPrompt) body.system = req.systemPrompt;
    if (typeof req.temperature === "number") body.temperature = req.temperature;
    if (typeof req.topP === "number") body["top_p"] = req.topP;
    if (req.thinking) {
      body.thinking = {
        type: "enabled",
        budget_tokens: req.thinkingBudget ?? 4096,
      };
    }
    return body;
  }

  async call(req: ModelCallRequest): Promise<ModelCallResult> {
    const start = Date.now();
    const res = await fetch(`${this.baseUrl}/v1/messages`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(this.buildBody(req)),
      signal: req.signal,
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Anthropic API error ${res.status}: ${errText}`);
    }
    const data = await res.json();
    const text = (data.content || [])
      .filter((b: { type: string }) => b.type === "text")
      .map((b: { text: string }) => b.text)
      .join("");
    const latencyMs = Date.now() - start;
    return {
      text,
      tokensIn: data.usage?.input_tokens ?? 0,
      tokensOut: data.usage?.output_tokens ?? 0,
      costUsd: estimateAnthropicCost(req.modelId, data.usage?.input_tokens ?? 0, data.usage?.output_tokens ?? 0),
      latencyMs,
      modelUsed: data.model || req.modelId,
    };
  }

  async stream(
    req: ModelCallRequest,
    onToken: (text: string) => void,
  ): Promise<Omit<ModelCallResult, "text">> {
    const start = Date.now();
    const body = { ...this.buildBody(req), stream: true };
    const res = await fetch(`${this.baseUrl}/v1/messages`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(body),
      signal: req.signal,
    });
    if (!res.ok || !res.body) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Anthropic stream error ${res.status}: ${errText}`);
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
            if (evt.type === "content_block_delta" && evt.delta?.type === "text_delta") {
              onToken(evt.delta.text);
            } else if (evt.type === "message_start" && evt.message?.usage) {
              tokensIn = evt.message.usage.input_tokens ?? 0;
              if (evt.message.model) modelUsed = evt.message.model;
            } else if (evt.type === "message_delta" && evt.usage) {
              tokensOut = evt.usage.output_tokens ?? tokensOut;
            }
          } catch {
            // Ignore unparseable keep-alive lines
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
      costUsd: estimateAnthropicCost(req.modelId, tokensIn, tokensOut),
      latencyMs,
      modelUsed,
    };
  }
}

/** Rough cost estimation — per 1M tokens, in USD. */
// Source: Anthropic public pricing as of 2025.
const ANTHROPIC_PRICING: Record<string, { in: number; out: number }> = {
  "claude-opus-4": { in: 15, out: 75 },
  "claude-opus-4-1": { in: 15, out: 75 },
  "claude-opus-4-5": { in: 5, out: 25 },
  "claude-sonnet-4": { in: 3, out: 15 },
  "claude-sonnet-4-5": { in: 3, out: 15 },
  "claude-haiku-4": { in: 1, out: 5 },
  "claude-haiku-4-5": { in: 0.8, out: 4 },
  "claude-3-7-sonnet": { in: 3, out: 15 },
  "claude-3-5-haiku": { in: 0.8, out: 4 },
};

function estimateAnthropicCost(modelId: string, tokensIn: number, tokensOut: number): number {
  const key = Object.keys(ANTHROPIC_PRICING).find((k) => modelId.startsWith(k));
  const p = key ? ANTHROPIC_PRICING[key] : { in: 3, out: 15 };
  return (tokensIn / 1_000_000) * p.in + (tokensOut / 1_000_000) * p.out;
}
