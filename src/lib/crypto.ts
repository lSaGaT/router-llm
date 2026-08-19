/**
 * Credential encryption layer — AES-256-GCM.
 *
 * Single-tenant, local-first. The encryption key is derived from
 * HARNESS_ENCRYPTION_KEY env var (or a deterministic fallback for dev).
 * In production, the user MUST set HARNESS_ENCRYPTION_KEY to a strong random value.
 */
import crypto from "crypto";

const ALGO = "aes-256-gcm";
const KEY_LEN = 32; // 256 bits
const IV_LEN = 12; // 96 bits — recommended for GCM

function getKey(): Buffer {
  const raw = process.env.HARNESS_ENCRYPTION_KEY;
  if (raw) {
    // Derive a 32-byte key from the user-supplied secret via SHA-256.
    return crypto.createHash("sha256").update(raw).digest();
  }
  // Dev fallback — deterministic, NOT secure for production. Logs a warning.
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "HARNESS_ENCRYPTION_KEY must be set in production. Generate one with: openssl rand -hex 32",
    );
  }
  return crypto.createHash("sha256").update("llm-harness-dev-key-do-not-use-in-prod").digest();
}

export interface EncryptedPayload {
  /** Base64 ciphertext + auth tag, separated by ":" */
  ivAuth: string;
  /** Base64 ciphertext */
  encryptedSecret: string;
}

export function encryptSecret(plaintext: string): EncryptedPayload {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    ivAuth: `${iv.toString("base64")}:${authTag.toString("base64")}`,
    encryptedSecret: encrypted.toString("base64"),
  };
}

export function decryptSecret(ivAuth: string, encryptedSecret: string): string {
  const key = getKey();
  const [ivB64, authTagB64] = ivAuth.split(":");
  if (!ivB64 || !authTagB64) {
    throw new Error("Invalid ivAuth format");
  }
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedSecret, "base64")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

/** Encrypt a credential payload (API key, organization, etc.) as JSON. */
export function encryptCredentialPayload(payload: object): EncryptedPayload {
  return encryptSecret(JSON.stringify(payload));
}

/** Decrypt a credential payload back to its original object form. */
export function decryptCredentialPayload<T = Record<string, unknown>>(
  ivAuth: string,
  encryptedSecret: string,
): T {
  return JSON.parse(decryptSecret(ivAuth, encryptedSecret)) as T;
}
