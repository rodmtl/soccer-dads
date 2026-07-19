import { describe, expect, it, vi, type Mock } from "vitest";
import { prisma } from "@/lib/prisma";
import { assertPlayerExists } from "@/server/services/assertPlayerExists";
import { getGameAttendance } from "@/server/actions/getGameAttendance";
import { InvalidPlayerError } from "@/server/errors";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    game: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/server/services/assertPlayerExists", () => ({
  assertPlayerExists: vi.fn(),
}));

const findUniqueMock = prisma.game.findUnique as unknown as Mock<() => Promise<unknown>>;
const assertPlayerExistsMock = assertPlayerExists as unknown as Mock<
  (playerId: string) => Promise<void>
>;

describe("getGameAttendance", () => {
  it("returns { ok: false, reason: 'invalid_player' } when the player id does not exist, rather than throwing", async () => {
    assertPlayerExistsMock.mockRejectedValue(new InvalidPlayerError("bad-id"));

    const result = await getGameAttendance("game-1", "bad-id");

    expect(result).toEqual({ ok: false, reason: "invalid_player" });
  });

  it("returns { ok: false, reason: 'not_found' } when the game id does not exist, rather than throwing", async () => {
    assertPlayerExistsMock.mockResolvedValue(undefined);
    findUniqueMock.mockResolvedValue(null);

    const result = await getGameAttendance("missing-game", "player-1");

    expect(result).toEqual({ ok: false, reason: "not_found" });
  });

  it("returns the game's raw date/time (client formats these per-locale) and the player's attendance status", async () => {
    assertPlayerExistsMock.mockResolvedValue(undefined);
    findUniqueMock.mockResolvedValue({
      id: "game-1",
      date: new Date("2026-07-20T00:00:00.000Z"),
      time: new Date("1970-01-01T18:00:00.000Z"),
      locationName: "Parque Central",
      address: "123 Main St",
      attendances: [{ status: "confirmed" }],
    });

    const result = await getGameAttendance("game-1", "player-1");

    expect(result).toEqual({
      ok: true,
      data: {
        game: {
          id: "game-1",
          date: "2026-07-20",
          time: "1970-01-01T18:00:00.000Z",
          locationName: "Parque Central",
          address: "123 Main St",
        },
        status: "confirmed",
      },
    });
  });

  it("defaults to no_response when the player has no attendance row yet", async () => {
    assertPlayerExistsMock.mockResolvedValue(undefined);
    findUniqueMock.mockResolvedValue({
      id: "game-1",
      date: new Date("2026-07-20T00:00:00.000Z"),
      time: new Date("1970-01-01T18:00:00.000Z"),
      locationName: "Parque Central",
      address: "123 Main St",
      attendances: [],
    });

    const result = await getGameAttendance("game-1", "player-1");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.status).toBe("no_response");
  });

  it("only queries this player's own attendance row for the game", async () => {
    assertPlayerExistsMock.mockResolvedValue(undefined);
    findUniqueMock.mockResolvedValue({
      id: "game-1",
      date: new Date("2026-07-20T00:00:00.000Z"),
      time: new Date("1970-01-01T18:00:00.000Z"),
      locationName: "Parque Central",
      address: "123 Main St",
      attendances: [],
    });

    await getGameAttendance("game-1", "player-42");

    expect(findUniqueMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "game-1" },
        include: { attendances: { where: { playerId: "player-42" } } },
      }),
    );
  });
});
