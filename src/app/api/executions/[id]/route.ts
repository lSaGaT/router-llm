/**
 * GET /api/executions/[id]  — fetch one execution with all node runs (for replay)
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    harnessName: execution.harness?.name || "(deleted)",
    status: execution.status,
    errorMessage: execution.errorMessage,
    request: JSON.parse(execution.requestJson),
    response: execution.responseJson ? JSON.parse(execution.responseJson) : null,
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
