# LLM Router

**Self-hosted phase-based LLM switching engine for Claude Code.**

Runs a transparent Anthropic-compatible gateway on `localhost:3000` that intercepts every request
Claude Code sends, detects which *phase* the agent is in (planning, executing, reviewing, utility),
and routes it to the best LLM for that phase — all transparently.

> Think "traffic controller for LLMs" — Claude Code keeps working as usual, and your router
> decides *which brain* handles each phase, swapping models on the fly without any client-side changes.

---

## How it works

```
DEVELOPER
   │
   ▼
CLAUDE CODE                  ← unchanged developer experience
   │  Anthropic API
   ▼
LLM ROUTER                   ← this project (your localhost)
   │  - Phase Detection (rules on model/tools/system prompt)
   │  - Protocol Dispatch (anthropic passthrough / openai_compat translation)
   │  - Proxy (transparent SSE pass-through + usage tracking)
   │
   ├──► Anthropic (Claude)
   ├──► Z.ai (GLM)
   ├──► DeepSeek
   ├──► OpenRouter
   ├──► OpenAI
   ├──► xAI (Grok)
   ├──► MiniMax
   ├──► Moonshot (Kimi)
   ├──► Mistral
   ├──► Google (Gemini)
   ├──► Groq
   ├──► Together AI
   ├──► Perplexity
   ├──► Cohere
   ├──► Fireworks AI
   ├──► Novita AI
   ├──► AI21 Labs
   ├──► Ollama (local)
   ├──► LM Studio (local)
   └──► vLLM / SGLang / Custom
```

When Claude Code sends `POST /api/v1/messages`, the router:

1. **Detects the phase** — evaluates configurable detection rules (model name, tools, system prompt, messages) in priority order.
2. **Resolves the route** — maps the phase to a credential + model + optional thinking override.
3. **Dispatches by protocol** — `anthropic` credentials pass through byte-intact; `openai_compat` credentials translate the request/response (tools, streaming, usage).
4. **Streams transparently** — SSE chunks flow to Claude Code unchanged; usage/cost is extracted passively for the execution log.

---

## Features

### Phase Router
- **5 route slots**: PLAN, EXECUTE, REVIEW, UTILITY, FALLBACK
- Each slot maps to a **credential + model** — pick different LLMs for different phases
- **Thinking override** per route: preserve, disable, or set a custom budget
- Visual configuration via the **Router** tab in the UI

### Detection Rules
- Configurable rules evaluated in **priority order** (first match wins)
- Match against: **model name**, **tools**, **system prompt**, or **last messages**
- Operators: **contains**, **regex**, **equals** (case-insensitive)
- Default rules out of the box:
  - `ExitPlanMode` tool present → PLAN phase
  - `haiku` in model name → UTILITY phase
  - Review-related system prompt → REVIEW phase
  - Everything else → EXECUTE (fallback)

### Multi-Protocol Gateway
- `POST /api/v1/messages` — Anthropic Messages API surface
- `POST /api/v1/messages/count_tokens` — token counting passthrough
- `GET /api/v1/models` — list models from all configured credentials
- **Two wire protocols**:
  - `anthropic` — native Anthropic Messages API (passes through untouched)
  - `openai_compat` — OpenAI Chat Completions API (translated to/from Anthropic format)
- **SSE streaming** with passive usage extraction (tokens, cost, latency)
- Optional auth via `HARNESS_API_KEY`

### Credentials (n8n-style)
- Create a credential per provider with a **preset** (base URL, known models, docs link)
- **20+ provider presets**: Anthropic, Z.ai, DeepSeek, OpenAI, xAI, MiniMax, Moonshot, Mistral, Gemini, Groq, Together AI, Perplexity, Cohere, Fireworks AI, Novita AI, AI21 Labs, OpenRouter, Ollama, LM Studio, vLLM
- API keys encrypted at rest with **AES-256-GCM** (`HARNESS_ENCRYPTION_KEY`)
- **Discover models** button fetches `/v1/models` and caches them
- **Protocol badge** shows whether a credential uses Anthropic or OpenAI-compatible protocol

### Executions & Replay
- Every request creates an `Execution` row with full request/response summaries
- **Phase routing metadata**: which phase was detected, which rule matched, what model was used
- Token counts (in/out), cost estimate, duration, status
- Dashboard shows the per-execution detail

### Internationalization
- **3 languages**: Portuguese (pt-BR), English, Spanish
- Language switcher in the header

### Security
- **PIN lock screen** to protect credentials when stepping away
- Auto-lock after configurable inactivity (1m, 5m, 15m, 1h)
- API keys encrypted at rest with AES-256-GCM

---

## Quick start (local dev)

### 1. Install deps and configure the .env

```bash
bun install
```

Create the `.env` file at the project root:

```bash
cp .env.example .env
```

Then generate an encryption key and paste it into `.env`:

```bash
openssl rand -hex 32
```

Your final `.env` should look like this:

```env
DATABASE_URL=file:./db/custom.db

# Encryption key for API keys at rest (AES-256-GCM).
# Generated with: openssl rand -hex 32
HARNESS_ENCRYPTION_KEY=<paste the hex key here>

# Optional: auth key for the gateway.
# If set, Claude Code must send this as x-api-key or Authorization: Bearer.
# Leave empty for local dev (no auth required).
HARNESS_API_KEY=
```

### 2. Push DB schema and start

```bash
bun run db:push
bun run dev
# → http://localhost:3000
```

### 3. Configure credentials in the UI

Open the UI, go to **Credenciais**, create a credential (the "Z.ai (GLM) — Anthropic API" preset works great), then go to **Router** and assign credentials to each phase. Click **Save**.

### 4. Configure Claude Code (`~/.claude/settings.json`)

> ⚠️ **Atenção**: os nomes das variáveis e o caminho da URL são diferentes do que muitos tutoriais mostram. Siga exatamente como descrito abaixo.

Abra o arquivo `~/.claude/settings.json` e adicione (ou substitua) o bloco `env` dentro dele:

```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "http://127.0.0.1:3000/api",
    "ANTHROPIC_AUTH_TOKEN": "qualquer-valor-aqui",
    "API_TIMEOUT_MS": "1000000"
  }
}
```

**Detalhes importantes:**

| Campo | Valor | Por quê |
|---|---|---|
| `ANTHROPIC_BASE_URL` | `http://127.0.0.1:3000/api` | O Claude Code acrescenta `/v1/messages` automaticamente. **Não** use `/api/v1` — resultaria em `/api/v1/v1/messages` (duplo). |
| `ANTHROPIC_AUTH_TOKEN` | qualquer valor | O Claude Code envia isso como header de auth. Se `HARNESS_API_KEY` estiver vazio no `.env`, qualquer valor funciona. Se estiver definido, deve ser o mesmo valor. |
| `API_TIMEOUT_MS` | `1000000` | Timeout em milissegundos para requests longos (recomendado: ~16 minutos). Sem isso, o Claude Code pode cortar requests que demoram. |

> ❗ **Não use** `ANTHROPIC_API_KEY` — o Claude Code usa `ANTHROPIC_AUTH_TOKEN` para o header.
> ❗ **Não use** `ANTHROPIC_BASE_URL` apontando para `/api/v1` — o path final ficaria duplicado.

### 5. Teste!

Abra o Claude Code em outro terminal:

```bash
claude
```

Digite algo — e veja a execução aparecer na aba **Execuções** do LLM Router.

---

## Quick start (Docker — production-style)

```bash
docker compose up -d
# → http://localhost:3000
```

The compose file starts:
- The Next.js app (UI + Gateway + Engine, all in one process)
- A volume for SQLite persistence

See [`docker-compose.yml`](./docker-compose.yml).

---

## Configuration (.env)

### Como criar o `.env`

```bash
# Copie o exemplo
 cp .env.example .env

# Gere a chave de criptografia
openssl rand -hex 32

# Cole o resultado no .env como HARNESS_ENCRYPTION_KEY
```

### Variáveis do `.env` (servidor)

| Variável | Obrigatória | Padrão | Descrição |
|---|---|---|---|
| `DATABASE_URL` | sim | `file:./db/custom.db` | Prisma datasource. SQLite por padrão; troque para `postgres://...` se precisar de multi-process. |
| `HARNESS_ENCRYPTION_KEY` | **prod: sim** | fallback de dev | String hex de 32+ chars para criptografar API keys em repouso. **Defina em produção.** Gere com `openssl rand -hex 32`. |
| `HARNESS_API_KEY` | opcional | (desabilitado) | Se definido, o Claude Code deve enviar como `x-api-key` ou `Authorization: Bearer`. |
| `PORT` | opcional | `3000` | Porta HTTP para a UI e o gateway. |
| `ROUTER_UPSTREAM_TIMEOUT_MS` | opcional | `600000` | Timeout (ms) para requests upstream. Padrão: 10 minutos. |

### Variáveis do `~/.claude/settings.json` (cliente Claude Code)

Estas variáveis ficam no **lado do cliente** (no seu computador), dentro do `settings.json` do Claude Code:

| Variável | Valor esperado | Descrição |
|---|---|---|
| `ANTHROPIC_BASE_URL` | `http://127.0.0.1:3000/api` | URL base do gateway. O Claude Code adiciona `/v1/messages` automaticamente — **não** inclua `/v1` na URL. |
| `ANTHROPIC_AUTH_TOKEN` | qualquer valor | Token de auth. Deve coincidir com `HARNESS_API_KEY` no `.env` (ou qualquer valor se `HARNESS_API_KEY` estiver vazio). |
| `API_TIMEOUT_MS` | `1000000` | Timeout em ms para requests longos (~16 min). Evita que o Claude Code corte requests demorados. |

---

## Project structure

```
src/
├── app/
│   ├── page.tsx                  # Main SPA with tabs (Router / Credentials / Executions / Settings)
│   ├── api/
│   │   ├── credentials/          # CRUD + model discovery
│   │   ├── router/               # Router config CRUD
│   │   ├── executions/           # List + detail
│   │   ├── settings/             # Gateway status
│   │   └── v1/
│   │       ├── messages/         # Anthropic-compatible gateway (POST + GET)
│   │       └── models/           # GET /api/v1/models
│   └── layout.tsx
├── components/
│   ├── harness/
│   │   ├── router-view.tsx       # Phase router configuration (routes + detection rules)
│   │   ├── credentials-view.tsx  # n8n-style credential manager with protocol badges
│   │   ├── executions-view.tsx   # Execution list + detail
│   │   ├── settings-view.tsx     # Gateway status + setup instructions
│   │   ├── lock-screen.tsx       # PIN lock screen
│   │   ├── lock-button.tsx       # Lock/unlock button
│   │   ├── theme-toggle.tsx      # Dark/light mode toggle
│   │   └── language-switcher.tsx # i18n language selector
│   ├── ui/                       # shadcn/ui components
│   └── providers.tsx             # React Query provider
├── lib/
│   ├── router/
│   │   ├── types.ts              # Phase, route, detection rule types + defaults
│   │   ├── config.ts             # RouterConfig persistence + validation
│   │   ├── detect.ts             # Phase detection (extract signals, evaluate rules)
│   │   ├── proxy.ts              # Transparent proxy — the core request handler
│   │   ├── protocol.ts           # Wire protocol resolution (anthropic vs openai_compat)
│   │   └── translate/
│   │       ├── types.ts          # Shared translation types (Anthropic request/response)
│   │       ├── request.ts        # Anthropic → OpenAI request translation
│   │       ├── response.ts       # OpenAI → Anthropic response translation
│   │       └── sse.ts            # OpenAI SSE → Anthropic SSE stream translation
│   ├── adapters/
│   │   ├── anthropic.ts          # Native Anthropic Messages API adapter
│   │   ├── openai-compatible.ts  # OpenAI Chat Completions adapter
│   │   ├── registry.ts           # Provider presets + credential → adapter mapping
│   │   └── types.ts              # Adapter interface
│   ├── i18n/
│   │   ├── translations.ts       # pt-BR, en, es translation dictionaries
│   │   └── provider.ts           # React context for locale
│   ├── crypto.ts                 # AES-256-GCM encrypt/decrypt
│   ├── db.ts                     # Prisma client
│   └── api.ts                    # Frontend API client
└── prisma/
    └── schema.prisma             # Credential, ProviderModel, Execution, RouterConfig
```

---

## Architecture

```
Claude Code request (Anthropic format)
   │
   ▼
Gateway  POST /api/v1/messages
   │  - Auth via HARNESS_API_KEY (optional)
   │  - Parse + summarize request body
   ▼
Phase Detection  detectPhase(signals, rules)
   │  - Extract signals: model, tools, system prompt, messages
   │  - Evaluate rules in priority order; first match wins
   │  - Phase → route target (credential + model + thinking override)
   ▼
Protocol Dispatch
   │  ┌─ anthropic ─────────────────────────────────────────────┐
   │  │  Pass through byte-intact (tools, thinking, SSE, etc.)  │
   │  └─────────────────────────────────────────────────────────┘
   │  ┌─ openai_compat ─────────────────────────────────────────┐
   │  │  Translate request: Anthropic → OpenAI Chat Completions │
   │  │  Translate stream:  OpenAI SSE → Anthropic SSE          │
   │  │  Translate errors:  OpenAI error shape → Anthropic      │
   │  └─────────────────────────────────────────────────────────┘
   ▼
Upstream Provider  (fetch + SSE pass-through)
   │  - Passive usage scanner reads tokens/cost from stream
   │  - Bytes flow through TransformStream untouched
   ▼
Execution Log  (DB row with phase, rule, model, tokens, cost, duration)
   │
   ▼
Response back to Claude Code (Anthropic format)
```

---

## Supported Providers

| Provider | Protocol | Discovery | Preset |
|---|---|---|---|
| **Anthropic** (Claude) | anthropic | — | ✅ |
| **Z.ai** (GLM) — Anthropic API | anthropic | — | ✅ |
| **Z.ai** (GLM) — OpenAI API | openai_compat | ✅ | ✅ |
| **DeepSeek** — OpenAI API | openai_compat | ✅ | ✅ |
| **DeepSeek** — Anthropic API | anthropic | — | ✅ |
| **OpenAI** | openai_compat | ✅ | ✅ |
| **xAI** (Grok) | openai_compat | ✅ | ✅ |
| **MiniMax** | openai_compat | ✅ | ✅ |
| **Moonshot** (Kimi) | openai_compat | ✅ | ✅ |
| **Mistral** | openai_compat | ✅ | ✅ |
| **Google** (Gemini) — OpenAI API | openai_compat | ✅ | ✅ |
| **Google** (Gemini) — Anthropic API | anthropic | — | ✅ |
| **Groq** | openai_compat | ✅ | ✅ |
| **Together AI** | openai_compat | ✅ | ✅ |
| **Perplexity** (sonar) | openai_compat | ✅ | ✅ |
| **Cohere** (Command) | openai_compat | ✅ | ✅ |
| **Fireworks AI** | openai_compat | ✅ | ✅ |
| **Novita AI** | openai_compat | ✅ | ✅ |
| **AI21 Labs** (Jamba) | openai_compat | ✅ | ✅ |
| **OpenRouter** | openai_compat | ✅ | ✅ |
| **Ollama** (local) | openai_compat | ✅ | ✅ |
| **LM Studio** (local) | openai_compat | ✅ | ✅ |
| **vLLM / SGLang / Custom** | openai_compat | ✅ | ✅ |

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
- The PIN lock screen is local-only (client-side) — it protects against casual access, not determined attackers.

---

## License

MIT — see [LICENSE](./LICENSE).

## Contributing

PRs welcome. See the Roadmap section above for what's planned next.
