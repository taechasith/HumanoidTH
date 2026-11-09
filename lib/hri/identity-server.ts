// Wires the identity module to production adapters (Postgres, EmailJS, the shared rate limiter)
// and to the participant cookie. Server-only.
import { cookies } from "next/headers";
import { createIdentity, DEV_ONLY_IDENTITY_SECRET, identityRequiredFromEnv, type Identity, type OtpMailer, type Participant } from "./identity";
import { emailJsConfigFromEnv, emailJsMailer } from "./identity-emailjs";
import { prismaIdentityStore } from "./identity-store";
import { consumeRateLimit, releaseRateLimit } from "./rate-limit";

// Scoped to the Living Lab: the cookie is never sent to the rest of the site.
export const PARTICIPANT_COOKIE = "hri_participant";
export const PARTICIPANT_COOKIE_PATH = "/living-lab";

// Local development without EmailJS keys: print the code to the server terminal instead.
// Never used in production, where missing keys make the feature unavailable.
const devConsoleMailer: OtpMailer = {
  async send({ toEmail, code }) {
    console.warn(`[living-lab identity] EmailJS is not configured. Code for ${toEmail}: ${code}`);
  }
};

// Production without EmailJS keys: sessions still read, but sending reports "unavailable".
const notConfiguredMailer: OtpMailer = {
  async send() {
    throw new Error("EmailJS is not configured.");
  }
};

function chooseMailer(): OtpMailer {
  const config = emailJsConfigFromEnv();
  if (config) return emailJsMailer(config);
  return process.env.NODE_ENV === "production" ? notConfiguredMailer : devConsoleMailer;
}

// Whether a code can actually be sent (EmailJS keys present, or local dev with the console mailer).
export function canSendCodes(): boolean {
  return emailJsConfigFromEnv() !== null || process.env.NODE_ENV !== "production";
}

let cached: Identity | null | undefined;

// Returns null only when HRI_IDENTITY_SECRET is missing in production.
export function getIdentity(): Identity | null {
  if (cached !== undefined) return cached;
  const secret = process.env.HRI_IDENTITY_SECRET?.trim() || (process.env.NODE_ENV === "production" ? "" : DEV_ONLY_IDENTITY_SECRET);
  cached = secret.length >= 16
    ? createIdentity({ mailer: chooseMailer(), store: prismaIdentityStore, consume: consumeRateLimit, release: releaseRateLimit, now: () => new Date(), secret })
    : null;
  return cached;
}

// HRI_IDENTITY_REQUIRED=true makes email verification required. Default: optional.
export function identityRequired(): boolean {
  return identityRequiredFromEnv(process.env.HRI_IDENTITY_REQUIRED);
}

// The verified participant behind this request's cookie, or null. Throws if the database cannot
// answer, so a caller never saves a passport without an owner just because of an outage.
export async function currentParticipant(): Promise<Participant | null> {
  const identity = getIdentity();
  if (!identity) return null;
  const token = (await cookies()).get(PARTICIPANT_COOKIE)?.value;
  try {
    return await identity.readSession(token);
  } catch (error) {
    console.error("Living Lab identity: could not read the session:", error instanceof Error ? error.message : "unknown error");
    throw error;
  }
}
