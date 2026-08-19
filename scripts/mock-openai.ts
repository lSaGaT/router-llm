/**
 * Mock OpenAI-compatible upstream for gateway E2E tests — zero credentials.
 *
 * Run: bun scripts/mock-openai.ts   (listens on :8787)
 *
 * Scenario is picked by the requested model id:
 *   mock-text   → SSE stream with plain text
 *   mock-tools  → SSE stream with two interleaved parallel tool calls
 *   mock-nostream → plain JSON response (no streaming)
 *   mock-400    → 400 error body mentioning stream_options (tests the retry)
 *   mock-error  → 500 with OpenAI error shape (tests error translation)
 */
const PORT = 8787;

function sseFrame(obj: unknown): string {
  return `data: ${JSON.stringify(obj)}\n\n`;
}

function chatChunk(delta: Record<string, unknown>, finish: string | null = null, model = "mock-model") {
  return { id: "chatcmpl-mock", object: "chat.completion.chunk", model, choices: [{ index: 0, delta, finish_reason: finish }] };
}

function textStream(): string {
  return (
    sseFrame(chatChunk({ role: "assistant", content: null })) +
    sseFrame(chatChunk({ content: "Resposta " })) +
    sseFrame(chatChunk({ content: "de teste " })) +
    sseFrame(chatChunk({ content: "mock." })) +
    sseFrame(chatChunk({ reasoning_content: "internal reasoning should be dropped" })) +
    sseFrame(chatChunk({}, "stop")) +
    sseFrame({ id: "chatcmpl-mock", choices: [], usage: { prompt_tokens: 42, completion_tokens: 7 } }) +
    "data: [DONE]\n\n"
  );
}

function toolsStream(): string {
  return (
    sseFrame(chatChunk({ role: "assistant", content: null })) +
    sseFrame(chatChunk({ content: "Vou executar duas tools." })) +
    sseFrame(
      chatChunk({
        tool_calls: [{ index: 0, id: "call_a", type: "function", function: { name: "Read", arguments: '{"pat' } }],
      }),
    ) +
    sseFrame(
      chatChunk({
        tool_calls: [{ index: 1, id: "call_b", type: "function", function: { name: "Grep", arguments: '{"pattern":"ro' } }],
      }),
    ) +
    sseFrame(
      chatChunk({
        tool_calls: [{ index: 0, function: { arguments: 'h":"a.ts"}' } }],
      }),
    ) +
    sseFrame(
      chatChunk({
        tool_calls: [{ index: 1, function: { arguments: 'uter"}' } }],
      }),
    ) +
    sseFrame(chatChunk({}, "stop")) + // stop with tool_calls → must become tool_use
    sseFrame({ id: "chatcmpl-mock", choices: [], usage: { prompt_tokens: 100, completion_tokens: 25 } }) +
    "data: [DONE]\n\n"
  );
}

function nonStreamJson(): string {
  return JSON.stringify({
    id: "chatcmpl-mock-ns",
    object: "chat.completion",
    model: "mock-model",
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: "Resposta não-streamada do mock.",
          reasoning_content: "dropped",
        },
        finish_reason: "stop",
      },
    ],
    usage: { prompt_tokens: 11, completion_tokens: 9 },
  });
}

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    // Discovery endpoint used by credential autoDiscover
    if (url.pathname === "/v1/models" && req.method === "GET") {
      return Response.json({
        object: "list",
        data: [
          "mock-text",
          "mock-tools",
          "mock-nostream",
          "mock-400",
          "mock-error",
        ].map((id) => ({ id, object: "model", owned_by: "mock" })),
      });
    }

    if (url.pathname === "/v1/chat/completions" && req.method === "POST") {
      const body = (await req.json().catch(() => ({}))) as { model?: string; stream?: boolean };
      const auth = req.headers.get("authorization");
      if (!auth?.startsWith("Bearer ")) {
        return Response.json({ error: { message: "Missing Bearer token", type: "invalid_request_error" } }, { status: 401 });
      }
      const model = body.model ?? "";

      if (model.includes("400")) {
        return Response.json(
          {
            error: {
              message: "Unrecognized request argument supplied: stream_options",
              type: "invalid_request_error",
              param: null,
              code: null,
            },
          },
          { status: 400 },
        );
      }
      if (model.includes("error")) {
        return Response.json(
          { error: { message: "mock upstream exploded", type: "server_error", code: "internal" } },
          { status: 500 },
        );
      }
      if (model.includes("nostream") || body.stream !== true) {
        return new Response(nonStreamJson(), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

      const stream = model.includes("tools") ? toolsStream() : textStream();
      return new Response(stream, {
        status: 200,
        headers: { "content-type": "text/event-stream" },
      });
    }

    return new Response("not found", { status: 404 });
  },
});

console.log(`mock-openai listening on http://127.0.0.1:${PORT}/v1`);
