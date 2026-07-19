import { test, expect } from "@playwright/test";

// Placeholder smoke test proving the Playwright/e2e setup is wired up
// correctly. Real acceptance-criteria e2e specs land in Phase 3+.
test("home page redirects to a locale and renders", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/(en|fr)\/?$/);
  await expect(page.getByRole("heading", { name: "GarageLeague" })).toBeVisible();
});
