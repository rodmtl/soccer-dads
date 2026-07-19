"use server";

import { prisma } from "@/lib/prisma";

export interface PlayerListItem {
  id: string;
  name: string;
}

// Flow 1 (player identity picker) only needs a player's id and name — see
// docs/ux/01-player-identity.md.
export async function listPlayers(): Promise<PlayerListItem[]> {
  return prisma.player.findMany({
    select: { id: true, name: true },
  });
}
