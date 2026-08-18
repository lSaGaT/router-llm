#!/usr/bin/env python3
"""Fix the auth blocks placement in translations.ts.

The previous script inserted the ES auth block inside the EN locale block.
We'll extract the 3 unique auth blocks (ptBR, en, es by language of content),
then delete all existing auth blocks, and finally insert one before each
locale's settings block.
"""
import re
from pathlib import Path

PATH = Path("/home/z/my-project/src/lib/i18n/translations.ts")
src = PATH.read_text()

# Extract all `auth: { ... },` blocks that contain string values
# (not type definitions). Type def uses `lockTitle: string;` (with semicolon).
# Locale values use `lockTitle: "...",` (with comma).
auth_pattern = re.compile(r'  auth: \{\n(    lockTitle: "[^"]*",.*?)\n  \},', re.DOTALL)
matches = list(auth_pattern.finditer(src))
print(f"Found {len(matches)} auth blocks (with content)")

blocks = []
for m in matches:
    content = m.group(1)
    lock_title_match = re.search(r'lockTitle:\s*"([^"]*)"', content)
    if not lock_title_match:
        continue
    lock_title = lock_title_match.group(1)
    blocks.append({"lock_title": lock_title, "content": content})

# Map by locale
LOCALE_BY_LOCK_TITLE = {
    "Aplicativo travado": "ptBR",
    "App locked": "en",
    "App bloqueada": "es",
}
by_locale = {}
for b in blocks:
    loc = LOCALE_BY_LOCK_TITLE[b["lock_title"]]
    if loc in by_locale:
        print(f"Warning: duplicate auth block for {loc} — keeping first")
        continue
    by_locale[loc] = b["content"]

# Remove ALL auth blocks from the source
src = auth_pattern.sub('', src)
# Also remove any blank lines that result from the deletion (collapse 3+ newlines to 2)
src = re.sub(r'\n{3,}', '\n\n', src)

# Re-insert before each locale's `settings: {` block
LOCALE_BOUNDS = []
for v in ["ptBR", "en", "es"]:
    start = src.find(f"const {v}: TranslationDict = {{")
    if start == -1:
        raise RuntimeError(f"Locale {v} not found")
    LOCALE_BOUNDS.append((v, start))
LOCALE_BOUNDS.sort(key=lambda x: x[1])

# Find end of each locale = start of next, or export
export_idx = src.find("export const TRANSLATIONS")
ends = [b[1] for b in LOCALE_BOUNDS] + [export_idx]

for i, (var, start) in enumerate(LOCALE_BOUNDS):
    end = ends[i + 1]
    block = src[start:end]
    settings_match = re.search(r'(\s{2}settings:\s*\{)', block)
    if not settings_match:
        raise RuntimeError(f"Could not find settings block in {var}")
    auth_content = by_locale[var]
    auth_block = f"  auth: {{\n{auth_content}\n  }},\n\n"
    new_block = (
        block[:settings_match.start()] +
        auth_block +
        block[settings_match.start():]
    )
    src = src[:start] + new_block + src[end:]

PATH.write_text(src)

# Verify
verify = PATH.read_text()
new_count = len(re.findall(r'^  auth: \{', verify, re.MULTILINE))
print(f"Auth blocks after fix: {new_count} (expected 3 in locales + 1 in type def = 4)")

# Make sure each locale has exactly one
for v in ["ptBR", "en", "es"]:
    start = verify.find(f"const {v}: TranslationDict = {{")
    end_idx = verify.find("const ", start + 1)
    if v == "es":
        end_idx = verify.find("export const TRANSLATIONS", start + 1)
    section = verify[start:end_idx]
    count = len(re.findall(r'^  auth: \{', section, re.MULTILINE))
    print(f"  {v}: {count} auth block(s)")
