/**
 * POST /api/credentials/[id]/models — discover and cache models for a credential.
 *
 * Calls the provider's /v1/models endpoint (or uses the hardcoded list for
 * Anthropic), saves the results to ProviderModel rows, and returns them.
 * Existing rows for this credential are replaced.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdapterForCredential } from "@/lib/adapters/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const credential = await db.credential.findUnique({ where: { id } });
  if (!credential) {
    return NextResponse.json({ error: "Credential not found" }, { status: 404 });
  }

  let discovered: { id: string; displayName: string }[];
  try {
    const { adapter } = await getAdapterForCredential(credential);
    discovered = await adapter.listModels();
  } catch (e) {
    return NextResponse.json(
      { error: `Discovery failed: ${(e as Error).message}` },
      { status: 502 },
    );
  }

  if (!discovered.length) {
    return NextResponse.json(
      { error: "Provider returned no models. Check baseUrl and apiKey." },
      { status: 422 },
    );
  }

  // Replace cached models — delete then recreate
  await db.providerModel.deleteMany({ where: { credentialId: id } });

  const created = await Promise.all(
    discovered.map((m) =>
      db.providerModel.create({
        data: {
          credentialId: id,
          modelId: m.id,
          displayName: m.displayName,
          lastSeenAt: new Date(),
        },
      }),
    ),
  );

  return NextResponse.json({
    count: created.length,
    models: created,
  });
}

/** GET /api/credentials/[id]/models — return cached models for this credential. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const models = await db.providerModel.findMany({
    where: { credentialId: id },
    orderBy: { displayName: "asc" },
  });
  return NextResponse.json({ models });
}
