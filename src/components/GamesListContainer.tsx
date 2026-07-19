"use client";

import { useEffect, useRef, useState } from "react";
import { GamesList, type GamesTab } from "@/components/GamesList";
import { listGames, type GamesByTab } from "@/server/actions/listGames";

export interface GamesListContainerProps {
  playerId: string;
  onSelectGame(gameId: string): void;
  onInvalidPlayer(): void;
}

// Wires the presentational GamesList to the listGames Server Action (see
// docs/ux/02-player-attendance.md's Games List screen).
export function GamesListContainer({
  playerId,
  onSelectGame,
  onInvalidPlayer,
}: GamesListContainerProps) {
  const [activeTab, setActiveTab] = useState<GamesTab>("upcoming");
  const [games, setGames] = useState<GamesByTab | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [attempt, setAttempt] = useState(0);

  // Kept in a ref (rather than a useEffect dependency) so a new inline
  // function passed down from the parent on every render doesn't re-trigger
  // the fetch below — only a real playerId/retry change should refetch.
  const onInvalidPlayerRef = useRef(onInvalidPlayer);
  useEffect(() => {
    onInvalidPlayerRef.current = onInvalidPlayer;
  });

  useEffect(() => {
    let cancelled = false;

    listGames(playerId)
      .then((result) => {
        if (cancelled) return;
        if (!result.ok) {
          if (result.reason === "invalid_player") {
            onInvalidPlayerRef.current();
          }
          return;
        }
        setGames(result.data);
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
  }, [playerId, attempt]);

  function handleRetry() {
    setIsLoading(true);
    setError(null);
    setAttempt((previousAttempt) => previousAttempt + 1);
  }

  return (
    <GamesList
      activeTab={activeTab}
      onTabChange={setActiveTab}
      games={games === null ? null : games[activeTab]}
      isLoading={isLoading}
      error={error}
      onSelectGame={onSelectGame}
      onRetry={handleRetry}
    />
  );
}
