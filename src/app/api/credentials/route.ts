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
import { PROVIDER_PRESETS, getAdapterForCredential } from "@/lib/adapters/registry";
import type { CredentialPayload } from "@/lib/adapters/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function maskApiKey(key: string): string {
  if (!key || key.length < 8) return "****";
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

/** Find the preset that matches a credential row (by providerLabel first, then baseUrl). */
function findPresetForCredential(c: { provider: string; providerLabel: string | null; baseUrl: string | null }) {
  const matches = PROVIDER_PRESETS.filter((p) => p.key === c.provider);
  if (matches.length === 0) return null;
  // 1. Match by persisted providerLabel — most reliable (set at creation time)
  if (c.providerLabel) {
    const byLabel = matches.find((p) => p.label === c.providerLabel);
    if (byLabel) return byLabel;
  }
  // 2. Fall back to baseUrl match
  if (c.baseUrl) {
    const exact = matches.find((p) => p.defaultBaseUrl === c.baseUrl);
    if (exact) return exact;
  }
  // 3. Last resort: first preset with this provider key
  return matches[0];
}

export async function GET() {
  const creds = await db.credential.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { models: true } } },
  });

  // Backfill providerLabel for legacy credentials that were created before
  // this column existed. We resolve from the preset by baseUrl match.
  for (const c of creds) {
    if (!c.providerLabel) {
      const preset = findPresetForCredential(c);
      if (preset) {
        await db.credential.update({
          where: { id: c.id },
          data: { providerLabel: preset.label },
        });
      }
    }
  }

  // Re-fetch with the backfilled labels
  const finalCreds = await db.credential.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { models: true } } },
  });

  return NextResponse.json({
    credentials: finalCreds.map((c) => {
      const preset = findPresetForCredential(c);
      return {
        id: c.id,
        name: c.name,
        provider: c.provider,
        providerLabel: c.providerLabel || preset?.label || c.provider,
        baseUrl: c.baseUrl,
        apiKeyMasked: "••••••••••••",
        notes: c.notes,
        knownModels: preset?.knownModels || [],
        discoveredModelCount: c._count.models,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      };
    }),
    presets: PROVIDER_PRESETS,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  // providerKey identifies the preset by its key+label (composite), since
  // multiple presets share the same canonical provider key (e.g. many
  // "openai_compatible" presets for Z.ai / DeepSeek / OpenAI / Grok / ...).
  const {
    name,
    providerKey, // preset.key (e.g. "anthropic" | "openai_compatible")
    providerLabel, // preset.label (e.g. "Z.ai (GLM)" | "xAI (Grok)")
    baseUrl,
    apiKey,
    organization,
    headers,
    notes,
    autoDiscover, // if true, fetch models immediately after creation
  } = body as {
    name: string;
    providerKey: string;
    providerLabel?: string;
    baseUrl?: string;
    apiKey: string;
    organization?: string;
    headers?: Record<string, string>;
    notes?: string;
    autoDiscover?: boolean;
  };

  if (!name || !providerKey || !apiKey) {
    return NextResponse.json(
      { error: "Missing required fields: name, providerKey, apiKey" },
      { status: 400 },
    );
  }

  // Find the preset by (key, label) tuple — falls back to key-only match
  // if no label was provided (back-compat).
  const preset = providerLabel
    ? PROVIDER_PRESETS.find((p) => p.key === providerKey && p.label === providerLabel)
    : PROVIDER_PRESETS.find((p) => p.key === providerKey);

  if (!preset) {
    return NextResponse.json(
      { error: `Unknown provider: ${providerKey} / ${providerLabel || ""}` },
      { status: 400 },
    );
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
      providerLabel: preset.label,
      baseUrl: baseUrl || preset.defaultBaseUrl || null,
      encryptedSecret: enc.encryptedSecret,
      ivAuth: enc.ivAuth,
      notes,
    },
  });

  // Optional auto-population of the model list right after creation so the
  // user doesn't have to click "Discover" manually.
  // - Providers WITHOUT a /v1/models endpoint (Anthropic-protocol presets,
  //   e.g. "Z.ai (GLM) — Anthropic API") are seeded from preset.knownModels.
  // - Providers with discovery get the real /v1/models call; on failure we
  //   fall back to knownModels when the preset has them.
  // Failures are swallowed (we just return discoveredCount: 0).
  const seedFromKnownModels = async (): Promise<number> => {
    if (!preset.knownModels || preset.knownModels.length === 0) return 0;
    await db.providerModel.deleteMany({ where: { credentialId: credential.id } });
    await db.providerModel.createMany({
      data: preset.knownModels.map((id) => ({
        credentialId: credential.id,
        modelId: id,
        displayName: id,
        lastSeenAt: new Date(),
      })),
    });
    return preset.knownModels.length;
  };

  let discoveredCount = 0;
  if (autoDiscover) {
    if (!preset.supportsDiscovery) {
      discoveredCount = await seedFromKnownModels();
    } else {
      try {
        const { adapter } = await getAdapterForCredential(credential);
        const models = await adapter.listModels();
        if (models.length > 0) {
          await db.providerModel.deleteMany({ where: { credentialId: credential.id } });
          await db.providerModel.createMany({
            data: models.map((m) => ({
              credentialId: credential.id,
              modelId: m.id,
              displayName: m.displayName,
              lastSeenAt: new Date(),
            })),
          });
          discoveredCount = models.length;
        } else {
          discoveredCount = await seedFromKnownModels();
        }
      } catch {
        // Discovery failure is non-fatal — fall back to knownModels if present.
        discoveredCount = await seedFromKnownModels();
      }
    }
  }

  return NextResponse.json({
    id: credential.id,
    name: credential.name,
    provider: credential.provider,
    baseUrl: credential.baseUrl,
    apiKeyMasked: maskApiKey(apiKey),
    discoveredCount,
    createdAt: credential.createdAt,
  });
}

