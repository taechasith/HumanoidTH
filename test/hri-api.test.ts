import assert from "node:assert/strict";
import { test } from "node:test";
import { careSpeed, newPassportCode } from "../lib/hri/passport";
import { API_LIMITS, getPassportResponse, type PassportApiDeps, type RateDecision } from "../lib/hri/passport-api";
import { distanceCloseness, toPublicProfile, type PassportProfileSource } from "../lib/hri/public-profile";
import { clientId, generateToken, hashToken, isWellFormedToken, issuePassportTokens, tokenMatchesHash } from "../lib/hri/security";

const NOW = new Date("2026-11-07T10:00:00Z");

function passport(overrides: Partial<PassportProfileSource> = {}): PassportProfileSource {
  return {
    comfortDistance: -1.3, speed: 1, gaze: "soft", language: "th", speechPace: "slow", greeting: "wai",
    voice: true, captions: "large", noReach: true, anxiety: "high", status: "active", version: 1,
    updatedAt: new Date("2026-11-07T09:00:00Z"), expiresAt: null, ...overrides
  };
}

// In-memory stand-in for the Postgres rate limiter, same semantics (consume counts, peek does not).
function fakeDeps(record: PassportProfileSource | null, opts: { requestLimitHit?: boolean } = {}) {
  const counts = new Map<string, number>();
  const lookups: string[] = [];
  const decision = (count: number, limit: number, counted: boolean): RateDecision => ({
    allowed: counted ? count <= limit : count < limit,
    remaining: Math.max(0, limit - count),
    retryAfterSeconds: 42
  });
  const deps: PassportApiDeps = {
    findByAccessTokenHash: async (hash) => { lookups.push(hash); return record; },
    consume: async (key, limit) => {
      const n = (counts.get(key) ?? 0) + 1;
      counts.set(key, n);
      if (opts.requestLimitHit && key.startsWith("api:")) return { allowed: false, remaining: 0, retryAfterSeconds: 42 };
      return decision(n, limit, true);
    },
    peek: async (key, limit) => decision(counts.get(key) ?? 0, limit, false),
    now: () => NOW
  };
  return { deps, counts, lookups };
}

// ---------------- tokens ----------------

test("tokens: 43-char base64url, 256-bit, unique, hashed with SHA-256", () => {
  const seen = new Set<string>();
  for (let i = 0; i < 1000; i++) {
    const t = generateToken();
    assert.equal(isWellFormedToken(t), true);
    assert.equal(Buffer.from(t, "base64url").length, 32);
    seen.add(t);
  }
  assert.equal(seen.size, 1000);
  const t = generateToken();
  assert.match(hashToken(t), /^[0-9a-f]{64}$/);
  assert.equal(hashToken(t), hashToken(t));
  assert.notEqual(hashToken(t), t);
});

test("tokens: access and edit tokens are independent; hashes verify in constant time", () => {
  const issued = issuePassportTokens();
  assert.notEqual(issued.accessToken, issued.editToken);
  assert.equal(tokenMatchesHash(issued.editToken, issued.editTokenHash), true);
  assert.equal(tokenMatchesHash(issued.accessToken, issued.editTokenHash), false, "access token must not edit");
  assert.equal(tokenMatchesHash("short", issued.editTokenHash), false);
  assert.equal(tokenMatchesHash(issued.editToken, null), false);
});

test("tokens: malformed input is rejected before any lookup", () => {
  for (const bad of ["", "MSAJYG", "a".repeat(42), "a".repeat(44), "a".repeat(42) + "=", "../../etc/passwd", "x".repeat(43).replace("x", "!")]) {
    assert.equal(isWellFormedToken(bad), false, bad);
  }
});

test("passport codes come from a CSPRNG and keep the unambiguous alphabet", () => {
  for (let i = 0; i < 500; i++) assert.match(newPassportCode(), /^[2-9A-HJKMNP-Z]{6}$/);
  assert.equal(newPassportCode(() => 0), "222222", "injectable generator still works");
});

test("client id is a salted hash, never the raw IP", () => {
  const id = clientId(new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }));
  assert.equal(id.includes("203.0.113.7"), false);
  assert.equal(id, clientId(new Headers({ "x-forwarded-for": "203.0.113.7" })), "first hop decides");
  assert.notEqual(id, clientId(new Headers({ "x-forwarded-for": "203.0.113.8" })));
});

// ---------------- robot-facing profile ----------------

test("profile: exposes only interaction preferences, never sensitive or identifying fields", () => {
  const profile = toPublicProfile(passport());
  const json = JSON.stringify(profile);
  for (const forbidden of ["anxiety", "nickname", "TokenHash", "consentAt", "createdAt", "\"code\"", "\"id\"", "sessions"]) {
    assert.equal(json.includes(forbidden), false, `must not contain ${forbidden}`);
  }
  assert.deepEqual(Object.keys(profile.preferences).sort(), ["distance", "eyeContact", "language", "movementSpeed", "speakingSpeed"]);
});

test("profile: units are explicit and distance is never reported in metres", () => {
  const p = toPublicProfile(passport({ comfortDistance: -1.3 }));
  assert.equal(p.preferences.distance.metres, null);
  assert.equal(p.preferences.distance.band, "far");
  assert.equal(p.preferences.distance.sceneUnits, -1.3);
  assert.equal(distanceCloseness(-3), 0);
  assert.equal(distanceCloseness(1.8), 1);
  assert.equal(distanceCloseness(9), 1, "clamped");
  assert.equal(p.preferences.language.locale, "th-TH");
  assert.deepEqual(p.preferences.speakingSpeed, { pace: "slow", rate: 0.85 });
  assert.equal(p.preferences.eyeContact.level, "soft");
  assert.ok(p.units.distance.includes("metres: null"));
});

test("profile: anxiety only appears as its effect (slower movement, calm demeanour)", () => {
  assert.equal(careSpeed(1, "high"), 0.5);
  assert.equal(careSpeed(1, "medium"), 0.75);
  assert.equal(careSpeed(0.4, "high"), 0.4);
  assert.equal(careSpeed(1.4, "low"), 1.4);
  const anxious = toPublicProfile(passport({ anxiety: "high", speed: 1 }));
  assert.deepEqual(anxious.preferences.movementSpeed, { multiplier: 0.5, band: "slow" });
  assert.equal(anxious.interaction.demeanor, "calm");
  const relaxed = toPublicProfile(passport({ anxiety: "low", speed: 1 }));
  assert.deepEqual(relaxed.preferences.movementSpeed, { multiplier: 1, band: "normal" });
  assert.equal(relaxed.interaction.demeanor, "friendly");
  assert.equal(relaxed.interaction.handover, "place_nearby");
});

test("profile: unexpected stored strings fall back to safe values", () => {
  const p = toPublicProfile(passport({ gaze: "stare", language: "fr", greeting: "hug", captions: "huge", speechPace: "fast" }));
  assert.equal(p.preferences.eyeContact.level, "soft");
  assert.equal(p.preferences.language.tag, "th");
  assert.equal(p.interaction.greeting, "wai");
  assert.equal(p.interaction.captions, "normal");
  assert.equal(p.preferences.speakingSpeed.pace, "normal");
});

// ---------------- API handler ----------------

test("api: valid token returns 200 with no-store, CORS and rate-limit headers", async () => {
  const { deps, lookups } = fakeDeps(passport());
  const token = generateToken();
  const res = await getPassportResponse(token, "caller", deps);
  assert.equal(res.status, 200);
  assert.equal(res.body.schema, "humanoidth.hri-passport/v1");
  assert.equal(res.headers["Cache-Control"], "no-store");
  assert.equal(res.headers["Access-Control-Allow-Origin"], "*");
  assert.equal(res.headers["RateLimit-Limit"], String(API_LIMITS.requests.limit));
  assert.deepEqual(lookups, [hashToken(token)], "looked up by hash, never by raw token");
});

test("api: malformed token → 400 without touching the database, and counts as a miss", async () => {
  const { deps, lookups, counts } = fakeDeps(passport());
  const res = await getPassportResponse("MSAJYG", "caller", deps);
  assert.equal(res.status, 400);
  assert.equal(res.body.error, "invalid_token");
  assert.equal(lookups.length, 0);
  assert.equal(counts.get("miss:caller"), 1);
});

test("api: unknown token → 404 and counts as a miss", async () => {
  const { deps, counts } = fakeDeps(null);
  const res = await getPassportResponse(generateToken(), "caller", deps);
  assert.equal(res.status, 404);
  assert.equal(res.body.error, "not_found");
  assert.equal(counts.get("miss:caller"), 1);
});

test("api: expired and revoked passports → 410 with no profile data", async () => {
  const expired = await getPassportResponse(generateToken(), "c", fakeDeps(passport({ expiresAt: new Date("2026-11-07T09:59:59Z") })).deps);
  assert.equal(expired.status, 410);
  assert.equal(expired.body.error, "expired");
  assert.equal("preferences" in expired.body, false);
  const revoked = await getPassportResponse(generateToken(), "c", fakeDeps(passport({ status: "revoked" })).deps);
  assert.equal(revoked.status, 410);
  assert.equal(revoked.body.error, "revoked");
  const future = await getPassportResponse(generateToken(), "c", fakeDeps(passport({ expiresAt: new Date("2026-12-01T00:00:00Z") })).deps);
  assert.equal(future.status, 200);
});

test("api: too many requests → 429 with Retry-After, before any lookup", async () => {
  const { deps, lookups } = fakeDeps(passport(), { requestLimitHit: true });
  const res = await getPassportResponse(generateToken(), "caller", deps);
  assert.equal(res.status, 429);
  assert.equal(res.body.error, "rate_limited");
  assert.equal(res.headers["Retry-After"], "42");
  assert.equal(lookups.length, 0);
});

test("api: guessing protection — after 20 misses even a valid token is refused", async () => {
  const { deps, lookups } = fakeDeps(null);
  for (let i = 0; i < API_LIMITS.misses.limit; i++) {
    assert.equal((await getPassportResponse(generateToken(), "guesser", deps)).status, 404);
  }
  const lookupsBefore = lookups.length;
  const blocked = await getPassportResponse(generateToken(), "guesser", deps);
  assert.equal(blocked.status, 429);
  assert.equal(lookups.length, lookupsBefore, "no database lookup once locked out");
  // A different caller is unaffected.
  assert.equal((await getPassportResponse(generateToken(), "someone-else", deps)).status, 404);
});
