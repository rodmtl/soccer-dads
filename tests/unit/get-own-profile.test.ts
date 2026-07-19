import { describe, expect, it, vi, type Mock } from "vitest";
import { prisma } from "@/lib/prisma";
import { assertPlayerExists } from "@/server/services/assertPlayerExists";
import { getOwnProfile } from "@/server/actions/getOwnProfile";
import { InvalidPlayerError } from "@/server/errors";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    player: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/server/services/assertPlayerExists", () => ({
  assertPlayerExists: vi.fn(),
}));

const findUniqueMock = prisma.player.findUnique as unknown as Mock<() => Promise<unknown>>;
const assertPlayerExistsMock = assertPlayerExists as unknown as Mock<
  (playerId: string) => Promise<void>
>;

// Profile (docs/ux/03-player-position.md): returns the CURRENT player's own
// record only. There is deliberately no id parameter here beyond the
// validated current-player id — this action can never be asked for another
// player's record. `rating` is deliberately never selected/returned at all
// (see docs/adr/0002-player-rating-privacy-deferred.md): v1 has no real
// player authentication, so a rating-fetching action can't verify the caller
// actually is the player it claims to be — anyone could otherwise request
// anyone's rating by supplying a different id.
describe("getOwnProfile", () => {
  it("returns { ok: false, reason: 'invalid_player' } when the player id does not exist, rather than throwing", async () => {
    assertPlayerExistsMock.mockRejectedValue(new InvalidPlayerError("bad-id"));

    const result = await getOwnProfile("bad-id");

    expect(result).toEqual({ ok: false, reason: "invalid_player" });
  });

  it("returns the current player's own name, age, and positions", async () => {
    assertPlayerExistsMock.mockResolvedValue(undefined);
    findUniqueMock.mockResolvedValue({
      name: "Jordan Lee",
      age: 34,
      positions: ["defender"],
    });

    const result = await getOwnProfile("player-1");

    expect(result).toEqual({
      ok: true,
      data: { name: "Jordan Lee", age: 34, positions: ["defender"] },
    });
  });

  it("never selects or returns rating, even if the underlying row has one (docs/adr/0002)", async () => {
    assertPlayerExistsMock.mockResolvedValue(undefined);
    findUniqueMock.mockResolvedValue({
      name: "Jordan Lee",
      age: 34,
      positions: ["defender"],
      rating: 99,
    });

    const result = await getOwnProfile("player-1");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).not.toHaveProperty("rating");
    expect(findUniqueMock).toHaveBeenCalledWith(
      expect.objectContaining({ select: { name: true, age: true, positions: true } }),
    );
  });

  it("only ever queries by the given (already-validated) player id, never a caller-supplied other id", async () => {
    assertPlayerExistsMock.mockResolvedValue(undefined);
    findUniqueMock.mockResolvedValue({
      name: "Jordan Lee",
      age: 34,
      positions: [],
    });

    await getOwnProfile("player-42");

    expect(findUniqueMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "player-42" } }),
    );
  });
});
