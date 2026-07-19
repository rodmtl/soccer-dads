import { randomUUID } from "node:crypto";
import { test, expect, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { CURRENT_PLAYER_STORAGE_KEY } from "@/lib/currentPlayer";

// Stores a player id directly in localStorage before navigating, bypassing
// the identity picker — see tests/e2e/player-attendance.spec.ts's helper of
// the same name/shape. Requires visiting the app origin once first, since
// localStorage is scoped per-origin.
async function setStoredPlayerId(page: Page, playerId: string) {
  await page.goto("/en/profile");
  await page.evaluate(
    ({ key, value }) => window.localStorage.setItem(key, value),
    { key: CURRENT_PLAYER_STORAGE_KEY, value: playerId },
  );
}

// End-to-end coverage of docs/ux/03-player-position.md's My Profile screen:
// identity gate -> profile -> position picker, exercised against a real
// running server (npm run start, per playwright.config.ts) and a real
// Postgres database, not a mocked Server Action. The previous slice's QA
// phase found a bug (thrown custom errors losing type identity across the
// Server Action boundary) that only reproduced against a real server, not
// mocked unit tests — this spec is the regression-class coverage for that
// lesson applied to this slice's own save flow.
const prisma = new PrismaClient();

test.describe("Player position picker", () => {
  // Rating is seeded with a distinct, non-default value so the negative
  // assertion below (rating never appears anywhere on the page) is actually
  // meaningful — a passing assertion against the default value (60) could
  // hide a real leak if some other on-screen number happened to also be 60.
  const SEEDED_RATING = 91;

  async function seedPlayer() {
    return prisma.player.create({
      data: {
        id: randomUUID(),
        name: `E2E Player ${randomUUID()}`,
        age: 34,
        rating: SEEDED_RATING,
        positions: [],
      },
    });
  }

  test("shows the player's own name/age (never rating), saves up to 2 positions for real, and rejects a 3rd with a visible message", async ({
    page,
  }) => {
    const player = await seedPlayer();

    try {
      await page.goto("/en/profile");

      await expect(page.getByRole("heading", { name: "Who are you?" })).toBeVisible();
      await page.getByRole("button", { name: player.name }).click();

      await expect(page.getByRole("heading", { name: "My Profile" })).toBeVisible();
      await expect(page.getByText(player.name)).toBeVisible();
      await expect(page.getByText("34", { exact: true })).toBeVisible();

      // docs/adr/0002-player-rating-privacy-deferred.md's actual security
      // boundary, checked against a real running server: rating must never
      // reach the page, even though the seeded row genuinely has one.
      await expect(page.getByText(/rating/i)).toHaveCount(0);
      await expect(page.getByText(String(SEEDED_RATING), { exact: true })).toHaveCount(0);

      const goalkeeper = page.getByRole("button", { name: "Goalkeeper" });
      const defender = page.getByRole("button", { name: "Defender" });
      const midfielder = page.getByRole("button", { name: "Midfielder" });

      await expect(page.getByText("0 of 2 selected")).toBeVisible();

      await goalkeeper.click();
      await expect(goalkeeper).toHaveAttribute("aria-pressed", "true");
      await expect(page.getByText("1 of 2 selected")).toBeVisible();

      await defender.click();
      await expect(defender).toHaveAttribute("aria-pressed", "true");
      await expect(page.getByText("2 of 2 selected")).toBeVisible();

      // Real server-side max-2 enforcement: a 3rd tap is rejected (not a
      // silent swap of an existing selection), and the rejection is
      // announced as visible text, not color/animation alone.
      await midfielder.click();
      await expect(midfielder).toHaveAttribute("aria-pressed", "false");
      await expect(page.getByText("You can choose up to 2 positions.")).toBeVisible();
      await expect(page.getByText("2 of 2 selected")).toBeVisible();

      // Reload to prove the two saved positions round-tripped through the
      // real database via updateOwnPositions, not just optimistic client
      // state that would vanish on a fresh load.
      await page.reload();
      await expect(page.getByRole("heading", { name: "My Profile" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Goalkeeper" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      await expect(page.getByRole("button", { name: "Defender" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      await expect(page.getByRole("button", { name: "Midfielder" })).toHaveAttribute(
        "aria-pressed",
        "false",
      );
    } finally {
      await prisma.player.delete({ where: { id: player.id } });
    }
  });

  // docs/ux/03-player-position.md's accessibility section, mirrored from
  // Flow 2's convention: focus stays on the toggle that was pressed through
  // the save cycle. A native `disabled` attribute can never hold focus in a
  // real browser, which JSDOM-based component tests don't reliably surface —
  // this needs a real browser to catch a regression.
  test("keeps keyboard focus on the toggle button through the position save cycle", async ({
    page,
  }) => {
    const player = await seedPlayer();

    try {
      await setStoredPlayerId(page, player.id);

      // Slows down the Server Action's POST request so there's a reliable
      // window to assert the in-flight (isSaving) state before it resolves.
      await page.route("**/*", async (route) => {
        if (route.request().method() === "POST") {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
        await route.continue();
      });

      await page.reload();

      const goalkeeper = page.getByRole("button", { name: "Goalkeeper" });
      await expect(goalkeeper).toBeVisible();
      await goalkeeper.click();

      await expect(goalkeeper).toBeFocused();
      await expect(goalkeeper).toHaveAttribute("aria-disabled", "true");

      await expect(goalkeeper).toHaveAttribute("aria-pressed", "true", { timeout: 2000 });
      await expect(goalkeeper).not.toHaveAttribute("aria-disabled", "true");
      await expect(goalkeeper).toBeFocused();
    } finally {
      await prisma.player.delete({ where: { id: player.id } });
    }
  });
});
