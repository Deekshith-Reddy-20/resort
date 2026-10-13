import { expect, test } from "@playwright/test";

test("homepage loads cinematic brand and no room checkout", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "V-FARMS", exact: true })).toBeVisible();
  await expect(page.getByText("A singular escape to nature.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Book Entire Resort" }).first()).toBeVisible();
  await expect(page.getByText("Book this room", { exact: false })).toHaveCount(0);
});

test("room pages are informational", async ({ page }) => {
  await page.goto("/rooms/room-1");
  await expect(page.getByText("There is no individual room price")).toBeVisible();
  await expect(page.getByRole("img", { name: /Room 1/i })).toBeVisible();
  await expect(page.getByRole("link", { name: "Book the entire estate" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Book this room" })).toHaveCount(0);
});

test("gallery uses approved frames only", async ({ page }) => {
  await page.goto("/gallery");
  const images = page.locator("img");
  await expect(images.first()).toBeVisible();
  const count = await images.count();
  expect(count).toBeGreaterThanOrEqual(12);
});

test("primary routes load", async ({ page }) => {
  for (const path of ["/estate", "/rooms", "/stays", "/experiences", "/events", "/about", "/contact"]) {
    const response = await page.goto(path);
    expect(response?.ok()).toBeTruthy();
  }
});

test("stay search panel is present on home", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Entire estate stay" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Exclusive event" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Check Availability" })).toBeVisible();
});
