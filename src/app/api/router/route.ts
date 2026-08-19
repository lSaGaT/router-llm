/**
 * GET /api/router — active router config (seeded with defaults on first access)
 * PUT /api/router — save the config (upsert on the active row, version++)
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateRouterConfig, parseRouterConfig } from "@/lib/router/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const config = await getOrCreateRouterConfig();
  return NextResponse.json({
    id: config.id,
    version: config.version,
    config: config.data,
  });
}

export async function PUT(req: NextRequest) {
  let body: { config?: unknown };
  try {
    body = (await req.json()) as { config?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body.config || typeof body.config !== "object") {
    return NextResponse.json({ error: "Missing config object" }, { status: 400 });
  }

  // Validate through the same sanitizer the gateway uses
  const data = parseRouterConfig(JSON.stringify(body.config));

  const current = await getOrCreateRouterConfig();
  const updated = await db.routerConfig.update({
    where: { id: current.id },
    data: {
      configJson: JSON.stringify(data),
      version: { increment: 1 },
    },
  });

  return NextResponse.json({ id: updated.id, version: updated.version, config: data });
}
