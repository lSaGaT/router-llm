/**
 * GET    /api/credentials/[id]       — fetch one credential (without secret)
 * PATCH  /api/credentials/[id]       — update credential (name, notes, or new apiKey)
 * DELETE /api/credentials/[id]       — delete credential
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { encryptCredentialPayload } from "@/lib/crypto";
import type { CredentialPayload } from "@/lib/adapters/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const c = await db.credential.findUnique({ where: { id }, include: { models: true } });
  if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    id: c.id,
    name: c.name,
    provider: c.provider,
    baseUrl: c.baseUrl,
    notes: c.notes,
    models: c.models,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json();
  const { name, notes, apiKey, baseUrl } = body as {
    name?: string;
    notes?: string;
    apiKey?: string;
    baseUrl?: string;
  };

  const existing = await db.credential.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: { name?: string; notes?: string; baseUrl?: string | null; encryptedSecret?: string; ivAuth?: string } = {};
  if (name) data.name = name;
  if (notes !== undefined) data.notes = notes;
  if (baseUrl !== undefined) data.baseUrl = baseUrl || null;

  if (apiKey) {
    // Re-encrypt with the new API key
    const payload: CredentialPayload = { apiKey };
    const enc = encryptCredentialPayload(payload);
    data.encryptedSecret = enc.encryptedSecret;
    data.ivAuth = enc.ivAuth;
  }

  const updated = await db.credential.update({ where: { id }, data });
  return NextResponse.json({ id: updated.id, updatedAt: updated.updatedAt });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await db.credential.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
