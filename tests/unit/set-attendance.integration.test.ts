import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { setAttendance } from "@/server/actions/setAttendance";

// Integration test against a real Postgres database (see docs/architecture.md's
// "Test tooling" section) — verifies setAttendance() actually round-trips
// through the real unique (game_id, player_id) constraint on `attendances`
// (upsert must update the existing row rather than violating the constraint
// on a second write for the same game+player). Requires
// `docker compose up -d postgres` and a migrated database reachable via
// DATABASE_URL.
describe("setAttendance (integration)", () => {
  // Cleanup is scoped to exactly the rows each test created (by id), not
  // whole-table deletes — a whole-table deleteMany would silently wipe a
  // real dev database if DATABASE_URL is ever pointed at one instead of the
  // disposable docker-compose Postgres.
  const createdGameIds: string[] = [];
  const createdPlayerIds: string[] = [];
  const createdAdminIds: string[] = [];

  afterEach(async () => {
    await prisma.attendance.deleteMany({ where: { gameId: { in: createdGameIds } } });
    await prisma.game.deleteMany({ where: { id: { in: createdGameIds } } });
    await prisma.player.deleteMany({ where: { id: { in: createdPlayerIds } } });
    await prisma.admin.deleteMany({ where: { id: { in: createdAdminIds } } });
    createdGameIds.length = 0;
    createdPlayerIds.length = 0;
    createdAdminIds.length = 0;
  });

  async function seedGameAndPlayer() {
    const admin = await prisma.admin.create({
      data: { id: randomUUID(), email: `admin-${randomUUID()}@example.com`, passwordHash: "hash" },
    });
    createdAdminIds.push(admin.id);

    const player = await prisma.player.create({
      data: { id: randomUUID(), name: "Zara", age: 30 },
    });
    createdPlayerIds.push(player.id);

    const game = await prisma.game.create({
      data: {
        id: randomUUID(),
        date: new Date("2026-08-01T00:00:00.000Z"),
        time: new Date("1970-01-01T18:00:00.000Z"),
        locationName: "Parque Central",
        address: "123 Main St",
        shareText: "Join us!",
        createdById: admin.id,
      },
    });
    createdGameIds.push(game.id);

    return { player, game };
  }

  it("creates an attendance row the first time a player responds", async () => {
    const { player, game } = await seedGameAndPlayer();

    const result = await setAttendance(game.id, player.id, "confirmed");

    expect(result).toEqual({ ok: true, data: { status: "confirmed" } });
    const rows = await prisma.attendance.findMany({
      where: { gameId: game.id, playerId: player.id },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("confirmed");
  });

  it("updates the same row on a second call instead of violating the unique constraint", async () => {
    const { player, game } = await seedGameAndPlayer();

    await setAttendance(game.id, player.id, "confirmed");
    const result = await setAttendance(game.id, player.id, "declined");

    expect(result).toEqual({ ok: true, data: { status: "declined" } });
    const rows = await prisma.attendance.findMany({
      where: { gameId: game.id, playerId: player.id },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("declined");
  });

  it("returns { ok: false, reason: 'invalid_player' } for a non-existent player id, without writing any attendance row", async () => {
    const { game } = await seedGameAndPlayer();

    const result = await setAttendance(game.id, randomUUID(), "confirmed");

    expect(result).toEqual({ ok: false, reason: "invalid_player" });

    const rows = await prisma.attendance.findMany({ where: { gameId: game.id } });
    expect(rows).toHaveLength(0);
  });
});
