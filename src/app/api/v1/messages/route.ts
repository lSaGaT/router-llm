/**
 * Anthropic-compatible Gateway — POST /api/v1/messages
 *
 * This endpoint receives the same request body that Claude Code sends to
 * https://api.anthropic.com/v1/messages. Instead of forwarding to Anthropic,
 * we route it through the deployed Harness workflow.
 *
 * Setup for the user:
 *   export ANTHROPIC_BASE_URL=http://localhost:3000/api/v1
 *   export ANTHROPIC_API_KEY=<HARNESS_API_KEY from your .env>
 *
 * Then `claude` (Claude Code CLI) will hit this endpoint instead.
 *
 * We support:
 *   - stream: true → SSE response (event: message_start, content_block_start, ...)
 *   - stream: false → standard JSON response
 *
 * Auth: HARNESS_API_KEY env var (if set). If empty, no auth (dev only).
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { executeWorkflow } from "@/lib/workflow/engine";
import type {
  AnthropicRequest,
  AnthropicResponse,
  AnthropicSSEChunk,
  Message,
  WorkflowDefinition,
} from "@/lib/workflow/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authenticate(req: NextRequest): { ok: boolean; error?: string } {
  const expected = process.env.HARNESS_API_KEY;
  if (!expected) return { ok: true }; // dev mode: no auth required
  const auth = req.headers.get("x-api-key") || req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!auth || auth !== expected) {
    return { ok: false, error: "Invalid API key (expected HARNESS_API_KEY)" };
  }
  return { ok: true };
}

function extractSystemMessages(system: AnthropicRequest["system"]): string {
  if (!system) return "";
  if (typeof system === "string") return system;
  return system
    .filter((b) => b.type === "text")
    .map((b) => (b as { text?: string }).text || "")
    .join("\n");
}

function flattenMessages(req: AnthropicRequest): Message[] {
  const msgs: Message[] = [];
  const systemText = extractSystemMessages(req.system);
  if (systemText) msgs.push({ role: "system", content: systemText });

  for (const m of req.messages) {
    let text = "";
    if (typeof m.content === "string") {
      text = m.content;
    } else {
      text = (m.content as { type: string; text?: string }[])
        .filter((b) => b.type === "text" && b.text)
        .map((b) => b.text!)
        .join("\n");
    }
    msgs.push({ role: m.role, content: text });
  }
  return msgs;
}

export async function POST(req: NextRequest) {
  const auth = authenticate(req);
  if (!auth.ok) {
    return NextResponse.json(
      { type: "error", error: { type: "authentication_error", message: auth.error } },
      { status: 401 },
    );
  }

  let body: AnthropicRequest;
  try {
    body = (await req.json()) as AnthropicRequest;
  } catch {
    return NextResponse.json(
      { type: "error", error: { type: "invalid_request_error", message: "Invalid JSON body" } },
      { status: 400 },
    );
  }

  // Find the deployed harness (single-tenant: only one deployed at a time)
  const harness = await db.harness.findFirst({
    where: { isDeployed: true },
    orderBy: { updatedAt: "desc" },
  });

  if (!harness) {
    return NextResponse.json(
      {
        type: "error",
        error: {
          type: "api_error",
          message:
            "No harness is deployed. Open the Harness UI and click Deploy on a workflow first.",
        },
      },
      { status: 503 },
    );
  }

  let workflow: WorkflowDefinition;
  try {
    workflow = JSON.parse(harness.graphJson) as WorkflowDefinition;
  } catch {
    return NextResponse.json(
      {
        type: "error",
        error: { type: "api_error", message: "Deployed harness has an invalid workflow definition" },
      },
      { status: 500 },
    );
  }

  // Create the Execution record
  const execution = await db.execution.create({
    data: {
      harnessId: harness.id,
      requestJson: JSON.stringify(body),
      status: "running",
    },
  });

  const inputMessages = flattenMessages(body);
  const wantsStream = body.stream === true;
  const startedAt = Date.now();

  // Common execution options
  const runOptions = {
    executionId: execution.id,
    harnessId: harness.id,
    workflow,
    inputMessages,
    requestedModel: body.model,
    stream: (_chunk: AnthropicSSEChunk) => {
      // replaced below for streaming case
    },
  };

  // ─────────────── Streaming response (SSE) ───────────────
  if (wantsStream) {
    const encoder = new TextEncoder();
    let controllerRef: ReadableStreamDefaultController<Uint8Array> | null = null;

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        controllerRef = controller;
        const send = (chunk: AnthropicSSEChunk) => {
          const data = `event: ${chunk.type}\ndata: ${JSON.stringify(chunk)}\n\n`;
          controller.enqueue(encoder.encode(data));
        };
        try {
          const result = await executeWorkflow({ ...runOptions, stream: send });
          // Final message_stop event
          send({ type: "message_stop" });
          await db.execution.update({
            where: { id: execution.id },
            data: {
              status: "completed",
              responseJson: JSON.stringify({ text: result.finalText }),
              totalTokensIn: result.totalTokensIn,
              totalTokensOut: result.totalTokensOut,
              totalCostUsd: result.totalCostUsd,
              durationMs: Date.now() - startedAt,
              finishedAt: new Date(),
            },
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          await db.execution.update({
            where: { id: execution.id },
            data: { status: "failed", errorMessage: msg, finishedAt: new Date() },
          });
          // Emit an error SSE event (non-standard, but informative for debugging)
          const errData = `event: error\ndata: ${JSON.stringify({ type: "error", error: { type: "api_error", message: msg } })}\n\n`;
          controller.enqueue(encoder.encode(errData));
        } finally {
          controller.close();
        }
      },
      cancel() {
        // Client disconnected
      },
    });

    return new NextResponse(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  }

  // ─────────────── Non-streaming response ───────────────
  try {
    const collected: AnthropicSSEChunk[] = [];
    const result = await executeWorkflow({
      ...runOptions,
      stream: (chunk) => collected.push(chunk),
    });

    const response: AnthropicResponse = {
      id: `msg_${execution.id}`,
      type: "message",
      role: "assistant",
      model: body.model,
      content: [{ type: "text", text: result.finalText }],
      stop_reason: "end_turn",
      stop_sequence: null,
      usage: {
        input_tokens: result.totalTokensIn,
        output_tokens: result.totalTokensOut,
      },
    };

    await db.execution.update({
      where: { id: execution.id },
      data: {
        status: "completed",
        responseJson: JSON.stringify(response),
        totalTokensIn: result.totalTokensIn,
        totalTokensOut: result.totalTokensOut,
        totalCostUsd: result.totalCostUsd,
        durationMs: Date.now() - startedAt,
        finishedAt: new Date(),
      },
    });

    return NextResponse.json(response);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await db.execution.update({
      where: { id: execution.id },
      data: { status: "failed", errorMessage: msg, finishedAt: new Date() },
    });
    return NextResponse.json(
      { type: "error", error: { type: "api_error", message: msg } },
      { status: 500 },
    );
  }
}

/** GET /api/v1/models — Anthropic-compatible models listing.
 *  Returns the models available in the deployed harness's credentials. */
export async function GET(req: NextRequest) {
  const auth = authenticate(req);
  if (!auth.ok) {
    return NextResponse.json(
      { type: "error", error: { type: "authentication_error", message: auth.error } },
      { status: 401 },
    );
  }

  // List all models from all credentials — Claude Code shows them in the model picker
  const models = await db.providerModel.findMany({
    include: { credential: true },
    orderBy: [{ credential: { name: "asc" } }, { displayName: "asc" }],
  });

  return NextResponse.json({
    object: "list",
    data: models.map((m) => ({
      id: m.modelId,
      object: "model",
      created: Math.floor(m.createdAt.getTime() / 1000),
      owned_by: m.credential?.name || "harness",
      display_name: m.displayName,
    })),
  });
}
