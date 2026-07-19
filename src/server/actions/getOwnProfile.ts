"use server";

import { prisma } from "@/lib/prisma";
import { assertPlayerExists } from "@/server/services/assertPlayerExists";
import { InvalidPlayerError } from "@/server/errors";
import type { PlayerActionResult } from "@/server/actions/actionResult";
import type { Position } from "@/server/services/positions";

export interface OwnProfileData {
  name: string;
  age: number;
  positions: Position[];
}

export type GetOwnProfileResult = PlayerActionResult<OwnProfileData>;

// Profile (docs/ux/03-player-position.md): returns the CURRENT player's own
// record only — name/age (read-only in this screen) and positions (editable
// via updateOwnPositions). There is no id parameter beyond the validated
// current-player id, so this action can never be used to read another
// player's record.
//
// `rating` is deliberately never selected or returned here, even though
// `Player.rating` exists in the data model — see
// docs/adr/0002-player-rating-privacy-deferred.md. v1 has no real player
// authentication (a player is only a client-supplied id, validated against
// *some* real row via assertPlayerExists, not proven to be *this browser's*
// player), and listPlayers() already exposes every player's id publicly, so
// returning rating here would let anyone read anyone's rating by supplying a
// different id. Withhold rating from every player-facing action until a real
// identity/session mechanism exists.
export async function getOwnProfile(playerId: string): Promise<GetOwnProfileResult> {
  try {
    await assertPlayerExists(playerId);
  } catch (error) {
    if (error instanceof InvalidPlayerError) {
      return { ok: false, reason: "invalid_player" };
    }
    throw error;
  }

  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { name: true, age: true, positions: true },
  });

  // assertPlayerExists just confirmed this row exists; a null here would
  // only happen from a concurrent deletion in the instant between the two
  // queries, which is the same class of (accepted) race already present in
  // setAttendance/getGameAttendance's use of assertPlayerExists.
  if (player === null) {
    return { ok: false, reason: "invalid_player" };
  }

  return {
    ok: true,
    data: {
      name: player.name,
      age: player.age,
      positions: player.positions as Position[],
    },
  };
}
