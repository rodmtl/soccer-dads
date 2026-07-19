import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { updateOwnPositions } from "@/server/actions/updateOwnPositions";

// Integration test against a real Postgres database (see docs/architecture.md's
// "Test tooling" section) — verifies updateOwnPositions() actually persists
// through Prisma's Position[] column and rejects invalid input before any
// write reaches the database. Requires `docker compose up -d postgres` and a
// migrated database reachable via DATABASE_URL.
describe("updateOwnPositions (integration)", () => {
  const createdPlayerIds: string[] = [];

  afterEach(async () => {
    await prisma.player.deleteMany({ where: { id: { in: createdPlayerIds } } });
    createdPlayerIds.length = 0;
  });

  async function seedPlayer() {
    const player = await prisma.player.create({
      data: { id: randomUUID(), name: "Zara", age: 30, positions: ["striker"] },
    });
    createdPlayerIds.push(player.id);
    return player;
  }

  it("persists the new positions for the given player", async () => {
    const player = await seedPlayer();

    const result = await updateOwnPositions(player.id, ["goalkeeper", "defender"]);

    expect(result).toEqual({ ok: true, data: { positions: ["goalkeeper", "defender"] } });
    const updated = await prisma.player.findUniqueOrThrow({ where: { id: player.id } });
    expect(updated.positions).toEqual(["goalkeeper", "defender"]);
  });

  it("rejects more than 2 positions without writing anything", async () => {
    const player = await seedPlayer();

    const result = await updateOwnPositions(player.id, [
      "goalkeeper",
      "defender",
      "midfielder",
    ]);

    expect(result).toEqual({ ok: false, reason: "invalid_positions" });
    const unchanged = await prisma.player.findUniqueOrThrow({ where: { id: player.id } });
    expect(unchanged.positions).toEqual(["striker"]);
  });

  it("returns { ok: false, reason: 'invalid_player' } for a non-existent player id, without writing anything", async () => {
    const result = await updateOwnPositions(randomUUID(), ["goalkeeper"]);

    expect(result).toEqual({ ok: false, reason: "invalid_player" });
  });
});
