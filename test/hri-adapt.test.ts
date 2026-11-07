import assert from "node:assert/strict";
import { test } from "node:test";
import { adapt, DEFAULT_PLAN } from "../lib/hri/adapt";
import { toPublicProfile } from "../lib/hri/public-profile";
import { ROBOT_PROFILES } from "../lib/hri/robot-profiles";

const base = {
  comfortDistance: 0.4,
  speed: 1.1,
  gaze: "soft",
  language: "th",
  speechPace: "normal",
  greeting: "wai",
  voice: true,
  captions: "normal",
  noReach: true,
  anxiety: "low",
  status: "active",
  version: 1,
  updatedAt: new Date("2026-01-01T00:00:00Z"),
  expiresAt: null
};

const full = ROBOT_PROFILES.find((r) => r.id === "a-humanoid")!;
const screen = ROBOT_PROFILES.find((r) => r.id === "b-screen")!;

const profile = (overrides: Partial<typeof base> = {}) =>
  toPublicProfile({ ...base, ...overrides });

test("adapt: a full humanoid applies every preference as written", () => {
  const plan = adapt(profile(), full);
  assert.equal(plan.distance.sceneUnits, 0.4);
  assert.equal(plan.distance.fixed, false);
  assert.equal(plan.movement.multiplier, 1.1);
  assert.equal(plan.movement.mobile, true);
  assert.equal(plan.eyeContact, "soft");
  assert.equal(plan.eyeMechanism, "head_and_eyes");
  assert.equal(plan.greeting, "wai");
  assert.equal(plan.voice, true);
  assert.equal(plan.handover, "place_nearby");
  assert.equal(plan.language, "th");
  assert.equal(plan.demeanor, "friendly");
  assert.deepEqual(plan.adaptations, []);
});

test("adapt: high anxiety is already folded into the profile, not re-derived", () => {
  const plan = adapt(profile({ speed: 1.4, anxiety: "high", captions: "large", speechPace: "slow" }), full);
  assert.equal(plan.movement.multiplier, 0.5, "careSpeed caps high anxiety at 0.5");
  assert.equal(plan.demeanor, "calm");
  assert.equal(plan.captions, "large");
  assert.equal(plan.speechRate, 0.85);
});

test("adapt: a screen-only robot keeps its base, cannot gaze, gesture or hand over", () => {
  const plan = adapt(profile(), screen);
  assert.equal(plan.distance.sceneUnits, 0);
  assert.equal(plan.distance.fixed, true);
  assert.equal(plan.movement.multiplier, 0);
  assert.equal(plan.movement.mobile, false);
  assert.equal(plan.eyeContact, "none");
  assert.equal(plan.eyeMechanism, "screen_cue");
  assert.equal(plan.greeting, "none");
  assert.equal(plan.handover, "place_nearby");
  assert.equal(plan.voice, true, "it still has a speaker");
  const codes = plan.adaptations.map((a) => a.code);
  assert.deepEqual(codes.sort(), ["fixed_base_distance", "fixed_base_speed", "no_arms", "no_head"]);
});

test("adapt: hardware speed caps are applied and reported", () => {
  const capped = { ...full, capabilities: { ...full.capabilities, maxSpeedMultiplier: 1 } };
  const plan = adapt(profile({ speed: 1.4 }), capped);
  assert.equal(plan.movement.multiplier, 1);
  assert.deepEqual(plan.adaptations, [{ code: "speed_capped", value: "×1" }]);
});

test("adapt: a robot without a speaker falls back to text", () => {
  const quiet = { ...full, capabilities: { ...full.capabilities, speaker: false } };
  const plan = adapt(profile({ voice: true }), quiet);
  assert.equal(plan.voice, false);
  assert.deepEqual(plan.adaptations, [{ code: "no_speaker" }]);
});

test("adapt: a request for no greeting stays silent on a full humanoid", () => {
  const plan = adapt(profile({ greeting: "none" }), full);
  assert.equal(plan.greeting, "none");
  assert.deepEqual(plan.adaptations, []);
});

test("adapt: pure and deterministic, never mutates the profile", () => {
  const source = profile();
  const snapshot = JSON.parse(JSON.stringify(source));
  const a = adapt(source, screen);
  const b = adapt(source, screen);
  assert.deepEqual(a, b);
  assert.deepEqual(JSON.parse(JSON.stringify(source)), snapshot);
});

test("adapt: the no-passport default matches the meet flow's default behaviour", () => {
  assert.equal(DEFAULT_PLAN.distance.sceneUnits, 1.3);
  assert.equal(DEFAULT_PLAN.movement.multiplier, 1.4);
  assert.equal(DEFAULT_PLAN.eyeContact, "direct");
  assert.equal(DEFAULT_PLAN.greeting, "wave");
  assert.equal(DEFAULT_PLAN.voice, true);
  assert.equal(DEFAULT_PLAN.handover, "hand_to_person");
  assert.equal(DEFAULT_PLAN.demeanor, "friendly");
});
