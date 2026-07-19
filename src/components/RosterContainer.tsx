"use client";

import { useEffect, useRef, useState } from "react";
import { RosterView, type RosterViewTeam } from "@/components/RosterView";
import { getGameRoster } from "@/server/actions/getGameRoster";

export interface RosterContainerProps {
  gameId: string;
  playerId: string;
  onInvalidPlayer(): void;
}

// Wires the presentational RosterView to getGameRoster (see
// docs/ux/04-player-roster-view.md). Mounted only while the Roster tab is
// selected (see GameDetailContainer), so it fetches fresh each time that tab
// is opened rather than pre-fetching alongside the Attendance tab's data.
export function RosterContainer({ gameId, playerId, onInvalidPlayer }: RosterContainerProps) {
  const [teams, setTeams] = useState<RosterViewTeam[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [attempt, setAttempt] = useState(0);

  const onInvalidPlayerRef = useRef(onInvalidPlayer);
  useEffect(() => {
    onInvalidPlayerRef.current = onInvalidPlayer;
  });

  useEffect(() => {
    let cancelled = false;

    getGameRoster(gameId, playerId)
      .then((result) => {
        if (cancelled) return;
        if (!result.ok) {
          if (result.reason === "invalid_player") {
            onInvalidPlayerRef.current();
            return;
          }
          // "not_found" here (the game deleted mid-session while a player
          // has the Roster tab open) gets the same generic retryable error
          // as any other load failure — a silently blank tab would read as
          // broken, and there's no dedicated "game not found" affordance for
          // this read-only tab beyond what the Attendance tab's own
          // not-found state already covers for the page as a whole.
          setError(new Error("Game not found"));
          return;
        }
        setTeams(result.data.teams);
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        setError(caught instanceof Error ? caught : new Error("Unknown error"));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [gameId, playerId, attempt]);

  function handleRetry() {
    setIsLoading(true);
    setError(null);
    setAttempt((previousAttempt) => previousAttempt + 1);
  }

  return (
    <RosterView
      teams={teams}
      isLoading={isLoading}
      error={error}
      currentPlayerId={playerId}
      onRetry={handleRetry}
    />
  );
}
