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

// Wires the presentational PlayerIdentityPicker to the listPlayers Server
// Action and to "current player" persistence (see docs/ux/01-player-identity.md).
export function PlayerIdentityPickerContainer() {
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

  return (
    <PlayerIdentityPicker
      players={players}
      isLoading={isLoading}
      error={error}
      onSelectPlayer={setCurrentPlayerId}
      onRetry={handleRetry}
    />
  );
}
