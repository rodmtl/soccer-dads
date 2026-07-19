"use client";

import { CurrentPlayerGate } from "@/components/CurrentPlayerGate";
import { ProfileContainer } from "@/components/ProfileContainer";

// Top-level client component for the /profile route (docs/ux/03-player-position.md's
// "My Profile" screen): gates on a resolved current player, then wires the
// profile fields and position picker to that player's own record.
export function ProfileScreen() {
  return (
    <CurrentPlayerGate>
      {(playerId, onInvalidPlayer) => (
        <ProfileContainer playerId={playerId} onInvalidPlayer={onInvalidPlayer} />
      )}
    </CurrentPlayerGate>
  );
}
