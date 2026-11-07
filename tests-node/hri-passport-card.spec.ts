// Integration tests for the HRI Passport card (/living-lab/passport/[token]): public view,
// owner unlock, edit, version bump and hard delete. Writes test passports, so it refuses to run
// unless NEON_BRANCH=dev. It cleans up after itself.
//
//   set -a && source ./.env.local && set +a
//   pnpm build && pnpm start &            # or next start
//   PLAYWRIGHT_EXTERNAL_SERVER=1 pnpm exec playwright test tests-node/hri-passport-card.spec.ts
import { randomUUID } from "node:crypto";
import { test, expect, type Browser } from "@playwright/test";
import pg from "pg";
import { issuePassportTokens } from "../lib/hri/security";

test.skip(process.env.NEON_BRANCH !== "dev", "Writes test data: only runs when NEON_BRANCH=dev.");
test.describe.configure({ mode: "serial" });

// Plain pg instead of the Prisma client: Playwright's ESM loader cannot import generated/prisma.
const db = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
const created: string[] = [];

// Every test calls from its own fake client IP so rate-limit windows never leak between tests.
const randomIp = () => `203.0.113.${Math.floor(Math.random() * 250) + 1}-${Date.now()}-${Math.random()}`;

async function seed(nickname = "integration-test") {
  const tokens = issuePassportTokens();
  const id = `itest_${randomUUID()}`;
  // Test codes start with "1", which real codes never contain.
  const code = `1${randomUUID().replace(/-/g, "").slice(0, 5).toUpperCase()}`;
  await db.query(
    `INSERT INTO "HriPassport" ("id","code","nickname","accessTokenHash","editTokenHash","comfortDistance","speed",
       "gaze","voice","language","anxiety","captions","speechPace","noReach","status","updatedAt")
     VALUES ($1,$2,$3,$4,$5,-1.3,1,'soft',true,'th','high','large','slow',true,'active', now() AT TIME ZONE 'UTC')`,
    [id, code, nickname, tokens.accessTokenHash, tokens.editTokenHash]
  );
  created.push(id);
  return { id, code, accessToken: tokens.accessToken, editToken: tokens.editToken };
}

// Make the browser behave as the owner's browser: the edit token is already stored for this card.
async function ownerContext(browser: Browser, row: { accessToken: string; editToken: string }) {
  const context = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": randomIp() } });
  await context.addInitScript(
    ({ key, value }: { key: string; value: string }) => {
      try { window.localStorage.setItem(key, value); } catch { /* ignore */ }
    },
    { key: `hri-passport-edit:${row.accessToken}`, value: row.editToken }
  );
  return context;
}

test.afterAll(async () => {
  await db.query(`DELETE FROM "HriPassport" WHERE "id" = ANY($1::text[])`, [created]);
  await db.end();
});

test("the public card renders the passport but never the owner-only data", async ({ browser }) => {
  const row = await seed();
  const context = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": randomIp() } });
  const page = await context.newPage();
  await page.goto(`/living-lab/passport/${row.accessToken}`);

  await expect(page.getByTestId("passport-code")).toHaveText(row.code);
  await expect(page.getByTestId("passport-qr")).toBeVisible();
  await expect(page.getByTestId("passport-status")).toHaveText("Active");
  await expect(page.getByTestId("owner-section")).toContainText("Read-only card");

  const html = await page.content();
  expect(html).not.toContain("integration-test");
  expect(html).not.toContain("Anxious");
  await context.close();
});

test("owner access unlocks from the browser and shows nickname and anxiety", async ({ browser }) => {
  const row = await seed();
  const context = await ownerContext(browser, row);
  const page = await context.newPage();
  await page.goto(`/living-lab/passport/${row.accessToken}`);

  await expect(page.getByTestId("owner-nickname")).toHaveText("integration-test");
  await expect(page.getByTestId("owner-anxiety")).toHaveText("Anxious");
  await expect(page.getByTestId("edit-button")).toBeVisible();
  await expect(page.getByTestId("delete-button")).toBeVisible();
  await context.close();
});

test("using the access token as an edit key is refused, then the real key unlocks", async ({ browser }) => {
  const row = await seed();
  const wrong = await ownerContext(browser, { accessToken: row.accessToken, editToken: row.accessToken });
  const page = await wrong.newPage();
  await page.goto(`/living-lab/passport/${row.accessToken}`);

  await expect(page.getByTestId("edit-key-input")).toBeVisible();
  await expect(page.getByText("That edit key does not belong to this passport.")).toBeVisible();
  await expect(page.getByTestId("owner-nickname")).toHaveCount(0);

  await page.getByTestId("edit-key-input").fill(row.editToken);
  await page.getByTestId("unlock-button").click();
  await expect(page.getByTestId("owner-nickname")).toHaveText("integration-test");
  await wrong.close();
});

test("editing bumps the version and the robot API returns the new value", async ({ browser, request }) => {
  const row = await seed();
  const context = await ownerContext(browser, row);
  const page = await context.newPage();
  await page.goto(`/living-lab/passport/${row.accessToken}`);

  await page.getByTestId("edit-button").click();
  // Playwright cannot fill a range input, so set it through the native setter React tracks.
  await page.getByTestId("distance-input").evaluate((element, value) => {
    const input = element as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    if (!setter) throw new Error("range input has no value setter");
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }, "-0.4");

  await page.getByTestId("save-button").click();
  await expect(page.getByText("Saved. Robots reading this passport now get version 2.")).toBeVisible();
  await expect(page.getByTestId("passport-version")).toHaveText("2");

  const res = await request.get(`/api/hri/passport/${row.accessToken}`, { headers: { "x-forwarded-for": randomIp() } });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.version).toBe(2);
  expect(body.preferences.distance.sceneUnits).toBe(-0.4);
  await context.close();
});

test("deleting is confirmed inline, then the API returns 404", async ({ browser, request }) => {
  const row = await seed();
  const context = await ownerContext(browser, row);
  const page = await context.newPage();
  await page.goto(`/living-lab/passport/${row.accessToken}`);

  await page.getByTestId("delete-button").click();
  await expect(page.getByText("Deleting is permanent.")).toBeVisible();
  await page.getByTestId("delete-confirm").click();
  await expect(page.getByTestId("passport-deleted")).toBeVisible();

  const api = await request.get(`/api/hri/passport/${row.accessToken}`, { headers: { "x-forwarded-for": randomIp() } });
  expect(api.status()).toBe(404);
  await context.close();
});

// The status code is not asserted: with streaming SSR a runtime not-found can flush 200 before the
// fallback renders, so the test checks the user-visible outcome instead (like the UI does).
test("unknown token → not-found notice, never an owner view", async ({ browser }) => {
  const context = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": randomIp() } });
  const page = await context.newPage();
  await page.goto(`/living-lab/passport/${"C".repeat(43)}`);
  await expect(page.getByText("Passport not found")).toBeVisible();
  await expect(page.getByTestId("passport-card")).toHaveCount(0);
  await context.close();
});

test("card guessing protection shares the failed-lookup budget", async ({ request }) => {
  const row = await seed();
  const ip = randomIp();
  for (let i = 0; i < 20; i++) {
    const miss = await request.get(`/living-lab/passport/${"D".repeat(42)}${i % 10}`, { headers: { "x-forwarded-for": ip } });
    expect(await miss.text()).toContain("Passport not found");
  }
  const blocked = await request.get(`/living-lab/passport/${row.accessToken}`, { headers: { "x-forwarded-for": ip } });
  expect(await blocked.text()).toContain("Too many requests");
});
