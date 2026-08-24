/**
 * Anthropic-compatible Gateway — POST /api/v1/messages
 *
 * Transparent proxy: receives the same request Claude Code would send to
 * https://api.anthropic.com/v1/messages, detects the current phase
 * (plan / execute / review / utility) from deterministic signals, rewrites
 * only the `model` field per the router config, and forwards upstream
 * (default: Z.ai's Anthropic-native endpoint). Response bytes — including
 * tool_use blocks, thinking deltas and SSE events — pass back untouched.
 *
 * Setup for the user:
 *   export ANTHROPIC_BASE_URL=http://localhost:3003/api/v1
 *   export ANTHROPIC_AUTH_TOKEN=<HARNESS_API_KEY from your .env, or anything if unset>
 *
 * Auth: HARNESS_API_KEY env var (if set). If empty, no auth (dev only).
 */
import { NextRequest } from "next/server";
import { proxyMessagesRequest } from "@/lib/router/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authenticate(req: NextRequest): { ok: boolean; error?: string } {
  const expected = process.env.HARNESS_API_KEY;
  if (!expected) return { ok: true }; // dev mode: no auth required
  const auth = req.headers.get("x-api-key") || req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!auth || auth !== expected) {
    return { ok: false, error: "Invalid API key (expected HARNESS_API_KEY)" };
  }
  return { ok: true };
}

export async function POST(req: NextRequest) {
  const auth = authenticate(req);
  if (!auth.ok) {
    return new Response(
      JSON.stringify({ type: "error", error: { type: "authentication_error", message: auth.error } }),
      { status: 401, headers: { "content-type": "application/json" } },
    );
  }

  const rawBodyText = await req.text();
  let bodyJson: unknown;
  try {
    bodyJson = JSON.parse(rawBodyText);
  } catch {
    return new Response(
      JSON.stringify({ type: "error", error: { type: "invalid_request_error", message: "Invalid JSON body" } }),
      { status: 400, headers: { "content-type": "application/json" } },
    );
  }

  return proxyMessagesRequest({ req, bodyJson, rawBodyText });
}
