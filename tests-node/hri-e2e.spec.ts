// End-to-end: one person's passport through the real UI, the way the demo runs it.
// consent → button calibration → passport + QR → robot API → card (owner) → Thai read-only view →
// robot console (Robot A / B) → edit on the card → API and console see version 2 → delete → gone everywhere.
// Writes to the database, so it only runs when NEON_BRANCH=dev, and it removes its passport even on failure.
//
//   PLAYWRIGHT_EXTERNAL_SERVER=1 pnpm exec playwright test tests-node/hri-e2e.spec.ts
import { test, expect, type Page } from "@playwright/test";
import pg from "pg";
import QRCode from "qrcode";

test.skip(process.env.NEON_BRANCH !== "dev", "Writes test data: only runs when NEON_BRANCH=dev.");
test.describe.configure({ mode: "serial" });
test.setTimeout(180_000);

const db = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
const ip = `203.0.113.${Math.floor(Math.random() * 200) + 1}-${Date.now()}`;
let code = "";
let token = "";

test.afterAll(async () => {
  if (code) await db.query(`DELETE FROM "HriPassport" WHERE "code" = $1`, [code]);
  await db.end();
});

// The QR must encode exactly this card URL. PNG bytes differ between the browser and Node encoders, so
// compare what matters: read every module (dark/light square) from the rendered image in the browser and
// compare it with the module matrix the qrcode library builds for the expected URL (margin 1, as the app uses).
async function qrEncodes(page: Page, selector: string, url: string) {
  const { size, data } = QRCode.create(url, {}).modules;
  const expected = Array.from(data, (bit) => (bit ? 1 : 0)).join("");
  const actual = await page.locator(selector).evaluate(async (node, n) => {
    const img = node as HTMLImageElement;
    if (!img.complete) await new Promise((resolve) => img.addEventListener("load", resolve, { once: true }));
    const w = img.naturalWidth;
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = w;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    const scale = w / (n + 2); // one module of quiet zone on each side
    let bits = "";
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const px = ctx.getImageData(Math.floor((c + 1.5) * scale), Math.floor((r + 1.5) * scale), 1, 1).data;
        bits += px[0] < 128 ? "1" : "0";
      }
    }
    return bits;
  }, size);
  return actual === expected;
}

async function readInConsole(page: Page, input: string) {
  await page.goto("/living-lab/robot");
  await page.getByLabel("Passport access token").fill(input);
  await page.getByRole("button", { name: "Read passport" }).click();
}

test("one passport, created in the Living Lab, read by every robot, edited and deleted", async ({ browser, request }) => {
  const context = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": ip }, viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const pageErrors: string[] = [];
  page.on("pageerror", (e) => pageErrors.push(e.message));
  const api = (t: string) => request.get(`/api/hri/passport/${t}`, { headers: { "x-forwarded-for": `${ip}-api` } });

  // 1. Calibration (button mode). Nothing starts without consent.
  await page.goto("/living-lab");
  const start = page.getByRole("button", { name: /Loading robot|Start/ }).first();
  await start.waitFor();
  await expect(start).toBeDisabled();
  await page.getByLabel(/I agree to save my preferences/).check();
  await expect(start).toBeEnabled({ timeout: 30_000 });
  await start.click();
  await page.getByRole("button", { name: /I made a wai/ }).click();
  for (let i = 0; i < 2; i++) {
    await page.getByRole("button", { name: /^Continue/ }).click();
    await page.waitForTimeout(1400);
  }
  await page.getByRole("button", { name: /Comfortable here/ }).click();
  await page.getByRole("button", { name: /^Next$/ }).click();
  await page.getByRole("button", { name: /Yes, look at me/ }).click();
  await page.getByRole("button", { name: /Text only/ }).click();
  await page.getByRole("button", { name: "Save my passport" }).click();

  // 2. The passport is issued: code, QR, edit key shown once, link to the card.
  const cardLink = page.getByRole("link", { name: /Open my passport card/ });
  await cardLink.waitFor({ timeout: 30_000 });
  const href = (await cardLink.getAttribute("href"))!;
  token = href.split("/").pop()!;
  code = (await page.locator(".ll-code").textContent())!.trim();
  expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
  expect(code).toMatch(/^[2-9A-HJKMNP-Z]{6}$/);
  await expect(page.getByText("Your edit key (shown once)")).toBeVisible();
  const origin = new URL(page.url()).origin;
  const cardUrl = `${origin}/living-lab/passport/${token}`;
  expect(await qrEncodes(page, `img[alt="QR code for your HRI Passport"]`, cardUrl), "calibration QR encodes the card URL").toBe(true);
  expect(await qrEncodes(page, `img[alt="QR code for your HRI Passport"]`, `${cardUrl}x`), "sanity: a different URL does not match").toBe(false);

  // 3. A robot reads it through the API: the five preferences, nothing sensitive.
  const first = await api(token);
  expect(first.status()).toBe(200);
  const p1 = await first.json();
  expect(p1).toMatchObject({ schema: "humanoidth.hri-passport/v1", status: "active", version: 1 });
  expect(p1.preferences.eyeContact.level).toBe("direct");
  expect(p1.preferences.language.tag).toBe("en");
  expect(p1.preferences.distance.metres).toBeNull();
  expect(p1.interaction.voice).toBe(false);
  expect(JSON.stringify(p1)).not.toMatch(/anxiety|nickname|"code"|TokenHash/);

  // 4. The card: same code, QR of its own URL, owner view unlocked from this browser.
  await page.goto(href);
  await expect(page.getByTestId("passport-code")).toHaveText(code);
  await expect(page.getByTestId("passport-status")).toHaveText("Active");
  await expect(page.getByTestId("owner-section")).toContainText("Owner access", { timeout: 15_000 });
  await page.getByTestId("passport-qr").waitFor();
  expect(await qrEncodes(page, `[data-testid="passport-qr"]`, cardUrl), "card QR encodes its own URL").toBe(true);

  // 5. Someone else scanning the QR (another browser, Thai UI): read-only, no owner data.
  const visitor = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": `${ip}-visitor` } });
  await visitor.addCookies([{ name: "lang", value: "th", url: origin }]);
  const vpage = await visitor.newPage();
  await vpage.goto(href);
  await expect(vpage.getByRole("heading", { name: "HRI Passport ของฉัน" })).toBeVisible();
  await expect(vpage.getByText("โปรไฟล์เดียว หุ่นยนต์ทุกตัวเข้าใจคุณ")).toBeVisible();
  await expect(vpage.getByTestId("owner-section")).toContainText("การ์ดแบบอ่านอย่างเดียว");
  await expect(vpage.getByTestId("owner-nickname")).toHaveCount(0);
  await expect(vpage.getByTestId("owner-anxiety")).toHaveCount(0);
  await visitor.close();

  // 6. Robot console, given the full card URL (what a robot gets from scanning the QR).
  await readInConsole(page, cardUrl);
  const a = page.getByTestId("robot-card-a");
  const b = page.getByTestId("robot-card-b");
  await expect(a).toContainText("Passport v1", { timeout: 30_000 });
  await expect(a).toContainText("direct");
  await expect(b).toContainText("not available"); // screen-only robot cannot make eye contact
  await expect(page.getByText("Browser simulation. No real robot is connected or controlled.")).toBeVisible();

  // 7. The owner changes eye contact on the card → version 2.
  await page.goto(href);
  await page.getByTestId("edit-button").click({ timeout: 15_000 });
  await page.getByRole("group", { name: "Eye contact" }).getByRole("button", { name: "Soft (looks away a little)" }).click();
  await page.getByTestId("save-button").click();
  await expect(page.getByText("Saved. Robots reading this passport now get version 2.")).toBeVisible();

  // 8. Every robot sees the change.
  const second = await (await api(token)).json();
  expect(second.version).toBe(2);
  expect(second.preferences.eyeContact.level).toBe("soft");
  await readInConsole(page, token);
  await expect(a).toContainText("Passport v2", { timeout: 30_000 });
  await expect(a).toContainText("soft");

  // 9. Delete: gone from the API, the card and the legacy code link.
  await page.goto(href);
  await page.getByTestId("delete-button").click({ timeout: 15_000 });
  await page.getByTestId("delete-confirm").click();
  await expect(page.getByTestId("passport-deleted")).toBeVisible();
  expect((await api(token)).status()).toBe(404);
  await page.goto(`/living-lab/meet/${code}`);
  await expect(page).toHaveURL(/error=not_found/);
  const left = await db.query(`SELECT count(*) FROM "HriPassport" WHERE "code" = $1`, [code]);
  expect(Number(left.rows[0].count)).toBe(0);
  code = ""; // nothing left to clean up

  expect(pageErrors).toEqual([]);
  await context.close();
});
