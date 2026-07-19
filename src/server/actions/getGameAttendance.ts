"use server";

import { prisma } from "@/lib/prisma";
import { assertPlayerExists } from "@/server/services/assertPlayerExists";
import { formatDateOnly } from "@/server/services/formatGameDateTime";
import { InvalidPlayerError } from "@/server/errors";
import type { GameActionResult } from "@/server/actions/actionResult";
import type { AttendanceStatusValue } from "@/server/actions/listGames";

export interface GameDetails {
  id: string;
  // Raw ISO date/time instants — the client formats these per-locale via
  // next-intl (see docs/ux/design-tokens.md's locale-aware date/time
  // formatting requirement); `locationName`/`address` are admin-entered free
  // text and are rendered as-is, never formatted or translated.
  date: string;
  time: string;
  locationName: string;
  address: string;
}

export interface GameAttendanceData {
  game: GameDetails;
  status: AttendanceStatusValue;
}

export type GetGameAttendanceResult = GameActionResult<GameAttendanceData>;

// Game Detail — Attendance (docs/ux/02-player-attendance.md): fetches one
// game's details plus the given player's own attendance status for it. Used
// both for the Games List -> Game Detail navigation and for the WhatsApp
// deep-link entry point, so `gameId` alone (no prior navigation state) must
// be enough to resolve this.
export async function getGameAttendance(
  gameId: string,
  playerId: string,
): Promise<GetGameAttendanceResult> {
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
    include: { attendances: { where: { playerId } } },
  });

  if (game === null) {
    return { ok: false, reason: "not_found" };
  }

  return {
    ok: true,
    data: {
      game: {
        id: game.id,
        date: formatDateOnly(game.date),
        time: game.time.toISOString(),
        locationName: game.locationName,
        address: game.address,
      },
      status: (game.attendances[0]?.status ?? "no_response") as AttendanceStatusValue,
    },
  };
}
