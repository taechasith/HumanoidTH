import assert from "node:assert/strict";
import { test } from "node:test";
import { findSpeechRecognition, listenOnce, type Recognition } from "../lib/hri/speech-input";
import { passportSchema, sessionSchema } from "../lib/hri/passport";
import { minimiseEvents, minimiseSummary } from "../lib/hri/session-privacy";
import { matchFirstVoiceAnswer, matchVoiceAnswer, VOICE_QUESTIONS, type VoiceQuestion } from "../lib/hri/voice-answers";

// ---------------- understanding an answer ----------------

test("voice: every question understands Thai and English", () => {
  const cases: [VoiceQuestion, string, string][] = [
    ["greet", "สวัสดีครับ", "wai"],
    ["greet", "Hello robot", "wai"],
    ["approach", "ไปต่อเลย", "continue"],
    ["approach", "ตรงนี้พอดี", "comfortable"],
    ["approach", "ใกล้เกินไปแล้ว", "too_close"],
    ["approach", "เร็วไปหน่อย", "too_fast"],
    ["approach", "That is too close", "too_close"],
    ["approach", "please slow down", "too_fast"],
    ["anxiety", "กังวลนิดหน่อย", "medium"],
    ["anxiety", "กังวลมาก", "high"],
    ["anxiety", "ไม่กังวลเลย", "low"],
    ["anxiety", "a bit nervous", "medium"],
    ["anxiety", "very nervous", "high"],
    ["communication", "พูดช้าหน่อย", "accessible"],
    ["communication", "ปกติ", "normal"],
    ["reach", "ยื่นให้ได้", "ok"],
    ["reach", "ไม่ต้องยื่น วางไว้", "avoid"],
    ["reach", "no, place it nearby", "avoid"],
    ["gaze", "มองได้เลย", "direct"],
    ["gaze", "ไม่ต้องมอง", "soft"],
    ["gaze", "please look away", "soft"],
    ["voice", "พูดออกเสียง", "on"],
    ["voice", "ไม่ต้องพูด ข้อความอย่างเดียว", "off"],
    ["voice", "text only", "off"],
    ["confirm", "บันทึกได้เลย", "save"]
  ];
  for (const [question, said, expected] of cases) {
    assert.equal(matchVoiceAnswer(question, said), expected, `${question}: ${said}`);
  }
});

test("voice: negation is not read as the answer it negates", () => {
  assert.equal(matchVoiceAnswer("approach", "ไม่ใกล้ไป"), null);
  assert.equal(matchVoiceAnswer("approach", "not too close"), null);
  assert.equal(matchVoiceAnswer("gaze", "ไม่สบตา"), "soft");
  assert.equal(matchVoiceAnswer("gaze", "ไม่ได้"), "soft");
  assert.equal(matchVoiceAnswer("reach", "ไม่ได้"), "avoid");
  assert.equal(matchVoiceAnswer("voice", "ไม่พูด"), "off");
  assert.equal(matchVoiceAnswer("confirm", "don't save"), null);
});

test("voice: unclear speech changes nothing", () => {
  for (const said of ["", "   ", "banana", "กล้วยหอม"]) {
    for (const question of Object.keys(VOICE_QUESTIONS) as VoiceQuestion[]) {
      assert.equal(matchVoiceAnswer(question, said), null, `${question}: "${said}"`);
    }
  }
});

test("voice: words pointing to different answers are refused rather than guessed", () => {
  assert.equal(matchVoiceAnswer("voice", "speak text"), null);
  assert.equal(matchVoiceAnswer("communication", "normal large"), null);
  assert.equal(matchVoiceAnswer("approach", "ตรงนี้ใกล้ไป"), null);
});

test("voice: English words must stand alone", () => {
  assert.equal(matchVoiceAnswer("gaze", "I know"), null, "'no' is not in 'know'");
  assert.equal(matchVoiceAnswer("greet", "this"), null, "'hi' is not in 'this'");
});

test("voice: the first clear guess among the recogniser's alternatives is used", () => {
  assert.deepEqual(matchFirstVoiceAnswer("approach", ["พอดีกัน", "ใกล้ไป"]), { answer: "comfortable", transcript: "พอดีกัน" });
  assert.deepEqual(matchFirstVoiceAnswer("approach", ["banana", "too fast"]), { answer: "too_fast", transcript: "too fast" });
  assert.equal(matchFirstVoiceAnswer("approach", ["banana"]), null);
  assert.equal(matchFirstVoiceAnswer("approach", []), null);
});

test("voice: every answer can be stored by the existing passport schema", () => {
  const anxiety = Object.keys(VOICE_QUESTIONS.anxiety);
  for (const level of anxiety) {
    assert.equal(
      passportSchema.safeParse({ comfortDistance: 0, speed: 1, gaze: "soft", voice: true, language: "th", anxiety: level }).success,
      true,
      level
    );
  }
  assert.equal(
    sessionSchema.safeParse({ protocol: "wai_first_calibration", inputMode: "voice", events: [], summary: {} }).success,
    true,
    "voice is a valid session input mode"
  );
});

// ---------------- what was said is never kept ----------------

test("voice: a transcript never reaches a stored session", () => {
  const events = minimiseEvents([{ t: 1, src: "human", type: "voice_answer", transcript: "กังวลมาก" }]);
  assert.equal(JSON.stringify(events).includes("กังวล"), false);
  assert.equal("transcript" in minimiseSummary({ transcript: "กังวลมาก", comfort: 4 }), false);
});

// ---------------- the browser's recogniser ----------------

function fakeRecognition(failOnStart = false) {
  const made: Recognition[] = [];
  let aborted = 0;
  class Fake implements Recognition {
    lang = "";
    interimResults = true;
    continuous = true;
    maxAlternatives = 1;
    onresult: Recognition["onresult"] = null;
    onerror: Recognition["onerror"] = null;
    onend: Recognition["onend"] = null;
    constructor() { made.push(this); }
    start() { if (failOnStart) throw new Error("already started"); }
    abort() { aborted++; }
  }
  return { Fake, made, aborted: () => aborted };
}

test("speech: finds the standard or prefixed recogniser, or reports none", () => {
  const { Fake } = fakeRecognition();
  assert.equal(findSpeechRecognition({ SpeechRecognition: Fake }), Fake);
  assert.equal(findSpeechRecognition({ webkitSpeechRecognition: Fake }), Fake);
  assert.equal(findSpeechRecognition({}), null);
});

test("speech: listens once in the page language and returns the guesses once", () => {
  const { Fake, made } = fakeRecognition();
  const results: unknown[] = [];
  listenOnce(Fake, "th", (r) => results.push(r));
  const recognition = made[0];
  assert.equal(recognition.lang, "th-TH");
  assert.equal(recognition.continuous, false);
  assert.equal(recognition.maxAlternatives, 3);
  recognition.onresult?.({ results: [[{ transcript: "พอดี" }, { transcript: "พอที" }]] });
  recognition.onend?.();
  assert.deepEqual(results, [{ alternatives: ["พอดี", "พอที"], problem: null }]);
});

test("speech: failures become problems the person can act on", () => {
  const cases: [string, string][] = [
    ["not-allowed", "denied"], ["service-not-allowed", "denied"],
    ["no-speech", "no_speech"], ["network", "unavailable"], ["audio-capture", "unavailable"]
  ];
  for (const [error, problem] of cases) {
    const { Fake, made } = fakeRecognition();
    const results: { problem: string | null }[] = [];
    listenOnce(Fake, "en", (r) => results.push(r));
    made[0].onerror?.({ error });
    made[0].onend?.();
    assert.deepEqual(results.map((r) => r.problem), [problem], error);
  }
});

test("speech: ending with no result counts as hearing nothing, and start errors are reported", () => {
  const silent = fakeRecognition();
  const heard: { problem: string | null }[] = [];
  listenOnce(silent.Fake, "en", (r) => heard.push(r));
  silent.made[0].onend?.();
  assert.equal(heard[0].problem, "no_speech");

  const broken = fakeRecognition(true);
  const failed: { problem: string | null }[] = [];
  listenOnce(broken.Fake, "en", (r) => failed.push(r));
  assert.equal(failed[0].problem, "unavailable");
});

test("speech: nothing is reported after stopping", () => {
  const { Fake, made, aborted } = fakeRecognition();
  const results: unknown[] = [];
  const stop = listenOnce(Fake, "en", (r) => results.push(r));
  stop();
  made[0].onresult?.({ results: [[{ transcript: "too close" }]] });
  made[0].onerror?.({ error: "aborted" });
  assert.equal(aborted(), 1);
  assert.deepEqual(results, []);
});
