import { test, expect } from "@playwright/test";

// Smoke e2e: verifies the app shell renders and the grounding contract holds at
// the UI level. The refusal path costs only a cheap embedding call (no answer
// generation), so this suite stays fast and essentially free to run.

test("home renders and links to the eval page", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: /eval/i }).first()).toBeVisible();
});

test("nav reaches the eval dashboard with metrics", async ({ page }) => {
  await page.goto("/eval");
  await expect(page.getByText(/citation precision/i).first()).toBeVisible();
  await expect(page.getByText(/refusal accuracy/i).first()).toBeVisible();
});

test("nav reaches the study dashboard", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: /weak topics \(lowest/i })).toBeVisible();
});

test("an out-of-corpus question is refused (grounding contract)", async ({ page }) => {
  await page.goto("/");
  await page.getByPlaceholder(/shrink the window/i).fill("What is the capital of France?");
  await page.getByRole("button", { name: /^ask$/i }).click();
  await expect(page.getByText(/couldn't find this in your uploaded materials/i)).toBeVisible({
    timeout: 60_000,
  });
});
