// Server-only helpers for HRI Passport access tokens and anonymous client keys.
// Do not import from client components: this uses node:crypto.
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

// 32 random bytes = 256 bits of entropy, encoded as 43 base64url characters.
export const TOKEN_BYTES = 32;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function generateToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

export function isWellFormedToken(value: unknown): value is string {
  return typeof value === "string" && TOKEN_PATTERN.test(value);
}

// Tokens are stored only as SHA-256 hashes, so a database leak does not leak working tokens.
export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

// Constant-time check of a presented token against a stored hash.
export function tokenMatchesHash(token: string, storedHash: string | null | undefined): boolean {
  if (!storedHash || !isWellFormedToken(token)) return false;
  const a = Buffer.from(hashToken(token), "hex");
  const b = Buffer.from(storedHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

// A new passport gets two independent secrets: one to read (goes in the QR), one to edit/delete.
export function issuePassportTokens() {
  const accessToken = generateToken();
  const editToken = generateToken();
  return { accessToken, editToken, accessTokenHash: hashToken(accessToken), editTokenHash: hashToken(editToken) };
}

// Anonymous, salted identifier for the caller, used only as a rate-limit key. The raw IP is never stored.
// On Vercel, x-forwarded-for is set by the platform; locally it can be spoofed, which only affects dev.
export function clientId(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || headers.get("x-real-ip")?.trim() || "unknown";
  const salt = process.env.RATE_LIMIT_SALT || process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_BASIC_PASSWORD || "hri-passport";
  return createHmac("sha256", salt).update(ip).digest("base64url").slice(0, 22);
}
