import { expect, test } from "@playwright/test";

const cards = (page: import("@playwright/test").Page) => page.getByTestId("generator-card");
const status = (page: import("@playwright/test").Page) => page.getByTestId("connection-status");

test("loads generators and goes live with updating data", async ({ page }) => {
  await page.goto("/");
  await expect(cards(page)).toHaveCount(4);
  await expect(status(page)).toHaveText("Live");

  const card = page.getByRole("article", { name: "Perth Depot A" });
  const first = await card.getAttribute("data-updated-at");
  await expect.poll(() => card.getAttribute("data-updated-at")).not.toBe(first);
  await expect(page.getByTestId("feed-banner")).toHaveCount(0);
});

test("shows a loading skeleton while the API is slow", async ({ page }) => {
  await page.route("**/api/generators", async (route) => {
    await new Promise((r) => setTimeout(r, 1500));
    await route.continue();
  });
  await page.goto("/");
  await expect(page.getByTestId("skeleton")).toBeVisible();
  await expect(cards(page)).toHaveCount(4);
  await expect(page.getByTestId("skeleton")).toBeHidden();
});

test("shows an error state and recovers on retry", async ({ page }) => {
  await page.route("**/api/generators", (route) => route.fulfill({ status: 500, body: "boom" }));
  await page.goto("/");
  const alert = page.getByRole("alert").filter({ hasText: "Couldn't load generators" });
  await expect(alert).toBeVisible();

  await page.unroute("**/api/generators");
  await alert.getByRole("button", { name: "Retry" }).click();
  await expect(cards(page)).toHaveCount(4);
});

test("reconnects after a dropped connection", async ({ page }) => {
  await page.goto("/?scenario=flaky");
  await expect(status(page)).toHaveText("Live");
  await expect(status(page)).toContainText("Reconnecting", { timeout: 10_000 });
  await expect(page.getByTestId("feed-banner")).toContainText("showing last known values", { ignoreCase: true });
  await expect(cards(page)).toHaveCount(4);
  await expect(status(page)).toHaveText("Live", { timeout: 10_000 });
  await expect(page.getByTestId("feed-banner")).toHaveCount(0);
});

test("flags stale data when the feed goes silent", async ({ page }) => {
  await page.goto("/?scenario=stall&staleAfter=2000");
  await expect(page.getByTestId("feed-banner")).toContainText("no telemetry received", { timeout: 15_000 });
  await expect(status(page)).toHaveText("Live");
  await expect(page.getByText(/^Stale · /).first()).toBeVisible();
});

test("goes offline after retries are exhausted and can reconnect manually", async ({ page }) => {
  await page.goto("/?scenario=down&retries=2&backoff=100");
  await expect(status(page)).toHaveText("Offline", { timeout: 10_000 });
  await expect(page.getByTestId("feed-banner")).toContainText("Connection lost");
  await expect(cards(page)).toHaveCount(4); // REST data is still shown
  await page.getByRole("button", { name: "Reconnect" }).click();
  await expect(status(page)).toContainText(/Connecting|Reconnecting/);
});

test("threshold form validates and saves", async ({ page }) => {
  await page.goto("/");
  await expect(cards(page)).toHaveCount(4);

  const fuel = page.getByLabel("Min fuel (%)");
  await fuel.fill("150");
  await page.getByRole("button", { name: "Save thresholds" }).click();
  await expect(page.getByText("Min fuel must be at most 100")).toBeVisible();

  await fuel.fill("50");
  await page.getByRole("button", { name: "Save thresholds" }).click();
  await expect(page.getByText("Thresholds saved")).toBeVisible();
  // Raising the minimum fuel threshold flags more generators.
  await expect(page.getByRole("article", { name: "Kalgoorlie Mine" }).getByText("Low fuel")).toBeVisible();
});
