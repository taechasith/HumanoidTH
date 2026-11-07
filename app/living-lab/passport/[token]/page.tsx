import type { Metadata } from "next";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { API_LIMITS } from "@/lib/hri/passport-api";
import { consumeRateLimit, currentClientId, peekRateLimit } from "@/lib/hri/rate-limit";
import { hashToken, isWellFormedToken } from "@/lib/hri/security";
import { cardCopy, type CardLang } from "../copy";
import PassportCardClient, { type CardPassport } from "./PassportCardClient";
import styles from "../passport.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My HRI Passport | HRI Living Lab",
  description: "The owner's view of an HRI Passport: one profile every robot understands.",
  robots: { index: false, follow: false }
};

type Params = Promise<{ token: string }>;

const PASSPORT_FIELDS = {
  code: true,
  greeting: true,
  comfortDistance: true,
  speed: true,
  gaze: true,
  voice: true,
  language: true,
  captions: true,
  speechPace: true,
  noReach: true,
  status: true,
  version: true,
  createdAt: true,
  updatedAt: true,
  expiresAt: true
} as const;

type PassportRow = {
  code: string;
  greeting: string;
  comfortDistance: number;
  speed: number;
  gaze: string;
  voice: boolean;
  language: string;
  captions: string;
  speechPace: string;
  noReach: boolean;
  status: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date | null;
};

type CardState =
  | { state: "ok"; passport: PassportRow }
  | { state: "rate_limited" }
  | { state: "not_found" };

// The card is protected like the API: an unknown token counts toward the shared failed-lookup
// budget, and every caller gets the same per-minute request budget as a robot would.
async function loadCard(token: string): Promise<CardState> {
  const caller = await currentClientId();
  const { requests, misses } = API_LIMITS;
  if (!(await consumeRateLimit(`card:${caller}`, requests.limit, requests.windowSeconds)).allowed) {
    return { state: "rate_limited" };
  }
  if (!(await peekRateLimit(`miss:${caller}`, misses.limit, misses.windowSeconds)).allowed) {
    return { state: "rate_limited" };
  }
  if (!isWellFormedToken(token)) {
    await consumeRateLimit(`miss:${caller}`, misses.limit, misses.windowSeconds);
    return { state: "not_found" };
  }
  const passport = await prisma.hriPassport.findUnique({
    where: { accessTokenHash: hashToken(token) },
    select: PASSPORT_FIELDS
  });
  if (!passport) {
    await consumeRateLimit(`miss:${caller}`, misses.limit, misses.windowSeconds);
    return { state: "not_found" };
  }
  return { state: "ok", passport };
}

function formatDate(value: Date, lang: CardLang) {
  return new Intl.DateTimeFormat(lang === "th" ? "th-TH" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok"
  }).format(value);
}

function Notice({ lang, title, body }: { lang: CardLang; title: string; body: string }) {
  return (
    <main className={styles.page}>
      <section className={styles.screen}>
        <h1>{title}</h1>
        <p>{body}</p>
        <p>
          <a className={styles.btn} href="/living-lab">{cardCopy[lang].backToLab}</a>
        </p>
      </section>
    </main>
  );
}

export default async function PassportCardPage({ params }: { params: Params }) {
  const { token } = await params;
  const lang = (((await cookies()).get("lang")?.value === "th" ? "th" : "en") as CardLang);
  const t = cardCopy[lang];

  let result: CardState;
  try {
    result = await loadCard(token);
  } catch (error) {
    console.error("HRI passport card unavailable", error);
    return <Notice lang={lang} title={t.unavailableTitle} body={t.unavailableBody} />;
  }

  if (result.state === "rate_limited") {
    return <Notice lang={lang} title={t.tooManyTitle} body={t.tooManyBody} />;
  }
  if (result.state === "not_found") {
    return <Notice lang={lang} title={t.notFoundTitle} body={t.notFoundBody} />;
  }

  const p = result.passport;
  const expired = p.expiresAt ? p.expiresAt.getTime() <= Date.now() : false;
  const status: CardPassport["passport"]["status"] = p.status !== "active" ? "revoked" : expired ? "expired" : "active";

  return (
    <PassportCardClient
      lang={lang}
      token={token}
      passport={{
        code: p.code,
        greeting: p.greeting,
        comfortDistance: p.comfortDistance,
        speed: p.speed,
        gaze: p.gaze,
        voice: p.voice,
        language: p.language,
        captions: p.captions,
        speechPace: p.speechPace,
        noReach: p.noReach,
        status,
        version: p.version,
        createdAtLabel: formatDate(p.createdAt, lang),
        updatedAtLabel: formatDate(p.updatedAt, lang),
        expiresAtLabel: p.expiresAt ? formatDate(p.expiresAt, lang) : null
      }}
    />
  );
}
