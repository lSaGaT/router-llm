/**
 * Shared types for the Anthropic ↔ OpenAI-compatible translation layer.
 * Typing is intentionally loose/tolerant: the gateway must never reject a
 * request because a block shape evolved — unknown fields are passed or
 * dropped, never validated.
 */

// ---------------------------------------------------------------------------
// OpenAI Chat Completions shapes (what we produce upstream)
// ---------------------------------------------------------------------------

export interface OpenAiFunctionCall {
  name?: string | null;
  arguments?: string | null;
}

export interface OpenAiToolCall {
  index?: number;
  id?: string | null;
  type?: string | null;
  function?: OpenAiFunctionCall | null;
}

export interface OpenAiContentPart {
  type: "text" | "image_url";
  text?: string;
  image_url?: { url: string };
}

export interface OpenAiMessage {
  role: "system" | "user" | "assistant" | "tool";
  content?: string | OpenAiContentPart[] | null;
  tool_calls?: OpenAiToolCall[];
  tool_call_id?: string;
}

export interface OpenAiTool {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
}

export interface OpenAiChatRequest {
  model: string;
  messages: OpenAiMessage[];
  max_tokens?: number;
  max_completion_tokens?: number;
  stop?: string[];
  temperature?: number;
  top_p?: number;
  reasoning_effort?: "low" | "medium" | "high";
  stream?: boolean;
  stream_options?: { include_usage: boolean };
  tools?: OpenAiTool[];
  tool_choice?: unknown;
  parallel_tool_calls?: boolean;
  user?: string;
}

// ---------------------------------------------------------------------------
// Anthropic shapes (what we accept from the client — loose)
// ---------------------------------------------------------------------------

export interface AnthropicTextBlock {
  type: "text";
  text: string;
  cache_control?: unknown;
}

export interface AnthropicToolUseBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: unknown;
}

export interface AnthropicToolResultBlock {
  type: "tool_result";
  tool_use_id: string;
  content?: unknown;
  is_error?: boolean;
}

export interface AnthropicImageBlock {
  type: "image";
  source: {
    type: string; // "base64" | "url"
    media_type?: string;
    data?: string;
    url?: string;
  };
}

export type AnthropicContentBlock =
  | AnthropicTextBlock
  | AnthropicToolUseBlock
  | AnthropicToolResultBlock
  | AnthropicImageBlock
  | { type: string; [k: string]: unknown }; // thinking, redacted_thinking, server_tool_use, ...

export interface AnthropicMessage {
  role?: string;
  content?: string | AnthropicContentBlock[];
  [k: string]: unknown;
}

export interface AnthropicRequestBody {
  model?: string;
  messages?: AnthropicMessage[];
  system?: string | AnthropicTextBlock[];
  tools?: unknown[];
  tool_choice?: unknown;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  stop_sequences?: string[];
  stream?: boolean;
  thinking?: { type?: string; budget_tokens?: number } | null;
  metadata?: { user_id?: string } | null;
  [k: string]: unknown;
}

// ---------------------------------------------------------------------------
// Translation diagnostics (logged to Execution.requestJson, never sent to client)
// ---------------------------------------------------------------------------

export interface TranslationIssue {
  severity: "warn" | "drop";
  detail: string;
}

export interface TranslatedRequest {
  out: OpenAiChatRequest;
  issues: TranslationIssue[];
}
