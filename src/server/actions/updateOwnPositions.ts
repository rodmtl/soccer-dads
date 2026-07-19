"use server";

import { prisma } from "@/lib/prisma";
import { assertPlayerExists } from "@/server/services/assertPlayerExists";
import { isValidPositionsUpdate, type Position } from "@/server/services/positions";
import { InvalidPlayerError } from "@/server/errors";
import type { UpdatePositionsActionResult } from "@/server/actions/actionResult";

export interface UpdatePositionsData {
  positions: Position[];
}

export type UpdateOwnPositionsResult = UpdatePositionsActionResult<UpdatePositionsData>;

// Profile — position picker (docs/ux/03-player-position.md): updates the
// CURRENT player's own positions. Validates player existence, then the full
// max-2 / valid-enum / no-duplicates constraint (docs/data-model.md's
// Player.positions) server-side — the client's PositionPicker also enforces
// max-2, but only as a UI convenience; a client can always call this action
// directly with an arbitrary body, so this is the real boundary.
export async function updateOwnPositions(
  playerId: string,
  positions: Position[],
): Promise<UpdateOwnPositionsResult> {
  try {
    await assertPlayerExists(playerId);
  } catch (error) {
    if (error instanceof InvalidPlayerError) {
      return { ok: false, reason: "invalid_player" };
    }
    throw error;
  }

  if (!isValidPositionsUpdate(positions)) {
    return { ok: false, reason: "invalid_positions" };
  }

  const player = await prisma.player.update({
    where: { id: playerId },
    data: { positions },
    select: { positions: true },
  });

  return { ok: true, data: { positions: player.positions as Position[] } };
}
