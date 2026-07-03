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

  // Visit the graph-paths page and check the path copy tool
  await page.goto("/network");
  const toolTitle = page.locator('h1:has-text("Copy Local Graph Paths")');
  await expect(toolTitle).toBeVisible({ timeout: 10000 });

  const copyButton = page.locator('button:has-text("Copy Local Graph Paths")');
  await expect(copyButton).toBeVisible({ timeout: 5000 });

  const searchInput = page.locator('input[placeholder*="Find sources, robots, or notes"]');
  await expect(searchInput).toBeVisible({ timeout: 5000 });

  const previewBox = page.locator('div').filter({ hasText: "Local neighbors" });
  await expect(previewBox.first()).toBeVisible({ timeout: 5000 });
});
