"use server";

import { prisma } from "@/lib/prisma";
import { assertPlayerExists } from "@/server/services/assertPlayerExists";
import { InvalidPlayerError } from "@/server/errors";
import type { GameActionResult } from "@/server/actions/actionResult";
import type { Position } from "@/server/services/positions";

export interface RosterPlayer {
  id: string;
  // Admin-entered free text, rendered as-is (docs/ux/04-player-roster-view.md).
  name: string;
  assignedPosition: Position;
}

export interface RosterTeam {
  teamIndex: number;
  players: RosterPlayer[];
}

export interface GameRosterData {
  teams: RosterTeam[];
}

export type GetGameRosterResult = GameActionResult<GameRosterData>;

// Game Detail — Roster (docs/ux/04-player-roster-view.md): reads the game's
// TeamAssignment rows, grouped by team_index. Always returns exactly
// `Game.numberOfTeams` team sections (indices 0..numberOfTeams-1) so N-team
// games render consistently, even when no rows exist yet for some (or all)
// of those indices.
//
// There is no separate "not generated yet" failure reason: a game with zero
// TeamAssignment rows is a normal, expected state (the admin hasn't run the
// roster algorithm yet), not an error — it comes back as `{ ok: true, data:
// { teams } }` with every team's `players` empty, and the caller (RosterView)
// renders that as its dedicated empty state rather than a load failure. See
// src/server/actions/actionResult.ts for why real failures use `{ ok: false
// }` instead of a thrown custom Error.
export async function getGameRoster(
  gameId: string,
  playerId: string,
): Promise<GetGameRosterResult> {
  try {
    await assertPlayerExists(playerId);
  } catch (error) {
    if (error instanceof InvalidPlayerError) {
      return { ok: false, reason: "invalid_player" };
    }
    throw error;
  }

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      // Selected down to exactly the fields this view needs (id, name) at
      // the query level, not `include: { player: true }` — the Player model
      // also carries `rating`, `phone`, `email`, `facebookProfile`, which
      // this read-only roster view has no business pulling into server
      // memory in the first place, regardless of what the later `.map()`
      // happens to project out. See docs/adr/0002-player-rating-privacy-deferred.md.
      teamAssignments: {
        select: {
          teamIndex: true,
          assignedPosition: true,
          player: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (game === null) {
    return { ok: false, reason: "not_found" };
  }

  const teams: RosterTeam[] = Array.from({ length: game.numberOfTeams }, (_, teamIndex) => ({
    teamIndex,
    players: game.teamAssignments
      .filter((assignment) => assignment.teamIndex === teamIndex)
      .map((assignment) => ({
        id: assignment.player.id,
        name: assignment.player.name,
        assignedPosition: assignment.assignedPosition as Position,
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  }));

  return { ok: true, data: { teams } };
}
