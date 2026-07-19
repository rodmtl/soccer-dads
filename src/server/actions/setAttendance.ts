"use server";

import { prisma } from "@/lib/prisma";
import { assertPlayerExists } from "@/server/services/assertPlayerExists";
import { InvalidPlayerError } from "@/server/errors";
import type { GameActionResult } from "@/server/actions/actionResult";
import type { AttendanceStatusValue } from "@/server/actions/listGames";

export interface SetAttendanceData {
  status: AttendanceStatusValue;
}

export type SetAttendanceResult = GameActionResult<SetAttendanceData>;

// Game Detail — Attendance (docs/ux/02-player-attendance.md): confirms,
// declines, or (undo) reverts a player's response for one game. Upserts on
// the Attendance table's unique (gameId, playerId) constraint since a row
// may not exist yet the first time a player responds.
//
// Security: playerId comes from the client (localStorage's "current player",
// see docs/ux/01-player-identity.md) and is never authenticated, so it must
// be validated against real Player rows here before any write happens —
// otherwise one browser could silently write attendance for an arbitrary/
// stale player id.
export async function setAttendance(
  gameId: string,
  playerId: string,
  status: AttendanceStatusValue,
): Promise<SetAttendanceResult> {
  try {
    await assertPlayerExists(playerId);
  } catch (error) {
    if (error instanceof InvalidPlayerError) {
      return { ok: false, reason: "invalid_player" };
    }
    throw error;
  }

  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (game === null) {
    return { ok: false, reason: "not_found" };
  }

  const respondedAt = status === "no_response" ? null : new Date();

  const attendance = await prisma.attendance.upsert({
    where: { gameId_playerId: { gameId, playerId } },
    create: { gameId, playerId, status, respondedAt },
    update: { status, respondedAt },
  });

  return { ok: true, data: { status: attendance.status as AttendanceStatusValue } };
}
