// Auto mode in a real browser with Chromium's fake camera (a synthetic test pattern, no person in it).
// This proves the wiring end to end: consent gate → camera + MediaPipe load → the calibrator pauses
// because nobody is in view → it stops cleanly without saving anything, and Stop returns to the buttons.
// It cannot prove detection accuracy on real people: that needs the venue test in
// HRI_FEASIBILITY_SPIKE.md §3.4. The full decision logic is unit-tested in test/hri-auto.test.ts.
//
//   set -a && source ./.env.local && set +a      # must include HRI_IDENTITY_SECRET (see identity-helper.ts)
//   PLAYWRIGHT_EXTERNAL_SERVER=1 pnpm exec playwright test tests-node/hri-auto-mode.spec.ts
import { test, expect } from "@playwright/test";
import pg from "pg";
import { signInParticipant } from "./identity-helper";

test.skip(process.env.NEON_BRANCH !== "dev", "Reads the dev database: only runs when NEON_BRANCH=dev.");
test.describe.configure({ mode: "serial" });
test.use({
  launchOptions: { args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] },
  permissions: ["camera"],
  viewport: { width: 1440, height: 1000 }
});

const db = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
// Only passports created after `since` (a database timestamp), and not the rows other specs seed and
// delete in parallel (nickname "integration-test"), so the count is stable when suites run together.
const dbNow = async () => (await db.query<{ now: string }>(`SELECT (now() AT TIME ZONE 'UTC')::text AS now`)).rows[0].now;
const passportsSince = async (since: string) =>
  Number((await db.query(
    `SELECT count(*) FROM "HriPassport" WHERE "createdAt" >= $1::timestamp AND "nickname" IS DISTINCT FROM 'integration-test'`,
    [since]
  )).rows[0].count);
const participants: { cleanup: () => Promise<unknown> }[] = [];
test.afterAll(async () => {
  for (const p of participants) await p.cleanup();
  await db.end();
});

// Every mode needs a verified participant before it can start; sign in, then open the page.
async function openLab(page: import("@playwright/test").Page) {
  participants.push(await signInParticipant(db, page.context()));
  await page.goto("/living-lab");
  const start = page.getByRole("button", { name: /Loading robot|Start/ }).first();
  await start.waitFor();
  return page.getByRole("button", { name: /Auto: just stand in front of the camera/ });
}

test("Auto needs consent, like every other mode", async ({ page }) => {
  const auto = await openLab(page);
  await expect(auto).toBeDisabled();
  await page.getByLabel(/I agree to save my preferences/).check();
  await expect(auto).toBeEnabled({ timeout: 30_000 });
});

test("with nobody in view, Auto pauses, then stops cleanly and saves nothing", async ({ page }) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const since = await dbNow();

  const auto = await openLab(page);
  await page.getByLabel(/I agree to save my preferences/).check();
  await expect(auto).toBeEnabled({ timeout: 30_000 });
  await auto.click();

  await expect(page.getByRole("heading", { name: "Auto calibration" })).toBeVisible();
  // Camera + MediaPipe load, frames arrive, nobody is detected → pause message.
  await expect(page.locator(".ll-auto-stage")).toHaveText(/can't see you/, { timeout: 45_000 });
  await expect(page.locator(".ll-auto-signals")).toContainText("No one in view");
  // After the pause limit (25 s) the session ends on its own, back on the intro with a clear message.
  // (Next.js also renders an empty role="alert" route announcer, so match our notice by its class.)
  await expect(page.locator("p.ll-error[role=alert]")).toContainText("Auto mode stopped: no one was in view", { timeout: 45_000 });
  await expect(page.getByRole("button", { name: /Auto: just stand/ })).toBeVisible();
  expect(await passportsSince(since)).toBe(0);
  expect(errors).toEqual([]);
});

test("Stop returns to the button flow and turns the camera off", async ({ page }) => {
  // Loading MediaPipe in headless Chromium takes ~20 s; the 30 s default leaves too little margin.
  test.setTimeout(120_000);
  const auto = await openLab(page);
  await page.getByLabel(/I agree to save my preferences/).check();
  await expect(auto).toBeEnabled({ timeout: 30_000 });
  await auto.click();
  await expect(page.locator(".ll-cam")).toHaveClass(/is-on/, { timeout: 45_000 });
  await page.getByRole("button", { name: "Stop and use buttons instead" }).click();
  await expect(page.locator(".ll-cam")).not.toHaveClass(/is-on/);
  await expect(page.getByRole("button", { name: /^Start/ }).first()).toBeEnabled();
});
