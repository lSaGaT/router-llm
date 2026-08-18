/**
 * GET /api/v1/models — Anthropic-compatible models listing.
 *
 * Returns the models available in the deployed harness's credentials.
 * Claude Code shows them in the model picker.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authenticate(req: NextRequest): { ok: boolean; error?: string } {
  const expected = process.env.HARNESS_API_KEY;
  if (!expected) return { ok: true }; // dev mode: no auth required
  const auth =
    req.headers.get("x-api-key") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!auth || auth !== expected) {
    return { ok: false, error: "Invalid API key (expected HARNESS_API_KEY)" };
  }
  return { ok: true };
}

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
