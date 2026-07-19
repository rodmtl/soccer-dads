import { describe, expect, it, vi, type Mock } from "vitest";
import { prisma } from "@/lib/prisma";
import { assertPlayerExists } from "@/server/services/assertPlayerExists";
import { getGameRoster } from "@/server/actions/getGameRoster";
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

describe("getGameRoster", () => {
  it("returns { ok: false, reason: 'invalid_player' } when the player id does not exist, rather than throwing", async () => {
    assertPlayerExistsMock.mockRejectedValue(new InvalidPlayerError("bad-id"));

    const result = await getGameRoster("game-1", "bad-id");

    expect(result).toEqual({ ok: false, reason: "invalid_player" });
  });

  it("returns { ok: false, reason: 'not_found' } when the game id does not exist, rather than throwing", async () => {
    assertPlayerExistsMock.mockResolvedValue(undefined);
    findUniqueMock.mockResolvedValue(null);

    const result = await getGameRoster("missing-game", "player-1");

    expect(result).toEqual({ ok: false, reason: "not_found" });
  });

  it("returns numberOfTeams teams, each with an empty players array, when no TeamAssignment rows exist yet (not generated)", async () => {
    assertPlayerExistsMock.mockResolvedValue(undefined);
    findUniqueMock.mockResolvedValue({
      id: "game-1",
      numberOfTeams: 2,
      teamAssignments: [],
    });

    const result = await getGameRoster("game-1", "player-1");

    expect(result).toEqual({
      ok: true,
      data: {
        teams: [
          { teamIndex: 0, players: [] },
          { teamIndex: 1, players: [] },
        ],
      },
    });
  });

  it("groups assigned players by team_index, within the game's numberOfTeams range", async () => {
    assertPlayerExistsMock.mockResolvedValue(undefined);
    findUniqueMock.mockResolvedValue({
      id: "game-1",
      numberOfTeams: 2,
      teamAssignments: [
        {
          teamIndex: 0,
          assignedPosition: "goalkeeper",
          player: { id: "p1", name: "Sam Ortiz" },
        },
        {
          teamIndex: 1,
          assignedPosition: "striker",
          player: { id: "p2", name: "Alex Kim" },
        },
        {
          teamIndex: 0,
          assignedPosition: "defender",
          player: { id: "p3", name: "Jordan Lee" },
        },
      ],
    });

    const result = await getGameRoster("game-1", "player-1");

    expect(result).toEqual({
      ok: true,
      data: {
        teams: [
          {
            teamIndex: 0,
            players: [
              { id: "p3", name: "Jordan Lee", assignedPosition: "defender" },
              { id: "p1", name: "Sam Ortiz", assignedPosition: "goalkeeper" },
            ],
          },
          {
            teamIndex: 1,
            players: [{ id: "p2", name: "Alex Kim", assignedPosition: "striker" }],
          },
        ],
      },
    });
  });

  it("supports N teams beyond a hardcoded A/B pair", async () => {
    assertPlayerExistsMock.mockResolvedValue(undefined);
    findUniqueMock.mockResolvedValue({
      id: "game-1",
      numberOfTeams: 3,
      teamAssignments: [
        { teamIndex: 2, assignedPosition: "midfielder", player: { id: "p1", name: "Priya Nair" } },
      ],
    });

    const result = await getGameRoster("game-1", "player-1");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.teams).toHaveLength(3);
    expect(result.data.teams.map((team) => team.teamIndex)).toEqual([0, 1, 2]);
    expect(result.data.teams[2].players).toEqual([
      { id: "p1", name: "Priya Nair", assignedPosition: "midfielder" },
    ]);
  });

  it("queries this game's team assignments, selecting only each player's id and name (not the full Player row)", async () => {
    assertPlayerExistsMock.mockResolvedValue(undefined);
    findUniqueMock.mockResolvedValue({
      id: "game-1",
      numberOfTeams: 2,
      teamAssignments: [],
    });

    await getGameRoster("game-1", "player-1");

    // Query-level privacy boundary (docs/adr/0002-player-rating-privacy-deferred.md):
    // must not `include: { player: true }`, which would pull rating/phone/
    // email/facebookProfile into server memory regardless of what a
    // downstream `.map()` later projects out.
    expect(findUniqueMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "game-1" },
        include: {
          teamAssignments: {
            select: {
              teamIndex: true,
              assignedPosition: true,
              player: { select: { id: true, name: true } },
            },
          },
        },
      }),
    );
  });
});
