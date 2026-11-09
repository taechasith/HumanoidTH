// Auto calibration: the person taps once (consent + start); the robot then learns the passport from
// the camera alone. Pure state machine, driven by camera frames: no React, no DOM, no network.
// The UI feeds frames in and turns the returned events into robot motion and speech.
// Unit-tested with synthetic landmark streams in test/hri-auto.test.ts.
//
// What is measured (on-device MediaPipe Pose landmarks only; frames are never stored):
//   wai            → WaiDetector (greeting acknowledged; the robot bows anyway after a timeout)
//   distance       → the robot approaches step by step; a lean-back or sustained step-back means
//                    "too close", leaning in at the last regular step allows the closest step
//   movement speed → a lean-back while the robot is moving means "too fast": it halves its speed
//   eye contact    → while the robot looks straight at the person, the share of time their head is
//                    turned away; mostly away → "soft"
// What is NOT inferred: anxiety (never read from faces), voice, captions, speech pace, handover.
// Those take safe defaults the owner can change on the passport card.
// Accuracy on real people has not been measured yet (see HRI_FEASIBILITY_SPIKE.md §3.4).
import {
  classifyWai, headTurn, isFrontal, LeanBackDetector, shoulderWidth, StillnessDetector, WaiDetector, type Landmark
} from "./signals";

export const AUTO_STEPS = [-2.2, -1.3, -0.4, 0.5] as const; // scene units, same scale as the button flow
export const AUTO_CLOSEST = 1.3; // only offered after the person leans in
const FARTHEST_BACKOFF = -2.4;

export const AUTO_TIMING = {
  baselineMs: 2000, // facing the camera, to learn the person's normal shoulder width
  waiTimeoutMs: 10000,
  afterWaiMs: 2800, // the robot returns the wai and bows
  stepMoveMs: 1600, // divided by the robot's speed
  dwellStillMs: 2000, // calm this long at a step → come one step closer
  dwellMaxMs: 5000, // never wait longer than this at a step
  sustainMs: 1000, // a step back / lean in must last this long
  gazeMs: 5000,
  noPersonGraceMs: 1500, // a dropped frame is not an absence
  abortAfterMs: 25000, // a pause longer than this ends the session
  maxTotalMs: 180000 // hard cap: the flow always ends
} as const;

export const AUTO_THRESHOLDS = {
  retreat: 0.85, // width below 85% of baseline = stepped back
  leanIn: 1.12, // width above 112% of baseline = leaned in
  avertTurn: 0.25, // |headTurn| above this = looking away
  avertShare: 0.35, // looking away more than 35% of the check → soft eye contact
  gazeMinCoverage: 0.4, // need the head visible in 40% of frames to trust the measurement
  darkLuma: 35, // mean frame brightness (0–255) below this = too dark
  minSpeed: 0.35,
  discomfortLeanBacks: 2 // this many lean-backs → slower and farther than measured
} as const;

export type AutoFrame = { tMs: number; landmarks: Landmark[] | null; people: number; luma?: number };
export type PauseReason = "no_person" | "one_person" | "too_dark";
export type AbortReason = PauseReason | "timeout";
export type AutoStage = "baseline" | "greet" | "returning_wai" | "moving" | "dwell" | "gaze" | "complete" | "aborted";

export type AutoResult = {
  greeting: "wai";
  comfortDistance: number;
  speed: number;
  gaze: "direct" | "soft";
  voice: true;
  language: "th" | "en";
  anxiety: "low";
  captions: "normal";
  speechPace: "normal";
  noReach: true;
};

export type AutoEvidence = {
  waiDetected: boolean;
  leanBacks: number;
  tooFast: number;
  leanIn: boolean;
  distanceReason: string;
  gazeMeasured: boolean;
  avertShare: number | null;
  pauses: number;
  durationSeconds: number;
};

export type AutoEvent =
  | { type: "stage"; stage: AutoStage }
  | { type: "paused"; reason: PauseReason }
  | { type: "resumed" }
  | { type: "wai_progress"; progress: number }
  | { type: "wai_received" }
  | { type: "wai_timeout" }
  | { type: "step"; index: number; distance: number; speed: number }
  | { type: "too_fast"; speed: number; retreatTo: number }
  | { type: "too_close"; backTo: number }
  | { type: "lean_in" }
  | { type: "distance_set"; distance: number; speed: number; reason: string }
  | { type: "gaze_check" }
  | { type: "complete"; result: AutoResult; evidence: AutoEvidence }
  | { type: "aborted"; reason: AbortReason };

const round2 = (v: number) => Math.round(v * 100) / 100;

export class AutoCalibrator {
  stage: AutoStage = "baseline";
  stepIndex = 0;
  distance: number = AUTO_STEPS[0];
  speed = 1;
  baseline = NaN;

  private startT = NaN;
  private stageStart = NaN;
  private widths: number[] = [];
  private wai = new WaiDetector();
  private lean = new LeanBackDetector();
  private still = new StillnessDetector();
  private stillSince: number | null = null;
  private retreatSince: number | null = null;
  private leanInSince: number | null = null;
  private missingSince: number | null = null;
  private paused: PauseReason | null = null;
  private pausedAt = 0;
  private lastT = 0;

  private waiDetected = false;
  private leanBacks = 0;
  private tooFast = 0;
  private leanIn = false;
  private pauses = 0;
  private finalDistance: number | null = null;
  private distanceReason = "";
  private gazeFrames = 0;
  private gazeVisible = 0;
  private gazeAway = 0;

  constructor(private readonly language: "th" | "en") {}

  update(frame: AutoFrame): AutoEvent[] {
    const out: AutoEvent[] = [];
    if (this.stage === "complete" || this.stage === "aborted") return out;
    const t = frame.tMs;
    this.lastT = t;
    if (Number.isNaN(this.startT)) {
      this.startT = t;
      this.enter("baseline", t, out);
    }
    if (t - this.startT > AUTO_TIMING.maxTotalMs) return this.abort("timeout", out);

    // ---- pauses: too dark, more than one person, nobody in view ----
    const reason = this.pauseReason(frame);
    if (reason === "no_person" && !this.paused) {
      this.missingSince ??= t;
      if (t - this.missingSince < AUTO_TIMING.noPersonGraceMs) return out;
    }
    if (reason) {
      if (!this.paused) {
        this.paused = reason;
        this.pausedAt = t;
        this.pauses++;
        out.push({ type: "paused", reason });
      } else if (this.paused !== reason) {
        this.paused = reason;
        out.push({ type: "paused", reason });
      }
      if (t - this.pausedAt > AUTO_TIMING.abortAfterMs) return this.abort(reason, out);
      return out;
    }
    this.missingSince = null;
    if (this.paused) {
      // Time spent paused does not count against the current stage, and old signal history is dropped
      // so a person walking back into view is not mistaken for a lean-back.
      this.stageStart += t - this.pausedAt;
      this.paused = null;
      this.lean.reset();
      this.still.reset();
      this.wai = new WaiDetector();
      this.stillSince = this.retreatSince = this.leanInSince = null;
      out.push({ type: "resumed" });
    }

    const lm = frame.landmarks!;
    const width = shoulderWidth(lm);
    const frontal = isFrontal(lm);
    const elapsed = t - this.stageStart;

    switch (this.stage) {
      case "baseline": {
        if (frontal) this.widths.push(width);
        if (elapsed >= AUTO_TIMING.baselineMs && this.widths.length >= 10) {
          const sorted = [...this.widths].sort((a, b) => a - b);
          this.baseline = sorted[Math.floor(sorted.length / 2)];
          this.enter("greet", t, out);
        }
        break;
      }
      case "greet": {
        const s = this.wai.update(t, classifyWai(lm));
        if (s.state === "rising") out.push({ type: "wai_progress", progress: round2(s.progress) });
        if (s.state === "fired") {
          this.waiDetected = true;
          out.push({ type: "wai_received" });
          this.enter("returning_wai", t, out);
        } else if (elapsed >= AUTO_TIMING.waiTimeoutMs) {
          out.push({ type: "wai_timeout" });
          this.enter("returning_wai", t, out);
        }
        break;
      }
      case "returning_wai": {
        if (elapsed >= AUTO_TIMING.afterWaiMs) this.moveTo(1, t, out);
        break;
      }
      case "moving": {
        if (frontal && this.lean.update(t, width)) return this.onLeanBack("moving", t, out);
        if (elapsed >= AUTO_TIMING.stepMoveMs / this.speed) this.enter("dwell", t, out);
        break;
      }
      case "dwell": {
        if (frontal && this.lean.update(t, width)) return this.onLeanBack("dwell", t, out);

        // A sustained step back (not just a quick lean) also means "too close".
        if (frontal && width < this.baseline * AUTO_THRESHOLDS.retreat) {
          this.retreatSince ??= t;
          if (t - this.retreatSince >= AUTO_TIMING.sustainMs) return this.onLeanBack("dwell", t, out);
        } else this.retreatSince = null;

        const atLastRegular = this.stepIndex === AUTO_STEPS.length - 1;
        const atClosest = this.stepIndex === AUTO_STEPS.length;

        // Leaning in at the last regular step is the only way to the closest step.
        if (atLastRegular && frontal && width > this.baseline * AUTO_THRESHOLDS.leanIn) {
          this.leanInSince ??= t;
          if (t - this.leanInSince >= AUTO_TIMING.sustainMs) {
            this.leanIn = true;
            out.push({ type: "lean_in" });
            this.moveTo(AUTO_STEPS.length, t, out);
            break;
          }
        } else this.leanInSince = null;

        if (this.still.update(t, width)) this.stillSince ??= t;
        else this.stillSince = null;
        const calm = this.stillSince !== null && t - this.stillSince >= AUTO_TIMING.dwellStillMs;

        if (atClosest) {
          if (calm || elapsed >= AUTO_TIMING.dwellMaxMs) this.setDistance(AUTO_CLOSEST, "closest_after_lean_in", t, out);
        } else if (atLastRegular) {
          // Give the person the full dwell to lean in before settling here.
          if (elapsed >= AUTO_TIMING.dwellMaxMs) this.setDistance(this.distance, "closest_offered", t, out);
        } else if (calm || elapsed >= AUTO_TIMING.dwellMaxMs) {
          this.moveTo(this.stepIndex + 1, t, out);
        }
        break;
      }
      case "gaze": {
        this.gazeFrames++;
        const turn = headTurn(lm);
        if (Number.isFinite(turn)) {
          this.gazeVisible++;
          if (Math.abs(turn) > AUTO_THRESHOLDS.avertTurn) this.gazeAway++;
        }
        if (elapsed >= AUTO_TIMING.gazeMs) this.complete(t, out);
        break;
      }
    }
    return out;
  }

  // ---------------- transitions ----------------

  private pauseReason(frame: AutoFrame): PauseReason | null {
    if (frame.luma !== undefined && frame.luma < AUTO_THRESHOLDS.darkLuma) return "too_dark";
    if (frame.people > 1) return "one_person";
    if (!frame.landmarks || !Number.isFinite(shoulderWidth(frame.landmarks))) return "no_person";
    return null;
  }

  private enter(stage: AutoStage, t: number, out: AutoEvent[]) {
    this.stage = stage;
    this.stageStart = t;
    this.stillSince = this.retreatSince = this.leanInSince = null;
    this.still.reset();
    out.push({ type: "stage", stage });
  }

  private moveTo(index: number, t: number, out: AutoEvent[]) {
    this.stepIndex = index;
    this.distance = index >= AUTO_STEPS.length ? AUTO_CLOSEST : AUTO_STEPS[index];
    out.push({ type: "step", index, distance: this.distance, speed: this.speed });
    this.enter("moving", t, out);
  }

  // The first lean-back while the robot is moving is read as "too fast": it slows down, steps back
  // one step and tries again. Any other lean-back is "too close" and ends the approach.
  private onLeanBack(context: "moving" | "dwell", t: number, out: AutoEvent[]) {
    this.leanBacks++;
    if (context === "moving" && this.tooFast === 0) {
      this.tooFast++;
      this.speed = Math.max(AUTO_THRESHOLDS.minSpeed, round2(this.speed * 0.5));
      this.stepIndex = Math.max(0, this.stepIndex - 1);
      this.distance = AUTO_STEPS[this.stepIndex];
      out.push({ type: "too_fast", speed: this.speed, retreatTo: this.distance });
      this.enter("dwell", t, out);
      return out;
    }
    const backTo = round2(Math.max(FARTHEST_BACKOFF, this.distance - 0.8));
    out.push({ type: "too_close", backTo });
    this.setDistance(backTo, "too_close", t, out);
    return out;
  }

  private setDistance(distance: number, reason: string, t: number, out: AutoEvent[]) {
    let d = distance;
    let why = reason;
    // Several lean-backs mean the whole approach was uncomfortable: keep more distance and move slower.
    // This replaces asking about (or guessing) anxiety.
    if (this.leanBacks >= AUTO_THRESHOLDS.discomfortLeanBacks) {
      d = Math.max(FARTHEST_BACKOFF, d - 0.4);
      this.speed = Math.min(this.speed, 0.5);
      why += "+discomfort";
    }
    this.finalDistance = round2(d);
    this.distance = this.finalDistance;
    this.distanceReason = why;
    out.push({ type: "distance_set", distance: this.finalDistance, speed: this.speed, reason: why });
    this.enter("gaze", t, out);
    out.push({ type: "gaze_check" });
  }

  private complete(t: number, out: AutoEvent[]) {
    const coverage = this.gazeFrames ? this.gazeVisible / this.gazeFrames : 0;
    const measured = coverage >= AUTO_THRESHOLDS.gazeMinCoverage && this.gazeVisible > 0;
    const avertShare = measured ? round2(this.gazeAway / this.gazeVisible) : null;
    // If eye contact could not be measured, choose the less intrusive option.
    const gaze = avertShare === null || avertShare > AUTO_THRESHOLDS.avertShare ? "soft" : "direct";
    const result: AutoResult = {
      greeting: "wai",
      comfortDistance: this.finalDistance ?? AUTO_STEPS[0],
      speed: this.speed,
      gaze,
      voice: true,
      language: this.language,
      anxiety: "low",
      captions: "normal",
      speechPace: "normal",
      noReach: true
    };
    const evidence: AutoEvidence = {
      waiDetected: this.waiDetected,
      leanBacks: this.leanBacks,
      tooFast: this.tooFast,
      leanIn: this.leanIn,
      distanceReason: this.distanceReason,
      gazeMeasured: measured,
      avertShare,
      pauses: this.pauses,
      durationSeconds: round2((t - this.startT) / 1000)
    };
    this.stage = "complete";
    out.push({ type: "stage", stage: "complete" }, { type: "complete", result, evidence });
  }

  private abort(reason: AbortReason, out: AutoEvent[]) {
    this.stage = "aborted";
    out.push({ type: "stage", stage: "aborted" }, { type: "aborted", reason });
    return out;
  }

  // Seconds since the session started, for logs.
  get seconds() {
    return Number.isNaN(this.startT) ? 0 : round2((this.lastT - this.startT) / 1000);
  }
}
