#!/usr/bin/env python3
"""Add dragHint to canvas.palette and the full auth section to each locale in translations.ts."""

import re
from pathlib import Path

PATH = Path("/home/z/my-project/src/lib/i18n/translations.ts")
src = PATH.read_text()

DRAG_HINTS = {
    "pt-BR": 'Arraste para o canvas ou clique para adicionar.',
    "en":    'Drag to the canvas or click to add.',
    "es":    'Arrastra al canvas o haz clic para añadir.',
}

AUTH_TRANSLATIONS = {
    "pt-BR": {
        "lockTitle": "Aplicativo travado",
        "lockSubtitle": "Digite seu PIN para destravar e continuar.",
        "pinPlaceholder": "••••",
        "unlock": "Destravar",
        "wrongPin": "PIN incorreto. Tente novamente.",
        "setupTitle": "Criar PIN de acesso",
        "setupSubtitle": "Proteja suas credenciais com um PIN local. Você precisará digitá-lo para destravar o app.",
        "setupPin": "Novo PIN (mínimo 4 dígitos)",
        "setupConfirm": "Confirmar PIN",
        "setupCreate": "Criar PIN",
        "setupMismatch": "Os PINs não coincidem.",
        "setupTooShort": "O PIN deve ter pelo menos 4 dígitos.",
        "noPinSkip": "Pular (não recomendado)",
        "noPinSkipHint": "Suas credenciais ficarão acessíveis a qualquer pessoa que usar este computador.",
        "lockButton": "Travar",
        "lockButtonTitle": "Travar aplicativo",
        "pinSection": "Proteção local",
        "pinSectionDesc": "Defina um PIN para travar o aplicativo. Útil quando você precisa sair do computador e não quer que outras pessoas vejam suas credenciais.",
        "setPin": "Definir PIN",
        "changePin": "Alterar PIN",
        "removePin": "Remover PIN",
        "pinActive": "PIN ativo",
        "pinInactive": "Sem PIN configurado",
        "autoLock": "Travar automaticamente",
        "autoLockDesc": "Trava o app após um período de inatividade.",
        "autoLockNever": "Nunca",
        "autoLock1m": "1 minuto",
        "autoLock5m": "5 minutos",
        "autoLock15m": "15 minutos",
        "autoLock60m": "1 hora",
    },
    "en": {
        "lockTitle": "App locked",
        "lockSubtitle": "Enter your PIN to unlock and continue.",
        "pinPlaceholder": "••••",
        "unlock": "Unlock",
        "wrongPin": "Wrong PIN. Try again.",
        "setupTitle": "Create access PIN",
        "setupSubtitle": "Protect your credentials with a local PIN. You'll need to enter it to unlock the app.",
        "setupPin": "New PIN (min 4 digits)",
        "setupConfirm": "Confirm PIN",
        "setupCreate": "Create PIN",
        "setupMismatch": "PINs don't match.",
        "setupTooShort": "PIN must be at least 4 digits.",
        "noPinSkip": "Skip (not recommended)",
        "noPinSkipHint": "Your credentials will be accessible to anyone using this computer.",
        "lockButton": "Lock",
        "lockButtonTitle": "Lock app",
        "pinSection": "Local protection",
        "pinSectionDesc": "Set a PIN to lock the app. Useful when you need to step away from the computer and don't want others to see your credentials.",
        "setPin": "Set PIN",
        "changePin": "Change PIN",
        "removePin": "Remove PIN",
        "pinActive": "PIN active",
        "pinInactive": "No PIN configured",
        "autoLock": "Auto-lock",
        "autoLockDesc": "Locks the app after a period of inactivity.",
        "autoLockNever": "Never",
        "autoLock1m": "1 minute",
        "autoLock5m": "5 minutes",
        "autoLock15m": "15 minutes",
        "autoLock60m": "1 hour",
    },
    "es": {
        "lockTitle": "App bloqueada",
        "lockSubtitle": "Ingresa tu PIN para desbloquear y continuar.",
        "pinPlaceholder": "••••",
        "unlock": "Desbloquear",
        "wrongPin": "PIN incorrecto. Inténtalo de nuevo.",
        "setupTitle": "Crear PIN de acceso",
        "setupSubtitle": "Protege tus credenciales con un PIN local. Tendrás que introducirlo para desbloquear la app.",
        "setupPin": "Nuevo PIN (mín 4 dígitos)",
        "setupConfirm": "Confirmar PIN",
        "setupCreate": "Crear PIN",
        "setupMismatch": "Los PINs no coinciden.",
        "setupTooShort": "El PIN debe tener al menos 4 dígitos.",
        "noPinSkip": "Saltar (no recomendado)",
        "noPinSkipHint": "Tus credenciales serán accesibles para cualquiera que use este ordenador.",
        "lockButton": "Bloquear",
        "lockButtonTitle": "Bloquear app",
        "pinSection": "Protección local",
        "pinSectionDesc": "Establece un PIN para bloquear la app. Útil cuando necesitas ausentarte del ordenador y no quieres que otros vean tus credenciales.",
        "setPin": "Establecer PIN",
        "changePin": "Cambiar PIN",
        "removePin": "Eliminar PIN",
        "pinActive": "PIN activo",
        "pinInactive": "Sin PIN configurado",
        "autoLock": "Bloqueo automático",
        "autoLockDesc": "Bloquea la app tras un periodo de inactividad.",
        "autoLockNever": "Nunca",
        "autoLock1m": "1 minuto",
        "autoLock5m": "5 minutos",
        "autoLock15m": "15 minutos",
        "autoLock60m": "1 hora",
    },
}

LOCALES = ["ptBR", "en", "es"]
LOCALE_KEYS = {"ptBR": "pt-BR", "en": "en", "es": "es"}

# Find each locale block boundaries
def find_locale_boundaries(src: str):
    """Return list of (start, end, var_name) for each locale block."""
    bounds = []
    for v in LOCALES:
        start = src.find(f"const {v}: TranslationDict = {{")
        if start == -1:
            raise RuntimeError(f"Locale {v} not found")
        bounds.append((start, v))
    bounds.sort()
    # End = start of next locale, or start of `export const TRANSLATIONS`
    export_idx = src.find("export const TRANSLATIONS")
    if export_idx == -1:
        raise RuntimeError("TRANSLATIONS export not found")
    bounds.append((export_idx, "END"))
    result = []
    for i in range(len(bounds) - 1):
        result.append((bounds[i][0], bounds[i + 1][0], bounds[i][1]))
    return result

bounds = find_locale_boundaries(src)

# Step 1: Add dragHint to each palette block.
for start, end, var_name in bounds:
    loc_key = LOCALE_KEYS[var_name]
    hint = DRAG_HINTS[loc_key]
    block = src[start:end]
    palette_match = re.search(
        r'(endDesc:\s*"[^"]*",\n)(\s{4}\},\s*\n\s*nodes:)',
        block,
    )
    if not palette_match:
        raise RuntimeError(f"Could not find palette block in {var_name}")
    new_block = (
        block[:palette_match.start()] +
        palette_match.group(1) +
        f'      dragHint: "{hint}",\n' +
        block[palette_match.end():]
    )
    src = src[:start] + new_block + src[end:]

# Recompute boundaries since the source changed
bounds = find_locale_boundaries(src)

# Step 2: Add the auth section before the settings block in each locale.
def build_auth_block(locale_key: str) -> str:
    tr = AUTH_TRANSLATIONS[locale_key]
    lines = ["  auth: {"]
    for k, v in tr.items():
        v_escaped = v.replace('"', '\\"')
        lines.append(f"    {k}: \"{v_escaped}\",")
    lines.append("  },")
    return "\n".join(lines)

for start, end, var_name in bounds:
    loc_key = LOCALE_KEYS[var_name]
    block = src[start:end]
    settings_match = re.search(r'(\s{2}settings:\s*\{)', block)
    if not settings_match:
        raise RuntimeError(f"Could not find settings block in {var_name}")
    auth_block = build_auth_block(loc_key) + "\n\n"
    new_block = (
        block[:settings_match.start()] +
        auth_block +
        block[settings_match.start():]
    )
    src = src[:start] + new_block + src[end:]

PATH.write_text(src)
print("Done — added dragHint to palette and full auth section to all 3 locales")
