"use client";

import { useEffect, useState } from "react";
import {
  PlayerIdentityPicker,
  type PlayerIdentityPickerPlayer,
} from "@/components/PlayerIdentityPicker";
import { setCurrentPlayerId } from "@/lib/currentPlayer";
import { listPlayers } from "@/server/actions/listPlayers";

function toError(caught: unknown): Error {
  return caught instanceof Error ? caught : new Error("Unknown error");
}

export interface PlayerIdentityPickerContainerProps {
  // Notified (in addition to persisting the id) once a player is selected —
  // used by callers (e.g. CurrentPlayerGate) that need to react immediately
  // rather than re-reading localStorage.
  onPlayerSelected?(playerId: string): void;
}

// Wires the presentational PlayerIdentityPicker to the listPlayers Server
// Action and to "current player" persistence (see docs/ux/01-player-identity.md).
export function PlayerIdentityPickerContainer({
  onPlayerSelected,
}: PlayerIdentityPickerContainerProps = {}) {
  const [players, setPlayers] = useState<PlayerIdentityPickerPlayer[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    listPlayers()
      .then((result) => {
        if (!cancelled) setPlayers(result);
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(toError(caught));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  function handleRetry() {
    setIsLoading(true);
    setError(null);
    setAttempt((previousAttempt) => previousAttempt + 1);
  }

  function handleSelectPlayer(playerId: string) {
    setCurrentPlayerId(playerId);
    onPlayerSelected?.(playerId);
  }

  return (
    <PlayerIdentityPicker
      players={players}
      isLoading={isLoading}
      error={error}
      onSelectPlayer={handleSelectPlayer}
      onRetry={handleRetry}
    />
  );
}
