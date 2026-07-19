import { randomUUID } from "node:crypto";
import { test, expect, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { CURRENT_PLAYER_STORAGE_KEY } from "@/lib/currentPlayer";

// Stores a player id directly in localStorage before navigating, bypassing
// the identity picker — used to simulate an already-resolved identity
// (valid or corrupted/stale) the same way a returning visitor's browser
// would have it. Requires visiting the app origin once first, since
// localStorage is scoped per-origin.
async function setStoredPlayerId(page: Page, playerId: string) {
  await page.goto("/en/games");
  await page.evaluate(
    ({ key, value }) => window.localStorage.setItem(key, value),
    { key: CURRENT_PLAYER_STORAGE_KEY, value: playerId },
  );
}

// End-to-end coverage of docs/ux/02-player-attendance.md's core flows:
// identity gate -> Games List -> Game Detail, and the WhatsApp deep-link
// entry point (a game reached directly by id, without going through the
// list first). Seeds its own Player/Game rows via Prisma directly against
// the same database the running app (npm run start, per playwright.config.ts)
// is pointed at.
const prisma = new PrismaClient();

test.describe("Player attendance", () => {
  // Both tests share one seeded game/player (created once in beforeAll) and
  // that game's (date, locationName) pair must stay unique in the database
  // (see prisma/schema.prisma) — run serially so the two tests in this
  // describe don't race across parallel workers into a duplicate insert.
  test.describe.configure({ mode: "serial" });

  let playerId: string;
  let gameId: string;
  let adminId: string;

  test.beforeAll(async () => {
    const admin = await prisma.admin.create({
      data: {
        id: randomUUID(),
        email: `e2e-admin-${randomUUID()}@example.com`,
        passwordHash: "hash",
      },
    });
    adminId = admin.id;

    const player = await prisma.player.create({
      data: { id: randomUUID(), name: `E2E Player ${randomUUID()}`, age: 30 },
    });
    playerId = player.id;

    const game = await prisma.game.create({
      data: {
        id: randomUUID(),
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        time: new Date("1970-01-01T18:00:00.000Z"),
        locationName: "Parque Central",
        address: "123 Main St",
        shareText: "Join us!",
        createdById: adminId,
      },
    });
    gameId = game.id;
  });

  test.afterAll(async () => {
    await prisma.attendance.deleteMany({ where: { gameId } });
    await prisma.game.delete({ where: { id: gameId } });
    await prisma.player.delete({ where: { id: playerId } });
    await prisma.admin.delete({ where: { id: adminId } });
    await prisma.$disconnect();
  });

  test("a WhatsApp-style deep link opens the identity picker, then lands on that exact game and lets the player confirm attendance", async ({
    page,
  }) => {
    // Simulates tapping a wa.me-shared link straight to this game's detail
    // page, with no prior visit (fresh browser context, no stored identity).
    await page.goto(`/en/games/${gameId}`);

    await expect(page.getByRole("heading", { name: "Who are you?" })).toBeVisible();

    const player = await prisma.player.findUniqueOrThrow({ where: { id: playerId } });
    await page.getByRole("button", { name: player.name }).click();

    // Deep-link preservation: after picking an identity, the player lands on
    // the originally requested game, not a generic destination.
    await expect(
      page.getByRole("heading", { name: "Game at Parque Central" }),
    ).toBeVisible();

    const confirmButton = page.getByRole("button", { name: "I'm in" });
    await expect(confirmButton).toHaveAttribute("aria-pressed", "false");

    await confirmButton.click();
    await expect(confirmButton).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText("Saved")).toBeVisible();
  });

  test("Games List shows the game and navigates to its detail on selection", async ({
    page,
  }) => {
    await page.goto("/en/games");

    await expect(page.getByRole("heading", { name: "Who are you?" })).toBeVisible();
    const player = await prisma.player.findUniqueOrThrow({ where: { id: playerId } });
    await page.getByRole("button", { name: player.name }).click();

    await expect(page.getByRole("heading", { name: "Games" })).toBeVisible();
    const gameRow = page.getByRole("button", { name: /Parque Central/ });
    await expect(gameRow).toBeVisible();

    await gameRow.click();

    await expect(
      page.getByRole("heading", { name: "Game at Parque Central" }),
    ).toBeVisible();
  });

  // Regression coverage for a bug that unit tests structurally couldn't
  // catch: getGameAttendance threw a custom GameNotFoundError, but Next.js
  // doesn't preserve custom Error subclass identity across the Server
  // Action client/server boundary, so `instanceof GameNotFoundError` on the
  // client never matched in a real deployment — this only reproduces against
  // an actual running server, not a mocked action in the same JS realm.
  test("shows the dedicated not-found message (not a generic retryable error) for a game id that doesn't exist", async ({
    page,
  }) => {
    await setStoredPlayerId(page, playerId);

    await page.goto(`/en/games/${randomUUID()}`);

    // Next.js also renders its own hidden route-announcer element with
    // role="alert" for accessibility, so this is scoped to the one
    // containing the actual not-found copy to avoid a strict-mode
    // ambiguity between the two.
    const alert = page.getByRole("alert").filter({ hasText: "This game couldn't be found." });
    await expect(alert).toBeVisible();
    await expect(page.getByRole("button", { name: "Retry" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Back to games" })).toBeVisible();
  });

  // Regression coverage for the same class of bug: a stale/corrupted
  // playerId in localStorage (e.g. after the player record was deleted or
  // the id was tampered with) must send the player back to the identity
  // picker, not trap them on a permanently-failing generic error — this is
  // the recovery path for the primary real-world entry point (a WhatsApp
  // deep link straight to a game).
  test("recovers to the identity picker (not a stuck generic error) when the stored player id is invalid", async ({
    page,
  }) => {
    await setStoredPlayerId(page, randomUUID());

    await page.goto(`/en/games/${gameId}`);

    await expect(page.getByRole("heading", { name: "Who are you?" })).toBeVisible();
    // Excludes Next.js's own hidden, always-present route-announcer element
    // (also role="alert", but with no text content) — this asserts no
    // *visible* error message is shown, not that no role="alert" node exists
    // in the DOM at all.
    await expect(page.getByRole("alert").filter({ hasText: /./ })).toHaveCount(0);

    // Recovery actually works end-to-end: picking a real identity lands on
    // the originally requested game (deep-link preservation).
    const player = await prisma.player.findUniqueOrThrow({ where: { id: playerId } });
    await page.getByRole("button", { name: player.name }).click();

    await expect(
      page.getByRole("heading", { name: "Game at Parque Central" }),
    ).toBeVisible();
  });

  // docs/ux/02-player-attendance.md's accessibility section: "Focus stays on
  // the toggle button that was pressed through the save cycle (does not
  // jump away)." A native `disabled` attribute can never hold focus in a
  // real browser, which JSDOM-based component tests don't reliably surface —
  // this needs a real browser to catch a regression.
  test("keeps keyboard focus on the toggle button through the attendance save cycle", async ({
    page,
  }) => {
    // Slows down the Server Action's POST request so there's a reliable
    // window to assert the in-flight (isSaving) state before it resolves.
    await page.route("**/*", async (route) => {
      if (route.request().method() === "POST") {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      await route.continue();
    });

    await setStoredPlayerId(page, playerId);
    await page.goto(`/en/games/${gameId}`);

    const declineButton = page.getByRole("button", { name: "Can't make it" });
    await expect(declineButton).toBeVisible();
    await declineButton.click();

    await expect(declineButton).toBeFocused();
    await expect(declineButton).toHaveAttribute("aria-disabled", "true");

    await expect(declineButton).toHaveAttribute("aria-pressed", "true", { timeout: 2000 });
    await expect(declineButton).not.toHaveAttribute("aria-disabled", "true");
    await expect(declineButton).toBeFocused();
  });
});
