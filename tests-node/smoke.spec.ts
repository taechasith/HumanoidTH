import { test, expect } from "@playwright/test";

test("smoke test - crawl all routes as admin", async ({ page }) => {
  // Go to profile page first
  await page.goto("/profile");
  
  // Click "Login as Administrator" button
  const adminBtn = page.locator('button:has-text("Login as Administrator")');
  if (await adminBtn.isVisible()) {
    await adminBtn.click();
    await page.waitForTimeout(1000);
  }

  const routes = [
    "/",
    "/dashboard",
    "/perspectives",
    "/robots",
    "/inventory",
    "/contributions",
    "/network",
    "/analytics",
    "/database",
    "/submit-data",
    "/admin/submitted-data",
  ];

  for (const route of routes) {
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);

    // Expect an h1 header element to exist on the page
    const h1 = page.locator("h1").first();
    await expect(h1).toBeVisible({ timeout: 10000 });
    const text = await h1.innerText();
    expect(text.trim().length).toBeGreaterThan(0);
  }

  // Visit network page and check zoom controls
  await page.goto("/network");
  const cytoscapePanel = page.locator(".two");
  await expect(cytoscapePanel).toBeVisible({ timeout: 10000 });

  const zoomBtn = page.locator('button[title="Zoom In"]');
  await expect(zoomBtn).toBeVisible({ timeout: 5000 });

  const searchInput = page.locator('input[placeholder*="Search nodes"]');
  await expect(searchInput).toBeVisible({ timeout: 5000 });
});
