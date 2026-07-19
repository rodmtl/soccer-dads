import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { getOwnProfile } from "@/server/actions/getOwnProfile";

// Integration test against a real Postgres database (see docs/architecture.md's
// "Test tooling" section) — verifies getOwnProfile() actually round-trips
// through Prisma's Position[] column type. Requires `docker compose up -d
// postgres` and a migrated database reachable via DATABASE_URL.
describe("getOwnProfile (integration)", () => {
  const createdPlayerIds: string[] = [];

  afterEach(async () => {
    await prisma.player.deleteMany({ where: { id: { in: createdPlayerIds } } });
    createdPlayerIds.length = 0;
  });

  it("returns the seeded player's own name, age, and positions", async () => {
    const player = await prisma.player.create({
      data: {
        id: randomUUID(),
        name: "Jordan Lee",
        age: 34,
        positions: ["defender", "midfielder"],
        rating: 72,
      },
    });
    createdPlayerIds.push(player.id);

    const result = await getOwnProfile(player.id);

    expect(result).toEqual({
      ok: true,
      data: {
        name: "Jordan Lee",
        age: 34,
        positions: ["defender", "midfielder"],
      },
    });
  });

  // docs/adr/0002-player-rating-privacy-deferred.md's actual security
  // boundary: this must hold against the real database, not just a mocked
  // Prisma client (the mocked unit test only proves the code *asks* Prisma
  // for the right select — this proves Prisma actually returns nothing else).
  it("never returns rating, even though the underlying row has one", async () => {
    const player = await prisma.player.create({
      data: { id: randomUUID(), name: "Jordan Lee", age: 34, rating: 99 },
    });
    createdPlayerIds.push(player.id);

    const result = await getOwnProfile(player.id);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).not.toHaveProperty("rating");
  });

  it("returns { ok: false, reason: 'invalid_player' } for a non-existent player id", async () => {
    const result = await getOwnProfile(randomUUID());

    expect(result).toEqual({ ok: false, reason: "invalid_player" });
  });
});
