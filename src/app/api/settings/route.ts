/**
 * GET /api/settings  — returns gateway runtime settings (no secrets)
 *
 * Used by the UI to show the user how to point Claude Code at the phase
 * router and what env vars to set / remove.
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateRouterConfig } from "@/lib/router/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const credentialCount = await db.credential.count();
  const router = await getOrCreateRouterConfig();
  const routerConfigured = !!router.data.routes.FALLBACK.credentialId;

  return NextResponse.json({
    /** The base URL the user should set as ANTHROPIC_BASE_URL in their Claude Code env. */
    gatewayBaseUrl: "/api/v1",
    /** Whether auth (HARNESS_API_KEY) is enabled. */
    authEnabled: !!process.env.HARNESS_API_KEY,
    /** The current HARNESS_API_KEY value (masked), if set. */
    apiKeyMasked: process.env.HARNESS_API_KEY
      ? `${process.env.HARNESS_API_KEY.slice(0, 4)}...${process.env.HARNESS_API_KEY.slice(-4)}`
      : null,
    /** Stats */
    routerConfigured,
    credentialCount,
    /** The encryption key status — useful warning for the user. */
    encryptionKeySet: !!process.env.HARNESS_ENCRYPTION_KEY,
    /** Suggested env vars for the user to copy/paste into Claude Code settings. */
    claudeCodeEnv: {
      ANTHROPIC_BASE_URL: "http://localhost:3003/api/v1",
      ANTHROPIC_AUTH_TOKEN: process.env.HARNESS_API_KEY || "<anything — gateway auth is off>",
    },
  });
}
