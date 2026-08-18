# LLM Harness — production Dockerfile
# Multi-stage build to keep the final image small.

# ── Stage 1: deps ──
FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

# ── Stage 2: build ──
FROM oven/bun:1 AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Generate Prisma client + push schema (creates the SQLite file)
RUN bun run db:generate
RUN bun run build

# ── Stage 3: runner ──
FROM oven/bun:1 AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV DATABASE_URL=file:/app/db/custom.db
RUN mkdir -p /app/db

# Copy only what we need from the builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000
# Next.js 16 standalone server
CMD ["bun", "run", "start"]
