# LLM Harness

**Self-hosted visual workflow builder for coding agents.**

Build your own AI coding harness — visually orchestrate multiple LLMs, conditions, and tools
behind a single Anthropic-compatible gateway that [Claude Code](https://docs.anthropic.com/en/docs/claude-code)
(or any Anthropic-API-compatible client) talks to.

> Think "n8n for LLMs" — the developer keeps using Claude Code as their daily driver,
> and your harness decides *who* plans, *who* executes, *who* reviews, *when* to escalate,
> and *when* to ask for human approval.

---

## What it does

```
DEVELOPER
   │
   ▼
CLAUDE CODE                  ← unchanged developer experience
   │  Anthropic API
   ▼
LLM HARNESS                  ← this project (your localhost)
   │  - Canvas (build the workflow visually)
   │  - Engine (traverses the graph per request)
   │  - Gateway (Anthropic-compatible /v1/messages + /v1/models)
   │
   ├──► Anthropic (Claude)
   ├──► Z.ai (GLM)
   ├──► DeepSeek
   ├──► OpenRouter
   ├──► OpenAI
   ├──► Moonshot (Kimi)
   ├──► Google (Gemini)
   └──► Ollama (local)
```

You build a **Harness** (a directed graph of nodes) on the visual canvas, click **Deploy**,
and from that moment every request Claude Code sends to `localhost:3000/api/v1/messages`
flows through your graph.

---

## Features (Phase 1)

### Canvas
- **React Flow** visual editor with custom node types
- Drag, connect, branch — like n8n
- Auto-save + Deploy buttons per harness
- Export harness as JSON (share, version in Git)

### Node types
| Node | Purpose |
|---|---|
| **Trigger** | Entry point — receives the request from Claude Code |
| **Model** | Calls an LLM via a credential; supports temperature, max_tokens, top_p, system prompt, extended thinking |
| **Condition** | IF-style branch on a variable (`score > 7`, `tokens > 100000`, `approved == true`, ...) — emits TRUE / FALSE handles |
| **End** | Terminates the workflow; the last assistant message becomes the response |

### Credentials (n8n-style)
- Create a credential per provider (Anthropic, Z.ai, DeepSeek, OpenRouter, OpenAI, Moonshot, Gemini, Ollama, custom)
- API keys are encrypted at rest with **AES-256-GCM** (`HARNESS_ENCRYPTION_KEY`)
- "Discover models" button fetches the provider's `/v1/models` and caches them
- Pick models directly inside a Model node on the canvas

### Gateway (Anthropic-compatible)
- `POST /api/v1/messages` — full Anthropic Messages API surface
- `GET /api/v1/models` — list models from all configured credentials
- **SSE streaming** support — Claude Code receives tokens incrementally
- Optional auth via `HARNESS_API_KEY`

### Executions & Replay
- Every request creates an `Execution` row with full input/output
- Per-node `NodeRun` log: input, output, model used, tokens (in/out), cost, latency
- Dashboard shows the per-node replay — click any node to expand its I/O

---

## Quick start (local dev)

```bash
# 1. Install deps
bun install

# 2. Set up env vars
cp .env.example .env
# Generate an encryption key for storing API keys at rest:
openssl rand -hex 32
# Paste it into .env as HARNESS_ENCRYPTION_KEY

# 3. Push DB schema
bun run db:push

# 4. Start dev server
bun run dev
# → http://localhost:3000
```

Open the UI, create a credential (Anthropic or Z.ai works great), click **Discover**,
then go to the **Harnesses** tab and click **New Harness**. Wire up:
`Trigger → Model (Planner) → Model (Executor) → End`. Click **Deploy**.

Then in another terminal:

```bash
export ANTHROPIC_BASE_URL=http://localhost:3000/api/v1
export ANTHROPIC_API_KEY=<your HARNESS_API_KEY from .env, or any value if empty>
claude
```

Type something — and watch the execution show up in the **Executions** tab.

---

## Quick start (Docker — production-style)

```bash
docker compose up -d
# → http://localhost:3000
```

The compose file starts:
- The Next.js app (UI + Gateway + Engine, all in one process for MVP)
- A volume for SQLite persistence

See [`docker-compose.yml`](./docker-compose.yml).

---

## Configuration (.env)

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | yes | `file:./db/custom.db` | Prisma datasource. SQLite file by default; swap for `postgres://...` for multi-process. |
| `HARNESS_ENCRYPTION_KEY` | **prod: yes** | dev fallback | 32+ char hex string used to encrypt API keys at rest. **Set this in production.** Generate with `openssl rand -hex 32`. |
| `HARNESS_API_KEY` | optional | (disabled) | If set, Claude Code must send this as `x-api-key` or `Authorization: Bearer`. |
| `PORT` | optional | `3000` | HTTP port for the UI and gateway. |

---

## Project structure

```
src/
├── app/
│   ├── page.tsx                  # Main SPA with tabs (Harnesses / Credentials / Executions / Settings)
│   ├── api/
│   │   ├── credentials/         # CRUD + model discovery
│   │   ├── harnesses/            # CRUD + deploy
│   │   ├── executions/           # List + detail (replay)
│   │   ├── settings/             # Gateway status
│   │   └── v1/
│   │       └── messages/         # Anthropic-compatible gateway (POST + GET)
│   └── layout.tsx
├── components/
│   ├── harness/
│   │   ├── canvas.tsx            # React Flow canvas + custom node types + palette
│   │   ├── credentials-view.tsx  # n8n-style credential manager
│   │   ├── harness-editor.tsx    # Editor wrapping canvas + node panel + toolbar
│   │   ├── node-config-panel.tsx # Side panel for editing selected node
│   │   ├── executions-view.tsx   # Execution list + replay
│   │   └── settings-view.tsx     # Gateway status + setup instructions
│   └── providers.tsx             # React Query provider
├── lib/
│   ├── adapters/
│   │   ├── anthropic.ts          # Native Anthropic Messages API adapter
│   │   ├── openai-compatible.ts   # Z.ai / DeepSeek / OpenRouter / Ollama / ...
│   │   └── registry.ts           # Credential → adapter mapping + provider presets
│   ├── workflow/
│   │   ├── types.ts              # All shared types (Workflow, Node, Message, ...)
│   │   └── engine.ts            # Graph traversal, node execution, NodeRun logging
│   ├── crypto.ts                 # AES-256-GCM encrypt/decrypt
│   ├── db.ts                     # Prisma client
│   └── api.ts                    # Frontend API client
└── prisma/
    └── schema.prisma             # Credential, ProviderModel, Harness, Execution, NodeRun
```

---

## Architecture

```
Claude Code request (Anthropic format)
   │
   ▼
Gateway  POST /api/v1/messages
   │  - Auth via HARNESS_API_KEY
   │  - Find deployed Harness
   │  - Create Execution row
   ▼
Engine   executeWorkflow(graph, inputMessages)
   │  - Find Trigger node
   │  - For each node:
   │      Model      → adapter.stream() → SSE chunks back to client
   │      Condition  → evaluate field op value → pick TRUE/FALSE edge
   │      End        → terminate
   │  - Log every node to NodeRun row
   ▼
Adapter  (Anthropic | OpenAI-compatible)
   │  - Translates messages
   │  - Streams tokens via fetch ReadableStream
   ▼
Provider  (Z.ai | DeepSeek | Anthropic | OpenRouter | ...)
```

### Why single-process for the MVP?

For Phase 1 (synchronous traversal, no Human Approval nodes), one Next.js process
handles UI + Gateway + Engine. The only reason to split workers in Phase 2 is
pause/resume for human-in-the-loop flows.

---

## Roadmap

### Phase 2 (next)
- **Router node** — split task by domain (backend / frontend / infra)
- **Reviewer node** — structured JSON output (approved / score / issues)
- **Security node** — run Semgrep / Gitleaks / npm audit as subprocess
- **Context node** — load CLAUDE.md / README / Git history
- **Human Approval node** — pause execution, resume via Redis pub/sub
- **Replay** in the canvas (highlight nodes as they execute)

### Phase 3
- **MCP node** — call any MCP server
- **Test runner node** — run pytest / vitest / cargo test
- **Provider discovery** — auto-poll `/v1/models` periodically
- **Multi-worker** — separate worker process for long-running harnesses
- **Harness versioning** — versioned graphs with rollback
- **Marketplace** — share harnesses as JSON files

---

## Security notes

- API keys are encrypted at rest with AES-256-GCM. **Always set `HARNESS_ENCRYPTION_KEY`** in production.
- The gateway accepts requests from any origin by default. For dev this is fine; for shared deployments, put it behind a reverse proxy with auth.
- `HARNESS_API_KEY` is a simple shared secret. Use a strong random value (e.g. `openssl rand -hex 32`).
- The DB file at `db/custom.db` contains your encrypted credentials — back it up but treat it as secret.

---

## License

MIT — see [LICENSE](./LICENSE).

## Contributing

PRs welcome. This is a Phase 1 MVP — see the Roadmap section above for what's planned next.
