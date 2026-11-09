import { z } from "zod";

// An HRI Passport carries how a person likes robots to behave around them.
// Distances are in the 3D stage's units: higher = closer to the person (range -3 .. 1.8).
export const passportSchema = z.object({
  nickname: z.string().trim().max(40).optional().nullable(),
  greeting: z.enum(["wai", "wave", "none"]).default("wai"),
  comfortDistance: z.number().min(-3).max(1.8),
  speed: z.number().min(0.25).max(2),
  gaze: z.enum(["direct", "soft"]),
  voice: z.boolean(),
  language: z.enum(["th", "en"]),
  // Care needs
  anxiety: z.enum(["low", "medium", "high"]).default("low"),
  captions: z.enum(["normal", "large"]).default("normal"),
  speechPace: z.enum(["normal", "slow"]).default("normal"),
  noReach: z.boolean().default(false)
});
export type PassportInput = z.infer<typeof passportSchema>;

export const sessionEventSchema = z.object({
  t: z.number(),
  src: z.enum(["robot", "human"]),
  type: z.string().max(40)
}).passthrough();

export const sessionSchema = z.object({
  protocol: z.enum(["wai_first_calibration", "passport_meeting", "care_journey_station"]),
  inputMode: z.enum(["buttons", "camera", "voice", "auto"]),
  robotModelId: z.string().max(40).optional().nullable(),
  events: z.array(sessionEventSchema).max(400),
  summary: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])).default({})
});
export type SessionInput = z.infer<typeof sessionSchema>;

// Short human-typable code without look-alike characters (no 0/O, 1/I/L).
// The code is a convenience for typing, not a secret: robot API access uses a 256-bit token
// (lib/hri/security.ts), and code lookups are rate-limited.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

// Uniform integer in [0, max) from the Web Crypto CSPRNG (available in browsers and Node 20+),
// using rejection sampling so no character is more likely than another.
function secureRandomInt(max: number) {
  const limit = Math.floor(0x100000000 / max) * max;
  const buffer = new Uint32Array(1);
  do globalThis.crypto.getRandomValues(buffer);
  while (buffer[0] >= limit);
  return buffer[0] % max;
}

export function newPassportCode(randomInt: (max: number) => number = secureRandomInt) {
  let code = "";
  for (let i = 0; i < 6; i++) code += ALPHABET[randomInt(ALPHABET.length)];
  return code;
}
export const normalizePassportCode = (raw: string) => raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);

// Plain-language description of a distance setting, for UI and analytics.
export function describeDistance(z: number) {
  if (z >= 0.9) return { en: "close", th: "ใกล้" };
  if (z >= -0.6) return { en: "medium", th: "ปานกลาง" };
  return { en: "far", th: "ห่าง" };
}

// Movement speed a robot should actually use: anxious people get a slower robot.
// Same rule the hospital journey has always applied (MeetClient careSpeed).
export function careSpeed(speed: number, anxiety: string) {
  if (anxiety === "high") return Math.min(speed, 0.5);
  if (anxiety === "medium") return Math.min(speed, 0.75);
  return speed;
}
