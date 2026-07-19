import { describe, expect, it, vi, type Mock } from "vitest";
import { prisma } from "@/lib/prisma";
import { listPlayers, type PlayerListItem } from "@/server/actions/listPlayers";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    player: {
      findMany: vi.fn(),
    },
  },
}));

// Prisma's real `findMany` type is a generic overload keyed off the `select`
// argument (so it can return the full Player shape or a narrowed one); the
// mocked client needs an explicit cast here so tests can resolve it with just
// the { id, name } shape this Server Action actually selects.
const findManyMock = prisma.player.findMany as unknown as Mock<
  () => Promise<PlayerListItem[]>
>;

describe("listPlayers", () => {
  it("returns only the id and name of every player", async () => {
    findManyMock.mockResolvedValue([
      { id: "1", name: "Alice" },
      { id: "2", name: "Bob" },
    ]);

    const players = await listPlayers();

    expect(players).toEqual([
      { id: "1", name: "Alice" },
      { id: "2", name: "Bob" },
    ]);
  });

  it("selects only id and name from the database, nothing else", async () => {
    findManyMock.mockResolvedValue([]);

    await listPlayers();

    expect(prisma.player.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: { id: true, name: true },
      }),
    );
  });
});
