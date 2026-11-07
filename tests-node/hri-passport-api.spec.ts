// Integration tests for GET /api/hri/passport/[token] against a running server and a real database.
// Writes test passports, so it refuses to run unless NEON_BRANCH=dev. It cleans up after itself.
//
//   set -a && source ./.env.local && set +a
//   pnpm build && pnpm start &            # or pnpm dev:next
//   PLAYWRIGHT_EXTERNAL_SERVER=1 pnpm exec playwright test tests-node/hri-passport-api.spec.ts
import { randomUUID } from "node:crypto";
import { test, expect } from "@playwright/test";
import pg from "pg";
import { issuePassportTokens } from "../lib/hri/security";

test.skip(process.env.NEON_BRANCH !== "dev", "Writes test data: only runs when NEON_BRANCH=dev.");
test.describe.configure({ mode: "serial" });

// Plain pg instead of the Prisma client: Playwright's ESM loader cannot import generated/prisma.
const db = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
const created: string[] = [];
let active = "";
let expired = "";
let revoked = "";

// Every test calls from its own fake client IP so rate-limit windows never leak between tests.
// (x-forwarded-for is only trusted like this locally; on Vercel the platform sets it.)
const randomIp = () => `198.51.100.${Math.floor(Math.random() * 250) + 1}-${Date.now()}-${Math.random()}`;

// expiredMinutesAgo is turned into a timestamp by Postgres itself: pg would serialise a JS Date in the
// machine's local time zone into a `timestamp without time zone` column and shift it (UTC+7 here).
async function seed(opts: { status?: string; expiredMinutesAgo?: number } = {}) {
  const t = issuePassportTokens();
  const id = `itest_${randomUUID()}`;
  // Test codes start with "1", which real codes never contain, so they can't collide or be confused.
  const code = `1${randomUUID().replace(/-/g, "").slice(0, 5).toUpperCase()}`;
  await db.query(
    `INSERT INTO "HriPassport" ("id","code","nickname","accessTokenHash","editTokenHash","comfortDistance","speed","gaze",
       "voice","language","anxiety","captions","speechPace","noReach","status","expiresAt","updatedAt")
     VALUES ($1,$2,'integration-test',$3,$4,-1.3,1,'soft',true,'th','high','large','slow',true,$5,
       CASE WHEN $6::int IS NULL THEN NULL ELSE (now() AT TIME ZONE 'UTC') - ($6::int * interval '1 minute') END,
       now() AT TIME ZONE 'UTC')`,
    [id, code, t.accessTokenHash, t.editTokenHash, opts.status ?? "active", opts.expiredMinutesAgo ?? null]
  );
  created.push(id);
  return t.accessToken;
}

test.beforeAll(async () => {
  active = await seed();
  expired = await seed({ expiredMinutesAgo: 1 });
  revoked = await seed({ status: "revoked" });
});

test.afterAll(async () => {
  await db.query(`DELETE FROM "HriPassport" WHERE "id" = ANY($1::text[])`, [created]);
  await db.end();
});

test("valid token → 200 robot-facing profile without sensitive fields", async ({ request }) => {
  const res = await request.get(`/api/hri/passport/${active}`, { headers: { "x-forwarded-for": randomIp() } });
  expect(res.status()).toBe(200);
  expect(res.headers()["cache-control"]).toBe("no-store");
  expect(res.headers()["access-control-allow-origin"]).toBe("*");
  const body = await res.json();
  expect(body.schema).toBe("humanoidth.hri-passport/v1");
  expect(body.preferences.distance).toMatchObject({ band: "far", metres: null, sceneUnits: -1.3 });
  expect(body.preferences.movementSpeed).toEqual({ multiplier: 0.5, band: "slow" });
  expect(body.preferences.eyeContact).toEqual({ level: "soft" });
  expect(body.preferences.language).toEqual({ tag: "th", locale: "th-TH" });
  expect(body.preferences.speakingSpeed).toEqual({ pace: "slow", rate: 0.85 });
  const raw = JSON.stringify(body);
  for (const forbidden of ["anxiety", "nickname", "integration-test", "TokenHash", "\"code\"", "\"id\""]) {
    expect(raw, `must not expose ${forbidden}`).not.toContain(forbidden);
  }
});

test("malformed token → 400, unknown token → 404", async ({ request }) => {
  const ip = randomIp();
  const bad = await request.get("/api/hri/passport/MSAJYG", { headers: { "x-forwarded-for": ip } });
  expect(bad.status()).toBe(400);
  expect((await bad.json()).error).toBe("invalid_token");
  const unknown = await request.get(`/api/hri/passport/${"A".repeat(43)}`, { headers: { "x-forwarded-for": ip } });
  expect(unknown.status()).toBe(404);
  expect((await unknown.json()).error).toBe("not_found");
});

test("expired and revoked passports → 410 without profile data", async ({ request }) => {
  const ip = randomIp();
  const e = await request.get(`/api/hri/passport/${expired}`, { headers: { "x-forwarded-for": ip } });
  expect(e.status()).toBe(410);
  expect(await e.json()).toMatchObject({ error: "expired" });
  const r = await request.get(`/api/hri/passport/${revoked}`, { headers: { "x-forwarded-for": ip } });
  expect(r.status()).toBe(410);
  const body = await r.json();
  expect(body.error).toBe("revoked");
  expect(body.preferences).toBeUndefined();
});

test("CORS preflight is answered for robots on other origins", async ({ request }) => {
  const res = await request.fetch(`/api/hri/passport/${active}`, { method: "OPTIONS" });
  expect(res.status()).toBe(204);
  expect(res.headers()["access-control-allow-methods"]).toContain("GET");
});

test("rate limit: request 61 within a minute → 429 with Retry-After", async ({ request }) => {
  const ip = randomIp();
  for (let i = 0; i < 60; i++) {
    const ok = await request.get(`/api/hri/passport/${active}`, { headers: { "x-forwarded-for": ip } });
    expect(ok.status(), `request ${i + 1}`).toBe(200);
  }
  const limited = await request.get(`/api/hri/passport/${active}`, { headers: { "x-forwarded-for": ip } });
  expect(limited.status()).toBe(429);
  expect(Number(limited.headers()["retry-after"])).toBeGreaterThan(0);
});

test("guessing protection: after 20 wrong tokens even a valid token is refused", async ({ request }) => {
  const ip = randomIp();
  for (let i = 0; i < 20; i++) {
    const miss = await request.get(`/api/hri/passport/${"B".repeat(42)}${i % 10}`, { headers: { "x-forwarded-for": ip } });
    expect(miss.status()).toBe(404);
  }
  const blocked = await request.get(`/api/hri/passport/${active}`, { headers: { "x-forwarded-for": ip } });
  expect(blocked.status()).toBe(429);
  // Another client is not affected.
  const other = await request.get(`/api/hri/passport/${active}`, { headers: { "x-forwarded-for": randomIp() } });
  expect(other.status()).toBe(200);
});

test("legacy 6-character code links share the guessing budget", async ({ browser }) => {
  const ip = randomIp();
  const context = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": ip } });
  const page = await context.newPage();
  for (let i = 0; i < 20; i++) {
    await page.goto(`/living-lab/meet/ZZZZ${"23456789AB"[i % 10]}${"CDEFGHJKMN"[Math.floor(i / 10)]}`);
    await expect(page).toHaveURL(/error=not_found/);
  }
  await page.goto("/living-lab/meet/ZZZZZZ");
  await expect(page).toHaveURL(/error=rate_limited/);
  await expect(page.getByText(/Too many incorrect codes/)).toBeVisible();
  await context.close();
});

test("rate-limit storage never contains a raw IP", async () => {
  const { rows } = await db.query<{ key: string }>(`SELECT "key" FROM "HriRateLimit" LIMIT 500`);
  expect(rows.length).toBeGreaterThan(0);
  for (const { key } of rows) expect(key).not.toMatch(/198\.51\.100|\d+\.\d+\.\d+\.\d+/);
});
