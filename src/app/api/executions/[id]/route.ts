/**
 * GET /api/executions/[id]  — fetch one execution with all node runs (for replay)
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Parse a stored JSON blob; truncated summaries may be invalid — return raw. */
function safeParse(json: string): unknown {
  try {
    return JSON.parse(json);
  } catch {
    return json;
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const execution = await db.execution.findUnique({
    where: { id },
    include: {
      harness: { select: { id: true, name: true, graphJson: true } },
      nodeRuns: { orderBy: { startedAt: "asc" } },
    },
  });
  if (!execution) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let graph: unknown = null;
  if (execution.harness?.graphJson) {
    try {
      graph = JSON.parse(execution.harness.graphJson);
    } catch {
      graph = null;
    }
  }

  return NextResponse.json({
    id: execution.id,
    harnessId: execution.harnessId,
    harnessName: execution.harness?.name || null,
    status: execution.status,
    errorMessage: execution.errorMessage,
    phase: execution.phase,
    matchedRule: execution.matchedRule,
    requestedModel: execution.requestedModel,
    routedModel: execution.routedModel,
    routedCredentialId: execution.routedCredentialId,
    request: safeParse(execution.requestJson),
    response: execution.responseJson ? safeParse(execution.responseJson) : null,
    totalTokensIn: execution.totalTokensIn,
    totalTokensOut: execution.totalTokensOut,
    totalCostUsd: execution.totalCostUsd,
    durationMs: execution.durationMs,
    startedAt: execution.startedAt,
    finishedAt: execution.finishedAt,
    graph,
    nodeRuns: execution.nodeRuns.map((nr) => ({
      id: nr.id,
      nodeId: nr.nodeId,
      nodeType: nr.nodeType,
      nodeLabel: nr.nodeLabel,
      status: nr.status,
      input: nr.inputJson ? JSON.parse(nr.inputJson) : null,
      output: nr.outputJson ? JSON.parse(nr.outputJson) : null,
      modelUsed: nr.modelUsed,
      credentialId: nr.credentialId,
      tokensIn: nr.tokensIn,
      tokensOut: nr.tokensOut,
      costUsd: nr.costUsd,
      latencyMs: nr.latencyMs,
      errorMessage: nr.errorMessage,
      startedAt: nr.startedAt,
      finishedAt: nr.finishedAt,
    })),
  });
}
