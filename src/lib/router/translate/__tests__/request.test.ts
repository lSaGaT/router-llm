import { describe, expect, test } from "bun:test";
import { anthropicToOpenAiBody } from "../request";
import type { AnthropicRequestBody } from "../types";

describe("anthropicToOpenAiBody", () => {
  test("plain text round shape", () => {
    const r = anthropicToOpenAiBody({
      model: "claude-sonnet-5",
      max_tokens: 100,
      messages: [
        { role: "user", content: "hello" },
        { role: "assistant", content: "hi" },
        { role: "user", content: "bye" },
      ],
    });
    expect(r.out.model).toBe("claude-sonnet-5");
    expect(r.out.max_tokens).toBe(100);
    expect(r.out.messages).toEqual([
      { role: "user", content: "hello" },
      { role: "assistant", content: "hi" },
      { role: "user", content: "bye" },
    ]);
    expect(r.issues.length).toBe(0);
  });

  test("system array with cache_control is joined and cache_control dropped", () => {
    const r = anthropicToOpenAiBody({
      model: "m",
      messages: [{ role: "user", content: "hi" }],
      system: [
        { type: "text", text: "Part A", cache_control: { type: "ephemeral" } },
        { type: "text", text: "Part B" },
      ],
    });
    expect(r.out.messages[0]).toEqual({ role: "system", content: "Part A\n\nPart B" });
  });

  test("system as string passes through", () => {
    const r = anthropicToOpenAiBody({
      model: "m",
      messages: [{ role: "user", content: "hi" }],
      system: "You are helpful.",
    });
    expect(r.out.messages[0]).toEqual({ role: "system", content: "You are helpful." });
  });

  test("assistant tool_use becomes tool_calls and registers tool_use_id", () => {
    const r = anthropicToOpenAiBody({
      model: "m",
      messages: [
        { role: "user", content: "run it" },
        {
          role: "assistant",
          content: [
            { type: "text", text: "Sure" },
            { type: "tool_use", id: "tu_1", name: "Bash", input: { command: "ls" } },
          ],
        },
        {
          role: "user",
          content: [{ type: "tool_result", tool_use_id: "tu_1", content: "file1\nfile2" }],
        },
      ],
    });
    const assistant = r.out.messages[1];
    expect(assistant.role).toBe("assistant");
    expect(assistant.content).toBe("Sure");
    expect(assistant.tool_calls).toEqual([
      { id: "tu_1", type: "function", function: { name: "Bash", arguments: '{"command":"ls"}' } },
    ]);
    const toolMsg = r.out.messages[2];
    expect(toolMsg).toEqual({ role: "tool", content: "file1\nfile2", tool_call_id: "tu_1" });
  });

  test("user tool_result + new text splits into tool message then user message", () => {
    const r = anthropicToOpenAiBody({
      model: "m",
      messages: [
        { role: "user", content: "go" },
        {
          role: "assistant",
          content: [{ type: "tool_use", id: "tu_9", name: "Read", input: { path: "x" } }],
        },
        {
          role: "user",
          content: [
            { type: "tool_result", tool_use_id: "tu_9", content: [{ type: "text", text: "contents" }] },
            { type: "text", text: "now summarize" },
          ],
        },
      ],
    });
    expect(r.out.messages[2]).toEqual({ role: "tool", content: "contents", tool_call_id: "tu_9" });
    expect(r.out.messages[3]).toEqual({ role: "user", content: "now summarize" });
  });

  test("orphan tool_result is inlined as user text, not a tool message", () => {
    const r = anthropicToOpenAiBody({
      model: "m",
      messages: [{ role: "user", content: [{ type: "tool_result", tool_use_id: "ghost", content: "x" }] }],
    });
    const msgs = r.out.messages;
    expect(msgs.some((m) => m.role === "tool")).toBe(false);
    expect((msgs[0].content as string).includes('<tool_result tool_use_id="ghost">')).toBe(true);
    expect(r.issues.some((i) => i.detail.includes("orphan"))).toBe(true);
  });

  test("thinking blocks in history are dropped with issue", () => {
    const r = anthropicToOpenAiBody({
      model: "m",
      messages: [
        {
          role: "assistant",
          content: [
            { type: "thinking", thinking: "deep", signature: "sig" } as never,
            { type: "text", text: "answer" },
          ],
        },
      ],
    });
    expect(r.out.messages).toEqual([{ role: "assistant", content: "answer" }]);
    expect(r.issues.some((i) => i.severity === "drop" && i.detail.includes("thinking"))).toBe(true);
  });

  test("assistant message with only thinking is omitted entirely", () => {
    const r = anthropicToOpenAiBody({
      model: "m",
      messages: [
        { role: "user", content: "q" },
        { role: "assistant", content: [{ type: "redacted_thinking", data: "xxx" } as never] },
        { role: "assistant", content: "real answer" },
      ],
    });
    expect(r.out.messages).toEqual([
      { role: "user", content: "q" },
      { role: "assistant", content: "real answer" },
    ]);
  });

  test("base64 image becomes image_url data part", () => {
    const r = anthropicToOpenAiBody({
      model: "m",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "what is this" },
            { type: "image", source: { type: "base64", media_type: "image/png", data: "QUJD" } },
          ],
        },
      ],
    });
    const content = r.out.messages[0].content as { type: string; image_url?: { url: string } }[];
    expect(Array.isArray(content)).toBe(true);
    expect(content[0]).toEqual({ type: "text", text: "what is this" });
    expect(content[1].image_url?.url).toBe("data:image/png;base64,QUJD");
  });

  test("image inside tool_result becomes [image omitted] text", () => {
    const r = anthropicToOpenAiBody({
      model: "m",
      messages: [
        { role: "user", content: "go" },
        {
          role: "assistant",
          content: [{ type: "tool_use", id: "tu_i", name: "Read", input: {} }],
        },
        {
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: "tu_i",
              content: [
                { type: "text", text: "head" },
                { type: "image", source: { type: "base64", media_type: "image/png", data: "x" } },
              ],
            },
          ],
        },
      ],
    });
    expect(r.out.messages[2]).toEqual({ role: "tool", content: "head\n[image omitted]", tool_call_id: "tu_i" });
  });

  test("tools convert input_schema to parameters", () => {
    const r = anthropicToOpenAiBody({
      model: "m",
      messages: [{ role: "user", content: "go" }],
      tools: [
        {
          name: "Bash",
          description: "Run a command",
          input_schema: { type: "object", properties: { command: { type: "string" } }, required: ["command"] },
        },
      ],
    });
    expect(r.out.tools).toEqual([
      {
        type: "function",
        function: {
          name: "Bash",
          description: "Run a command",
          parameters: { type: "object", properties: { command: { type: "string" } }, required: ["command"] },
        },
      },
    ]);
  });

  test("tool_choice variants", () => {
    const base = { model: "m", messages: [{ role: "user" as const, content: "x" }] };
    expect(anthropicToOpenAiBody({ ...base, tool_choice: { type: "auto" } }).out.tool_choice).toBe("auto");
    expect(anthropicToOpenAiBody({ ...base, tool_choice: { type: "any" } }).out.tool_choice).toBe("required");
    expect(anthropicToOpenAiBody({ ...base, tool_choice: { type: "tool", name: "Bash" } }).out.tool_choice).toEqual({
      type: "function",
      function: { name: "Bash" },
    });
    const r = anthropicToOpenAiBody({ ...base, tool_choice: { type: "auto", disable_parallel_tool_use: true } });
    expect(r.out.parallel_tool_calls).toBe(false);
    expect(anthropicToOpenAiBody({ ...base, tool_choice: { type: "weird" } }).out.tool_choice).toBeUndefined();
  });

  test("context suffix [1m] is stripped from model", () => {
    const r = anthropicToOpenAiBody({ model: "glm-5.3[1m]", messages: [{ role: "user", content: "x" }] });
    expect(r.out.model).toBe("glm-5.3");
  });

  test("stop_sequences truncated to 4 with warn", () => {
    const r = anthropicToOpenAiBody({
      model: "m",
      messages: [{ role: "user", content: "x" }],
      stop_sequences: ["a", "b", "c", "d", "e", "f"],
    });
    expect(r.out.stop).toEqual(["a", "b", "c", "d"]);
    expect(r.issues.some((i) => i.detail.includes("stop_sequences"))).toBe(true);
  });

  test("thinking enabled maps to reasoning_effort only on supporting models", () => {
    const mk = (model: string): AnthropicRequestBody => ({
      model,
      messages: [{ role: "user", content: "x" }],
      thinking: { type: "enabled", budget_tokens: 10000 },
    });
    expect(anthropicToOpenAiBody(mk("gpt-5")).out.reasoning_effort).toBe("medium");
    expect(anthropicToOpenAiBody(mk("o3-mini")).out.reasoning_effort).toBe("medium");
    expect(anthropicToOpenAiBody(mk("deepseek-chat")).out.reasoning_effort).toBeDefined();
    const plain = anthropicToOpenAiBody(mk("qwen-72b"));
    expect(plain.out.reasoning_effort).toBeUndefined();
    expect(plain.issues.some((i) => i.detail.includes("thinking dropped"))).toBe(true);
    // budget tiers
    expect(anthropicToOpenAiBody({ ...mk("gpt-5"), thinking: { type: "enabled", budget_tokens: 2000 } }).out.reasoning_effort).toBe("low");
    expect(anthropicToOpenAiBody({ ...mk("gpt-5"), thinking: { type: "enabled", budget_tokens: 40000 } }).out.reasoning_effort).toBe("high");
  });

  test("max_completion_tokens used for o-series/gpt-5; max_tokens otherwise", () => {
    const mk = (model: string): AnthropicRequestBody => ({
      model,
      max_tokens: 4096,
      messages: [{ role: "user", content: "x" }],
    });
    const o = anthropicToOpenAiBody(mk("o4-mini")).out;
    expect(o.max_completion_tokens).toBe(4096);
    expect(o.max_tokens).toBeUndefined();
    expect(o.temperature).toBeUndefined();
    const g = anthropicToOpenAiBody(mk("deepseek-chat")).out;
    expect(g.max_tokens).toBe(4096);
    expect(g.max_completion_tokens).toBeUndefined();
  });

  test("stream adds stream_options include_usage", () => {
    const r = anthropicToOpenAiBody({ model: "m", stream: true, messages: [{ role: "user", content: "x" }] });
    expect(r.out.stream).toBe(true);
    expect(r.out.stream_options).toEqual({ include_usage: true });
  });

  test("metadata.user_id maps to user", () => {
    const r = anthropicToOpenAiBody({
      model: "m",
      messages: [{ role: "user", content: "x" }],
      metadata: { user_id: "user_123" },
    });
    expect(r.out.user).toBe("user_123");
  });

  test("consecutive same-role plain messages merge", () => {
    const r = anthropicToOpenAiBody({
      model: "m",
      messages: [
        { role: "user", content: "part1" },
        { role: "user", content: [{ type: "text", text: "part2" }] },
      ],
    });
    expect(r.out.messages).toEqual([{ role: "user", content: "part1\n\npart2" }]);
  });

  test("drop fields never forwarded", () => {
    const r = anthropicToOpenAiBody({
      model: "m",
      messages: [{ role: "user", content: "x" }],
      top_k: 40,
      service_tier: "auto",
      mcp_servers: [{ type: "url", url: "https://x" }],
    } as AnthropicRequestBody);
    const o = r.out as Record<string, unknown>;
    expect(o.top_k).toBeUndefined();
    expect(o.service_tier).toBeUndefined();
    expect(o.mcp_servers).toBeUndefined();
  });
});
