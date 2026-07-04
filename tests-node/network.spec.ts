import { test, expect } from "@playwright/test";

async function expectGraphEnvelope(response: Awaited<ReturnType<typeof fetch>> | any) {
  expect(response.status()).toBeLessThan(500);

  const graph = await response.json();
  expect(Array.isArray(graph.nodes)).toBe(true);
  expect(Array.isArray(graph.edges)).toBe(true);
  expect(Array.isArray(graph.clusters)).toBe(true);
  expect(graph.meta).toBeTruthy();
  expect(graph.meta.source_mode).toBeTruthy();
  expect(graph.meta.resolved_source).toBeTruthy();
  expect(Array.isArray(graph.meta.warnings)).toBe(true);

  for (const edge of graph.edges.slice(0, 10)) {
    expect(edge.source).toBeTruthy();
    expect(edge.target).toBeTruthy();
    expect(edge.relation).toBeTruthy();
    expect(typeof edge.confidence).toBe("number");
    expect("url" in edge).toBe(true);
    expect(edge.data_origin).toBeTruthy();
  }
  return graph;
}

test("network API returns graph envelope", async ({ request }) => {
  await expectGraphEnvelope(await request.get("/api/network/graph"));
});

test("network API supports source modes", async ({ request }) => {
  const file = await expectGraphEnvelope(await request.get("/api/network/graph?source=file"));
  expect(file.meta.resolved_source).toBe("file");
  expect(file.nodes.length).toBeGreaterThan(0);

  const auto = await expectGraphEnvelope(await request.get("/api/network/graph?source=auto"));
  expect(["database", "fallback_file"]).toContain(auto.meta.resolved_source);

  const hybrid = await expectGraphEnvelope(await request.get("/api/network/graph?source=hybrid"));
  expect(["hybrid", "database", "fallback_file"]).toContain(hybrid.meta.resolved_source);

  const databaseResponse = await request.get("/api/network/graph?source=database");
  expect([200, 503]).toContain(databaseResponse.status());
  const database = await databaseResponse.json();
  expect(database.meta.source_mode).toBe("database");
});

test("network page renders graph UI and core controls", async ({ page }) => {
  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("requestfailed", (request) => {
    failedRequests.push(request.url());
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  const response = await page.goto("/network");
  expect(response?.status()).toBe(200);

  await expect(page.getByRole("heading", { name: /relationship network/i })).toBeVisible();
  await expect(page.getByPlaceholder("Search node label...")).toBeVisible();
  await expect(page.getByRole("button", { name: "Fit view" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Reset layout" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Arrows" })).toBeVisible();
  await expect(page.getByLabel("Network data source")).toBeVisible();
  await expect(page.getByLabel("Interactive network graph")).toBeVisible({ timeout: 20000 });

  await page.getByLabel("Network data source").selectOption("file");
  await expect(page.getByText(/Data source: Import file/i)).toBeVisible({ timeout: 20000 });
  await page.getByLabel("Network data source").selectOption("auto");
  await expect(page.getByText(/Data source:/i)).toBeVisible({ timeout: 20000 });

  const graph = await (await page.request.get("/api/network/graph?source=file")).json();
  if (graph.nodes.length > 0) {
    await page.waitForFunction(() => document.querySelector("canvas") !== null, null, { timeout: 20000 });
    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible();
    const box = await canvas.boundingBox();
    expect(box?.width ?? 0).toBeGreaterThan(200);
    expect(box?.height ?? 0).toBeGreaterThan(200);

    await page.getByPlaceholder("Search node label...").fill(graph.nodes[0].label);
    await page.getByRole("button", { name: "Focus" }).click();
    await expect(page.getByText(graph.nodes[0].label, { exact: false })).toBeVisible({ timeout: 10000 });
  } else {
    await expect(page.getByText("No network relationships have been generated yet.")).toBeVisible();
  }

  expect(failedRequests).toEqual([]);
  expect(consoleErrors.filter((message) => !message.includes("favicon"))).toEqual([]);
});

test("network page mobile layout does not overflow horizontally", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/network");
  await expect(page.getByPlaceholder("Search node label...")).toBeVisible({ timeout: 20000 });

  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(hasHorizontalOverflow).toBe(false);
});
