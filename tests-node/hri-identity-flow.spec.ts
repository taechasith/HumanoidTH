// The whole email verification, through the real UI and a real database, with no email sent: without
// EmailJS keys, `next dev` prints the code to the server's output, and this test reads it from there.
//
//   set -a && source ./.env.local && set +a      # EmailJS keys must not be set
//   pnpm dev > dev.log 2>&1 &
//   NEON_BRANCH=dev HRI_DEV_LOG=dev.log PLAYWRIGHT_EXTERNAL_SERVER=1 pnpm exec playwright test tests-node/hri-identity-flow.spec.ts
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { test, expect, type Page } from "@playwright/test";
import pg from "pg";

const devLog = process.env.HRI_DEV_LOG;
test.skip(process.env.NEON_BRANCH !== "dev" || !devLog, "Needs NEON_BRANCH=dev and HRI_DEV_LOG, the output file of `next dev`.");
test.describe.configure({ mode: "serial", timeout: 240_000 });
test.use({ viewport: { width: 1440, height: 1200 } });

const db = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
const emails: string[] = [];
const newEmail = () => {
  const email = `itest_${randomUUID()}@itest.invalid`;
  emails.push(email);
  return email;
};

test.afterAll(async () => {
  await db.query(`DELETE FROM "HriPassport" WHERE "participantId" IN (SELECT "id" FROM "HriParticipant" WHERE "email" = ANY($1::text[]))`, [emails]);
  await db.query(`DELETE FROM "HriEmailChallenge" WHERE "email" = ANY($1::text[])`, [emails]);
  await db.query(`DELETE FROM "HriParticipant" WHERE "email" = ANY($1::text[])`, [emails]);
  await db.end();
});

async function codeFromServer(email: string) {
  let code: string | undefined;
  await expect.poll(() => {
    const matches = [...readFileSync(devLog!, "utf8").matchAll(new RegExp(`Code for ${email}: (\\d{6})`, "g"))];
    code = matches.at(-1)?.[1];
    return code;
  }, { timeout: 30_000 }).toBeTruthy();
  return code!;
}

async function signIn(page: Page, email: string) {
  await page.goto("/living-lab");
  await page.getByLabel(/I agree to save my preferences/).check();
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await page.getByRole("button", { name: "Send code" }).click();
  await expect(page.getByText(`We sent a code to ${email}`)).toBeVisible({ timeout: 60_000 });
  return codeFromServer(email);
}

async function calibrateAndSave(page: Page) {
  const start = page.getByRole("button", { name: "Start", exact: true });
  await expect(start).toBeEnabled({ timeout: 120_000 });
  await start.click();
  await page.getByRole("button", { name: /I made a wai/ }).click();
  await page.waitForTimeout(3000);
  await page.getByRole("button", { name: /Comfortable here/ }).click();
  await page.getByRole("button", { name: /^Next$/ }).click();
  await page.getByRole("button", { name: /Yes, look at me/ }).click();
  await page.getByRole("button", { name: /Text only/ }).click();
  await page.getByRole("button", { name: "Save my passport" }).click();
  await expect(page.getByRole("link", { name: /Open my passport card/ })).toBeVisible({ timeout: 30_000 });
}

test("a wrong code is refused, the right one signs in, and the passport belongs to that person until they delete their email", async ({ browser, request }) => {
  const context = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": `198.51.100.${Date.now()}` } });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const email = newEmail();
  const masked = `it•••@itest.invalid`;

  // Only a hash is stored.
  const code = await signIn(page, email);
  const stored = await db.query(`SELECT "codeHash" FROM "HriEmailChallenge" WHERE "email" = $1`, [email]);
  expect(stored.rows).toHaveLength(1);
  expect(stored.rows[0].codeHash).not.toContain(code);

  // A wrong code keeps the person on this step, ready to type again.
  const codeBox = page.getByLabel("6-digit code");
  await codeBox.fill(code === "000000" ? "111111" : "000000");
  await page.getByRole("button", { name: "Verify", exact: true }).click();
  await expect(page.getByText("That code is not right.")).toBeVisible();
  await expect(codeBox).toBeFocused();

  await codeBox.fill(code);
  await page.getByRole("button", { name: "Verify", exact: true }).click();
  await expect(page.getByText("Saving as")).toBeVisible();
  await expect(page.getByText(masked)).toBeVisible();

  // Still signed in after a reload: the session is in an httpOnly cookie, not visible to scripts.
  await page.reload();
  await expect(page.getByText(masked)).toBeVisible();
  expect(await page.evaluate(() => document.cookie)).not.toContain("hri_participant");
  const cookie = (await context.cookies()).find((c) => c.name === "hri_participant");
  expect(cookie?.httpOnly).toBe(true);
  expect(cookie?.path).toBe("/living-lab");

  // The passport is saved to this participant, and the screen says who the server saved it to.
  await page.getByLabel(/I agree to save my preferences/).check();
  await calibrateAndSave(page);
  await expect(page.getByText(`Saved to ${masked}`)).toBeVisible();
  const owned = await db.query(
    `SELECT p."id", p."eventsJson" FROM (SELECT h."id", s."eventsJson" FROM "HriPassport" h JOIN "HriSession" s ON s."passportId" = h."id"
       WHERE h."participantId" = (SELECT "id" FROM "HriParticipant" WHERE "email" = $1)) p`,
    [email]
  );
  expect(owned.rows).toHaveLength(1);
  expect(JSON.stringify(owned.rows[0].eventsJson)).not.toContain(email);

  // A robot reading the passport learns nothing about who owns it.
  const href = await page.getByRole("link", { name: /Open my passport card/ }).getAttribute("href");
  const profile = await (await request.get(`/api/hri/passport/${href!.split("/").pop()}`, { headers: { "x-forwarded-for": "198.51.100.200" } })).text();
  expect(profile).not.toContain("itest");
  expect(profile).not.toContain("participant");

  // Deleting asks first, then removes the email everywhere, and keeps the passport without an owner.
  await page.getByRole("button", { name: "Delete my email" }).click();
  await expect(page.getByText("This deletes your email and signs you out.")).toBeVisible();
  await page.getByRole("button", { name: "Keep it" }).click();
  expect((await db.query(`SELECT 1 FROM "HriParticipant" WHERE "email" = $1`, [email])).rows).toHaveLength(1);
  await page.getByRole("button", { name: "Delete my email" }).click();
  await page.getByRole("button", { name: "Yes, delete my email" }).click();
  await expect(page.getByRole("textbox", { name: "Email" })).toBeVisible();
  expect((await db.query(`SELECT 1 FROM "HriParticipant" WHERE "email" = $1`, [email])).rows).toHaveLength(0);
  expect((await db.query(`SELECT 1 FROM "HriEmailChallenge" WHERE "email" = $1`, [email])).rows).toHaveLength(0);
  const kept = await db.query(`SELECT "participantId" FROM "HriPassport" WHERE "id" = $1`, [owned.rows[0].id]);
  expect(kept.rows[0].participantId).toBeNull();
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Email" })).toBeVisible();

  await db.query(`DELETE FROM "HriPassport" WHERE "id" = $1`, [owned.rows[0].id]);
  expect(errors).toEqual([]);
  await context.close();
});

test("'Not you?' signs out and removes the session cookie", async ({ browser }) => {
  const context = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": `198.51.100.${Date.now()}-2` } });
  const page = await context.newPage();
  const email = newEmail();
  const code = await signIn(page, email);
  await page.getByLabel("6-digit code").fill(code);
  await page.getByRole("button", { name: "Verify", exact: true }).click();
  await expect(page.getByText("Saving as")).toBeVisible();

  await page.getByRole("button", { name: "Not you?" }).click();
  await expect(page.getByRole("textbox", { name: "Email" })).toBeVisible();
  expect((await context.cookies()).find((c) => c.name === "hri_participant")).toBeUndefined();
  await context.close();
});
