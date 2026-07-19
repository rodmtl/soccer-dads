"use server";

import { prisma } from "@/lib/prisma";
import { assertPlayerExists } from "@/server/services/assertPlayerExists";
import { formatDateOnly } from "@/server/services/formatGameDateTime";
import { InvalidPlayerError } from "@/server/errors";
import type { PlayerActionResult } from "@/server/actions/actionResult";

export type AttendanceStatusValue = "confirmed" | "declined" | "no_response";

export interface GameListItem {
  id: string;
  // Raw ISO date (yyyy-mm-dd); the client formats this per-locale via
  // next-intl rather than the server pre-formatting a display string (see
  // docs/ux/design-tokens.md's locale-aware date/time formatting
  // requirement).
  date: string;
  // Raw ISO instant of the stored time-of-day (epoch-anchored, since
  // Game.time is a timezone-less TIME column); the client parses this and
  // formats just the time-of-day per-locale.
  time: string;
  locationName: string;
  myAttendanceStatus: AttendanceStatusValue;
}

export interface GamesByTab {
  upcoming: GameListItem[];
  past: GameListItem[];
}

export type ListGamesResult = PlayerActionResult<GamesByTab>;

// Games List (docs/ux/02-player-attendance.md): Upcoming = date >= today,
// ascending; Past = date < today, descending (most recent first). `now`
// defaults to the real clock but is an explicit parameter so callers/tests
// can pin "today" instead of depending on the ambient system clock.
export async function listGames(
  playerId: string,
  now: Date = new Date(),
): Promise<ListGamesResult> {
  try {
    await assertPlayerExists(playerId);
  } catch (error) {
    if (error instanceof InvalidPlayerError) {
      return { ok: false, reason: "invalid_player" };
    }
    throw error;
  }

  const games = await prisma.game.findMany({
    include: { attendances: { where: { playerId } } },
  });

  const today = formatDateOnly(now);

  const items: GameListItem[] = games.map((game) => ({
    id: game.id,
    date: formatDateOnly(game.date),
    time: game.time.toISOString(),
    locationName: game.locationName,
    myAttendanceStatus: (game.attendances[0]?.status ?? "no_response") as AttendanceStatusValue,
  }));

  const upcoming = items
    .filter((item) => item.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));

  const past = items
    .filter((item) => item.date < today)
    .sort((a, b) => b.date.localeCompare(a.date));

  return { ok: true, data: { upcoming, past } };
}
