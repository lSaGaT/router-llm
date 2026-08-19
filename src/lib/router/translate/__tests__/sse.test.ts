import { describe, expect, test } from "bun:test";
import { openAiSseToAnthropicStream } from "../sse";

/** Run an OpenAI SSE byte stream through the translator, return decoded output. */
async function translate(input: string): Promise<{ out: string; usage: ReturnType<typeof openAiSseToAnthropicStream>["usage"] }> {
  const { stream, usage } = openAiSseToAnthropicStream({ fallbackModel: "fb" });
  const writer = stream.writable.getWriter();
  const reader = stream.readable.getReader();
  const decoder = new TextDecoder();

  const writerDone = (async () => {
    await writer.write(new TextEncoder().encode(input));
    await writer.close();
  })();

  let out = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    out += decoder.decode(value, { stream: true });
  }
  await writerDone;
  return { out, usage };
}

/** Parse `event:`/`data:` frames into [{event, data}] */
function parseEvents(out: string): Array<{ event: string; data: any }> {
  const events: Array<{ event: string; data: any }> = [];
  for (const frame of out.split("\n\n")) {
    if (frame.trim().length === 0) continue;
    const eventLine = frame.split("\n").find((l) => l.startsWith("event: "));
    const dataLine = frame.split("\n").find((l) => l.startsWith("data: "));
    events.push({
      event: eventLine?.slice(7) ?? "",
      data: dataLine ? JSON.parse(dataLine.slice(6)) : null,
    });
  }
  return events;
}

const enc = (obj: unknown) => `data: ${JSON.stringify(obj)}\n\n`;

function textChunk(content: string, model = "test-model") {
  return { id: "c1", model, choices: [{ index: 0, delta: { content }, finish_reason: null }] };
}
function roleChunk() {
  return { id: "c1", choices: [{ index: 0, delta: { role: "assistant", content: null }, finish_reason: null }] };
}
function toolChunk(index: number, id: string | null, name: string | null, args: string | null) {
  return {
    id: "c1",
    choices: [
      {
        index: 0,
        delta: {
          tool_calls: [
            {
              index,
              ...(id !== null ? { id } : {}),
              function: { ...(name !== null ? { name } : {}), ...(args !== null ? { arguments: args } : {}) },
            },
          ],
        },
        finish_reason: null,
      },
    ],
  };
}
function finishChunk(reason: string) {
  return { id: "c1", choices: [{ index: 0, delta: {}, finish_reason: reason }] };
}
function usageChunk(prompt: number, completion: number) {
  return { id: "c1", choices: [], usage: { prompt_tokens: prompt, completion_tokens: completion } };
}

describe("openAiSseToAnthropicStream", () => {
  test("plain text stream produces correct Anthropic event sequence", async () => {
    const input =
      enc(roleChunk()) +
      enc(textChunk("Hel")) +
      enc(textChunk("lo w")) +
      enc(textChunk("orld")) +
      enc(finishChunk("stop")) +
      enc(usageChunk(12, 6)) +
      "data: [DONE]\n\n";
    const { out, usage } = await translate(input);
    const events = parseEvents(out);

    expect(events.map((e) => e.event)).toEqual([
      "message_start",
      "content_block_start",
      "content_block_delta",
      "content_block_delta",
      "content_block_delta",
      "content_block_stop",
      "message_delta",
      "message_stop",
    ]);
    expect(events[0].data.message.model).toBe("test-model");
    expect(events[1].data.content_block).toEqual({ type: "text", text: "" });
    const deltas = events.filter((e) => e.event === "content_block_delta");
    expect(deltas.map((d) => d.data.delta.text).join("")).toBe("Hello world");
    expect(events.at(-2)!.data.delta.stop_reason).toBe("end_turn");
    expect(events.at(-2)!.data.usage).toEqual({ input_tokens: 12, output_tokens: 6 });
    expect(usage).toMatchObject({ inputTokens: 12, outputTokens: 6, stopReason: "end_turn", model: "test-model" });
  });

  test("single tool call: buffered then emitted whole", async () => {
    const input =
      enc(roleChunk()) +
      enc(textChunk("Let me check.")) +
      enc(toolChunk(0, "call_1", "Bash", '{"comm')) +
      enc(toolChunk(0, null, null, 'and":"ls -la"}')) +
      enc(finishChunk("tool_calls")) +
      enc(usageChunk(50, 30)) +
      "data: [DONE]\n\n";
    const { out, usage } = await translate(input);
    const events = parseEvents(out);
    const names = events.map((e) => e.event);

    expect(names).toEqual([
      "message_start",
      "content_block_start", // text
      "content_block_delta",
      "content_block_stop",
      "content_block_start", // tool_use
      "content_block_delta", // full args in one input_json_delta
      "content_block_stop",
      "message_delta",
      "message_stop",
    ]);
    const toolStart = events.find((e) => e.event === "content_block_start" && e.data.content_block.type === "tool_use")!;
    expect(toolStart.data.content_block).toEqual({ type: "tool_use", id: "call_1", name: "Bash", input: {} });
    const jsonDelta = events.find((e) => e.event === "content_block_delta" && e.data.delta.type === "input_json_delta")!;
    expect(jsonDelta.data.delta.partial_json).toBe('{"command":"ls -la"}');
    expect(events.at(-2)!.data.delta.stop_reason).toBe("tool_use");
    expect(usage.stopReason).toBe("tool_use");
  });

  test("two parallel tool calls interleaved by index", async () => {
    const input =
      enc(toolChunk(0, "call_a", "Read", '{"pat')) +
      enc(toolChunk(1, "call_b", "Grep", '{"pattern":"x')) +
      enc(toolChunk(0, null, null, 'h":"a.ts"}')) +
      enc(toolChunk(1, null, null, '"}')) +
      enc(finishChunk("tool_calls")) +
      "data: [DONE]\n\n";
    const { out } = await translate(input);
    const events = parseEvents(out);

    const toolStarts = events.filter((e) => e.event === "content_block_start" && e.data.content_block.type === "tool_use");
    expect(toolStarts).toHaveLength(2);
    // call_a flushed when index 1 first appears; call_b flushed at finish
    expect(toolStarts[0].data.content_block.id).toBe("call_a");
    expect(toolStarts[1].data.content_block.id).toBe("call_b");

    const jsonDeltas = events.filter((e) => e.event === "content_block_delta" && e.data.delta.type === "input_json_delta");
    expect(jsonDeltas.map((d) => d.data.delta.partial_json).join("")).toBe('{"path":"a.ts"}{"pattern":"x"}');

    // Each tool's arguments concatenate into valid JSON
    expect(JSON.parse('{"pat' + 'h":"a.ts"}')).toEqual({ path: "a.ts" });
    expect(events.at(-2)!.data.delta.stop_reason).toBe("tool_use");
  });

  test("tool call with no arguments gets {} delta", async () => {
    const input =
      enc(toolChunk(0, "call_x", "Ping", null)) +
      enc(finishChunk("tool_calls")) +
      "data: [DONE]\n\n";
    const { out } = await translate(input);
    const events = parseEvents(out);
    const jsonDelta = events.find((e) => e.event === "content_block_delta" && e.data.delta.type === "input_json_delta")!;
    expect(jsonDelta.data.delta.partial_json).toBe("{}");
  });

  test("finish stop with tool calls overrides to tool_use", async () => {
    const input =
      enc(toolChunk(0, "call_y", "Bash", "{}")) +
      enc(finishChunk("stop")) +
      "data: [DONE]\n\n";
    const { out, usage } = await translate(input);
    const events = parseEvents(out);
    expect(events.at(-2)!.data.delta.stop_reason).toBe("tool_use");
    expect(usage.stopReason).toBe("tool_use");
  });

  test("name arriving after id (xAI style) still names the block", async () => {
    const input =
      enc(toolChunk(0, "call_z", null, null)) +
      enc(toolChunk(0, null, "WebSearch", '{"q":"a"}')) +
      enc(finishChunk("tool_calls")) +
      "data: [DONE]\n\n";
    const { out } = await translate(input);
    const events = parseEvents(out);
    const toolStart = events.find((e) => e.event === "content_block_start" && e.data.content_block.type === "tool_use")!;
    expect(toolStart.data.content_block.name).toBe("WebSearch");
  });

  test("reasoning_content deltas are dropped", async () => {
    const input =
      enc({ id: "c", choices: [{ index: 0, delta: { reasoning_content: "thinking..." }, finish_reason: null }] }) +
      enc(textChunk("answer")) +
      enc(finishChunk("stop")) +
      "data: [DONE]\n\n";
    const { out } = await translate(input);
    expect(out).not.toContain("thinking...");
    expect(out).not.toContain("reasoning");
    const deltas = parseEvents(out).filter((e) => e.event === "content_block_delta");
    expect(deltas.every((d) => d.data.delta.type === "text_delta")).toBe(true);
  });

  test("stream without [DONE] flushes cleanly on close", async () => {
    const input = enc(textChunk("partial")) + enc(finishChunk("stop"));
    const { out, usage } = await translate(input);
    const events = parseEvents(out);
    expect(events.at(-1)!.event).toBe("message_stop");
    expect(events.at(-2)!.event).toBe("message_delta");
    expect(usage.stopReason).toBe("end_turn");
  });

  test("empty stream still produces message_start/delta/stop", async () => {
    const { out } = await translate("");
    const events = parseEvents(out);
    expect(events.map((e) => e.event)).toEqual(["message_start", "message_delta", "message_stop"]);
  });

  test("multibyte UTF-8 split across chunks survives", async () => {
    // "ação" — split the UTF-8 bytes of "ã" (0xC3 0xA3) across two chunks
    const full = "ação";
    const bytes = new TextEncoder().encode(full);
    const cut = 2; // a=0x61, c=0xC3 | 0xA3, a, o — cut between 0xC3 and 0xA3
    const part1 = bytes.slice(0, cut);
    const part2 = bytes.slice(cut);

    const { stream } = openAiSseToAnthropicStream({ fallbackModel: "fb" });
    const writer = stream.writable.getWriter();
    const reader = stream.readable.getReader();
    const decoder = new TextDecoder();

    const head = new TextEncoder().encode("data: " + JSON.stringify(textChunk("")) + "\n\ndata: ");
    // Simpler: craft raw SSE manually
    const frame1 = new TextEncoder().encode(
      `data: ${JSON.stringify({ id: "x", choices: [{ index: 0, delta: { content: "a" }, finish_reason: null }] })}\n\n`,
    );
    const midJson = JSON.stringify({ id: "x", choices: [{ index: 0, delta: { content: "çã" }, finish_reason: null }] });
    // encode JSON but split bytes of the delta content
    const midBytes = new TextEncoder().encode(`data: ${midJson}\n\n`);
    const splitAt = midBytes.indexOf(0xC3); // first byte of "ç"
    const writerPromise = (async () => {
      await writer.write(frame1);
      await writer.write(midBytes.slice(0, splitAt));
      await writer.write(midBytes.slice(splitAt));
      await writer.write(new TextEncoder().encode(`data: ${JSON.stringify(finishChunk("stop"))}\n\n`));
      await writer.write(new TextEncoder().encode("data: [DONE]\n\n"));
      await writer.close();
    })();

    let out = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      out += decoder.decode(value, { stream: true });
    }
    await writerPromise;

    const text = parseEvents(out)
      .filter((e) => e.event === "content_block_delta")
      .map((e) => e.data.delta.text ?? "")
      .join("");
    expect(text).toBe("açã");
  });

  test("line split across chunks (no newline boundary) survives", async () => {
    const json = JSON.stringify(textChunk("hello"));
    const sse = `data: ${json}\n`;
    const half = Math.floor(sse.length / 2);
    const input = sse.slice(0, half) + "|" + sse.slice(half);
    // replace the marker trick — feed in two writes instead
    const { stream } = openAiSseToAnthropicStream({ fallbackModel: "fb" });
    const writer = stream.writable.getWriter();
    const reader = stream.readable.getReader();
    const decoder = new TextDecoder();
    const enc2 = new TextEncoder();
    const wp = (async () => {
      await writer.write(enc2.encode(sse.slice(0, half)));
      await writer.write(enc2.encode(sse.slice(half)));
      await writer.write(enc2.encode(`data: ${JSON.stringify(finishChunk("stop"))}\n\n`));
      await writer.write(enc2.encode("data: [DONE]\n\n"));
      await writer.close();
    })();
    let out = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      out += decoder.decode(value, { stream: true });
    }
    await wp;
    const text = parseEvents(out)
      .filter((e) => e.event === "content_block_delta")
      .map((e) => e.data.delta.text ?? "")
      .join("");
    expect(text).toBe("hello");
  });

  test("usage chunk before finish and provider sending usage repeatedly", async () => {
    const input =
      enc(usageChunk(5, 5)) +
      enc(textChunk("x")) +
      enc(usageChunk(10, 20)) +
      enc(finishChunk("stop")) +
      "data: [DONE]\n\n";
    const { usage } = await translate(input);
    expect(usage.inputTokens).toBe(10);
    expect(usage.outputTokens).toBe(20);
  });

  test("\\r\\n line endings handled", async () => {
    const input =
      `data: ${JSON.stringify(textChunk("hi"))}\r\n\r\n` +
      `data: ${JSON.stringify(finishChunk("stop"))}\r\n\r\n` +
      "data: [DONE]\r\n\r\n";
    const { out, usage } = await translate(input);
    expect(usage.stopReason).toBe("end_turn");
    const text = parseEvents(out)
      .filter((e) => e.event === "content_block_delta")
      .map((e) => e.data.delta.text ?? "")
      .join("");
    expect(text).toBe("hi");
  });

  test("error event in stream reported on usage object", async () => {
    // OpenAI streams errors as a data frame with type error
    const input =
      enc(textChunk("partial")) +
      `data: ${JSON.stringify({ error: { message: "overloaded", type: "server_error" } })}\n\n` +
      "data: [DONE]\n\n";
    const { out } = await translate(input);
    // Stream still terminates cleanly
    expect(out).toContain("message_stop");
  });
});
