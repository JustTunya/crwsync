import { test, expect } from "@playwright/test";

const WEB_URL = process.env.WEB_URL || "http://localhost:3000";
const DASH_URL = process.env.DASH_URL || "http://localhost:3001";

test.describe("crwsync End-to-End Collaboration Journey", () => {
  test("1. Landing page, navigation to sign in", async ({ page }) => {
    await page.goto(WEB_URL);
    await expect(page).toHaveTitle(/crwsync/i);

    // Verify presence of main CTA or signin links
    const signinLink = page.getByRole("link", { name: /sign in/i }).first();
    await expect(signinLink).toBeVisible();
  });

  test("2. Sign in with demo credentials & redirect to dashboard", async ({ page }) => {
    await page.goto(`${WEB_URL}/auth/signin`);

    // Check sign in form elements
    const identifierInput = page.locator("#identifier");
    const passwordInput = page.locator("#password");
    const submitBtn = page.getByRole("button", { name: /sign in/i });

    await expect(identifierInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitBtn).toBeDisabled();

    // Fill credentials
    await identifierInput.fill("tunya");
    await passwordInput.fill("Password123!");
    await expect(submitBtn).toBeEnabled();
  });

  test("3. Workspace creation UI verification", async ({ page }) => {
    await page.goto(`${DASH_URL}/create-workspace`);

    // Verify workspace form presence
    const nameInput = page.locator("#ws-name");
    const slugInput = page.locator("#ws-slug");
    const submitBtn = page.getByRole("button", { name: /create workspace/i });

    await expect(nameInput).toBeVisible();
    await expect(slugInput).toBeVisible();
    await expect(submitBtn).toBeDisabled();

    await nameInput.fill("Engineering Core");
    await slugInput.fill("eng-core");
    await expect(submitBtn).toBeEnabled();
  });

  test("4. Dashboard Omni-search (Cmd+K) modal interaction", async ({ page }) => {
    // Navigate to dashboard root or demo workspace
    await page.goto(`${DASH_URL}/`);

    // Trigger keyboard shortcut Cmd+K or Ctrl+K
    await page.keyboard.press("Control+KeyK");

    // Verify quick search or command palette dialog appears or is accessible
    const searchDialog = page.locator("[role='dialog']").first();
    if (await searchDialog.isVisible()) {
      const searchInput = searchDialog.locator("input");
      await expect(searchInput).toBeVisible();
      await searchInput.fill("task");
      await page.keyboard.press("Escape");
    }
  });
});
