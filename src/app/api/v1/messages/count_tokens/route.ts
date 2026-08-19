/**
 * POST /api/v1/messages/count_tokens — local token estimation.
 *
 * Claude Code calls this to decide when to compact the conversation. The
 * upstream (Z.ai's Anthropic endpoint) doesn't implement it — forwarding
 * there makes it generate a full message instead of counting. So we
 * estimate locally: ~4 chars per token is close enough for compaction
 * decisions, costs nothing, and answers instantly.
 *
 * Response follows the Anthropic count_tokens shape: { input_tokens: N }.
 */
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const expected = process.env.HARNESS_API_KEY;
  if (expected) {
    const auth = req.headers.get("x-api-key") || req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!auth || auth !== expected) {
      return new Response(
        JSON.stringify({
          type: "error",
          error: { type: "authentication_error", message: "Invalid API key (expected HARNESS_API_KEY)" },
        }),
        { status: 401, headers: { "content-type": "application/json" } },
      );
    }
  }

  const raw = await req.text();
  // Rough estimate: JSON overhead included, ~4 chars/token average for
  // mixed English/code content. Deliberately errs slightly high so Claude
  // Code compacts a bit early rather than late.
  const inputTokens = Math.ceil(raw.length / 4);

  return new Response(JSON.stringify({ input_tokens: inputTokens }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
