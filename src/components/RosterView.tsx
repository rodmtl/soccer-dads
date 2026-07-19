"use client";

import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import type { Position } from "@/server/services/positions";

export interface RosterViewPlayer {
  id: string;
  // Admin-entered free text, rendered as-is.
  name: string;
  assignedPosition: Position;
}

export interface RosterViewTeam {
  teamIndex: number;
  players: RosterViewPlayer[];
}

export interface RosterViewProps {
  // null while loading; [] (or every team having zero players) is a valid
  // "no teams" state distinct from null, rendered as the not-generated-yet
  // empty state — see docs/ux/04-player-roster-view.md.
  teams: RosterViewTeam[] | null;
  isLoading: boolean;
  error: Error | null;
  currentPlayerId: string;
  onRetry(): void;
}

// Game Detail — Roster (docs/ux/04-player-roster-view.md): a read-only view
// of a game's N teams and their assigned players/positions. A roster with
// zero TeamAssignment rows is indistinguishable from "not generated yet" to
// a player, so `teams.length === 0` and "every team has zero players" both
// render the same empty state rather than being treated as separate cases.
export function RosterView({
  teams,
  isLoading,
  error,
  currentPlayerId,
  onRetry,
}: RosterViewProps) {
  const t = useTranslations("Roster");
  const tCommon = useTranslations("Common");
  const tPosition = useTranslations("Position");

  if (isLoading) {
    return <LoadingSkeleton rows={4} label={tCommon("loading")} />;
  }

  if (error !== null) {
    return (
      <ErrorState message={t("loadError")} retryLabel={tCommon("retry")} onRetry={onRetry} />
    );
  }

  if (teams === null) {
    return null;
  }

  const hasAnyPlayers = teams.some((team) => team.players.length > 0);
  if (!hasAnyPlayers) {
    return (
      <EmptyState title={t("notGeneratedTitle")} description={t("notGeneratedDescription")} />
    );
  }

  return (
    <div className="flex flex-col gap-4 sm:grid sm:grid-cols-2 sm:gap-4">
      {teams.map((team) => (
        <section key={team.teamIndex} aria-labelledby={`team-${team.teamIndex}-heading`}>
          <h2 id={`team-${team.teamIndex}-heading`} className="text-lg font-semibold">
            {t("teamHeading", { number: team.teamIndex + 1 })}
          </h2>
          <ul className="flex flex-col gap-1">
            {team.players.map((player) => (
              <li key={player.id} className="flex items-center gap-2">
                <span>{player.name}</span>
                <span className="text-sm text-gray-600">{tPosition(player.assignedPosition)}</span>
                {player.id === currentPlayerId ? (
                  <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-800">
                    {t("youBadge")}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
