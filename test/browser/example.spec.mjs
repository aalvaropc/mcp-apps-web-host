import { test, expect } from "@playwright/test";

test("two origins deliver a view, accept and refuse choices, and tear down", async ({ page, request }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  expect((await request.get("/mcp-app/sandbox.html")).status()).toBe(404);
  expect((await request.get("http://127.0.0.1:8191/")).status()).toBe(404);
  await page.getByRole("button", { name: "Call compare_options" }).click();
  await expect(page.locator("#mcp-app-frame")).toHaveAttribute("src", /^http:\/\/127\.0\.0\.1:8191\/mcp-app\/sandbox\.html\?host=/);
  expect(await page.evaluate(() => document.getElementById("mcp-app-frame").contentDocument)).toBeNull();
  const card = page.frameLocator("#mcp-app-frame").frameLocator("iframe");
  await card.getByRole("button", { name: /^Air:/ }).click();
  await expect(card.locator("#status")).toHaveText("The host accepted Air.");
  await card.getByRole("button", { name: /^Split shipment:/ }).click();
  await expect(card.locator("#status")).toContainText("The host refused");
  await page.getByRole("button", { name: "Switch to dark" }).click();
  await expect(card.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Hide the view" }).click();
  await expect(page.locator("#mcp-app-frame")).toHaveCount(0);
  expect(errors).toEqual([]);
});
