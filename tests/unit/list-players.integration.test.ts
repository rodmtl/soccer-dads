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
  afterEach(async () => {
    await prisma.player.deleteMany();
  });

  it("returns players actually persisted in the database", async () => {
    await prisma.player.create({
      data: { id: randomUUID(), name: "Zara", age: 30 },
    });
    await prisma.player.create({
      data: { id: randomUUID(), name: "Amir", age: 25 },
    });

    const players = await listPlayers();

    expect(players.map((player) => player.name).sort()).toEqual(["Amir", "Zara"]);
    expect(players.every((player) => typeof player.id === "string")).toBe(true);
  });
});
