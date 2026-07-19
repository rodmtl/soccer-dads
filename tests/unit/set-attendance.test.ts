import { describe, expect, it, vi, type Mock } from "vitest";
import { prisma } from "@/lib/prisma";
import { assertPlayerExists } from "@/server/services/assertPlayerExists";
import { setAttendance } from "@/server/actions/setAttendance";
import { InvalidPlayerError } from "@/server/errors";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    game: {
      findUnique: vi.fn(),
    },
    attendance: {
      upsert: vi.fn(),
    },
  },
}));

vi.mock("@/server/services/assertPlayerExists", () => ({
  assertPlayerExists: vi.fn(),
}));

const gameFindUniqueMock = prisma.game.findUnique as unknown as Mock<() => Promise<unknown>>;
interface UpsertArgs {
  where: { gameId_playerId: { gameId: string; playerId: string } };
  create: { gameId: string; playerId: string; status: string; respondedAt: Date | null };
  update: { status: string; respondedAt: Date | null };
}

const upsertMock = prisma.attendance.upsert as unknown as Mock<
  (args: UpsertArgs) => Promise<unknown>
>;
const assertPlayerExistsMock = assertPlayerExists as unknown as Mock<
  (playerId: string) => Promise<void>
>;

describe("setAttendance", () => {
  it("returns { ok: false, reason: 'invalid_player' } when the player id does not exist, without writing anything", async () => {
    assertPlayerExistsMock.mockRejectedValue(new InvalidPlayerError("bad-id"));

    const result = await setAttendance("game-1", "bad-id", "confirmed");

    expect(result).toEqual({ ok: false, reason: "invalid_player" });
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it("returns { ok: false, reason: 'not_found' } when the game id does not exist, without writing anything", async () => {
    assertPlayerExistsMock.mockResolvedValue(undefined);
    gameFindUniqueMock.mockResolvedValue(null);

    const result = await setAttendance("missing-game", "player-1", "confirmed");

    expect(result).toEqual({ ok: false, reason: "not_found" });
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it("upserts the attendance row keyed by gameId+playerId and returns the new status", async () => {
    assertPlayerExistsMock.mockResolvedValue(undefined);
    gameFindUniqueMock.mockResolvedValue({ id: "game-1" });
    upsertMock.mockResolvedValue({ status: "confirmed" });

    const result = await setAttendance("game-1", "player-1", "confirmed");

    expect(result).toEqual({ ok: true, data: { status: "confirmed" } });
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { gameId_playerId: { gameId: "game-1", playerId: "player-1" } },
        create: expect.objectContaining({
          gameId: "game-1",
          playerId: "player-1",
          status: "confirmed",
        }),
        update: expect.objectContaining({ status: "confirmed" }),
      }),
    );
  });

  it("clears respondedAt when reverting back to no_response", async () => {
    assertPlayerExistsMock.mockResolvedValue(undefined);
    gameFindUniqueMock.mockResolvedValue({ id: "game-1" });
    upsertMock.mockResolvedValue({ status: "no_response" });

    await setAttendance("game-1", "player-1", "no_response");

    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ status: "no_response", respondedAt: null }),
      }),
    );
  });

  it("sets respondedAt when confirming or declining", async () => {
    assertPlayerExistsMock.mockResolvedValue(undefined);
    gameFindUniqueMock.mockResolvedValue({ id: "game-1" });
    upsertMock.mockResolvedValue({ status: "declined" });

    await setAttendance("game-1", "player-1", "declined");

    const call = upsertMock.mock.calls[0][0];
    expect(call.update.respondedAt).toBeInstanceOf(Date);
  });
});
