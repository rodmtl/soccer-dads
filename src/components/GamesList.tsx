"use client";

import { type ReactNode } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { TabList } from "@/components/TabList";
import { GAME_DATE_FORMAT, GAME_TIME_FORMAT } from "@/lib/gameDateTimeFormats";
import type { AttendanceStatusValue } from "@/server/actions/listGames";

export type GamesTab = "upcoming" | "past";

export interface GamesListGame {
  id: string;
  date: string;
  time: string;
  locationName: string;
  myAttendanceStatus: AttendanceStatusValue;
}

export interface GamesListProps {
  activeTab: GamesTab;
  onTabChange(tab: GamesTab): void;
  games: GamesListGame[] | null;
  isLoading: boolean;
  error: Error | null;
  onSelectGame(gameId: string): void;
  onRetry(): void;
}

// Games List (docs/ux/02-player-attendance.md): Upcoming/Past tabs over the
// current player's own games, each row exposing date/location/status as a
// single accessible name (screen reader users shouldn't have to hunt for the
// status pill separately from the row label).
export function GamesList({
  activeTab,
  onTabChange,
  games,
  isLoading,
  error,
  onSelectGame,
  onRetry,
}: GamesListProps) {
  const t = useTranslations("Games");
  const tAttendance = useTranslations("Attendance");
  const tCommon = useTranslations("Common");
  const format = useFormatter();

  const tabs: { id: GamesTab; label: string }[] = [
    { id: "upcoming", label: t("upcomingTab") },
    { id: "past", label: t("pastTab") },
  ];

  function statusLabel(status: AttendanceStatusValue): string {
    if (status === "confirmed") return tAttendance("statusConfirmed");
    if (status === "declined") return tAttendance("statusDeclined");
    return tAttendance("statusNoResponse");
  }

  function formatGameDate(isoDate: string): string {
    return format.dateTime(new Date(isoDate), GAME_DATE_FORMAT);
  }

  function formatGameTime(isoInstant: string): string {
    return format.dateTime(new Date(isoInstant), GAME_TIME_FORMAT);
  }

  function renderPanelContent(): ReactNode {
    if (isLoading) {
      return <LoadingSkeleton rows={4} label={tCommon("loading")} />;
    }

    if (error !== null) {
      return (
        <ErrorState
          message={t("loadError")}
          retryLabel={tCommon("retry")}
          onRetry={onRetry}
        />
      );
    }

    if (games === null) {
      return null;
    }

    if (games.length === 0) {
      return activeTab === "upcoming" ? (
        <EmptyState
          title={t("noUpcomingTitle")}
          description={t("noUpcomingDescription")}
        />
      ) : (
        <EmptyState title={t("noPastTitle")} />
      );
    }

    return (
      <ul className="flex flex-col gap-2">
        {games.map((game) => (
          <li key={game.id}>
            <button
              type="button"
              onClick={() => onSelectGame(game.id)}
              aria-label={t("gameRowLabel", {
                date: formatGameDate(game.date),
                locationName: game.locationName,
                status: statusLabel(game.myAttendanceStatus),
              })}
              className="min-h-11 w-full rounded-md border p-3 text-left"
            >
              <span>
                {formatGameDate(game.date)} · {formatGameTime(game.time)} ·{" "}
                {game.locationName}
              </span>
              <span className="ml-2 text-sm">{statusLabel(game.myAttendanceStatus)}</span>
            </button>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <TabList<GamesTab>
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={onTabChange}
        ariaLabel={t("title")}
      />
      <div role="tabpanel">{renderPanelContent()}</div>
    </div>
  );
}
