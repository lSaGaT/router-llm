/**
 * Phase detection — deterministic, first-match-wins over ordered rules.
 *
 * Signals extracted (cheaply, without mutating) from the Anthropic request:
 * - requestedModel: body.model
 * - tools: names of body.tools[]
 * - systemPrompt: body.system (string or array of {type:"text", text} blocks)
 * - lastMessages: last few messages flattened to text (for custom rules only —
 *   prone to false positives, so no default rule uses it)
 */
import type { DetectionRule, PhaseKey } from "./types";

export interface DetectionSignals {
  requestedModel: string;
  toolNames: string[];
  systemText: string;
  lastMessagesText: string;
}

interface ContentBlockLike {
  type?: string;
  text?: string;
}

/** Cheap extraction of the fields detection rules can match against. */
export function extractSignals(body: unknown): DetectionSignals {
  const b = (body && typeof body === "object" ? body : {}) as {
    model?: unknown;
    tools?: unknown;
    system?: unknown;
    messages?: unknown;
  };

  const requestedModel = typeof b.model === "string" ? b.model : "";

  const toolNames: string[] = Array.isArray(b.tools)
    ? b.tools
        .map((t) => (t && typeof t === "object" && typeof (t as { name?: unknown }).name === "string" ? (t as { name: string }).name : ""))
        .filter(Boolean)
    : [];

  let systemText = "";
  if (typeof b.system === "string") {
    systemText = b.system;
  } else if (Array.isArray(b.system)) {
    systemText = (b.system as ContentBlockLike[])
      .filter((blk) => blk && blk.type === "text" && typeof blk.text === "string")
      .map((blk) => blk.text!)
      .join("\n");
  }

  // Last few messages flattened — custom rules only.
  let lastMessagesText = "";
  if (Array.isArray(b.messages)) {
    const tail = b.messages.slice(-4) as Array<{ role?: unknown; content?: unknown }>;
    lastMessagesText = tail
      .map((m) => {
        const role = typeof m.role === "string" ? m.role : "";
        let text = "";
        if (typeof m.content === "string") {
          text = m.content;
        } else if (Array.isArray(m.content)) {
          text = (m.content as ContentBlockLike[])
            .filter((blk) => blk && typeof blk.text === "string")
            .map((blk) => blk.text!)
            .join("\n");
        }
        return `${role}: ${text}`;
      })
      .join("\n");
  }

  // Caps: regex over a huge system prompt is still fine, but we bound it anyway.
  return {
    requestedModel,
    toolNames,
    systemText: systemText.slice(0, 64_000),
    lastMessagesText: lastMessagesText.slice(0, 64_000),
  };
}

function testRule(rule: DetectionRule, sig: DetectionSignals): boolean {
  let haystack = "";
  switch (rule.field) {
    case "requestedModel":
      haystack = sig.requestedModel;
      break;
    case "tools":
      haystack = sig.toolNames.join(",");
      break;
    case "systemPrompt":
      haystack = sig.systemText;
      break;
    case "lastMessages":
      haystack = sig.lastMessagesText;
      break;
  }

  if (rule.operator === "regex") {
    try {
      return new RegExp(rule.value, "i").test(haystack);
    } catch {
      return false; // invalid regex — skip the rule, never throw
    }
  }
  const needle = rule.value.toLowerCase();
  const hay = haystack.toLowerCase();
  if (rule.operator === "equals") return hay === needle;
  return hay.includes(needle);
}

/**
 * Evaluate rules in priority order; first enabled match wins.
 * Returns the phase plus which rule matched (null = fallback to EXECUTE).
 */
export function detectPhase(
  signals: DetectionSignals,
  rules: DetectionRule[],
): { phase: PhaseKey; matchedRule: DetectionRule | null } {
  for (const rule of rules) {
    if (!rule.enabled) continue;
    if (rule.value === "") continue;
    if (testRule(rule, signals)) {
      return { phase: rule.phase, matchedRule: rule };
    }
  }
  return { phase: "EXECUTE", matchedRule: null };
}
