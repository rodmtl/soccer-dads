"use client";

import { CurrentPlayerGate } from "@/components/CurrentPlayerGate";
import { GameDetailContainer } from "@/components/GameDetailContainer";

export interface GameDetailScreenProps {
  gameId: string;
}

// Top-level client component for the /games/{gameId} route — this is also
// the WhatsApp deep-link entry point (see docs/ux/02-player-attendance.md):
// `gameId` comes straight from the route param, so a player following a
// shared link lands here directly, identity gate included, with no prior
// navigation through the Games List required.
export function GameDetailScreen({ gameId }: GameDetailScreenProps) {
  return (
    <CurrentPlayerGate>
      {(playerId, onInvalidPlayer) => (
        <GameDetailContainer
          gameId={gameId}
          playerId={playerId}
          onInvalidPlayer={onInvalidPlayer}
        />
      )}
    </CurrentPlayerGate>
  );
}
