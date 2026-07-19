import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { listPlayers } from "@/server/actions/listPlayers";

// Integration test against a real Postgres database (see docs/architecture.md's
// "Test tooling" section) — verifies listPlayers() actually round-trips through
// Prisma against the schema in prisma/migrations, not just a mocked client.
// Requires `docker compose up -d postgres` and a migrated database
// (`prisma migrate deploy` / `prisma migrate dev`) to be reachable via
// DATABASE_URL.
describe("listPlayers (integration)", () => {
  // Cleanup is scoped to exactly the player ids this test created, not a
  // whole-table delete — a whole-table deleteMany would silently wipe a real
  // dev database if DATABASE_URL is ever pointed at one instead of the
  // disposable docker-compose Postgres.
  const createdPlayerIds: string[] = [];

  afterEach(async () => {
    await prisma.player.deleteMany({ where: { id: { in: createdPlayerIds } } });
    createdPlayerIds.length = 0;
  });

  it("returns players actually persisted in the database", async () => {
    const zara = await prisma.player.create({
      data: { id: randomUUID(), name: "Zara", age: 30 },
    });
    createdPlayerIds.push(zara.id);
    const amir = await prisma.player.create({
      data: { id: randomUUID(), name: "Amir", age: 25 },
    });
    createdPlayerIds.push(amir.id);

    const players = await listPlayers();

    const createdPlayers = players.filter((player) =>
      createdPlayerIds.includes(player.id),
    );
    expect(createdPlayers.map((player) => player.name).sort()).toEqual([
      "Amir",
      "Zara",
    ]);
  });
});
