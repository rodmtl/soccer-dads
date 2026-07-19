import { prisma } from "@/lib/prisma";
import { InvalidPlayerError } from "@/server/errors";

// Shared by every Server Action that accepts a player id from the client
// (attendance confirm/decline is the first data-mutating flow to consume
// getCurrentPlayerId()'s value) — a stale or tampered-with id must not be
// trusted to write data or read another player's state. See the security
// note in docs/ux/02-player-attendance.md's carry-over from the Flow 1 audit.
export async function assertPlayerExists(playerId: string): Promise<void> {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { id: true },
  });

  if (player === null) {
    throw new InvalidPlayerError(playerId);
  }
}
