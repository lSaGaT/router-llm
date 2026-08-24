#!/usr/bin/env bash
set -e

echo "🚀 Configurando o projeto..."
echo ""

# ── 1. Instalar dependências ──
echo "📦 Instalando dependências..."
if command -v bun &> /dev/null; then
  bun install
elif command -v npm &> /dev/null; then
  npm install
else
  echo "❌ Bun ou npm não encontrado. Instale o Bun: https://bun.sh"
  exit 1
fi
echo ""

# ── 2. Criar .env ──
if [ -f .env ]; then
  echo "⚠️  Arquivo .env já existe. Pulando criação."
else
  echo "🔧 Criando arquivo .env..."
  cp .env.example .env

  # Gerar chave de criptografia
  KEY=$(openssl rand -hex 32)
  sed -i.bak "s/^HARNESS_ENCRYPTION_KEY=.*/HARNESS_ENCRYPTION_KEY=$KEY/" .env
  rm -f .env.bak
  echo "✅ Chave de criptografia gerada e inserida no .env."
fi
echo ""

# ── 3. Gerar Prisma Client ──
echo "⚙️  Gerando Prisma Client..."
npx prisma generate
echo ""

# ── 4. Configurar banco de dados ──
echo "🗄️  Configurando banco de dados..."
npx prisma db push --accept-data-loss
echo ""

# ── Pronto ──
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Tudo pronto!"
echo ""
echo "👉 Abra o arquivo .env e preencha as informações"
echo "   que precisar (HARNESS_API_KEY, PORT, etc)."
echo ""
echo "👉 Para iniciar em modo desenvolvimento:"
echo "   bun run dev"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
