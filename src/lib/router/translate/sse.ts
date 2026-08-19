/**
 * OpenAI Chat Completions SSE → Anthropic Messages SSE translator.
 *
 * Core design decision: text streams incrementally; tool_use blocks are
 * buffered per delta.tool_calls[].index and emitted whole when the tool call
 * "completes" (a fragment of another index arrives, finish_reason arrives,
 * or the stream flushes). OpenAI interleaves argument fragments of parallel
 * tool calls by index, but the Anthropic protocol requires sequential
 * complete blocks — buffering is the only truncation-proof mapping. Claude
 * Code only executes a tool at content_block_stop, so nothing is lost.
 *
 * reasoning_content deltas are dropped (see request.ts for the both-directions
 * thinking policy).
 */

import { mapFinishReason } from "./response";

export interface SseUsageLike {
  inputTokens: number;
  outputTokens: number;
  model: string | null;
  stopReason: string | null;
  error: string | null;
}

export interface SseTranslateOptions {
  fallbackModel: string;
}

interface ToolCallBuffer {
  index: number;
  id: string;
  name: string | null;
  args: string;
}

interface OpenBlock {
  index: number;
  kind: "text" | "tool_use";
}

class AnthropicSseWriter {
  private buf = "";

  event(name: string, data: unknown): void {
    this.buf += `event: ${name}\ndata: ${JSON.stringify(data)}\n\n`;
  }

  take(): string {
    const out = this.buf;
    this.buf = "";
    return out;
  }
}

export function openAiSseToAnthropicStream(opts: SseTranslateOptions): {
  stream: TransformStream<Uint8Array, Uint8Array>;
  usage: SseUsageLike;
} {
  const usage: SseUsageLike = {
    inputTokens: 0,
    outputTokens: 0,
    model: null,
    stopReason: null,
    error: null,
  };

  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  const writer = new AnthropicSseWriter();

  let lineBuf = "";
  let sentStart = false;
  let openBlock: OpenBlock | null = null;
  let nextBlockIndex = 0;
  let model = opts.fallbackModel;
  /** Pending tool calls by OpenAI index — emitted in arrival order of first fragment. */
  const toolBuffers = new Map<number, ToolCallBuffer>();
  let finishReason: string | null = null;
  let flushed = false;
  let emittedAnyToolUse = false;

  function emitMessageStart(): void {
    if (sentStart) return;
    sentStart = true;
    writer.event("message_start", {
      type: "message_start",
      message: {
        id: `msg_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`,
        type: "message",
        role: "assistant",
        model,
        content: [],
        stop_reason: null,
        stop_sequence: null,
        usage: { input_tokens: 0, output_tokens: 0 },
      },
    });
  }

  function openTextBlock(): void {
    if (openBlock?.kind === "text") return;
    closeOpenBlock();
    openBlock = { index: nextBlockIndex++, kind: "text" };
    writer.event("content_block_start", {
      type: "content_block_start",
      index: openBlock.index,
      content_block: { type: "text", text: "" },
    });
  }

  function closeOpenBlock(): void {
    if (openBlock === null) return;
    writer.event("content_block_stop", { type: "content_block_stop", index: openBlock.index });
    openBlock = null;
  }

  function emitTextDelta(text: string): void {
    if (text.length === 0) return;
    emitMessageStart();
    openTextBlock();
    writer.event("content_block_delta", {
      type: "content_block_delta",
      index: openBlock!.index,
      delta: { type: "text_delta", text },
    });
  }

  /**
   * Emit one buffered tool call as a complete Anthropic tool_use block.
   * A call with no name and no arguments is unidentifiable — skipped.
   */
  function emitToolBuffer(tc: ToolCallBuffer): boolean {
    const name = tc.name ?? "";
    const args = tc.args.trim().length > 0 ? tc.args : "{}";
    if (name.length === 0 && args === "{}") return false;
    emitMessageStart();
    closeOpenBlock();
    const blockIndex = nextBlockIndex++;
    writer.event("content_block_start", {
      type: "content_block_start",
      index: blockIndex,
      content_block: { type: "tool_use", id: tc.id, name, input: {} },
    });
    // Arguments split into ≤8k chunks keeps single-frame size bounded
    for (let i = 0; i < args.length; i += 8192) {
      writer.event("content_block_delta", {
        type: "content_block_delta",
        index: blockIndex,
        delta: { type: "input_json_delta", partial_json: args.slice(i, i + 8192) },
      });
    }
    writer.event("content_block_stop", { type: "content_block_stop", index: blockIndex });
    emittedAnyToolUse = true;
    return true;
  }

  function flushAllToolBuffers(): void {
    for (const [, tc] of toolBuffers) {
      emitToolBuffer(tc);
    }
    toolBuffers.clear();
  }

  function handleToolCallDelta(item: {
    index?: number;
    id?: string | null;
    function?: { name?: string | null; arguments?: string | null } | null;
  }): void {
    const idx = typeof item.index === "number" ? item.index : 0;

    // Buffers are intentionally NOT emitted on index switch — providers
    // interleave argument fragments (0,1,0,1,...), so a switch is not a
    // completion signal. Everything flushes at finish_reason / terminal
    // flush, always with complete arguments.

    let buf = toolBuffers.get(idx);
    if (!buf) {
      buf = {
        index: idx,
        id: typeof item.id === "string" && item.id.length > 0 ? item.id : `toolu_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`,
        name: null,
        args: "",
      };
      toolBuffers.set(idx, buf);
    }
    if (typeof item.id === "string" && item.id.length > 0 && !buf.id) {
      buf.id = item.id;
    }
    const fn = item.function;
    if (fn && typeof fn.name === "string" && fn.name.length > 0 && buf.name === null) {
      buf.name = fn.name;
    }
    if (fn && typeof fn.arguments === "string" && fn.arguments.length > 0) {
      buf.args += fn.arguments;
    }
    // Note: the block is NOT emitted here — a later fragment may carry the
    // name (xAI/MiniMax sometimes send id first, name later). It flushes at
    // finish_reason or the terminal flush.
  }

  function ingestLine(line: string): string {
    const trimmed = line.replace(/\r$/, "");
    if (trimmed.length === 0 || trimmed.startsWith(":")) return "";
    if (!trimmed.startsWith("data:")) return "";

    const payload = trimmed.slice(5).trim();
    if (payload === "[DONE]") {
      terminalFlush();
      return writer.take();
    }

    let chunk: Record<string, unknown>;
    try {
      const parsed = JSON.parse(payload);
      if (typeof parsed !== "object" || parsed === null) return "";
      chunk = parsed as Record<string, unknown>;
    } catch {
      return ""; // partial/garbage line
    }

    if (typeof chunk.model === "string" && chunk.model.length > 0) {
      model = chunk.model;
      usage.model = model;
    }

    // Final usage chunk: `choices` is empty, usage at top level
    if (typeof chunk.usage === "object" && chunk.usage !== null) {
      const u = chunk.usage as { prompt_tokens?: unknown; completion_tokens?: unknown };
      if (typeof u.prompt_tokens === "number") usage.inputTokens = u.prompt_tokens;
      if (typeof u.completion_tokens === "number") usage.outputTokens = u.completion_tokens;
    }

    const choices = Array.isArray(chunk.choices) ? (chunk.choices as Record<string, unknown>[]) : [];
    const choice = choices[0];
    if (choice !== undefined) {
      const delta = (typeof choice.delta === "object" && choice.delta !== null
        ? choice.delta
        : {}) as {
        role?: string;
        content?: string | null;
        reasoning_content?: string | null;
        reasoning?: string | null;
        tool_calls?: Array<{
          index?: number;
          id?: string | null;
          function?: { name?: string | null; arguments?: string | null } | null;
        }>;
      };

      // role-only announcement chunk → ignore
      if (typeof delta.content === "string" && delta.content.length > 0) {
        emitTextDelta(delta.content);
      }
      // reasoning_content / reasoning intentionally dropped

      if (Array.isArray(delta.tool_calls)) {
        for (const tc of delta.tool_calls) {
          if (typeof tc === "object" && tc !== null) handleToolCallDelta(tc);
        }
      }

      if (typeof choice.finish_reason === "string" && choice.finish_reason.length > 0) {
        finishReason = choice.finish_reason;
        usage.stopReason = finishReason;
        closeOpenBlock();
        flushAllToolBuffers();
      }
    }

    return writer.take();
  }

  function terminalFlush(): void {
    if (flushed) return;
    flushed = true;

    closeOpenBlock();
    flushAllToolBuffers();

    emitMessageStart(); // degenerate case: stream produced nothing

    const stop = mapFinishReason(finishReason, emittedAnyToolUse);
    usage.stopReason = stop;
    writer.event("message_delta", {
      type: "message_delta",
      delta: { stop_reason: stop, stop_sequence: null },
      usage: { input_tokens: usage.inputTokens, output_tokens: usage.outputTokens },
    });
    writer.event("message_stop", { type: "message_stop" });
  }

  const stream = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      lineBuf += decoder.decode(chunk, { stream: true });
      const lines = lineBuf.split("\n");
      lineBuf = lines.pop() ?? ""; // keep incomplete tail
      let out = "";
      for (const line of lines) out += ingestLine(line);
      if (out.length > 0) controller.enqueue(encoder.encode(out));
    },
    flush(controller) {
      // Stream ended (possibly without [DONE]) — finish the message cleanly
      const rest = lineBuf + decoder.decode();
      lineBuf = "";
      let out = "";
      for (const line of rest.split("\n")) out += ingestLine(line);
      terminalFlush();
      out += writer.take();
      if (out.length > 0) controller.enqueue(encoder.encode(out));
    },
    // Client abort: readable cancel propagates through the TransformStream
    // to the upstream body — the proxy finalizes with status "cancelled"
    // via its own req.signal listener.
  });

  return { stream, usage };
}
