/**
 * OpenAI Chat Completions response → Anthropic Messages response (non-stream)
 * and OpenAI error body → Anthropic error shape.
 */

export interface AnthropicResponseJson {
  id: string;
  type: "message";
  role: "assistant";
  model: string;
  content: Array<Record<string, unknown>>;
  stop_reason: string;
  stop_sequence: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_read_input_tokens?: number;
    cache_creation_input_tokens?: number;
  };
}

/** Map OpenAI finish_reason → Anthropic stop_reason. */
export function mapFinishReason(
  fr: string | null | undefined,
  hadToolCalls: boolean,
): "end_turn" | "max_tokens" | "stop_sequence" | "tool_use" | "refusal" {
  switch (fr) {
    case "length":
      return "max_tokens";
    case "tool_calls":
    case "function_call":
      return "tool_use";
    case "content_filter":
      return "refusal";
    case "stop":
      // Some providers finish with "stop" even after emitting tool_calls;
      // Claude Code drives its tool loop off stop_reason, so a trailing
      // tool_use must be announced as one.
      return hadToolCalls ? "tool_use" : "end_turn";
    default:
      return hadToolCalls ? "tool_use" : "end_turn";
  }
}

function safeJsonParse(s: unknown): Record<string, unknown> | null {
  if (typeof s !== "string" || s.length === 0) return null;
  try {
    const v = JSON.parse(s);
    return typeof v === "object" && v !== null ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function randomIdSuffix(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

/**
 * Synthesize an Anthropic Messages JSON from an OpenAI Chat Completions
 * response. Tolerant of missing fields; never throws.
 */
export function openAiToAnthropicResponse(openai: unknown, fallbackModel: string): AnthropicResponseJson {
  const o = (typeof openai === "object" && openai !== null ? openai : {}) as Record<string, unknown>;
  const choices = Array.isArray(o.choices) ? (o.choices as Record<string, unknown>[]) : [];
  const choice = choices[0] ?? {};
  const message = (typeof choice.message === "object" && choice.message !== null
    ? choice.message
    : {}) as Record<string, unknown>;

  const content: Array<Record<string, unknown>> = [];

  // reasoning_content is intentionally dropped: a synthesized thinking block
  // with an empty signature would 400 on the next request of this conversation
  // if it routes to an Anthropic-native credential. See request.ts notes.

  const rawContent = message.content;
  let refusalText: string | null = null;
  if (Array.isArray(rawContent)) {
    // Some providers return content parts even on chat.completions
    const texts: string[] = [];
    for (const part of rawContent) {
      const p = part as { type?: string; text?: unknown; refusal?: unknown };
      if (typeof p.text === "string" && p.text.length > 0) texts.push(p.text);
      if (typeof p.refusal === "string" && p.refusal.length > 0) refusalText = p.refusal;
    }
    if (texts.length > 0) content.push({ type: "text", text: texts.join("\n\n") });
  } else if (typeof rawContent === "string" && rawContent.length > 0) {
    content.push({ type: "text", text: rawContent });
  }
  if (typeof message.refusal === "string" && message.refusal.length > 0) {
    refusalText = message.refusal;
  }
  if (refusalText !== null) {
    content.push({ type: "text", text: refusalText });
  }

  const toolCalls = Array.isArray(message.tool_calls) ? (message.tool_calls as Record<string, unknown>[]) : [];
  for (const tc of toolCalls) {
    const fn = (typeof tc.function === "object" && tc.function !== null
      ? tc.function
      : {}) as { name?: unknown; arguments?: unknown };
    const name = typeof fn.name === "string" ? fn.name : "unknown_tool";
    const input = safeJsonParse(fn.arguments) ?? {}; // empty/invalid arguments → {} (never null)
    content.push({
      type: "tool_use",
      id: typeof tc.id === "string" && tc.id.length > 0 ? tc.id : `toolu_${randomIdSuffix()}`,
      name,
      input,
    });
  }

  const hadToolCalls = content.some((b) => b.type === "tool_use");
  let stopReason = mapFinishReason(
    typeof choice.finish_reason === "string" ? choice.finish_reason : null,
    hadToolCalls,
  );
  if (refusalText !== null && !hadToolCalls) stopReason = "refusal";

  if (content.length === 0) {
    content.push({ type: "text", text: "" });
  }

  const usage = (typeof o.usage === "object" && o.usage !== null ? o.usage : {}) as Record<string, unknown>;

  return {
    id: typeof o.id === "string" && o.id.length > 0 ? o.id : `msg_${randomIdSuffix()}`,
    type: "message",
    role: "assistant",
    model: typeof o.model === "string" && o.model.length > 0 ? o.model : fallbackModel,
    content,
    stop_reason: stopReason,
    stop_sequence: null,
    usage: {
      input_tokens: typeof usage.prompt_tokens === "number" ? usage.prompt_tokens : 0,
      output_tokens: typeof usage.completion_tokens === "number" ? usage.completion_tokens : 0,
    },
  };
}

const STATUS_TO_ERROR_TYPE: Record<number, string> = {
  400: "invalid_request_error",
  401: "authentication_error",
  403: "permission_error",
  404: "not_found_error",
  413: "request_too_large",
  429: "rate_limit_error",
  500: "api_error",
  502: "api_error",
  503: "overloaded_error",
  529: "overloaded_error",
};

/**
 * Convert an upstream OpenAI-style error body into an Anthropic-shaped error
 * JSON string (same HTTP status as upstream). Falls back to statusText when
 * the body is not parseable — the client always receives a valid shape.
 */
export function openAiToAnthropicError(status: number, body: string, statusText = ""): string {
  let message = statusText || `Upstream error (HTTP ${status})`;
  let upstreamType: string | undefined;

  try {
    const parsed = JSON.parse(body) as { error?: { message?: unknown; type?: unknown; code?: unknown } };
    if (parsed?.error) {
      if (typeof parsed.error.message === "string" && parsed.error.message.length > 0) {
        message = parsed.error.message;
      }
      if (typeof parsed.error.type === "string") upstreamType = parsed.error.type;
    }
  } catch {
    // HTML or garbage body — keep fallback message
  }

  const type =
    upstreamType && upstreamType.length > 0 ? upstreamType : STATUS_TO_ERROR_TYPE[status] ?? "api_error";

  return JSON.stringify({ type: "error", error: { type, message } });
}
