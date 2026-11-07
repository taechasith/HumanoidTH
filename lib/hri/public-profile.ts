// The robot-facing view of an HRI Passport: what any robot may read to adapt its behaviour.
// Robot-agnostic by design: it states preferences and units, not commands for one robot model.
//
// Data minimisation: never includes the passport id, 6-character code, nickname, the raw anxiety
// level, consent/creation timestamps, token hashes or any session log. Anxiety only shows up as
// its *effect* (a slower movement multiplier and a calm demeanour), which a robot needs in order to adapt.
import { careSpeed, describeDistance } from "./passport";

export const PROFILE_SCHEMA = "humanoidth.hri-passport/v1";

// The Living Lab stores distance in the 3D stage's scene units (see lib/hri/behavior-engine.ts setDistance).
export const SCENE_DISTANCE_RANGE = { far: -3, close: 1.8 } as const;

export type PassportProfileSource = {
  comfortDistance: number;
  speed: number;
  gaze: string;
  language: string;
  speechPace: string;
  greeting: string;
  voice: boolean;
  captions: string;
  noReach: boolean;
  anxiety: string;
  status: string;
  version: number;
  updatedAt: Date;
  expiresAt: Date | null;
};

const round = (value: number, digits = 2) => Number(value.toFixed(digits));

// 0 = as far as the stage allows, 1 = as close as the stage allows.
export function distanceCloseness(sceneUnits: number) {
  const { far, close } = SCENE_DISTANCE_RANGE;
  return round(Math.min(1, Math.max(0, (sceneUnits - far) / (close - far))));
}

export function speedBand(multiplier: number): "slow" | "normal" | "fast" {
  if (multiplier < 0.9) return "slow";
  if (multiplier > 1.1) return "fast";
  return "normal";
}

export function toPublicProfile(p: PassportProfileSource) {
  const language = p.language === "en" ? "en" : "th";
  const pace = p.speechPace === "slow" ? "slow" : "normal";
  const movement = careSpeed(p.speed, p.anxiety);
  return {
    schema: PROFILE_SCHEMA,
    status: p.status === "active" ? ("active" as const) : ("revoked" as const),
    version: p.version,
    updatedAt: p.updatedAt.toISOString(),
    expiresAt: p.expiresAt ? p.expiresAt.toISOString() : null,
    preferences: {
      distance: {
        band: describeDistance(p.comfortDistance).en as "close" | "medium" | "far",
        closeness: distanceCloseness(p.comfortDistance),
        sceneUnits: round(p.comfortDistance),
        // No validated scene-units-to-metres conversion exists yet, so metres are deliberately not reported.
        metres: null
      },
      movementSpeed: { multiplier: round(movement), band: speedBand(movement) },
      eyeContact: { level: p.gaze === "direct" ? ("direct" as const) : ("soft" as const) },
      language: { tag: language as "th" | "en", locale: language === "th" ? "th-TH" : "en-US" },
      speakingSpeed: { pace, rate: pace === "slow" ? 0.85 : 1 }
    },
    interaction: {
      greeting: (p.greeting === "wave" || p.greeting === "none" ? p.greeting : "wai") as "wai" | "wave" | "none",
      voice: p.voice,
      captions: p.captions === "large" ? ("large" as const) : ("normal" as const),
      handover: p.noReach ? ("place_nearby" as const) : ("hand_to_person" as const),
      demeanor: p.anxiety === "high" ? ("calm" as const) : ("friendly" as const)
    },
    units: {
      distance:
        "band: close | medium | far. closeness: 0 (farthest) to 1 (closest) across the HumanoidTH stage range. " +
        "sceneUnits: raw 3D stage value (-3 far .. 1.8 close). metres: null until a conversion is defined. " +
        "Each robot maps the band or closeness to its own safe physical distance.",
      movementSpeed: "multiplier of the robot's own nominal speed (1 = default). Already reduced for comfort needs.",
      speakingSpeed: "rate: multiplier of the robot's normal speech rate (Web Speech API scale, 1 = default)."
    }
  };
}

export type PublicProfile = ReturnType<typeof toPublicProfile>;

// What the hospital journey page may send to the browser. Anyone holding the 6-character code can
// open that page and the code is printed on the public card, so the raw anxiety level is replaced
// by its effects, the same ones the robot API exposes: a capped speed and a calm demeanour.
export function toJourneyPassport<T extends { speed: number; anxiety: string }>(passport: T) {
  const { anxiety, ...rest } = passport;
  return { ...rest, speed: careSpeed(passport.speed, anxiety), calm: anxiety === "high" };
}
