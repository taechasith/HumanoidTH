// The voice and typed-answer flow in a real browser. No microphone is involved: the browser's speech
// recogniser is replaced by a stand-in the test drives, so this proves the wiring (question order,
// review before saving, fallback), not how well a real recogniser hears Thai. That needs a person,
// a microphone and the demo browser: see docs/BASELINE-AUDIT.md.
// Starting needs a verified Living Lab participant (docs/hri-living-lab-identity-design.md), and
// reading the participant's session needs the database, so this runs against Neon dev only.
// It saves no passport; it creates one test participant per test and deletes it.
//
//   set -a && source ./.env.local && set +a      # must include HRI_IDENTITY_SECRET (see identity-helper.ts)
//   pnpm build && pnpm start &
//   NEON_BRANCH=dev PLAYWRIGHT_EXTERNAL_SERVER=1 pnpm exec playwright test tests-node/hri-voice-flow.spec.ts
import { test, expect, type Page } from "@playwright/test";
import pg from "pg";
import { signInParticipant } from "./identity-helper";

test.skip(process.env.NEON_BRANCH !== "dev", "Needs a signed-in participant, so the dev database: only runs when NEON_BRANCH=dev.");
const db = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
const participants: { cleanup: () => Promise<unknown> }[] = [];
test.afterAll(async () => {
  for (const p of participants) await p.cleanup();
  await db.end();
});
// Signs this page's browser in as a fresh participant; returns it so a test can remove it early.
async function signIn(page: Page) {
  const participant = await signInParticipant(db, page.context());
  participants.push(participant);
  return participant;
}

test.use({ viewport: { width: 1440, height: 1100 } });
test.describe.configure({ timeout: 120_000 });

async function fakeRecogniser(page: Page) {
  await page.addInitScript(() => {
    type Fake = { onresult?: (e: unknown) => void; onend?: () => void; onerror?: (e: unknown) => void };
    const w = window as unknown as Record<string, unknown>;
    w.SpeechRecognition = w.webkitSpeechRecognition = class {
      start() { w.__recogniser = this; }
      abort() {}
    };
    w.__hear = (text: string) => {
      const r = w.__recogniser as Fake;
      r.onresult?.({ results: [[{ transcript: text }]] });
      r.onend?.();
    };
    w.__fail = (error: string) => {
      const r = w.__recogniser as Fake;
      r.onerror?.({ error });
      r.onend?.();
    };
  });
}

async function noRecogniser(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as Record<string, unknown>;
    w.SpeechRecognition = undefined;
    w.webkitSpeechRecognition = undefined;
  });
}

async function openVoiceFlow(page: Page) {
  if (!(await page.context().cookies()).some((c) => c.name === "hri_participant")) await signIn(page);
  await page.goto("/living-lab");
  const voiceStart = page.getByRole("button", { name: "Talk or type your answers" });
  await expect(voiceStart).toBeDisabled();
  await page.getByLabel(/I agree to save my preferences/).check();
  await expect(voiceStart).toBeEnabled({ timeout: 60_000 });
  await voiceStart.click();
}

async function say(page: Page, text: string) {
  await page.getByRole("button", { name: "Press and speak" }).click();
  await page.evaluate((t) => (window as unknown as { __hear: (s: string) => void }).__hear(t), text);
}

async function type(page: Page, text: string) {
  await page.getByLabel("Or type your answer").fill(text);
  await page.getByRole("button", { name: "Send" }).click();
}

const pressed = (page: Page, group: string, name: string) =>
  expect(page.getByRole("group", { name: group, exact: true }).getByRole("button", { name, exact: true })).toHaveAttribute("aria-pressed", "true");

test("speaking every answer reaches a review screen with those answers, and nothing is saved yet", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await fakeRecogniser(page);
  await openVoiceFlow(page);

  await expect(page.getByRole("heading", { name: "Greet the robot" })).toBeVisible();
  await say(page, "hello");
  await expect(page.getByRole("heading", { name: "How close is comfortable?" })).toBeVisible();
  await page.waitForTimeout(3000); // the robot returns the wai first
  await say(page, "too fast");
  await expect(page.getByTestId("voice-heard")).toHaveText('Heard: "too fast"');
  await say(page, "too close");

  await expect(page.getByRole("heading", { name: "Your care needs" })).toBeVisible({ timeout: 10_000 });
  await say(page, "a bit nervous");
  await expect(page.getByText("How should robots communicate with you?").first()).toBeVisible();
  await say(page, "slow");
  await say(page, "place it nearby");

  await expect(page.getByRole("heading", { name: "Eye contact" })).toBeVisible({ timeout: 10_000 });
  await say(page, "look away");
  await expect(page.getByRole("heading", { name: "Voice" })).toBeVisible();
  await say(page, "text only");

  await expect(page.getByRole("heading", { name: "Check your answers before saving" })).toBeVisible();
  await pressed(page, "Eye contact", "soft (looks away a little)");
  await pressed(page, "Voice", "Text only");
  await pressed(page, "Feeling about robots", "A bit nervous");
  await pressed(page, "Communication", "Slower speech + large text");
  await pressed(page, "Handing items", "No, place it nearby");
  await pressed(page, "Movement", "slower");
  await pressed(page, "Greeting", "Wai");
  await expect(page.getByText("Nothing is saved yet.")).toBeVisible();

  // Every answer can still be changed on the review screen.
  const gaze = page.getByRole("group", { name: "Eye contact", exact: true });
  await gaze.getByRole("button", { name: "direct" }).click();
  await pressed(page, "Eye contact", "direct");
  await page.getByRole("group", { name: "Greeting", exact: true }).getByRole("button", { name: "Wave" }).click();
  await pressed(page, "Greeting", "Wave");
  await page.getByRole("group", { name: "Comfortable distance", exact: true }).getByRole("button", { name: "Close" }).click();
  await pressed(page, "Comfortable distance", "Close");
  await page.getByRole("group", { name: "Movement", exact: true }).getByRole("button", { name: "normal" }).click();
  await pressed(page, "Movement", "normal");
  expect(errors).toEqual([]);
});

test("an unclear answer changes nothing and asks again", async ({ page }) => {
  await fakeRecogniser(page);
  await openVoiceFlow(page);
  await say(page, "banana");
  await expect(page.getByTestId("voice-heard")).toHaveText('Heard: "banana"');
  await expect(page.getByText("I didn't catch a clear answer.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Greet the robot" })).toBeVisible();
});

test("a blocked microphone explains the way forward, and typing still works", async ({ page }) => {
  await fakeRecogniser(page);
  await openVoiceFlow(page);
  await page.getByRole("button", { name: "Press and speak" }).click();
  await page.evaluate(() => (window as unknown as { __fail: (s: string) => void }).__fail("not-allowed"));
  await expect(page.getByText("Microphone access is blocked.")).toBeVisible();
  await type(page, "สวัสดี");
  await expect(page.getByRole("heading", { name: "How close is comfortable?" })).toBeVisible();
});

test("without speech support the same flow works by typing", async ({ page }) => {
  await noRecogniser(page);
  await openVoiceFlow(page);
  await expect(page.getByText("Speech input is not available in this browser.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Press and speak" })).toHaveCount(0);

  await type(page, "wai");
  await page.waitForTimeout(3000);
  await type(page, "comfortable");
  await expect(page.getByRole("heading", { name: "Your care needs" })).toBeVisible({ timeout: 10_000 });
  await type(page, "anxious");
  await type(page, "normal");
  await type(page, "yes");
  await expect(page.getByRole("heading", { name: "Eye contact" })).toBeVisible({ timeout: 10_000 });
  await type(page, "yes");
  await type(page, "speak");
  await expect(page.getByRole("heading", { name: "Check your answers before saving" })).toBeVisible();
  await pressed(page, "Feeling about robots", "Anxious");
  await pressed(page, "Voice", "Speak out loud");
  await pressed(page, "Eye contact", "direct");
  await pressed(page, "Handing items", "Yes, hand it to me");
});

test("if saving fails, the answers stay on the review screen and can be saved again", async ({ page }) => {
  test.skip(process.env.HRI_IDENTITY_REQUIRED?.trim().toLowerCase() !== "true", "Makes saving fail by removing a required owner, so it needs HRI_IDENTITY_REQUIRED=true on both sides.");
  // Saving is made to fail by removing the participant after the flow has started: the server then
  // refuses with "identity_required". (Before identity, this test relied on a server with no database.)
  const participant = await signIn(page);
  await noRecogniser(page);
  await openVoiceFlow(page);
  await type(page, "wai");
  await page.waitForTimeout(3000);
  await type(page, "comfortable");
  await expect(page.getByRole("heading", { name: "Your care needs" })).toBeVisible({ timeout: 10_000 });
  await type(page, "anxious");
  await type(page, "normal");
  await type(page, "yes");
  await expect(page.getByRole("heading", { name: "Eye contact" })).toBeVisible({ timeout: 10_000 });
  await type(page, "yes");
  await type(page, "text");
  await expect(page.getByRole("heading", { name: "Check your answers before saving" })).toBeVisible();

  await participant.cleanup();
  await type(page, "save");
  await expect(page.getByText("Please verify your email before saving your passport.")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Check your answers before saving" })).toBeVisible();
  await pressed(page, "Feeling about robots", "Anxious");
  await expect(page.getByRole("button", { name: "Save my passport" })).toBeEnabled();
});

test("the button flow also stops at the review screen, and starting again clears consent and answers", async ({ page }) => {
  await signIn(page);
  await page.goto("/living-lab");
  const start = page.getByRole("button", { name: "Start", exact: true });
  const consent = page.getByLabel(/I agree to save my preferences/);
  await consent.check();
  await expect(start).toBeEnabled({ timeout: 60_000 });
  await start.click();

  await page.getByRole("button", { name: /I made a wai/ }).click();
  await page.waitForTimeout(3000);
  await page.getByRole("button", { name: /Comfortable here/ }).click();
  const care = page.getByRole("group", { name: "How do robots make you feel?" });
  await care.getByRole("button", { name: "Anxious" }).click();
  await page.getByRole("button", { name: /^Next$/ }).click();
  await page.getByRole("button", { name: /Yes, look at me/ }).click();
  await page.getByRole("button", { name: /Text only/ }).click();

  await expect(page.getByRole("heading", { name: "Check your answers before saving" })).toBeVisible();
  await pressed(page, "Feeling about robots", "Anxious");
  // No voice box in the button flow.
  await expect(page.getByLabel("Or type your answer")).toHaveCount(0);

  await page.getByRole("button", { name: "Start again" }).click();
  await expect(consent).not.toBeChecked();
  await expect(start).toBeDisabled();
  await consent.check();
  await start.click();
  await page.getByRole("button", { name: /I made a wai/ }).click();
  await page.waitForTimeout(3000);
  await page.getByRole("button", { name: /Comfortable here/ }).click();
  await expect(care.getByRole("button", { name: "Comfortable" })).toHaveAttribute("aria-pressed", "true");
});
