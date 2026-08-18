"use client";

/**
 * AuthProvider — keeps the UI in sync with the PIN lock state.
 *
 * - On mount, reads PIN status from localStorage.
 * - If a PIN is set and the app is locked (or should auto-lock), shows the
 *   LockScreen component instead of the app.
 * - If no PIN is set, lets the user skip (with a warning) but doesn't lock.
 * - Polls every 5s for auto-lock check.
 * - Listens to user activity (mousemove, keypress) to refresh the
 *   last-activity timestamp so auto-lock only fires after genuine inactivity.
 */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import {
  getPinStatus,
  setPin as persistPin,
  removePin as clearPin,
  verifyPin,
  unlock as doUnlock,
  lock as doLock,
  setAutoLockMs,
  touchActivity,
  shouldAutoLock,
  type PinStatus,
} from "@/lib/auth/pin";

interface AuthContextValue {
  status: PinStatus;
  /** Try to unlock with the given PIN. Returns true on success. */
  tryUnlock: (pin: string) => Promise<boolean>;
  /** Set a new PIN and unlock immediately. */
  setupPin: (pin: string) => Promise<void>;
  /** Skip PIN setup (app stays unlocked, no PIN). */
  skipPin: () => void;
  /** Lock the app now (requires PIN to unlock). */
  lockNow: () => void;
  /** Remove the PIN entirely. */
  removePin: () => void;
  /** Set auto-lock timeout. null = never. */
  changeAutoLock: (ms: number | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Initialize from localStorage on first render (lazy initializer — no flash, no effect).
  const [status, setStatus] = useState<PinStatus>(() => getPinStatus());

  // Refresh status from localStorage
  const refresh = useCallback(() => {
    setStatus(getPinStatus());
  }, []);

  // Auto-lock check: poll every 5 seconds
  useEffect(() => {
    if (!status.hasPin || !status.unlocked || status.autoLockMs === null) return;
    const interval = setInterval(() => {
      if (shouldAutoLock()) {
        doLock();
        refresh();
      }
    }, 5_000);
    return () => clearInterval(interval);
  }, [status.hasPin, status.unlocked, status.autoLockMs, refresh]);

  // Activity tracking: refresh lastActivity timestamp on user input
  const lastTouchRef = useRef<number>(0);
  useEffect(() => {
    if (!status.unlocked || !status.hasPin) return;
    const handler = () => {
      // Throttle to once per 5 seconds — localStorage writes are cheap but still
      const now = Date.now();
      if (now - lastTouchRef.current > 5_000) {
        lastTouchRef.current = now;
        touchActivity();
      }
    };
    window.addEventListener("mousemove", handler);
    window.addEventListener("keydown", handler);
    window.addEventListener("click", handler);
    return () => {
      window.removeEventListener("mousemove", handler);
      window.removeEventListener("keydown", handler);
      window.removeEventListener("click", handler);
    };
  }, [status.unlocked, status.hasPin]);

  // Cross-tab sync: if another tab locks, lock this one too
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === "harness.unlocked" || e.key === "harness.pinHash") {
        refresh();
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [refresh]);

  const tryUnlock = useCallback(
    async (pin: string): Promise<boolean> => {
      const ok = await verifyPin(pin);
      if (ok) {
        doUnlock();
        refresh();
      }
      return ok;
    },
    [refresh],
  );

  const setupPin = useCallback(
    async (pin: string): Promise<void> => {
      await persistPin(pin);
      refresh();
    },
    [refresh],
  );

  const skipPin = useCallback(() => {
    // Mark as unlocked but don't set a PIN
    doUnlock();
    refresh();
  }, [refresh]);

  const lockNow = useCallback(() => {
    doLock();
    refresh();
  }, [refresh]);

  const removePin = useCallback(() => {
    clearPin();
    refresh();
  }, [refresh]);

  const changeAutoLock = useCallback(
    (ms: number | null) => {
      setAutoLockMs(ms);
      refresh();
    },
    [refresh],
  );

  const value: AuthContextValue = {
    status,
    tryUnlock,
    setupPin,
    skipPin,
    lockNow,
    removePin,
    changeAutoLock,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
