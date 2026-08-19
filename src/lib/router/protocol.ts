/**
 * Wire-protocol resolution for upstream credentials.
 *
 * The gateway speaks the Anthropic Messages API on the client side, but the
 * upstream credential may be either protocol:
 *  - "anthropic"    → native Anthropic Messages API (Z.ai, Anthropic, Gemini's
 *                     Anthropic-compatible endpoint). Requests pass through.
 *  - "openai_compat"→ OpenAI Chat Completions API (OpenAI, xAI, DeepSeek,
 *                     MiniMax, ...). Requests/responses are translated.
 *
 * `Credential.protocol` is nullable for zero-downtime migration; older rows
 * are resolved from the legacy `provider` canonical key.
 */

export type WireProtocol = "anthropic" | "openai_compat";

/** Default upstream base URL per protocol, used when credential.baseUrl is null. */
export const PROTOCOL_DEFAULT_BASE: Record<WireProtocol, string> = {
  anthropic: "https://api.anthropic.com",
  openai_compat: "https://api.openai.com/v1",
};

/**
 * Resolve the wire protocol for a credential row.
 * Explicit `protocol` wins; otherwise fall back to the legacy provider key
 * ("openai_compatible" → openai_compat, anything else → anthropic).
 */
export function credentialProtocol(c: {
  protocol: string | null;
  provider: string;
}): WireProtocol {
  if (c.protocol === "openai_compat" || c.protocol === "anthropic") return c.protocol;
  return c.provider === "openai_compatible" ? "openai_compat" : "anthropic";
}
