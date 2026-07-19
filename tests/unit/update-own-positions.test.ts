import { describe, expect, it, vi, type Mock } from "vitest";
import { prisma } from "@/lib/prisma";
import { assertPlayerExists } from "@/server/services/assertPlayerExists";
import { updateOwnPositions } from "@/server/actions/updateOwnPositions";
import { InvalidPlayerError } from "@/server/errors";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    player: {
      update: vi.fn(),
    },
  },
}));

vi.mock("@/server/services/assertPlayerExists", () => ({
  assertPlayerExists: vi.fn(),
}));

const updateMock = prisma.player.update as unknown as Mock<() => Promise<unknown>>;
const assertPlayerExistsMock = assertPlayerExists as unknown as Mock<
  (playerId: string) => Promise<void>
>;

// Profile — position picker (docs/ux/03-player-position.md): the server-side
// boundary for the max-2/valid-enum/no-duplicates constraint on
// Player.positions (docs/data-model.md). The client's PositionPicker also
// enforces max-2, but that's a UI convenience only — this is the real check.
describe("updateOwnPositions", () => {
  it("returns { ok: false, reason: 'invalid_player' } when the player id does not exist, without writing anything", async () => {
    assertPlayerExistsMock.mockRejectedValue(new InvalidPlayerError("bad-id"));

    const result = await updateOwnPositions("bad-id", ["goalkeeper"]);

    expect(result).toEqual({ ok: false, reason: "invalid_player" });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("returns { ok: false, reason: 'invalid_positions' } when given more than 2 positions, without writing anything", async () => {
    assertPlayerExistsMock.mockResolvedValue(undefined);

    const result = await updateOwnPositions("player-1", [
      "goalkeeper",
      "defender",
      "midfielder",
    ]);

    expect(result).toEqual({ ok: false, reason: "invalid_positions" });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("returns { ok: false, reason: 'invalid_positions' } for a value that isn't a real position, without writing anything", async () => {
    assertPlayerExistsMock.mockResolvedValue(undefined);

    // @ts-expect-error deliberately invalid input, exercising the real
    // server-side boundary rather than a value TypeScript would already reject.
    const result = await updateOwnPositions("player-1", ["sweeper"]);

    expect(result).toEqual({ ok: false, reason: "invalid_positions" });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("returns { ok: false, reason: 'invalid_positions' } for duplicate positions, without writing anything", async () => {
    assertPlayerExistsMock.mockResolvedValue(undefined);

    const result = await updateOwnPositions("player-1", ["goalkeeper", "goalkeeper"]);

    expect(result).toEqual({ ok: false, reason: "invalid_positions" });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("updates the player's positions and returns the new list", async () => {
    assertPlayerExistsMock.mockResolvedValue(undefined);
    updateMock.mockResolvedValue({ positions: ["goalkeeper", "defender"] });

    const result = await updateOwnPositions("player-1", ["goalkeeper", "defender"]);

    expect(result).toEqual({ ok: true, data: { positions: ["goalkeeper", "defender"] } });
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "player-1" },
        data: { positions: ["goalkeeper", "defender"] },
      }),
    );
  });

  it("allows clearing all positions back to an empty selection", async () => {
    assertPlayerExistsMock.mockResolvedValue(undefined);
    updateMock.mockResolvedValue({ positions: [] });

    const result = await updateOwnPositions("player-1", []);

    expect(result).toEqual({ ok: true, data: { positions: [] } });
  });
});
