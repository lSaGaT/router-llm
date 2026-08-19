/**
 * Router config persistence — get-or-seed + validation.
 *
 * Single-tenant: one active RouterConfig row. Both the gateway and the UI
 * go through getOrCreateRouterConfig(), so the row is seeded on first access
 * and the gateway never sees a missing config — only routes with a null
 * credentialId (which produce a friendly 503).
 */
import { db } from "@/lib/db";
import {
  DEFAULT_ROUTER_CONFIG,
  PHASES,
  ROUTE_KEYS,
  type DetectionField,
  type DetectionOperator,
  type DetectionRule,
  type PhaseKey,
  type RouteKey,
  type RouteTarget,
  type RouterConfigData,
} from "./types";

const FIELDS: DetectionField[] = ["requestedModel", "tools", "systemPrompt", "lastMessages"];
const OPERATORS: DetectionOperator[] = ["contains", "regex", "equals"];

function sanitizeRoute(raw: unknown, fallback: RouteTarget): RouteTarget {
  if (!raw || typeof raw !== "object") return { ...fallback };
  const r = raw as Partial<RouteTarget>;
  return {
    credentialId: typeof r.credentialId === "string" ? r.credentialId : null,
    modelId: typeof r.modelId === "string" && r.modelId.length > 0 ? r.modelId : null,
    thinkingOverride:
      r.thinkingOverride === undefined ||
      r.thinkingOverride === "preserve" ||
      r.thinkingOverride === "disable" ||
      (typeof r.thinkingOverride === "object" &&
        r.thinkingOverride !== null &&
        r.thinkingOverride.type === "enabled" &&
        typeof r.thinkingOverride.budget_tokens === "number")
        ? r.thinkingOverride
        : "preserve",
  };
}

function sanitizeRule(raw: unknown, index: number): DetectionRule | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<DetectionRule>;
  const phase = PHASES.includes(r.phase as PhaseKey) ? (r.phase as PhaseKey) : null;
  const field = FIELDS.includes(r.field as DetectionField) ? (r.field as DetectionField) : null;
  const operator = OPERATORS.includes(r.operator as DetectionOperator)
    ? (r.operator as DetectionOperator)
    : "contains";
  if (!phase || !field) return null;
  return {
    id: typeof r.id === "string" && r.id ? r.id : `rule_${index}_${Math.random().toString(36).slice(2, 8)}`,
    name: typeof r.name === "string" && r.name ? r.name : `Rule ${index + 1}`,
    field,
    operator,
    value: typeof r.value === "string" ? r.value : "",
    phase,
    enabled: r.enabled !== false,
    priority: typeof r.priority === "number" ? r.priority : index,
  };
}

/** Parse + validate a configJson string. Invalid pieces fall back to defaults. */
export function parseRouterConfig(json: string): RouterConfigData {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return structuredClone(DEFAULT_ROUTER_CONFIG);
  }
  if (!raw || typeof raw !== "object") return structuredClone(DEFAULT_ROUTER_CONFIG);
  const obj = raw as Partial<RouterConfigData> & { routes?: unknown; rules?: unknown };

  const routes = {} as Record<RouteKey, RouteTarget>;
  const rawRoutes = (obj.routes && typeof obj.routes === "object" ? obj.routes : {}) as Record<
    string,
    unknown
  >;
  for (const key of ROUTE_KEYS) {
    routes[key] = sanitizeRoute(rawRoutes[key], DEFAULT_ROUTER_CONFIG.routes[key]);
  }

  const rawRules = Array.isArray(obj.rules) ? obj.rules : [];
  const rules = rawRules
    .map((r, i) => sanitizeRule(r, i))
    .filter((r): r is DetectionRule => r !== null)
    .sort((a, b) => a.priority - b.priority)
    .map((r, i) => ({ ...r, priority: i })); // renumber contiguously

  return { version: 1, routes, rules };
}

/** Get the active config, seeding defaults on first access. */
export async function getOrCreateRouterConfig(): Promise<{
  id: string;
  version: number;
  data: RouterConfigData;
}> {
  const existing = await db.routerConfig.findFirst({
    where: { isActive: true },
    orderBy: { updatedAt: "desc" },
  });
  if (existing) {
    return { id: existing.id, version: existing.version, data: parseRouterConfig(existing.configJson) };
  }
  const created = await db.routerConfig.create({
    data: {
      isActive: true,
      configJson: JSON.stringify(DEFAULT_ROUTER_CONFIG),
    },
  });
  return { id: created.id, version: created.version, data: structuredClone(DEFAULT_ROUTER_CONFIG) };
}
