/**
 * GET /api/credentials — list all credentials
 * POST /api/credentials — create a new credential
 *
 * Credentials are encrypted at rest with AES-256-GCM. The API key never
 * comes back to the client in plaintext after creation (we return only a
 * masked preview).
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { encryptCredentialPayload } from "@/lib/crypto";
import { PROVIDER_PRESETS } from "@/lib/adapters/registry";
import type { CredentialPayload } from "@/lib/workflow/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function maskApiKey(key: string): string {
  if (!key || key.length < 8) return "****";
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

export async function GET() {
  const creds = await db.credential.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({
    credentials: creds.map((c) => ({
      id: c.id,
      name: c.name,
      provider: c.provider,
      baseUrl: c.baseUrl,
      // We never return the raw API key. Only a hint about its prefix.
      apiKeyMasked: "••••••••••••",
      notes: c.notes,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    })),
    presets: PROVIDER_PRESETS,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, providerKey, baseUrl, apiKey, organization, headers, notes } = body as {
    name: string;
    providerKey: string; // preset key like "anthropic" or "openai_compatible"
    baseUrl?: string;
    apiKey: string;
    organization?: string;
    headers?: Record<string, string>;
    notes?: string;
  };

  if (!name || !providerKey || !apiKey) {
    return NextResponse.json(
      { error: "Missing required fields: name, providerKey, apiKey" },
      { status: 400 },
    );
  }

  // Find the preset to get the canonical provider key
  const preset = PROVIDER_PRESETS.find((p) => p.key === providerKey);
  if (!preset) {
    return NextResponse.json({ error: `Unknown provider: ${providerKey}` }, { status: 400 });
  }

  const payload: CredentialPayload = {
    apiKey,
    organization,
    headers,
  };
  const enc = encryptCredentialPayload(payload);

  const credential = await db.credential.create({
    data: {
      name,
      provider: preset.key,
      baseUrl: baseUrl || preset.defaultBaseUrl || null,
      encryptedSecret: enc.encryptedSecret,
      ivAuth: enc.ivAuth,
      notes,
    },
  });

  return NextResponse.json({
    id: credential.id,
    name: credential.name,
    provider: credential.provider,
    baseUrl: credential.baseUrl,
    apiKeyMasked: maskApiKey(apiKey),
    createdAt: credential.createdAt,
  });
}
