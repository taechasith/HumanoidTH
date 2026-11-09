// Adapt a robot-agnostic HRI Passport profile to one robot's capabilities.
//
// This is the heart of "One Profile. Every Robot Understands You.": the passport never contains
// commands for a specific robot. Each robot applies the same preferences within its own hardware.
// Pure and client-safe: no database, no network. Unit-tested in test/hri-adapt.test.ts.
import { describeDistance } from "./passport";
import { distanceCloseness, speedBand, type PublicProfile } from "./public-profile";
import type { RobotProfile } from "./robot-profiles";

export type AdaptationCode =
  | "fixed_base_distance"
  | "fixed_base_speed"
  | "speed_capped"
  | "no_head"
  | "no_arms"
  | "no_speaker";

export type PlanAdaptation = { code: AdaptationCode; value?: string };

export type BehaviourPlan = {
  distance: { sceneUnits: number; band: "close" | "medium" | "far"; closeness: number; fixed: boolean };
  movement: { multiplier: number; band: "slow" | "normal" | "fast"; mobile: boolean };
  eyeContact: "direct" | "soft" | "none";
  eyeMechanism: "head_and_eyes" | "screen_cue" | "none";
  greeting: "wai" | "wave" | "none";
  voice: boolean;
  captions: "normal" | "large";
  language: "th" | "en";
  speechRate: number;
  handover: "hand_to_person" | "place_nearby";
  demeanor: "friendly" | "calm";
  adaptations: PlanAdaptation[];
};

// What a robot does when it has not read a passport: wave, walk close at full speed, stare.
export const DEFAULT_PLAN: BehaviourPlan = {
  distance: { sceneUnits: 1.3, band: "close", closeness: distanceCloseness(1.3), fixed: false },
  movement: { multiplier: 1.4, band: "fast", mobile: true },
  eyeContact: "direct",
  eyeMechanism: "head_and_eyes",
  greeting: "wave",
  voice: true,
  captions: "normal",
  language: "th",
  speechRate: 1,
  handover: "hand_to_person",
  demeanor: "friendly",
  adaptations: []
};

export function adapt(profile: PublicProfile, robot: RobotProfile): BehaviourPlan {
  const preferences = profile.preferences;
  const { capabilities } = robot;
  const adaptations: PlanAdaptation[] = [];

  // A fixed-base robot stays where it is; the preference is still reported, but not applied.
  const fixed = !capabilities.mobile;
  const sceneUnits = fixed ? 0 : preferences.distance.sceneUnits;
  if (fixed) adaptations.push({ code: "fixed_base_distance" });

  // A fixed-base robot does not move, so the movement preference has no effect there.
  let multiplier = preferences.movementSpeed.multiplier;
  if (fixed) {
    multiplier = 0;
    adaptations.push({ code: "fixed_base_speed" });
  } else if (multiplier > capabilities.maxSpeedMultiplier) {
    multiplier = capabilities.maxSpeedMultiplier;
    adaptations.push({ code: "speed_capped", value: `×${capabilities.maxSpeedMultiplier}` });
  }

  // Eye contact needs a head (or at least eyes). A screen can hint at attention, but cannot look.
  let eyeContact: BehaviourPlan["eyeContact"] = preferences.eyeContact.level;
  let eyeMechanism: BehaviourPlan["eyeMechanism"] = "head_and_eyes";
  if (!capabilities.head) {
    eyeContact = "none";
    eyeMechanism = capabilities.screen ? "screen_cue" : "none";
    adaptations.push({ code: "no_head" });
  }

  // Wai and waving need arms; a robot without them asks the person to read the screen instead.
  let greeting: BehaviourPlan["greeting"] = profile.interaction.greeting;
  if (!capabilities.arms && greeting !== "none") {
    greeting = "none";
    adaptations.push({ code: "no_arms" });
  }

  // Handing an item to a person needs arms; otherwise the robot places it nearby, as the passport asks.
  const handover = capabilities.arms ? profile.interaction.handover : "place_nearby";
  if (!capabilities.arms && !adaptations.some((a) => a.code === "no_arms")) {
    adaptations.push({ code: "no_arms" });
  }

  // A robot without a speaker falls back to its screen.
  let voice = profile.interaction.voice;
  if (voice && !capabilities.speaker) {
    voice = false;
    adaptations.push({ code: "no_speaker" });
  }

  return {
    distance: {
      sceneUnits,
      band: describeDistance(sceneUnits).en as "close" | "medium" | "far",
      closeness: distanceCloseness(sceneUnits),
      fixed
    },
    movement: { multiplier, band: speedBand(multiplier), mobile: capabilities.mobile },
    eyeContact,
    eyeMechanism,
    greeting,
    voice,
    captions: profile.interaction.captions,
    language: preferences.language.tag,
    speechRate: preferences.speakingSpeed.rate,
    handover,
    demeanor: profile.interaction.demeanor,
    adaptations
  };
}
