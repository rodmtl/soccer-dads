"use client";

import { useRouter } from "@/i18n/navigation";
import { CurrentPlayerGate } from "@/components/CurrentPlayerGate";
import { GamesListContainer } from "@/components/GamesListContainer";

// Top-level client component for the /games route: gates on a resolved
// current player, then wires the games list to per-game navigation (see
// docs/ux/02-player-attendance.md's Games List screen). Uses next-intl's
// client router (locale-aware, no full page reload) rather than a plain
// href/window.location navigation.
export function GamesScreen() {
  const router = useRouter();

  return (
    <CurrentPlayerGate>
      {(playerId, onInvalidPlayer) => (
        <GamesListContainer
          playerId={playerId}
          onInvalidPlayer={onInvalidPlayer}
          onSelectGame={(gameId) => router.push(`/games/${gameId}`)}
        />
      )}
    </CurrentPlayerGate>
  );
}
