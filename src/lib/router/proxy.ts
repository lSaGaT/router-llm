/**
 * Transparent Anthropic-protocol proxy — the heart of the phase router.
 *
 * Forwards /v1/messages (and /v1/messages/count_tokens) requests upstream
 * byte-intact: tools, tool_use/tool_result blocks, system arrays with
 * cache_control, anthropic-beta headers — everything passes through
 * untouched. Only the `model` field (and optionally `thinking`) is
 * rewritten according to the detected phase.
 *
 * Usage/tokens/cost are extracted PASSIVELY by reading the SSE stream as
 * it flows through a pass-through TransformStream — events are never
 * altered, delayed, or re-emitted.
 */
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { decryptCredentialPayload } from "@/lib/crypto";
import { getOrCreateRouterConfig } from "./config";
import { detectPhase, extractSignals } from "./detect";
import type { PhaseKey, RouteTarget } from "./types";

const DEFAULT_UPSTREAM_BASE = "https://api.z.ai/api/anthropic";
const UPSTREAM_TIMEOUT_MS =
  Number(process.env.ROUTER_UPSTREAM_TIMEOUT_MS) || 600_000; // 10 min default

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function anthropicError(status: number, message: string): Response {
  return new Response(
    JSON.stringify({ type: "error", error: { type: "api_error", message } }),
    { status, headers: { "content-type": "application/json" } },
  );
}

function combineSignals(a: AbortSignal, timeoutMs: number): AbortSignal {
  if (typeof AbortSignal.any === "function") {
    return AbortSignal.any([a, AbortSignal.timeout(timeoutMs)]);
  }
  return a; // fallback for runtimes without AbortSignal.any
}

/** Build upstream headers: credential auth + passthrough of anthropic-* headers. */
function buildUpstreamHeaders(req: NextRequest, apiKey: string): Headers {
  const h = new Headers();
  h.set("content-type", "application/json");
  // Z.ai accepts both header styles — send both.
  h.set("x-api-key", apiKey);
  h.set("authorization", `Bearer ${apiKey}`);
  h.set("anthropic-version", req.headers.get("anthropic-version") || "2023-06-01");
  const beta = req.headers.get("anthropic-beta");
  if (beta) h.set("anthropic-beta", beta);
  const org = req.headers.get("anthropic-organization");
  if (org) h.set("anthropic-organization", org);
  return h;
}

/** Truncated request summary for the Execution log — never the full body
 *  (Claude Code sends multi-MB conversations). */
function summarizeRequest(body: unknown, bodyBytes: number): string {
  const b = (body && typeof body === "object" ? body : {}) as {
    model?: unknown;
    stream?: unknown;
    tools?: unknown;
    system?: unknown;
    messages?: unknown;
  };
  const toolNames = Array.isArray(b.tools)
    ? b.tools
        .map((t) => (t && typeof t === "object" ? (t as { name?: unknown }).name : null))
        .filter((n): n is string => typeof n === "string")
    : [];
  let systemHead = "";
  if (typeof b.system === "string") systemHead = b.system.slice(0, 500);
  else if (Array.isArray(b.system)) {
    systemHead = b.system
      .map((blk) =>
        blk && typeof blk === "object" && typeof (blk as { text?: unknown }).text === "string"
          ? (blk as { text: string }).text
          : "",
      )
      .join("\n")
      .slice(0, 500);
  }
  const messages = Array.isArray(b.messages) ? b.messages.slice(-6) : [];
  const msgPreviews = messages.map((m) => {
    const mm = (m && typeof m === "object" ? m : {}) as { role?: unknown; content?: unknown };
    let text = "";
    if (typeof mm.content === "string") text = mm.content;
    else if (Array.isArray(mm.content)) {
      text = (mm.content as { type?: string; text?: string }[])
        .filter((blk) => blk && typeof blk.text === "string")
        .map((blk) => blk.text!)
        .join("\n");
    }
    return { role: mm.role, preview: text.slice(0, 120) };
  });
  const summary = {
    truncated: true,
    model: typeof b.model === "string" ? b.model : null,
    stream: b.stream === true,
    bodyBytes,
    toolCount: toolNames.length,
    tools: toolNames.slice(0, 40),
    systemHead,
    lastMessages: msgPreviews,
  };
  const json = JSON.stringify(summary);
  return json.length > 8192 ? JSON.stringify({ ...summary, tools: toolNames.slice(0, 10), systemHead: systemHead.slice(0, 200) }) : json;
}

// ─────────────────────────────────────────────────────────────────────────────
// SSE usage scanner — reads passively, never mutates
// ─────────────────────────────────────────────────────────────────────────────

export interface SseUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens: number;
  cacheCreationInputTokens: number;
  model: string | null;
  stopReason: string | null;
  error: string | null;
}

class SseUsageScanner {
  private pending = "";
  readonly usage: SseUsage = {
    inputTokens: 0,
    outputTokens: 0,
    cacheReadInputTokens: 0,
    cacheCreationInputTokens: 0,
    model: null,
    stopReason: null,
    error: null,
  };

  ingest(chunk: Uint8Array): void {
    this.pending += new TextDecoder().decode(chunk, { stream: true });
    const lines = this.pending.split("\n");
    this.pending = lines.pop() ?? ""; // keep only the incomplete tail
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      let evt: any;
      try {
        evt = JSON.parse(payload);
      } catch {
        continue;
      }
      if (evt.type === "message_start" && evt.message) {
        this.usage.inputTokens = evt.message.usage?.input_tokens ?? 0;
        this.usage.cacheReadInputTokens = evt.message.usage?.cache_read_input_tokens ?? 0;
        this.usage.cacheCreationInputTokens =
          evt.message.usage?.cache_creation_input_tokens ?? 0;
        this.usage.model = evt.message.model ?? null;
      } else if (evt.type === "message_delta") {
        if (typeof evt.usage?.output_tokens === "number") {
          this.usage.outputTokens = evt.usage.output_tokens;
        }
        // Some providers (e.g. Z.ai) only report input usage here, not in message_start.
        if (typeof evt.usage?.input_tokens === "number" && !this.usage.inputTokens) {
          this.usage.inputTokens = evt.usage.input_tokens;
        }
        if (evt.delta?.stop_reason) this.usage.stopReason = evt.delta.stop_reason;
      } else if (evt.type === "error") {
        this.usage.error = evt.error?.message ?? "unknown upstream error";
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Cost lookup
// ─────────────────────────────────────────────────────────────────────────────

async function estimateCost(
  credentialId: string,
  modelId: string,
  usage: SseUsage,
): Promise<number> {
  const strip = (m: string) => m.replace(/\[[^\]]*\]$/, "");
  let row = await db.providerModel.findUnique({
    where: { credentialId_modelId: { credentialId, modelId } },
  });
  if (!row && strip(modelId) !== modelId) {
    row = await db.providerModel.findUnique({
      where: { credentialId_modelId: { credentialId, modelId: strip(modelId) } },
    });
  }
  if (!row || row.inputCostPer1M == null || row.outputCostPer1M == null) return 0;
  const inTokens =
    usage.inputTokens + usage.cacheReadInputTokens + usage.cacheCreationInputTokens;
  return (
    (inTokens / 1e6) * row.inputCostPer1M + (usage.outputTokens / 1e6) * row.outputCostPer1M
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main entry
// ─────────────────────────────────────────────────────────────────────────────

export interface ProxyOptions {
  req: NextRequest;
  /** Parsed request body (parsed once by the route). */
  bodyJson: unknown;
  /** Raw body text — used for size accounting in the summary. */
  rawBodyText: string;
  /** Passthrough mode for count_tokens: no Execution logging. */
  logExecution?: boolean;
}

export async function proxyMessagesRequest(opts: ProxyOptions): Promise<Response> {
  const { req, bodyJson, rawBodyText, logExecution = true } = opts;

  // 1. Config + phase detection
  const config = await getOrCreateRouterConfig();
  const signals = extractSignals(bodyJson);
  const { phase, matchedRule } = detectPhase(signals, config.data.rules);
  const target: RouteTarget =
    config.data.routes[phase as PhaseKey] ?? config.data.routes.FALLBACK;
  const requestedModel = typeof (bodyJson as { model?: unknown })?.model === "string"
    ? (bodyJson as { model: string }).model
    : "";

  // 2. Route validation
  if (!target.credentialId || !target.modelId) {
    if (logExecution) {
      await db.execution
        .create({
          data: {
            status: "failed",
            phase,
            matchedRule: matchedRule?.name ?? "fallback",
            requestedModel,
            routedModel: target.modelId,
            routedCredentialId: target.credentialId,
            requestJson: summarizeRequest(bodyJson, rawBodyText.length),
            errorMessage: `Route for phase ${phase} has no credential/model configured`,
            finishedAt: new Date(),
          },
        })
        .catch(() => undefined);
    }
    return anthropicError(
      503,
      `Phase router: route for phase ${phase} has no credential/model configured. Open the Router tab in the Harness UI.`,
    );
  }

  // 3. Credential
  const credential = await db.credential.findUnique({ where: { id: target.credentialId } });
  if (!credential) {
    return anthropicError(503, `Phase router: credential ${target.credentialId} not found.`);
  }
  let apiKey: string;
  try {
    const payload = decryptCredentialPayload<{ apiKey?: string }>(
      credential.ivAuth,
      credential.encryptedSecret,
    );
    apiKey = payload.apiKey ?? "";
  } catch {
    return anthropicError(500, "Phase router: failed to decrypt credential (HARNESS_ENCRYPTION_KEY changed?).");
  }
  if (!apiKey) return anthropicError(500, "Phase router: credential has no apiKey.");

  // 4. Minimal body rewrite — everything else passes through untouched
  const outBody: Record<string, unknown> = {
    ...(bodyJson as Record<string, unknown>),
    model: target.modelId,
  };
  if (target.thinkingOverride === "disable") {
    delete outBody.thinking;
  } else if (
    target.thinkingOverride &&
    typeof target.thinkingOverride === "object" &&
    target.thinkingOverride.type === "enabled"
  ) {
    outBody.thinking = {
      type: "enabled",
      budget_tokens: target.thinkingOverride.budget_tokens,
    };
  }

  const base = (credential.baseUrl || DEFAULT_UPSTREAM_BASE).replace(/\/+$/, "");
  const url = `${base}/v1/messages`;
  const headers = buildUpstreamHeaders(req, apiKey);
  const signal = combineSignals(req.signal, UPSTREAM_TIMEOUT_MS);

  // 5. Execution row (before fetch)
  const startedAt = Date.now();
  let executionId: string | null = null;
  if (logExecution) {
    try {
      const created = await db.execution.create({
        data: {
          status: "running",
          phase,
          matchedRule: matchedRule?.name ?? "fallback",
          requestedModel,
          routedModel: target.modelId,
          routedCredentialId: target.credentialId,
          requestJson: summarizeRequest(bodyJson, rawBodyText.length),
        },
      });
      executionId = created.id;
    } catch {
      executionId = null; // logging must never break the proxy
    }
  }

  // Idempotent finalizer — every exit path updates the row exactly once
  let finalized = false;
  const finalize = async (
    status: "completed" | "failed" | "cancelled",
    usage: SseUsage | null,
    errorMessage?: string,
    responseSummary?: string,
  ) => {
    if (finalized || !executionId) return;
    finalized = true;
    try {
      const costUsd =
        usage && (usage.inputTokens || usage.outputTokens)
          ? await estimateCost(target.credentialId!, target.modelId!, usage)
          : 0;
      await db.execution.update({
        where: { id: executionId },
        data: {
          status,
          errorMessage: errorMessage ?? null,
          responseJson: responseSummary ?? null,
          totalTokensIn: usage?.inputTokens ?? 0,
          totalTokensOut: usage?.outputTokens ?? 0,
          totalCostUsd: costUsd,
          durationMs: Date.now() - startedAt,
          finishedAt: new Date(),
        },
      });
    } catch {
      // DB failure must never break the response stream
    }
  };

  // 6. Fetch upstream
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(outBody),
      signal,
      cache: "no-store",
      redirect: "manual",
    });
  } catch (err) {
    const aborted = req.signal.aborted;
    await finalize(
      aborted ? "cancelled" : "failed",
      null,
      `upstream fetch error: ${err instanceof Error ? err.message : String(err)}`,
    );
    if (aborted) return anthropicError(499, "Client aborted request");
    return anthropicError(502, `Upstream fetch failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  // 7. Upstream error → pass status + body through verbatim
  if (!res.ok) {
    const errText = (await res.text()).slice(0, 64 * 1024);
    await finalize("failed", null, `upstream ${res.status}: ${errText.slice(0, 400)}`);
    return new Response(errText, {
      status: res.status,
      headers: { "content-type": res.headers.get("content-type") || "application/json" },
    });
  }

  const wantsStream = (bodyJson as { stream?: unknown })?.stream === true;

  // 8. Non-streaming: read, extract usage, return text verbatim
  if (!wantsStream || !res.body) {
    const text = await res.text();
    const scanner = new SseUsageScanner();
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === "object") {
        const u = (parsed as { usage?: any }).usage;
        if (u) {
          scanner.usage.inputTokens = u.input_tokens ?? scanner.usage.inputTokens;
          scanner.usage.outputTokens = u.output_tokens ?? scanner.usage.outputTokens;
          scanner.usage.cacheReadInputTokens = u.cache_read_input_tokens ?? 0;
          scanner.usage.cacheCreationInputTokens = u.cache_creation_input_tokens ?? 0;
        }
        scanner.usage.model = (parsed as { model?: string }).model ?? scanner.usage.model;
        scanner.usage.stopReason = (parsed as { stop_reason?: string }).stop_reason ?? null;
      }
    } catch {
      // non-JSON response — pass through without usage
    }
    const respSummary = JSON.stringify({
      truncated: true,
      model: scanner.usage.model,
      stopReason: scanner.usage.stopReason,
      usage: {
        input: scanner.usage.inputTokens,
        output: scanner.usage.outputTokens,
        cacheRead: scanner.usage.cacheReadInputTokens,
        cacheCreation: scanner.usage.cacheCreationInputTokens,
      },
      textHead: text.slice(0, 1000),
    }).slice(0, 8192);
    await finalize("completed", scanner.usage, undefined, respSummary);
    return new Response(text, {
      status: res.status,
      headers: { "content-type": res.headers.get("content-type") || "application/json" },
    });
  }

  // 9. Streaming: pass-through TransformStream + passive scanner
  const scanner = new SseUsageScanner();

  const onClientAbort = () => {
    void finalize("cancelled", scanner.usage, "client aborted mid-stream");
  };
  req.signal.addEventListener("abort", onClientAbort, { once: true });

  // TS's Transformer type lacks `cancel` (standard in the streams spec) — declare it.
  type TransformerWithCancel = Transformer<Uint8Array, Uint8Array> & {
    cancel?: (reason?: unknown) => Promise<void>;
  };
  const transformer: TransformerWithCancel = {
    transform(chunk, controller) {
      scanner.ingest(chunk);
      controller.enqueue(chunk); // bytes flow through untouched
    },
    async flush() {
      req.signal.removeEventListener("abort", onClientAbort);
      await finalize(
        scanner.usage.error ? "failed" : "completed",
        scanner.usage,
        scanner.usage.error ?? undefined,
      );
    },
    async cancel(reason) {
      req.signal.removeEventListener("abort", onClientAbort);
      await finalize("cancelled", scanner.usage, `stream cancelled: ${String(reason)}`);
    },
  };

  const transformed = res.body.pipeThrough(new TransformStream(transformer));

  return new Response(transformed, {
    status: res.status,
    headers: {
      "content-type": res.headers.get("content-type") || "text/event-stream",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
    },
  });
}
