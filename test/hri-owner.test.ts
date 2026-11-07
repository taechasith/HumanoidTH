import assert from "node:assert/strict";
import { test } from "node:test";
import { OWNER_LIMITS, ownerPatchSchema, shouldForgetEditKey } from "../lib/hri/passport-owner";
import { issuePassportTokens, tokenMatchesHash } from "../lib/hri/security";

// ---------------- keeping the owner's key ----------------

test("edit key: a temporary rate limit never forgets it, a rejected key does", () => {
  assert.equal(shouldForgetEditKey("rate_limited"), false);
  assert.equal(shouldForgetEditKey("not_found"), true);
});

// ---------------- what the owner may change ----------------

test("owner patch: fields are optional and missing fields never get defaults", () => {
  assert.deepEqual(ownerPatchSchema.parse({ comfortDistance: -0.4 }), { comfortDistance: -0.4 });
  assert.deepEqual(ownerPatchSchema.parse({ speed: 0.8 }), { speed: 0.8 });
  assert.deepEqual(ownerPatchSchema.parse({}), {}, "an empty patch parses; the action rejects it");
  const full = {
    nickname: "Mali", greeting: "wave", comfortDistance: 0.5, speed: 1.25, gaze: "direct", voice: false,
    language: "en", anxiety: "medium", captions: "large", speechPace: "slow", noReach: true
  };
  assert.deepEqual(ownerPatchSchema.parse(full), full);
});

test("owner patch: out-of-range and unknown values are rejected", () => {
  const bad = [
    { comfortDistance: 5 }, { comfortDistance: -4 }, { speed: 0 }, { speed: 3 },
    { gaze: "stare" }, { language: "fr" }, { captions: "huge" }, { speechPace: "fast" },
    { anxiety: "none" }, { greeting: "hug" }, { voice: "yes" }, { noReach: 1 }
  ];
  for (const patch of bad) {
    assert.equal(ownerPatchSchema.safeParse(patch).success, false, JSON.stringify(patch));
  }
});

test("owner patch: server-owned fields cannot be smuggled in", () => {
  for (const key of ["id", "code", "version", "status", "accessTokenHash", "editTokenHash", "consentAt", "expiresAt", "createdAt", "updatedAt"]) {
    assert.equal(ownerPatchSchema.safeParse({ [key]: "x" }).success, false, key);
  }
});

test("owner patch: nickname is trimmed, may be cleared, and stays under 40 characters", () => {
  assert.equal(ownerPatchSchema.parse({ nickname: "  Mali  " }).nickname, "Mali");
  assert.equal(ownerPatchSchema.parse({ nickname: null }).nickname, null);
  assert.equal(ownerPatchSchema.safeParse({ nickname: "x".repeat(41) }).success, false);
});

// ---------------- who may change it ----------------

test("owner authorisation: the edit token matches, the access token never does", () => {
  const issued = issuePassportTokens();
  assert.equal(tokenMatchesHash(issued.editToken, issued.editTokenHash), true);
  assert.equal(tokenMatchesHash(issued.accessToken, issued.editTokenHash), false, "access token cannot edit");
  assert.equal(tokenMatchesHash(issued.editToken, issued.accessTokenHash), false, "edit token is not a read token");
  assert.equal(tokenMatchesHash("MSAJYG", issued.editTokenHash), false, "malformed key");
  assert.equal(tokenMatchesHash(issued.editToken, null), false, "legacy passport without an edit token");
});

test("owner limits: deleting is rarer than editing, and every bucket is finite", () => {
  assert.ok(OWNER_LIMITS.delete.limit < OWNER_LIMITS.update.limit);
  assert.ok(OWNER_LIMITS.delete.windowSeconds >= OWNER_LIMITS.update.windowSeconds);
  for (const limits of Object.values(OWNER_LIMITS)) {
    assert.ok(limits.limit > 0);
    assert.ok(limits.windowSeconds > 0);
  }
});
