// The email card before anyone signs in, in a real browser. Needs no database and sends no email:
// the server has no HRI_IDENTITY_SECRET, so sending reports "unavailable". The verified state, including
// deleting an email, needs a database and is covered by unit tests in test/hri-identity.test.ts only.
//
//   pnpm build && pnpm start &                   # also try with HRI_IDENTITY_REQUIRED=true
//   PLAYWRIGHT_EXTERNAL_SERVER=1 pnpm exec playwright test tests-node/hri-identity-card.spec.ts
import { test, expect } from "@playwright/test";

test.skip(Boolean(process.env.NEON_BRANCH), "Needs a server with no database and no identity secret.");
test.use({ viewport: { width: 1440, height: 1100 } });

const required = process.env.HRI_IDENTITY_REQUIRED?.trim().toLowerCase() === "true";
const LINKED = /linked to my verified email, which is used only to identify the owner, never for marketing/;

test("no code can be requested before consent", async ({ page }) => {
  await page.goto("/living-lab");
  const consent = page.getByLabel(/I agree to save my preferences/);
  const send = page.getByRole("button", { name: "Send code" });
  await page.getByRole("textbox", { name: "Email" }).fill("someone@example.com");

  await expect(send).toBeDisabled();
  await expect(page.getByText("Tick the consent box first.")).toBeVisible();

  await consent.check();
  await expect(page.getByText("Tick the consent box first.")).toHaveCount(0);
  await expect(send).toBeEnabled();
  await send.click();
  await expect(page.getByText("Email verification is not available right now.")).toBeVisible();
});

test("the consent text and the start buttons match whether verifying is required", async ({ page }) => {
  await page.goto("/living-lab");
  const consent = page.getByLabel(/I agree to save my preferences/);
  const start = page.getByRole("button", { name: "Start", exact: true });
  await consent.check();
  if (required) {
    await expect(consent.locator("xpath=..")).toContainText(LINKED);
    await expect(page.getByText("Verify your email below before the robot starts.")).toBeVisible();
    await expect(page.getByText("find them again")).toHaveCount(0);
    await page.waitForTimeout(3000);
    await expect(start).toBeDisabled();
  } else {
    await expect(consent.locator("xpath=..")).not.toContainText("verified email");
    await expect(start).toBeEnabled({ timeout: 60_000 });
  }
});
