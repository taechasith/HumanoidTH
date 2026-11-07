// Fixed-window rate limiting stored in Postgres (table "HriRateLimit"), so the limit holds across
// all Vercel serverless instances. One atomic upsert per counted request.
// Window maths runs inside Postgres (secondsLeft) so the Node driver's time-zone handling of
// `timestamp without time zone` can never skew it.
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { clientId } from "./security";
import type { RateDecision } from "./passport-api";

type Row = { count: number; secondsLeft: number };

function decide(row: Row | undefined, limit: number, countsThisRequest: boolean): RateDecision {
  if (!row || row.secondsLeft <= 0) return { allowed: true, remaining: limit, retryAfterSeconds: 0 };
  const count = Number(row.count);
  return {
    // consume: the row already includes this request, so it may reach the limit.
    // peek: nothing is counted, so the caller is blocked once the limit is reached.
    allowed: countsThisRequest ? count <= limit : count < limit,
    remaining: Math.max(0, limit - count),
    retryAfterSeconds: Math.ceil(Number(row.secondsLeft))
  };
}

export async function consumeRateLimit(key: string, limit: number, windowSeconds: number): Promise<RateDecision> {
  const rows = await prisma.$queryRaw<Row[]>`
    INSERT INTO "HriRateLimit" AS r ("key", "windowStart", "count")
    VALUES (${key}, now(), 1)
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN r."windowStart" <= now() - (${windowSeconds}::int * interval '1 second')
                     THEN 1 ELSE r."count" + 1 END,
      "windowStart" = CASE WHEN r."windowStart" <= now() - (${windowSeconds}::int * interval '1 second')
                     THEN now() ELSE r."windowStart" END
    RETURNING "count",
      EXTRACT(EPOCH FROM ("windowStart" + (${windowSeconds}::int * interval '1 second') - now()))::float8 AS "secondsLeft"`;
  // Occasionally clear windows older than a day so the table stays small. Not security-relevant.
  if (Math.random() < 0.01) {
    prisma.$executeRaw`DELETE FROM "HriRateLimit" WHERE "windowStart" < now() - interval '1 day'`.catch(() => undefined);
  }
  return decide(rows[0], limit, true);
}

export async function peekRateLimit(key: string, limit: number, windowSeconds: number): Promise<RateDecision> {
  const rows = await prisma.$queryRaw<Row[]>`
    SELECT "count",
      EXTRACT(EPOCH FROM ("windowStart" + (${windowSeconds}::int * interval '1 second') - now()))::float8 AS "secondsLeft"
    FROM "HriRateLimit" WHERE "key" = ${key}`;
  return decide(rows[0], limit, false);
}

// For server actions and server components, which have no Request object.
export async function currentClientId() {
  return clientId(await headers());
}

// Counts one server-action call from this client. The action returns the refusal as data: Next.js
// hides the message of anything thrown from a server action in production.
export async function consumeActionLimit(scope: string, limit: number, windowSeconds: number) {
  return consumeRateLimit(`${scope}:${await currentClientId()}`, limit, windowSeconds);
}
