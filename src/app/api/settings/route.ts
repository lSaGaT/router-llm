/**
 * GET /api/settings  — returns gateway runtime settings (no secrets)
 *
 * Used by the UI to show the user what env vars they need to set in their
 * Claude Code configuration.
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const deployedCount = await db.harness.count({ where: { isDeployed: true } });
  const credentialCount = await db.credential.count();

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
    hasDeployedHarness: deployedCount > 0,
    credentialCount,
    /** The encryption key status — useful warning for the user. */
    encryptionKeySet: !!process.env.HARNESS_ENCRYPTION_KEY,
    /** Suggested env vars for the user to copy/paste into their shell. */
    claudeCodeEnv: {
      ANTHROPIC_BASE_URL: "<your-host>/api/v1",
      ANTHROPIC_API_KEY: process.env.HARNESS_API_KEY || "<set HARNESS_API_KEY in .env>",
    },
  });
}
