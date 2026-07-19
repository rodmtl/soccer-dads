import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { getGameRoster } from "@/server/actions/getGameRoster";

// Integration test against a real Postgres database (see docs/architecture.md's
// "Test tooling" section) — verifies getGameRoster() actually reads/groups
// real TeamAssignment rows by team_index, including the "not generated yet"
// case (zero rows) which is only meaningfully distinct from a genuine
// mid-generation partial roster once real rows are involved. Requires
// `docker compose up -d postgres` and a migrated database reachable via
// DATABASE_URL.
describe("getGameRoster (integration)", () => {
  const createdGameIds: string[] = [];
  const createdPlayerIds: string[] = [];
  const createdAdminIds: string[] = [];

  afterEach(async () => {
    await prisma.teamAssignment.deleteMany({ where: { gameId: { in: createdGameIds } } });
    await prisma.game.deleteMany({ where: { id: { in: createdGameIds } } });
    await prisma.player.deleteMany({ where: { id: { in: createdPlayerIds } } });
    await prisma.admin.deleteMany({ where: { id: { in: createdAdminIds } } });
    createdGameIds.length = 0;
    createdPlayerIds.length = 0;
    createdAdminIds.length = 0;
  });

  async function seedAdmin() {
    const admin = await prisma.admin.create({
      data: { id: randomUUID(), email: `admin-${randomUUID()}@example.com`, passwordHash: "hash" },
    });
    createdAdminIds.push(admin.id);
    return admin;
  }

  async function seedGame(adminId: string, numberOfTeams = 2) {
    const game = await prisma.game.create({
      data: {
        id: randomUUID(),
        date: new Date("2026-08-01T00:00:00.000Z"),
        time: new Date("1970-01-01T18:00:00.000Z"),
        locationName: `Parque Central ${randomUUID()}`,
        address: "123 Main St",
        numberOfTeams,
        shareText: "Join us!",
        createdById: adminId,
      },
    });
    createdGameIds.push(game.id);
    return game;
  }

  async function seedPlayer(name: string) {
    const player = await prisma.player.create({
      data: { id: randomUUID(), name, age: 30 },
    });
    createdPlayerIds.push(player.id);
    return player;
  }

  it("returns empty teams for a game with no TeamAssignment rows yet", async () => {
    const admin = await seedAdmin();
    const game = await seedGame(admin.id, 2);
    const player = await seedPlayer("Sam Ortiz");

    const result = await getGameRoster(game.id, player.id);

    expect(result).toEqual({
      ok: true,
      data: {
        teams: [
          { teamIndex: 0, players: [] },
          { teamIndex: 1, players: [] },
        ],
      },
    });
  });

  it("reads real TeamAssignment rows, grouped by team_index, once a roster is generated", async () => {
    const admin = await seedAdmin();
    const game = await seedGame(admin.id, 2);
    const viewer = await seedPlayer("Viewer Player");
    const teammate = await seedPlayer("Jordan Lee");
    const opponent = await seedPlayer("Alex Kim");

    await prisma.teamAssignment.createMany({
      data: [
        {
          id: randomUUID(),
          gameId: game.id,
          playerId: viewer.id,
          teamIndex: 0,
          assignedPosition: "midfielder",
        },
        {
          id: randomUUID(),
          gameId: game.id,
          playerId: teammate.id,
          teamIndex: 0,
          assignedPosition: "defender",
        },
        {
          id: randomUUID(),
          gameId: game.id,
          playerId: opponent.id,
          teamIndex: 1,
          assignedPosition: "striker",
        },
      ],
    });

    const result = await getGameRoster(game.id, viewer.id);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.teams).toHaveLength(2);
    expect(result.data.teams[0].players).toEqual([
      { id: teammate.id, name: "Jordan Lee", assignedPosition: "defender" },
      { id: viewer.id, name: "Viewer Player", assignedPosition: "midfielder" },
    ]);
    expect(result.data.teams[1].players).toEqual([
      { id: opponent.id, name: "Alex Kim", assignedPosition: "striker" },
    ]);
  });

  it("returns { ok: false, reason: 'not_found' } for a non-existent game id", async () => {
    const player = await seedPlayer("Sam Ortiz");

    const result = await getGameRoster(randomUUID(), player.id);

    expect(result).toEqual({ ok: false, reason: "not_found" });
  });

  it("returns { ok: false, reason: 'invalid_player' } for a non-existent player id", async () => {
    const admin = await seedAdmin();
    const game = await seedGame(admin.id, 2);

    const result = await getGameRoster(game.id, randomUUID());

    expect(result).toEqual({ ok: false, reason: "invalid_player" });
  });
});
