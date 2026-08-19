/**
 * Anthropic Messages request → OpenAI Chat Completions request.
 *
 * Design notes (load-bearing):
 *  - Claude Code is the client; it expects a transparent gateway. Anything
 *    without a Chat Completions equivalent is DROPPED (with a TranslationIssue)
 *    rather than causing a 400 upstream.
 *  - thinking/redacted_thinking blocks are dropped in BOTH directions. A
 *    synthesized thinking block with an empty signature would 400 on the next
 *    request of the same conversation if it routes to an Anthropic-native
 *    credential — dropping is the only closed policy.
 *  - `[1m]`-style context suffixes are stripped from the model id (accepted by
 *    Z.ai, 404 everywhere else). Same regex as estimateCost() in proxy.ts.
 */
import type {
  AnthropicContentBlock,
  AnthropicMessage,
  AnthropicRequestBody,
  OpenAiContentPart,
  OpenAiMessage,
  OpenAiTool,
  TranslatedRequest,
  TranslationIssue,
} from "./types";

const CONTEXT_SUFFIX_RE = /\[[^\]]*\]$/;

/**
 * Models that accept `reasoning_effort`. Extend this single list as new
 * reasoning-capable model families appear upstream.
 */
const REASONING_EFFORT_RE =
  /^(o[134](-|$)|gpt-5|deepseek-reasoner|deepseek-chat|grok-[a-z0-9.]*-reasoning|grok-4|minimax-m[23]|glm-4)/i;

/** Models that reject `max_tokens` and require `max_completion_tokens` (and no temperature). */
const MAX_COMPLETION_ONLY_RE = /^(o[134]|gpt-5)/i;

export function supportsReasoningEffort(modelId: string): boolean {
  return REASONING_EFFORT_RE.test(modelId);
}

export function isMaxCompletionOnly(modelId: string): boolean {
  return MAX_COMPLETION_ONLY_RE.test(modelId);
}

/** Strip Z.ai-style context suffixes: "glm-5.3[1m]" → "glm-5.3". */
export function stripContextSuffix(modelId: string): string {
  return modelId.replace(CONTEXT_SUFFIX_RE, "");
}

export function anthropicToOpenAiBody(body: AnthropicRequestBody): TranslatedRequest {
  const issues: TranslationIssue[] = [];
  const model = stripContextSuffix(typeof body.model === "string" ? body.model : "");

  const messages: OpenAiMessage[] = [];
  const systemText = convertSystem(body.system);
  if (systemText !== null) {
    messages.push({ role: "system", content: systemText });
  }

  const toolUseIds = new Set<string>();
  convertMessages(body.messages ?? [], messages, toolUseIds, issues);

  const out: Record<string, unknown> = {
    model,
    messages,
  };

  if (Array.isArray(body.tools) && body.tools.length > 0) {
    const tools = convertTools(body.tools, issues);
    if (tools.length > 0) out.tools = tools;
  }

  const toolChoice = convertToolChoice(body.tool_choice);
  if (toolChoice !== undefined) {
    Object.assign(out, toolChoice);
  }

  if (typeof body.max_tokens === "number") {
    if (isMaxCompletionOnly(model)) out.max_completion_tokens = body.max_tokens;
    else out.max_tokens = body.max_tokens;
  }

  if (Array.isArray(body.stop_sequences) && body.stop_sequences.length > 0) {
    // OpenAI accepts at most 4 stop sequences
    const stop = body.stop_sequences.slice(0, 4).filter((s): s is string => typeof s === "string");
    if (stop.length > 0) out.stop = stop;
    if (body.stop_sequences.length > 4) {
      issues.push({ severity: "warn", detail: `stop_sequences truncated to 4 (got ${body.stop_sequences.length})` });
    }
  }

  if (isMaxCompletionOnly(model)) {
    // o-series/gpt-5 reject temperature and top_p
    if (typeof body.temperature === "number") {
      issues.push({ severity: "drop", detail: "temperature dropped (reasoning-only model)" });
    }
    if (typeof body.top_p === "number") {
      issues.push({ severity: "drop", detail: "top_p dropped (reasoning-only model)" });
    }
  } else {
    if (typeof body.temperature === "number") out.temperature = body.temperature;
    if (typeof body.top_p === "number") out.top_p = body.top_p;
  }

  // OpenAI rejects unknown params with 400 — only emit when the model family supports it
  if (body.thinking?.type === "enabled" && typeof body.thinking.budget_tokens === "number") {
    if (supportsReasoningEffort(model)) {
      const b = body.thinking.budget_tokens;
      out.reasoning_effort = b < 4000 ? "low" : b < 16000 ? "medium" : "high";
    } else {
      issues.push({ severity: "drop", detail: "thinking dropped (model without reasoning_effort support)" });
    }
  }

  if (body.stream === true) {
    out.stream = true;
    out.stream_options = { include_usage: true };
  }

  if (typeof body.metadata?.user_id === "string") {
    out.user = body.metadata.user_id;
  }

  // Explicitly NOT forwarded: top_k, service_tier, anthropic-beta fields,
  // mcp_servers, context_management, cache_control (no cross-provider
  // prompt-caching in this phase).

  return { out: out as TranslatedRequest["out"], issues };
}

// ---------------------------------------------------------------------------
// system
// ---------------------------------------------------------------------------

function convertSystem(system: AnthropicRequestBody["system"]): string | null {
  if (typeof system === "string" && system.length > 0) return system;
  if (Array.isArray(system)) {
    const parts = system
      .filter((b): b is { type: string; text?: unknown } => typeof b === "object" && b !== null)
      .map((b) => (typeof b.text === "string" ? b.text : ""))
      .filter((t) => t.length > 0);
    if (parts.length > 0) return parts.join("\n\n");
  }
  return null;
}

// ---------------------------------------------------------------------------
// messages
// ---------------------------------------------------------------------------

function convertMessages(
  input: AnthropicMessage[],
  out: OpenAiMessage[],
  toolUseIds: Set<string>,
  issues: TranslationIssue[],
): void {
  for (const msg of input) {
    if (typeof msg !== "object" || msg === null) continue;
    const role = msg.role === "assistant" ? "assistant" : "user";

    if (typeof msg.content === "string") {
      pushOrMerge(out, { role, content: msg.content });
      continue;
    }
    if (!Array.isArray(msg.content)) {
      // Empty content — keep message shape valid
      pushOrMerge(out, { role, content: role === "assistant" ? "" : " " });
      continue;
    }

    if (role === "user") {
      convertUserMessage(msg.content, out, toolUseIds, issues);
    } else {
      convertAssistantMessage(msg.content, out, toolUseIds, issues);
    }
  }
}

function convertUserMessage(
  blocks: AnthropicContentBlock[],
  out: OpenAiMessage[],
  toolUseIds: Set<string>,
  issues: TranslationIssue[],
): void {
  const toolResults: OpenAiMessage[] = [];
  const rest: AnthropicContentBlock[] = [];

  for (const b of blocks) {
    if (typeof b === "object" && b !== null && b.type === "tool_result") {
      // OpenAI 400s on a tool message with no preceding tool_call — orphan
      // results degrade to plain user text so the request stays valid.
      if (b.tool_use_id && toolUseIds.has(b.tool_use_id)) {
        toolResults.push({
          role: "tool",
          content: toolResultContentToString(b.content),
          tool_call_id: b.tool_use_id,
        });
      } else {
        issues.push({ severity: "warn", detail: `orphan tool_result ${b.tool_use_id ?? "?"} inlined as user text` });
        rest.push({
          type: "text",
          text: `<tool_result tool_use_id="${b.tool_use_id ?? ""}">${toolResultContentToString(b.content)}</tool_result>`,
        });
      }
    } else {
      rest.push(b);
    }
  }

  out.push(...toolResults);

  if (rest.length > 0) {
    const converted = blocksToContent(rest, issues);
    if (converted !== null) pushOrMerge(out, { role: "user", content: converted });
  }
}

function convertAssistantMessage(
  blocks: AnthropicContentBlock[],
  out: OpenAiMessage[],
  toolUseIds: Set<string>,
  issues: TranslationIssue[],
): void {
  const textParts: string[] = [];
  const toolCalls: NonNullable<OpenAiMessage["tool_calls"]> = [];

  for (const b of blocks) {
    if (typeof b !== "object" || b === null) continue;
    switch (b.type) {
      case "text":
        if (typeof b.text === "string" && b.text.length > 0) textParts.push(b.text);
        break;
      case "tool_use":
        if (typeof b.id === "string" && typeof b.name === "string") {
          toolUseIds.add(b.id);
          toolCalls.push({
            id: b.id,
            type: "function",
            function: { name: b.name, arguments: JSON.stringify(b.input ?? {}) },
          });
        }
        break;
      case "thinking":
      case "redacted_thinking":
      case "server_tool_use":
      case "web_search_tool_result":
        issues.push({ severity: "drop", detail: `assistant block "${b.type}" dropped` });
        break;
      default:
        // Unknown block type — string-ify defensively so content is not lost
        if (typeof (b as { text?: unknown }).text === "string") {
          textParts.push((b as { text: string }).text);
        } else {
          issues.push({ severity: "warn", detail: `unknown assistant block "${String(b.type)}" dropped` });
        }
    }
  }

  const content = textParts.join("\n\n");
  if (toolCalls.length > 0) {
    out.push({ role: "assistant", content: content || null, tool_calls: toolCalls });
  } else if (content.length > 0) {
    pushOrMerge(out, { role: "assistant", content });
  }
  // else: fully-dropped message (thinking only) — omit
}

/**
 * Convert non-tool_result blocks of a user message into OpenAI content.
 * Plain text → string; any image → rich content array (text + image_url parts).
 */
function blocksToContent(
  blocks: AnthropicContentBlock[],
  issues: TranslationIssue[],
): string | OpenAiContentPart[] | null {
  const textParts: string[] = [];
  const imageParts: OpenAiContentPart[] = [];

  for (const b of blocks) {
    if (typeof b !== "object" || b === null) continue;
    switch (b.type) {
      case "text":
        if (typeof b.text === "string" && b.text.length > 0) textParts.push(b.text);
        break;
      case "image": {
        const src = b.source;
        if (src?.type === "base64" && typeof src.data === "string") {
          imageParts.push({
            type: "image_url",
            image_url: { url: `data:${src.media_type ?? "image/png"};base64,${src.data}` },
          });
        } else if (src?.type === "url" && typeof src.url === "string") {
          imageParts.push({ type: "image_url", image_url: { url: src.url } });
        } else {
          issues.push({ severity: "warn", detail: "unsupported image source shape replaced by placeholder" });
          textParts.push("[image omitted]");
        }
        break;
      }
      default:
        issues.push({ severity: "warn", detail: `unknown user block "${String(b.type)}" dropped` });
    }
  }

  if (imageParts.length > 0) {
    const parts: OpenAiContentPart[] = [];
    if (textParts.length > 0) parts.push({ type: "text", text: textParts.join("\n\n") });
    parts.push(...imageParts);
    return parts;
  }
  return textParts.length > 0 ? textParts.join("\n\n") : null;
}

function toolResultContentToString(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    const parts: string[] = [];
    for (const c of content) {
      if (typeof c === "object" && c !== null) {
        const t = c as { type?: string; text?: unknown };
        if (t.type === "text" && typeof t.text === "string") parts.push(t.text);
        else if (t.type === "image") parts.push("[image omitted]");
        else parts.push(JSON.stringify(c));
      } else if (typeof c === "string") {
        parts.push(c);
      }
    }
    return parts.join("\n");
  }
  if (content === undefined || content === null) return "";
  return JSON.stringify(content);
}

/** Merge consecutive same-role plain messages (OpenAI rejects some repeats; keeps history compact). */
function pushOrMerge(out: OpenAiMessage[], msg: OpenAiMessage): void {
  const last = out[out.length - 1];
  if (
    last &&
    last.role === msg.role &&
    !last.tool_call_id &&
    !msg.tool_call_id &&
    !last.tool_calls &&
    !msg.tool_calls &&
    typeof last.content === "string" &&
    typeof msg.content === "string"
  ) {
    last.content = `${last.content}\n\n${msg.content}`;
    return;
  }
  out.push(msg);
}

// ---------------------------------------------------------------------------
// tools / tool_choice
// ---------------------------------------------------------------------------

function convertTools(tools: unknown[], issues: TranslationIssue[]): OpenAiTool[] {
  const out: OpenAiTool[] = [];
  for (const t of tools) {
    if (typeof t !== "object" || t === null) continue;
    const tool = t as { name?: unknown; description?: unknown; input_schema?: unknown };
    if (typeof tool.name !== "string" || tool.name.length === 0) continue;
    out.push({
      type: "function",
      function: {
        name: tool.name,
        description: typeof tool.description === "string" ? tool.description : undefined,
        parameters:
          tool.input_schema && typeof tool.input_schema === "object"
            ? (tool.input_schema as Record<string, unknown>)
            : undefined,
      },
    });
  }
  if (out.length === 0) issues.push({ severity: "warn", detail: "no valid tools after conversion" });
  return out;
}

function convertToolChoice(
  tc: unknown,
): { tool_choice?: unknown; parallel_tool_calls?: boolean } | undefined {
  if (tc === null || tc === undefined) return undefined;
  if (typeof tc !== "object") return undefined;
  const c = tc as { type?: string; name?: unknown; disable_parallel_tool_use?: boolean };
  const out: { tool_choice?: unknown; parallel_tool_calls?: boolean } = {};

  switch (c.type) {
    case "auto":
      out.tool_choice = "auto";
      break;
    case "any":
      out.tool_choice = "required";
      break;
    case "tool":
      if (typeof c.name === "string") {
        out.tool_choice = { type: "function", function: { name: c.name } };
      }
      break;
    default:
      return undefined;
  }

  if (c.disable_parallel_tool_use === true) out.parallel_tool_calls = false;
  return out;
}
