/**
 * Local PIN-based auth — single-tenant, client-side only.
 *
 * Why a PIN:
 *   The whole app runs locally on the user's machine. The Prisma DB stores
 *   encrypted API keys. But anyone with file system access can read the DB
 *   (the encryption key is in .env on the same machine). The PIN adds a
 *   second layer: even if someone sits at your computer while you're logged
 *   in, they can't open the UI without entering the PIN again.
 *
 * Storage:
 *   - PIN hash: SHA-256, stored in localStorage (`harness.pinHash`).
 *   - Auto-lock timeout: stored in localStorage (`harness.autoLockMs`).
 *   - Last activity timestamp: stored in localStorage (`harness.lastActivity`).
 *
 * Threat model:
 *   - Defends against: curious family/coworkers/roommates opening the UI
 *     while you're away from keyboard.
 *   - Does NOT defend against: an attacker with disk access (they can read
 *     localStorage + the encrypted DB + the .env encryption key together).
 *
 * For real protection, the user should still set HARNESS_ENCRYPTION_KEY and
 * keep their OS user account secure.
 */

const PIN_HASH_KEY = "harness.pinHash";
const AUTOLOCK_MS_KEY = "harness.autoLockMs";
const LAST_ACTIVITY_KEY = "harness.lastActivity";
const UNLOCKED_KEY = "harness.unlocked";

export interface PinStatus {
  hasPin: boolean;
  autoLockMs: number | null; // null = never auto-lock
  unlocked: boolean;
}

export function getPinStatus(): PinStatus {
  if (typeof window === "undefined") {
    return { hasPin: false, autoLockMs: null, unlocked: false };
  }
  const pinHash = window.localStorage.getItem(PIN_HASH_KEY);
  const autoLockMsStr = window.localStorage.getItem(AUTOLOCK_MS_KEY);
  const unlockedStr = window.localStorage.getItem(UNLOCKED_KEY);
  return {
    hasPin: !!pinHash,
    autoLockMs: autoLockMsStr ? parseInt(autoLockMsStr) : null,
    unlocked: unlockedStr === "true",
  };
}

async function sha256(text: string): Promise<string> {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Set a new PIN. Replaces any existing PIN. */
export async function setPin(pin: string): Promise<void> {
  if (pin.length < 4) throw new Error("PIN must be at least 4 digits");
  const hash = await sha256(pin);
  window.localStorage.setItem(PIN_HASH_KEY, hash);
  window.localStorage.setItem(UNLOCKED_KEY, "true");
  window.localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
}

/** Remove the PIN entirely. */
export function removePin(): void {
  window.localStorage.removeItem(PIN_HASH_KEY);
  window.localStorage.removeItem(AUTOLOCK_MS_KEY);
  window.localStorage.removeItem(UNLOCKED_KEY);
  window.localStorage.removeItem(LAST_ACTIVITY_KEY);
}

/** Verify a PIN against the stored hash. Returns true if matched. */
export async function verifyPin(pin: string): Promise<boolean> {
  const stored = window.localStorage.getItem(PIN_HASH_KEY);
  if (!stored) return true; // no PIN set = always unlocks
  const hash = await sha256(pin);
  return hash === stored;
}

/** Mark as unlocked and refresh last activity. */
export function unlock(): void {
  window.localStorage.setItem(UNLOCKED_KEY, "true");
  touchActivity();
}

/** Mark as locked (require PIN to unlock again). */
export function lock(): void {
  window.localStorage.setItem(UNLOCKED_KEY, "false");
}

/** Set the auto-lock timeout in milliseconds (null = never). */
export function setAutoLockMs(ms: number | null): void {
  if (ms === null) {
    window.localStorage.removeItem(AUTOLOCK_MS_KEY);
  } else {
    window.localStorage.setItem(AUTOLOCK_MS_KEY, String(ms));
  }
  touchActivity();
}

/** Update the last-activity timestamp (called on user interaction). */
export function touchActivity(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
}

/** Check if the app should auto-lock due to inactivity. Returns true if it should. */
export function shouldAutoLock(): boolean {
  if (typeof window === "undefined") return false;
  const autoLockMsStr = window.localStorage.getItem(AUTOLOCK_MS_KEY);
  const pinHash = window.localStorage.getItem(PIN_HASH_KEY);
  if (!autoLockMsStr || !pinHash) return false;
  const lastActivityStr = window.localStorage.getItem(LAST_ACTIVITY_KEY);
  if (!lastActivityStr) return false;
  const lastActivity = parseInt(lastActivityStr);
  const autoLockMs = parseInt(autoLockMsStr);
  return Date.now() - lastActivity > autoLockMs;
}

/** Auto-lock option presets. */
export const AUTOLOCK_PRESETS: { value: number | null; labelKey: string }[] = [
  { value: null, labelKey: "auth.autoLockNever" },
  { value: 60_000, labelKey: "auth.autoLock1m" },
  { value: 300_000, labelKey: "auth.autoLock5m" },
  { value: 900_000, labelKey: "auth.autoLock15m" },
  { value: 3_600_000, labelKey: "auth.autoLock60m" },
];
