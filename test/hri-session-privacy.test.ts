import assert from "node:assert/strict";
import { test } from "node:test";
import { sessionSchema } from "../lib/hri/passport";
import { toJourneyPassport } from "../lib/hri/public-profile";
import { minimiseEvents, minimiseSummary } from "../lib/hri/session-privacy";

// ---------------- sessions outlive the passport, so care needs must never reach them ----------------

test("session events: the care answers logged by the Living Lab are not stored", () => {
  // Same shapes LivingLabClient logs. The schema lets these extra fields through, so the filter must catch them.
  const { events } = sessionSchema.parse({
    protocol: "wai_first_calibration",
    inputMode: "buttons",
    events: [
      { t: 1, src: "human", type: "anxiety", level: "high" },
      { t: 2, src: "human", type: "communication", accessible: true },
      { t: 3, src: "human", type: "reach", noReach: true },
      { t: 4, src: "human", type: "care_needs_set", anxiety: "high", accessible: true, noReach: true },
      { t: 5, src: "human", type: "gaze_preference", gaze: "soft" }
    ]
  });
  const stored = minimiseEvents(events);
  assert.deepEqual(stored, [{ t: 5, src: "human", type: "gaze_preference", gaze: "soft" }]);
  for (const forbidden of ["anxiety", "high", "accessible", "noReach"]) {
    assert.equal(JSON.stringify(stored).includes(forbidden), false, forbidden);
  }
});

test("session events: sensitive fields are stripped from any other event, and the rest is kept", () => {
  assert.deepEqual(
    minimiseEvents([
      { t: 1, src: "human", type: "passport_not_read", code: "ABC234" },
      { t: 2, src: "human", type: "custom", anxiety: "high", nickname: "Mali", distance: 0.5 }
    ]),
    [
      { t: 1, src: "human", type: "passport_not_read" },
      { t: 2, src: "human", type: "custom", distance: 0.5 }
    ]
  );
});

test("session summary: analytics stay, care needs go", () => {
  assert.deepEqual(
    minimiseSummary({
      mode: "passport", comfort: 4, tooClose: 1,
      anxiety: "high", nickname: "Mali", captions: "large", speechPace: "slow", noReach: true
    }),
    { mode: "passport", comfort: 4, tooClose: 1 }
  );
});

// ---------------- the journey page opens with only the code printed on the public card ----------------

test("journey passport: the raw anxiety level is replaced by its effects", () => {
  const passport = { code: "ABC234", speed: 1.4, gaze: "soft" };
  const high = toJourneyPassport({ ...passport, anxiety: "high" });
  assert.equal("anxiety" in high, false);
  assert.deepEqual(high, { code: "ABC234", gaze: "soft", speed: 0.5, calm: true });
  assert.deepEqual(toJourneyPassport({ ...passport, anxiety: "medium" }), { code: "ABC234", gaze: "soft", speed: 0.75, calm: false });
  assert.deepEqual(toJourneyPassport({ ...passport, anxiety: "low" }), { code: "ABC234", gaze: "soft", speed: 1.4, calm: false });
});
