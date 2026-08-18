/**
 * GET  /api/harnesses      — list all harnesses
 * POST /api/harnesses      — create a new harness
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const harnesses = await db.harness.findMany({
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { executions: true } } },
  });
  return NextResponse.json({
    harnesses: harnesses.map((h) => ({
      id: h.id,
      name: h.name,
      description: h.description,
      isDeployed: h.isDeployed,
      version: h.version,
      executionCount: h._count.executions,
      createdAt: h.createdAt,
      updatedAt: h.updatedAt,
    })),
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, description, graphJson } = body as {
    name: string;
    description?: string;
    graphJson: string;
  };

  if (!name || !graphJson) {
    return NextResponse.json({ error: "name and graphJson are required" }, { status: 400 });
  }

  const harness = await db.harness.create({
    data: { name, description, graphJson },
  });
  return NextResponse.json(harness);
}
