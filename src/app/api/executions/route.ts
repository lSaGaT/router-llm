/**
 * GET /api/executions      — list executions (paginated)
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const limit = Math.min(50, parseInt(url.searchParams.get("limit") || "20"));
  const offset = parseInt(url.searchParams.get("offset") || "0");
  const harnessId = url.searchParams.get("harnessId");

  const where = harnessId ? { harnessId } : {};
  const [executions, total] = await Promise.all([
    db.execution.findMany({
      where,
      orderBy: { startedAt: "desc" },
      take: limit,
      skip: offset,
      include: {
        harness: { select: { id: true, name: true } },
        _count: { select: { nodeRuns: true } },
      },
    }),
    db.execution.count({ where }),
  ]);

  return NextResponse.json({
    executions: executions.map((e) => ({
      id: e.id,
      harnessId: e.harnessId,
      harnessName: e.harness?.name || null,
      status: e.status,
      phase: e.phase,
      matchedRule: e.matchedRule,
      requestedModel: e.requestedModel,
      routedModel: e.routedModel,
      totalTokensIn: e.totalTokensIn,
      totalTokensOut: e.totalTokensOut,
      totalCostUsd: e.totalCostUsd,
      durationMs: e.durationMs,
      errorMessage: e.errorMessage,
      nodeRunCount: e._count.nodeRuns,
      startedAt: e.startedAt,
      finishedAt: e.finishedAt,
    })),
    total,
    limit,
    offset,
  });
}
