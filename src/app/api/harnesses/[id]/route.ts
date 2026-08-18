/**
 * GET    /api/harnesses/[id]  — fetch a harness (full graph)
 * PATCH  /api/harnesses/[id]  — update name/description/graphJson/deploy
 * DELETE /api/harnesses/[id]  — delete a harness
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
  const h = await db.harness.findUnique({
    where: { id },
    include: { _count: { select: { executions: true } } },
  });
  if (!h) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(h);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json();
  const { name, description, graphJson, isDeployed } = body as {
    name?: string;
    description?: string;
    graphJson?: string;
    isDeployed?: boolean;
  };

  // If deploying this harness, undeploy all others first (single-tenant: one deployed at a time)
  if (isDeployed === true) {
    await db.harness.updateMany({ where: { isDeployed: true }, data: { isDeployed: false } });
  }

  const data: { name?: string; description?: string; graphJson?: string; isDeployed?: boolean; version?: { increment: number } } = {};
  if (name !== undefined) data.name = name;
  if (description !== undefined) data.description = description;
  if (graphJson !== undefined) {
    data.graphJson = graphJson;
    data.version = { increment: 1 };
  }
  if (isDeployed !== undefined) data.isDeployed = isDeployed;

  const updated = await db.harness.update({ where: { id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await db.harness.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
