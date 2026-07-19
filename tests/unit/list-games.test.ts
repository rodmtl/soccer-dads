import { describe, expect, it, vi, type Mock } from "vitest";
import { prisma } from "@/lib/prisma";
import { assertPlayerExists } from "@/server/services/assertPlayerExists";
import { listGames } from "@/server/actions/listGames";
import { InvalidPlayerError } from "@/server/errors";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    game: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/server/services/assertPlayerExists", () => ({
  assertPlayerExists: vi.fn(),
}));

const findManyMock = prisma.game.findMany as unknown as Mock<() => Promise<unknown[]>>;
const assertPlayerExistsMock = assertPlayerExists as unknown as Mock<
  (playerId: string) => Promise<void>
>;

const NOW = new Date("2026-07-19T12:00:00.000Z");

function game(overrides: Partial<{
  id: string;
  date: string;
  locationName: string;
  attendances: Array<{ status: string }>;
}>) {
  return {
    id: overrides.id ?? "game-1",
    date: new Date(`${overrides.date ?? "2026-07-20"}T00:00:00.000Z`),
    time: new Date("1970-01-01T18:00:00.000Z"),
    locationName: overrides.locationName ?? "Parque Central",
    attendances: overrides.attendances ?? [],
  };
}

describe("listGames", () => {
  it("returns { ok: false, reason: 'invalid_player' } when the player id does not exist, rather than throwing", async () => {
    assertPlayerExistsMock.mockRejectedValue(new InvalidPlayerError("bad-id"));

    const result = await listGames("bad-id", NOW);

    expect(result).toEqual({ ok: false, reason: "invalid_player" });
  });

  it("splits games into upcoming (date >= today) and past (date < today)", async () => {
    assertPlayerExistsMock.mockResolvedValue(undefined);
    findManyMock.mockResolvedValue([
      game({ id: "future", date: "2026-07-20" }),
      game({ id: "today", date: "2026-07-19" }),
      game({ id: "past", date: "2026-07-18" }),
    ]);

    const result = await listGames("player-1", NOW);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.upcoming.map((g) => g.id)).toEqual(["today", "future"]);
    expect(result.data.past.map((g) => g.id)).toEqual(["past"]);
  });

  it("sorts upcoming games ascending by date and past games descending", async () => {
    assertPlayerExistsMock.mockResolvedValue(undefined);
    findManyMock.mockResolvedValue([
      game({ id: "far-future", date: "2026-08-01" }),
      game({ id: "near-future", date: "2026-07-21" }),
      game({ id: "near-past", date: "2026-07-17" }),
      game({ id: "far-past", date: "2026-07-01" }),
    ]);

    const result = await listGames("player-1", NOW);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.upcoming.map((g) => g.id)).toEqual(["near-future", "far-future"]);
    expect(result.data.past.map((g) => g.id)).toEqual(["near-past", "far-past"]);
  });

  it("derives each game's myAttendanceStatus from the current player's attendance row", async () => {
    assertPlayerExistsMock.mockResolvedValue(undefined);
    findManyMock.mockResolvedValue([
      game({ id: "confirmed-game", date: "2026-07-20", attendances: [{ status: "confirmed" }] }),
      game({ id: "declined-game", date: "2026-07-20", attendances: [{ status: "declined" }] }),
      game({ id: "no-response-game", date: "2026-07-20", attendances: [] }),
    ]);

    const result = await listGames("player-1", NOW);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.upcoming).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "confirmed-game", myAttendanceStatus: "confirmed" }),
        expect.objectContaining({ id: "declined-game", myAttendanceStatus: "declined" }),
        expect.objectContaining({ id: "no-response-game", myAttendanceStatus: "no_response" }),
      ]),
    );
  });

  it("returns the raw ISO date and raw ISO time instant (client formats these per-locale), and passes locationName through as-is", async () => {
    assertPlayerExistsMock.mockResolvedValue(undefined);
    findManyMock.mockResolvedValue([game({ id: "g1", date: "2026-07-20", locationName: "Parque Norte" })]);

    const result = await listGames("player-1", NOW);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.upcoming[0]).toEqual({
      id: "g1",
      date: "2026-07-20",
      time: "1970-01-01T18:00:00.000Z",
      locationName: "Parque Norte",
      myAttendanceStatus: "no_response",
    });
  });

  it("only queries this player's own attendance rows for each game", async () => {
    assertPlayerExistsMock.mockResolvedValue(undefined);
    findManyMock.mockResolvedValue([]);

    await listGames("player-42", NOW);

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        include: { attendances: { where: { playerId: "player-42" } } },
      }),
    );
  });
});
