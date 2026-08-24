@echo off
echo ============================================
echo   Configurando o projeto...
echo    ____   ___  _   _ _____ _____ ____    _     _     __  __ 
echo   |  _ \ / _ \| | | |_   _| ____|  _ \  | |   | |   |  \/  |
echo   | |_) | | | | | | | | | |  _| | |_) | | |   | |   | |\/| |
echo   |  _ <| |_| | |_| | | | | |___|  _ <  | |___| |___| |  | |
echo   |_| \_\\___/ \___/  |_| |_____|_| \_\ |_____|_____|_|  |_|
echo ============================================
echo.

REM ── 1. Instalar dependências ──
echo [1/4] Instalando dependencias...
where bun >nul 2>&1
if %errorlevel%==0 (
  call bun install
) else (
  where npm >nul 2>&1
  if %errorlevel%==0 (
    call npm install
  ) else (
    echo ❌ Bun ou npm nao encontrado.
    echo    Instale o Bun: https://bun.sh
    exit /b 1
  )
)
echo.

REM ── 2. Criar .env ──
if exist .env (
  echo [2/4] Arquivo .env ja existe. Pulando criacao.
) else (
  echo [2/4] Criando arquivo .env...
  copy .env.example .env >nul

  REM Gerar chave de criptografia usando Node.js
  for /f "delims=" %%i in ('node -e "process.stdout.write(require('crypto').randomBytes(32).toString('hex'))"') do set KEY=%%i

  REM Substituir a chave no .env usando PowerShell
  powershell -Command "(Get-Content .env) -replace '^HARNESS_ENCRYPTION_KEY=.*', 'HARNESS_ENCRYPTION_KEY=%KEY%' | Set-Content .env"

  echo ✅ Chave de criptografia gerada e inserida no .env.
)
echo.

REM ── 3. Gerar Prisma Client ──
echo [3/4] Gerando Prisma Client...
call npx prisma generate
echo.

REM ── 4. Configurar banco de dados ──
echo [4/4] Configurando banco de dados...
call npx prisma db push --accept-data-loss
echo.

REM ── Pronto ──
echo ============================================
echo   ✅ Tudo pronto!
echo    ____   ___  _   _ _____ _____ ____    _     _     __  __ 
echo   |  _ \ / _ \| | | |_   _| ____|  _ \  | |   | |   |  \/  |
echo   | |_) | | | | | | | | | |  _| | |_) | | |   | |   | |\/| |
echo   |  _ <| |_| | |_| | | | | |___|  _ <  | |___| |___| |  | |
echo   |_| \_\\___/ \___/  |_| |_____|_| \_\ |_____|_____|_|  |_|
echo    ___ _   _ ____ _____  _    _        _    ____   ___  
echo   |_ _| \ | / ___|_   _|/ \  | |      / \  |  _ \ / _ \ 
echo    | ||  \| \___ \ | | / _ \ | |     / _ \ | | | | | | |
echo    | || |\  |___) || |/ ___ \| |___ / ___ \| |_| | |_| |
echo   |___|_| \_|____/ |_/_/   \_\_____/_/   \_\____/ \___/
echo.
echo   ^> Abra o arquivo .env e preencha as
echo     informacoes que precisar.
echo.
echo   ^> Para iniciar:
echo     bun run dev
echo ============================================
pause
