import { describe, expect, test } from "bun:test";
import { mapFinishReason, openAiToAnthropicError, openAiToAnthropicResponse } from "../response";

describe("mapFinishReason", () => {
  test("stop→end_turn without tools", () => {
    expect(mapFinishReason("stop", false)).toBe("end_turn");
  });
  test("stop with tool_calls overrides to tool_use", () => {
    expect(mapFinishReason("stop", true)).toBe("tool_use");
  });
  test("null with tool_calls overrides to tool_use", () => {
    expect(mapFinishReason(null, true)).toBe("tool_use");
  });
  test("length→max_tokens, content_filter→refusal, tool_calls→tool_use", () => {
    expect(mapFinishReason("length", false)).toBe("max_tokens");
    expect(mapFinishReason("content_filter", false)).toBe("refusal");
    expect(mapFinishReason("tool_calls", false)).toBe("tool_use");
    expect(mapFinishReason("function_call", false)).toBe("tool_use");
  });
});

describe("openAiToAnthropicResponse", () => {
  test("text response shape", () => {
    const r = openAiToAnthropicResponse(
      {
        id: "chatcmpl-123",
        model: "gpt-4o",
        choices: [{ index: 0, message: { role: "assistant", content: "hello" }, finish_reason: "stop" }],
        usage: { prompt_tokens: 10, completion_tokens: 5 },
      },
      "fallback",
    );
    expect(r.id).toBe("chatcmpl-123");
    expect(r.type).toBe("message");
    expect(r.model).toBe("gpt-4o");
    expect(r.content).toEqual([{ type: "text", text: "hello" }]);
    expect(r.stop_reason).toBe("end_turn");
    expect(r.usage).toEqual({ input_tokens: 10, output_tokens: 5 });
  });

  test("tool_calls with valid arguments", () => {
    const r = openAiToAnthropicResponse(
      {
        choices: [
          {
            message: {
              role: "assistant",
              content: null,
              tool_calls: [
                { id: "call_1", type: "function", function: { name: "Bash", arguments: '{"command":"ls -la"}' } },
              ],
            },
            finish_reason: "tool_calls",
          },
        ],
        usage: { prompt_tokens: 100, completion_tokens: 20 },
      },
      "m",
    );
    expect(r.content).toEqual([{ type: "tool_use", id: "call_1", name: "Bash", input: { command: "ls -la" } }]);
    expect(r.stop_reason).toBe("tool_use");
  });

  test("tool_calls with fragmented/invalid arguments → input {}", () => {
    const r = openAiToAnthropicResponse(
      {
        choices: [
          {
            message: {
              role: "assistant",
              content: null,
              tool_calls: [{ id: "c2", function: { name: "Read", arguments: '{"path": "trunca' } }],
            },
            finish_reason: "stop",
          },
        ],
      },
      "m",
    );
    const tu = r.content[0] as { type: string; input: unknown };
    expect(tu.type).toBe("tool_use");
    expect(tu.input).toEqual({});
    // finish "stop" + tool_use → override
    expect(r.stop_reason).toBe("tool_use");
  });

  test("empty tool_calls arguments string → input {}", () => {
    const r = openAiToAnthropicResponse(
      {
        choices: [
          { message: { role: "assistant", content: null, tool_calls: [{ id: "c3", function: { name: "X", arguments: "" } }] }, finish_reason: "tool_calls" },
        ],
      },
      "m",
    );
    expect((r.content[0] as { input: unknown }).input).toEqual({});
  });

  test("tool_call without id gets generated id", () => {
    const r = openAiToAnthropicResponse(
      {
        choices: [
          { message: { role: "assistant", content: null, tool_calls: [{ function: { name: "Y", arguments: "{}" } }] }, finish_reason: "tool_calls" },
        ],
      },
      "m",
    );
    expect(String((r.content[0] as { id: string }).id).length).toBeGreaterThan(4);
  });

  test("refusal becomes text block with stop_reason refusal", () => {
    const r = openAiToAnthropicResponse(
      {
        choices: [{ message: { role: "assistant", content: null, refusal: "cannot do that" }, finish_reason: "stop" }],
      },
      "m",
    );
    expect(r.content).toEqual([{ type: "text", text: "cannot do that" }]);
    expect(r.stop_reason).toBe("refusal");
  });

  test("reasoning_content is dropped", () => {
    const r = openAiToAnthropicResponse(
      {
        choices: [
          {
            message: { role: "assistant", content: "answer", reasoning_content: "chain of thought..." },
            finish_reason: "stop",
          },
        ],
      },
      "m",
    );
    expect(r.content).toEqual([{ type: "text", text: "answer" }]);
  });

  test("content parts array joined", () => {
    const r = openAiToAnthropicResponse(
      {
        choices: [
          { message: { role: "assistant", content: [{ type: "text", text: "a" }, { type: "text", text: "b" }] }, finish_reason: "stop" },
        ],
      },
      "m",
    );
    expect(r.content).toEqual([{ type: "text", text: "a\n\nb" }]);
  });

  test("empty everything → text empty, end_turn, zero usage, fallback model", () => {
    const r = openAiToAnthropicResponse({}, "fb-model");
    expect(r.content).toEqual([{ type: "text", text: "" }]);
    expect(r.stop_reason).toBe("end_turn");
    expect(r.usage).toEqual({ input_tokens: 0, output_tokens: 0 });
    expect(r.model).toBe("fb-model");
    expect(r.id).toMatch(/^msg_/);
  });

  test("missing usage → zeros", () => {
    const r = openAiToAnthropicResponse({ choices: [{ message: { content: "x" }, finish_reason: "stop" }] }, "m");
    expect(r.usage.input_tokens).toBe(0);
    expect(r.usage.output_tokens).toBe(0);
  });
});

describe("openAiToAnthropicError", () => {
  test("openai error body converted with status mapping", () => {
    const out = JSON.parse(
      openAiToAnthropicError(429, '{"error":{"message":"Rate limit reached","type":"rate_limit_exceeded","code":"429"}}'),
    );
    expect(out).toEqual({
      type: "error",
      error: { type: "rate_limit_exceeded", message: "Rate limit reached" },
    });
  });

  test("unknown type falls back to status map", () => {
    const out = JSON.parse(openAiToAnthropicError(401, '{"error":{"message":"bad key"}}'));
    expect(out.error.type).toBe("authentication_error");
    expect(out.error.message).toBe("bad key");
  });

  test("non-JSON body falls back to statusText", () => {
    const out = JSON.parse(openAiToAnthropicError(502, "<html>Bad Gateway</html>", "Bad Gateway"));
    expect(out.error.type).toBe("api_error");
    expect(out.error.message).toBe("Bad Gateway");
  });

  test("500 without statusText still yields a message", () => {
    const out = JSON.parse(openAiToAnthropicError(500, ""));
    expect(out.error.message).toContain("500");
    expect(out.error.type).toBe("api_error");
  });

  test("404 → not_found_error", () => {
    const out = JSON.parse(openAiToAnthropicError(404, '{"error":{"message":"model not found"}}'));
    expect(out.error.type).toBe("not_found_error");
  });
});
