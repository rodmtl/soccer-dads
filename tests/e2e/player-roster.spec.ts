import { randomUUID } from "node:crypto";
import { test, expect, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { CURRENT_PLAYER_STORAGE_KEY } from "@/lib/currentPlayer";

// Stores a player id directly in localStorage before navigating, bypassing
// the identity picker — see tests/e2e/player-attendance.spec.ts's helper of
// the same name/shape. Requires visiting the app origin once first, since
// localStorage is scoped per-origin.
async function setStoredPlayerId(page: Page, playerId: string) {
  await page.goto("/en/games");
  await page.evaluate(
    ({ key, value }) => window.localStorage.setItem(key, value),
    { key: CURRENT_PLAYER_STORAGE_KEY, value: playerId },
  );
}

// End-to-end coverage of docs/ux/04-player-roster-view.md against a real
// running server and a real Postgres database with real seeded
// TeamAssignment rows, not a mocked getGameRoster action — exercises the
// tab-switching interaction and the header-extraction refactor's actual
// rendering, neither of which a mocked component test can fully verify (see
// tests/e2e/player-attendance.spec.ts's comment on the same class of bug).
const prisma = new PrismaClient();

test.describe("Player roster view", () => {
  test.describe.configure({ mode: "serial" });

  let adminId: string;
  let viewerId: string;
  let teammateId: string;
  let opponentId: string;
  let generatedGameId: string;
  let notGeneratedGameId: string;

  test.beforeAll(async () => {
    const admin = await prisma.admin.create({
      data: {
        id: randomUUID(),
        email: `e2e-admin-${randomUUID()}@example.com`,
        passwordHash: "hash",
      },
    });
    adminId = admin.id;

    const viewer = await prisma.player.create({
      data: { id: randomUUID(), name: `E2E Viewer ${randomUUID()}`, age: 30 },
    });
    viewerId = viewer.id;

    const teammate = await prisma.player.create({
      data: { id: randomUUID(), name: "Jordan Lee", age: 28 },
    });
    teammateId = teammate.id;

    const opponent = await prisma.player.create({
      data: { id: randomUUID(), name: "Alex Kim", age: 32 },
    });
    opponentId = opponent.id;

    const generatedGame = await prisma.game.create({
      data: {
        id: randomUUID(),
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        time: new Date("1970-01-01T18:00:00.000Z"),
        locationName: `Cancha Sur ${randomUUID()}`,
        address: "123 Main St",
        numberOfTeams: 2,
        shareText: "Join us!",
        createdById: adminId,
      },
    });
    generatedGameId = generatedGame.id;

    await prisma.teamAssignment.createMany({
      data: [
        {
          id: randomUUID(),
          gameId: generatedGameId,
          playerId: viewerId,
          teamIndex: 0,
          assignedPosition: "midfielder",
        },
        {
          id: randomUUID(),
          gameId: generatedGameId,
          playerId: teammateId,
          teamIndex: 0,
          assignedPosition: "defender",
        },
        {
          id: randomUUID(),
          gameId: generatedGameId,
          playerId: opponentId,
          teamIndex: 1,
          assignedPosition: "striker",
        },
      ],
    });

    const notGeneratedGame = await prisma.game.create({
      data: {
        id: randomUUID(),
        date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        time: new Date("1970-01-01T18:00:00.000Z"),
        locationName: `Cancha Norte ${randomUUID()}`,
        address: "456 North Ave",
        numberOfTeams: 2,
        shareText: "Join us!",
        createdById: adminId,
      },
    });
    notGeneratedGameId = notGeneratedGame.id;
  });

  test.afterAll(async () => {
    await prisma.teamAssignment.deleteMany({
      where: { gameId: { in: [generatedGameId, notGeneratedGameId] } },
    });
    await prisma.attendance.deleteMany({
      where: { gameId: { in: [generatedGameId, notGeneratedGameId] } },
    });
    await prisma.game.deleteMany({ where: { id: { in: [generatedGameId, notGeneratedGameId] } } });
    await prisma.player.deleteMany({ where: { id: { in: [viewerId, teammateId, opponentId] } } });
    await prisma.admin.delete({ where: { id: adminId } });
    await prisma.$disconnect();
  });

  test("switches from Details & Attendance to Roster and shows the generated teams with the viewer highlighted as 'You'", async ({
    page,
  }) => {
    await setStoredPlayerId(page, viewerId);
    await page.goto(`/en/games/${generatedGameId}`);

    const attendanceTab = page.getByRole("tab", { name: "Details & Attendance" });
    const rosterTab = page.getByRole("tab", { name: "Roster" });
    await expect(attendanceTab).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("button", { name: "I'm in" })).toBeVisible();

    await rosterTab.click();

    await expect(rosterTab).toHaveAttribute("aria-selected", "true");
    // The shared header (extracted out of the Attendance tab) stays visible
    // above both tabs.
    await expect(
      page.getByRole("heading", { name: /Game at Cancha Sur/ }),
    ).toBeVisible();

    await expect(page.getByRole("heading", { name: "Team 1" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Team 2" })).toBeVisible();

    const team1 = page.locator("section", { has: page.getByRole("heading", { name: "Team 1" }) });
    await expect(team1.getByText("Jordan Lee")).toBeVisible();
    await expect(team1.getByText("Defender")).toBeVisible();

    const ownRow = team1.locator("li").filter({ hasText: "You" });
    await expect(ownRow).toHaveCount(1);

    const team2 = page.locator("section", { has: page.getByRole("heading", { name: "Team 2" }) });
    await expect(team2.getByText("Alex Kim")).toBeVisible();
    await expect(team2.getByText("Striker")).toBeVisible();
    await expect(team2.locator("li").filter({ hasText: "You" })).toHaveCount(0);

    // Switching back to Details & Attendance still works after visiting Roster.
    await attendanceTab.click();
    await expect(page.getByRole("button", { name: "I'm in" })).toBeVisible();
  });

  test("shows the not-generated-yet empty state for a game with no TeamAssignment rows", async ({
    page,
  }) => {
    await setStoredPlayerId(page, viewerId);
    await page.goto(`/en/games/${notGeneratedGameId}`);

    await page.getByRole("tab", { name: "Roster" }).click();

    await expect(page.getByText("Teams haven't been announced yet")).toBeVisible();
    await expect(page.getByText("Check back closer to game day.")).toBeVisible();
    await expect(page.getByRole("heading", { name: /^Team \d/ })).toHaveCount(0);
  });
});
