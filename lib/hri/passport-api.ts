// Framework-free logic of GET /api/hri/passport/[token]. The route handler wires in Prisma and the
// database-backed rate limiter; tests wire in fakes. Keeping it here makes every branch unit-testable.
import { hashToken, isWellFormedToken } from "./security";
import { toPublicProfile, type PassportProfileSource } from "./public-profile";

export type RateDecision = { allowed: boolean; remaining: number; retryAfterSeconds: number };

export type PassportApiDeps = {
  findByAccessTokenHash: (hash: string) => Promise<PassportProfileSource | null>;
  // Counts this request, then says whether it is still within the limit.
  consume: (key: string, limit: number, windowSeconds: number) => Promise<RateDecision>;
  // Says whether the key is still within the limit, without counting.
  peek: (key: string, limit: number, windowSeconds: number) => Promise<RateDecision>;
  now: () => Date;
};

// Every caller: 60 lookups per minute. Failed lookups (malformed or unknown token): 20 per 10 minutes,
// after which the caller is locked out for the rest of the window — this is the guessing protection.
export const API_LIMITS = {
  requests: { limit: 60, windowSeconds: 60 },
  misses: { limit: 20, windowSeconds: 600 }
} as const;

export const BASE_HEADERS: Record<string, string> = {
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

export type ApiResult = { status: number; body: Record<string, unknown>; headers: Record<string, string> };

function result(status: number, body: Record<string, unknown>, extra: Record<string, string> = {}): ApiResult {
  return { status, body, headers: { ...BASE_HEADERS, ...extra } };
}

function tooMany(decision: RateDecision, limit: number): ApiResult {
  return result(
    429,
    { error: "rate_limited", message: "Too many requests. Try again later.", retryAfterSeconds: decision.retryAfterSeconds },
    { "Retry-After": String(Math.max(1, decision.retryAfterSeconds)), "RateLimit-Limit": String(limit), "RateLimit-Remaining": "0" }
  );
}

export async function getPassportResponse(rawToken: string, caller: string, deps: PassportApiDeps): Promise<ApiResult> {
  const { requests, misses } = API_LIMITS;

  const request = await deps.consume(`api:${caller}`, requests.limit, requests.windowSeconds);
  if (!request.allowed) return tooMany(request, requests.limit);

  const missState = await deps.peek(`miss:${caller}`, misses.limit, misses.windowSeconds);
  if (!missState.allowed) return tooMany(missState, misses.limit);

  const rateHeaders = { "RateLimit-Limit": String(requests.limit), "RateLimit-Remaining": String(request.remaining) };

  if (!isWellFormedToken(rawToken)) {
    await deps.consume(`miss:${caller}`, misses.limit, misses.windowSeconds);
    return result(400, { error: "invalid_token", message: "The passport token is not in a valid format." }, rateHeaders);
  }

  const passport = await deps.findByAccessTokenHash(hashToken(rawToken));
  if (!passport) {
    await deps.consume(`miss:${caller}`, misses.limit, misses.windowSeconds);
    return result(404, { error: "not_found", message: "No passport matches this token." }, rateHeaders);
  }

  if (passport.status !== "active") {
    return result(410, { error: "revoked", message: "This passport has been revoked by its owner." }, rateHeaders);
  }
  if (passport.expiresAt && passport.expiresAt.getTime() <= deps.now().getTime()) {
    return result(410, { error: "expired", message: "This passport has expired." }, rateHeaders);
  }

  return result(200, toPublicProfile(passport), rateHeaders);
}
