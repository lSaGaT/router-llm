/**
 * E2E harness for the openai_compat translation path — runs against a dev
 * server (default http://127.0.0.1:3001) and the mock upstream on :8787.
 *
 * Creates a throwaway mock credential, points the EXECUTE route at it for
 * each scenario model, sends Anthropic-shaped requests through the gateway,
 * and checks the translated Anthropic output. Restores the original router
 * config at the end (best effort).
 *
 * Run: bun scripts/e2e-mock.ts [baseUrl]
 */
const BASE = process.argv[2] ?? "http://127.0.0.1:3001";

let failures = 0;
function check(name: string, ok: boolean, extra = ""): void {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? ` — ${extra}` : ""}`);
  if (!ok) failures++;
}

async function jfetch(path: string, init?: RequestInit): Promise<any> {
  const res = await fetch(`${BASE}${path}`, init);
  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* keep text */
  }
  return { status: res.status, json, text };
}

// 1. Create the mock credential
const created = await jfetch("/api/credentials", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    name: "E2E Mock (auto)",
    providerKey: "openai_compatible",
    providerLabel: "DeepSeek", // any openai_compatible preset; baseUrl overrides
    baseUrl: "http://127.0.0.1:8787/v1",
    apiKey: "mock-key-e2e",
    autoDiscover: true,
  }),
});
const credId = created.json?.id;
if (!credId) {
  console.error("credential creation failed:", created.status, created.text?.slice(0, 300));
  process.exit(1);
}
check("credential created", true, `id=${credId} discovered=${created.json?.discoveredCount}`);
check("credential has protocol", created.json?.protocol !== undefined, `protocol=${created.json?.protocol}`);

// 2. Save current router config
const routerBefore = await jfetch("/api/router");
const originalConfig = routerBefore.json?.config;
if (!originalConfig) {
  console.error("could not read router config:", routerBefore.status, routerBefore.text?.slice(0, 200));
  process.exit(1);
}

async function pointExecuteAt(modelId: string): Promise<void> {
  const cfg = JSON.parse(JSON.stringify(originalConfig));
  cfg.routes.EXECUTE = { credentialId: credId, modelId };
  const put = await jfetch("/api/router", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ config: cfg }),
  });
  if (put.status !== 200) throw new Error(`router PUT failed: ${put.status} ${put.text?.slice(0, 200)}`);
}

async function gateway(body: Record<string, unknown>): Promise<{ status: number; text: string }> {
  const res = await fetch(`${BASE}/api/v1/messages`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer e2e" },
    body: JSON.stringify(body),
  });
  return { status: res.status, text: await res.text() };
}

function parseSse(text: string): any[] {
  const events: any[] = [];
  for (const frame of text.split("\n\n")) {
    const dataLine = frame.split("\n").find((l) => l.startsWith("data: "));
    if (!dataLine) continue;
    try {
      events.push(JSON.parse(dataLine.slice(6)));
    } catch {
      /* ignore */
    }
  }
  return events;
}

try {
  // ─── Scenario 1: streaming text ───
  await pointExecuteAt("mock-text");
  const s1 = await gateway({
    model: "claude-sonnet-5",
    max_tokens: 100,
    stream: true,
    system: [{ type: "text", text: "You are a test.", cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: "hello" }],
  });
  const ev1 = parseSse(s1.text);
  const text1 = ev1
    .filter((e) => e.type === "content_block_delta" && e.delta?.type === "text_delta")
    .map((e) => e.delta.text)
    .join("");
  check("s1 stream status 200", s1.status === 200);
  check("s1 text joined", text1 === "Resposta de teste mock.", `got="${text1}"`);
  check("s1 message_start first", ev1[0]?.type === "message_start");
  check("s1 message_stop last", ev1.at(-1)?.type === "message_stop");
  const delta1 = ev1.find((e) => e.type === "message_delta");
  check("s1 usage translated", delta1?.usage?.input_tokens === 42 && delta1?.usage?.output_tokens === 7, JSON.stringify(delta1?.usage));
  check("s1 reasoning dropped", !s1.text.includes("internal reasoning"));
  check("s1 stop_reason end_turn", delta1?.delta?.stop_reason === "end_turn");

  // ─── Scenario 2: streaming tools (interleaved parallel) ───
  await pointExecuteAt("mock-tools");
  const s2 = await gateway({
    model: "claude-sonnet-5",
    max_tokens: 200,
    stream: true,
    tools: [
      { name: "Read", description: "read", input_schema: { type: "object" } },
      { name: "Grep", description: "grep", input_schema: { type: "object" } },
    ],
    messages: [{ role: "user", content: "leia e procure" }],
  });
  const ev2 = parseSse(s2.text);
  const toolStarts = ev2.filter((e) => e.type === "content_block_start" && e.content_block?.type === "tool_use");
  const jsonDeltas = ev2.filter((e) => e.type === "content_block_delta" && e.delta?.type === "input_json_delta");
  check("s2 two tool_use blocks", toolStarts.length === 2, `got ${toolStarts.length}`);
  const argsConcat = jsonDeltas.map((e) => e.delta.partial_json).join("");
  check("s2 tool args complete", argsConcat === '{"path":"a.ts"}{"pattern":"router"}', JSON.stringify(argsConcat));
  const delta2 = ev2.find((e) => e.type === "message_delta");
  check("s2 stop_reason tool_use (override from stop)", delta2?.delta?.stop_reason === "tool_use", delta2?.delta?.stop_reason);

  // ─── Scenario 3: non-streaming ───
  await pointExecuteAt("mock-nostream");
  const s3 = await gateway({
    model: "claude-sonnet-5",
    max_tokens: 100,
    messages: [{ role: "user", content: "oi" }],
  });
  let j3: any = null;
  try {
    j3 = JSON.parse(s3.text);
  } catch {
    /* fail below */
  }
  check("s3 anthropic shape", j3?.type === "message" && j3?.role === "assistant", s3.text.slice(0, 120));
  check("s3 usage mapped", j3?.usage?.input_tokens === 11 && j3?.usage?.output_tokens === 9, JSON.stringify(j3?.usage));
  check("s3 reasoning dropped", !s3.text.includes("dropped"));
  check("s3 text content", j3?.content?.[0]?.text === "Resposta não-streamada do mock.");

  // ─── Scenario 4: 400 stream_options retry ───
  await pointExecuteAt("mock-400");
  const s4 = await gateway({
    model: "claude-sonnet-5",
    max_tokens: 100,
    stream: true,
    messages: [{ role: "user", content: "oi" }],
  });
  // After retry without stream_options the mock still 400s (model name still
  // matches), but the body must now be an Anthropic-shaped error.
  let j4: any = null;
  try {
    j4 = JSON.parse(s4.text);
  } catch {
    /* sse error frames are not pure json */
  }
  const s4anthropicError = s4.text.includes('"type":"error"') || j4?.type === "error";
  check("s4 status 400", s4.status === 400);
  check("s4 anthropic error shape", s4anthropicError, s4.text.slice(0, 160));

  // ─── Scenario 5: upstream 500 → translated error ───
  await pointExecuteAt("mock-error");
  const s5 = await gateway({
    model: "claude-sonnet-5",
    max_tokens: 100,
    messages: [{ role: "user", content: "oi" }],
  });
  let j5: any = null;
  try {
    j5 = JSON.parse(s5.text);
  } catch {
    /* fail below */
  }
  check("s5 status 500", s5.status === 500);
  check("s5 anthropic error shape", j5?.type === "error" && j5?.error?.message === "mock upstream exploded", s5.text.slice(0, 160));
} finally {
  // 3. Restore original config
  if (originalConfig) {
    await jfetch("/api/router", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ config: originalConfig }),
    }).catch(() => undefined);
    console.log("router config restored");
  }
  // 4. Remove the throwaway credential
  if (credId) {
    await fetch(`${BASE}/api/credentials/${credId}`, { method: "DELETE" }).catch(() => undefined);
    console.log("mock credential deleted");
  }
}

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
