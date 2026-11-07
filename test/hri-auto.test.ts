import assert from "node:assert/strict";
import { test } from "node:test";
import { AUTO_CLOSEST, AUTO_STEPS, AUTO_TIMING, AutoCalibrator, type AutoEvent, type AutoFrame } from "../lib/hri/auto-calibration";
import { headTurn, isFrontal, POSE, StillnessDetector, type Landmark } from "../lib/hri/signals";
import { passportSchema, sessionSchema } from "../lib/hri/passport";

// ---------------- synthetic people ----------------
// A person facing the camera: shoulder width `w` (bigger = closer), head turned by `turn` shoulder widths.
function body({ w = 0.24, turn = 0, wai = false } = {}): Landmark[] {
  const lm: Landmark[] = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 0.1 }));
  const set = (i: number, x: number, y: number) => (lm[i] = { x, y, visibility: 0.95 });
  const cx = 0.5, sy = 0.42;
  set(POSE.lShoulder, cx + w / 2, sy);
  set(POSE.rShoulder, cx - w / 2, sy);
  set(POSE.nose, cx + turn * w, sy - 0.6 * w);
  if (wai) {
    set(POSE.lWrist, cx + 0.02, sy - 0.06); set(POSE.rWrist, cx - 0.02, sy - 0.06);
    set(POSE.lElbow, cx + 0.4 * w, sy + 0.5 * w); set(POSE.rElbow, cx - 0.4 * w, sy + 0.5 * w);
  } else {
    set(POSE.lElbow, cx + 0.6 * w, sy + 0.6 * w); set(POSE.rElbow, cx - 0.6 * w, sy + 0.6 * w);
    set(POSE.lWrist, cx + 0.6 * w, sy + 1.2 * w); set(POSE.rWrist, cx - 0.6 * w, sy + 1.2 * w);
  }
  return lm;
}

type Script = (t: number, cal: AutoCalibrator, events: AutoEvent[]) => Partial<AutoFrame>;

// Feed 30 fps frames until the calibrator completes or aborts (or maxMs passes).
function run(script: Script, maxMs = 200_000, language: "th" | "en" = "th") {
  const cal = new AutoCalibrator(language);
  const events: AutoEvent[] = [];
  for (let t = 0; t <= maxMs; t += 1000 / 30) {
    const frame: AutoFrame = { tMs: t, landmarks: body(), people: 1, luma: 120, ...script(t, cal, events) };
    events.push(...cal.update(frame));
    if (cal.stage === "complete" || cal.stage === "aborted") break;
  }
  const done = events.find((e) => e.type === "complete") as Extract<AutoEvent, { type: "complete" }> | undefined;
  return { cal, events, done, has: (type: AutoEvent["type"]) => events.some((e) => e.type === type) };
}

const waiBetween = (from: number, to: number): Script => (t) => (t >= from && t < to ? { landmarks: body({ wai: true }) } : {});

// ---------------- signals ----------------

test("signals: head turn, frontal check and stillness", () => {
  assert.ok(Math.abs(headTurn(body())) < 1e-9);
  assert.ok(Math.abs(headTurn(body({ turn: 0.4 })) - 0.4) < 1e-9);
  assert.equal(isFrontal(body()), true);
  assert.equal(isFrontal(body({ turn: 0.5 })), false);
  assert.ok(Number.isNaN(headTurn(undefined)));
  const s = new StillnessDetector(1500, 0.05);
  let still = false;
  for (let t = 0; t <= 1600; t += 33) still = s.update(t, 0.24 + (t % 66 ? 0.002 : -0.002));
  assert.equal(still, true, "small jitter over a full window is still");
  assert.equal(s.update(1700, 0.3), false, "a jump breaks stillness");
});

// ---------------- full sessions ----------------

test("auto: a calm person who wais gets a medium-close passport, direct gaze, normal speed", () => {
  const { done, events, has } = run(waiBetween(2100, 3000));
  assert.ok(done, "completes");
  assert.ok(has("wai_received"));
  const steps = events.filter((e) => e.type === "step").map((e) => (e as { index: number }).index);
  assert.deepEqual(steps, [1, 2, 3], "approaches one step at a time, stops at the last regular step");
  assert.equal(done.result.comfortDistance, AUTO_STEPS[3]);
  assert.equal(done.evidence.distanceReason, "closest_offered");
  assert.equal(done.result.speed, 1);
  assert.equal(done.result.gaze, "direct");
  assert.equal(done.evidence.waiDetected, true);
  assert.equal(done.evidence.gazeMeasured, true);
  assert.ok(done.evidence.durationSeconds < 60, `finished in ${done.evidence.durationSeconds}s`);
});

test("auto: no wai → the robot bows anyway after the timeout and carries on", () => {
  const { done, has } = run(() => ({}));
  assert.ok(has("wai_timeout"));
  assert.ok(done);
  assert.equal(done.evidence.waiDetected, false);
});

test("auto: leaning back while the robot waits at a step → too close, it backs off", () => {
  const { done, has } = run((t, cal) => (cal.stage === "dwell" && cal.stepIndex === 2 ? { landmarks: body({ w: 0.19 }) } : {}));
  assert.ok(has("too_close"));
  assert.ok(done);
  assert.equal(done.result.comfortDistance, Math.round((AUTO_STEPS[2] - 0.8) * 100) / 100);
  assert.equal(done.evidence.distanceReason, "too_close");
  assert.equal(done.evidence.leanBacks, 1);
});

test("auto: leaning back while the robot moves → too fast: half speed, one step back, then continue", () => {
  let slowed = false;
  const { done, events } = run((t, cal, ev) => {
    slowed ||= ev.some((e) => e.type === "too_fast");
    return cal.stage === "moving" && cal.stepIndex === 2 && !slowed ? { landmarks: body({ w: 0.19 }) } : {};
  });
  const tooFast = events.find((e) => e.type === "too_fast") as Extract<AutoEvent, { type: "too_fast" }>;
  assert.ok(tooFast);
  assert.equal(tooFast.speed, 0.5);
  assert.equal(tooFast.retreatTo, AUTO_STEPS[1]);
  assert.ok(done);
  assert.equal(done.result.speed, 0.5);
  assert.equal(done.evidence.tooFast, 1);
  assert.equal(done.result.comfortDistance, AUTO_STEPS[3], "a single startle does not end the approach");
});

test("auto: repeated lean-backs → farther and slower than measured (instead of guessing anxiety)", () => {
  let slowed = false;
  const { done } = run((t, cal, ev) => {
    slowed ||= ev.some((e) => e.type === "too_fast");
    if (cal.stage === "moving" && cal.stepIndex === 2 && !slowed) return { landmarks: body({ w: 0.19 }) };
    if (cal.stage === "dwell" && cal.stepIndex === 2 && slowed) return { landmarks: body({ w: 0.19 }) };
    return {};
  });
  assert.ok(done);
  assert.equal(done.evidence.leanBacks, 2);
  assert.match(done.evidence.distanceReason, /too_close\+discomfort/);
  // Second lean-back at step 2 (−0.4): back off 0.8 → −1.2, then 0.4 farther for discomfort → −1.6.
  assert.equal(done.result.comfortDistance, Math.round((AUTO_STEPS[2] - 0.8 - 0.4) * 100) / 100);
  assert.ok(done.result.speed <= 0.5);
  assert.equal(done.result.anxiety, "low", "anxiety is never inferred");
});

test("auto: leaning in at the last step unlocks the closest distance", () => {
  const { done, has } = run((t, cal) => (cal.stepIndex >= 3 && (cal.stage === "dwell" || cal.stage === "moving") ? { landmarks: body({ w: 0.28 }) } : {}));
  assert.ok(has("lean_in"));
  assert.ok(done);
  assert.equal(done.result.comfortDistance, AUTO_CLOSEST);
  assert.equal(done.evidence.leanIn, true);
});

test("auto: looking away most of the time while the robot looks at you → soft eye contact", () => {
  const { done } = run((t, cal) => (cal.stage === "gaze" && (t / 1000) % 1 < 0.6 ? { landmarks: body({ turn: 0.45 }) } : {}));
  assert.ok(done);
  assert.equal(done.result.gaze, "soft");
  assert.ok(done.evidence.avertShare! > 0.5 && done.evidence.avertShare! < 0.7);
});

test("auto: turning sideways is not mistaken for leaning back", () => {
  const { done, has } = run((t, cal) => {
    if (cal.stage === "dwell" && cal.stepIndex === 2 && (t / 1000) % 2 < 1) return { landmarks: body({ w: 0.17, turn: 0.5 }) };
    return {};
  });
  assert.equal(has("too_close"), false);
  assert.equal(has("too_fast"), false);
  assert.ok(done);
  assert.equal(done.evidence.leanBacks, 0);
});

// ---------------- robustness ----------------

test("auto: nobody in view → pauses, then stops cleanly after the timeout without a passport", () => {
  const { events, done, cal } = run(() => ({ landmarks: null, people: 0 }));
  assert.equal(done, undefined);
  assert.equal(cal.stage, "aborted");
  assert.deepEqual(events.find((e) => e.type === "paused"), { type: "paused", reason: "no_person" });
  assert.deepEqual(events.at(-1), { type: "aborted", reason: "no_person" });
});

test("auto: a short absence pauses and resumes; paused time does not count against the step", () => {
  const { done, has, events } = run((t, cal) => {
    if (cal.stage === "greet" && t > 3000 && t < 8000) return { landmarks: null, people: 0 };
    return t >= 8500 && t < 9500 ? { landmarks: body({ wai: true }) } : {};
  });
  assert.ok(has("paused") && has("resumed"));
  assert.ok(done);
  assert.equal(done.evidence.pauses, 1);
  assert.equal(done.evidence.waiDetected, true, "the wai after coming back still counts");
  assert.equal(events.some((e) => e.type === "wai_timeout"), false, "the pause did not eat the wai window");
});

test("auto: a dropped frame or two is not an absence", () => {
  const { has, done } = run((t) => ((Math.floor(t / 33) % 40 === 0) ? { landmarks: null, people: 0 } : {}));
  assert.equal(has("paused"), false);
  assert.ok(done);
});

test("auto: two people → pause until one remains; too dark → pause", () => {
  const two = run((t) => (t > 500 && t < 4000 ? { people: 2 } : {}));
  assert.deepEqual(two.events.find((e) => e.type === "paused"), { type: "paused", reason: "one_person" });
  assert.ok(two.has("resumed") && two.done);
  const dark = run((t) => (t > 500 && t < 4000 ? { luma: 20 } : {}));
  assert.deepEqual(dark.events.find((e) => e.type === "paused"), { type: "paused", reason: "too_dark" });
  assert.ok(dark.done);
});

test("auto: always ends, even with chaotic input", () => {
  let seed = 42;
  const rand = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
  for (let i = 0; i < 20; i++) {
    const { cal } = run(() => {
      const r = rand();
      if (r < 0.05) return { landmarks: null, people: 0 };
      if (r < 0.07) return { people: 2 };
      return { landmarks: body({ w: 0.15 + rand() * 0.15, turn: (rand() - 0.5) * 0.8, wai: rand() < 0.1 }) };
    }, AUTO_TIMING.maxTotalMs + 5000);
    assert.ok(cal.stage === "complete" || cal.stage === "aborted", `run ${i} ended (${cal.stage})`);
  }
});

test("auto: results use safe defaults for what the camera cannot know, and the chosen language", () => {
  const { done } = run(() => ({}), 200_000, "en");
  assert.ok(done);
  assert.deepEqual(
    { voice: done.result.voice, captions: done.result.captions, speechPace: done.result.speechPace, noReach: done.result.noReach, anxiety: done.result.anxiety, language: done.result.language },
    { voice: true, captions: "normal", speechPace: "normal", noReach: true, anxiety: "low", language: "en" }
  );
  assert.equal(JSON.stringify(done.evidence).includes("anxiety"), false);
});

test("auto: the result and session the UI saves pass the server's validation unchanged", () => {
  const { done } = run(waiBetween(2100, 3000));
  assert.ok(done);
  // Same shapes LivingLabClient.saveAuto sends to createPassportAction.
  assert.deepEqual(passportSchema.parse(done.result), done.result);
  const session = sessionSchema.parse({
    protocol: "wai_first_calibration",
    inputMode: "auto",
    events: [{ t: 0, src: "human", type: "session_start" }],
    summary: { ...done.evidence, tooClose: 0, tooFast: 0, leanBack: 0, finalDistance: done.result.comfortDistance, finalSpeed: done.result.speed }
  });
  assert.equal(session.inputMode, "auto");
  assert.equal(session.summary.distanceReason, "closest_offered");
});
