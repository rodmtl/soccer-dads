"use client";

import { useRef, type ReactNode } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
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

const TABS: GamesTab[] = ["upcoming", "past"];

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
  const tabRefs = useRef<Record<GamesTab, HTMLButtonElement | null>>({
    upcoming: null,
    past: null,
  });

  const tabLabels: Record<GamesTab, string> = {
    upcoming: t("upcomingTab"),
    past: t("pastTab"),
  };

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

  function handleTabKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const currentIndex = TABS.indexOf(activeTab);
    const delta = event.key === "ArrowRight" ? 1 : -1;
    const nextTab = TABS[(currentIndex + delta + TABS.length) % TABS.length];
    onTabChange(nextTab);
    tabRefs.current[nextTab]?.focus();
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
      <div role="tablist" aria-label={t("title")} className="flex gap-2 border-b">
        {TABS.map((tab) => (
          <button
            key={tab}
            ref={(el) => {
              tabRefs.current[tab] = el;
            }}
            role="tab"
            type="button"
            aria-selected={activeTab === tab}
            tabIndex={activeTab === tab ? 0 : -1}
            onClick={() => onTabChange(tab)}
            onKeyDown={handleTabKeyDown}
            className="min-h-11 px-4 font-medium"
          >
            {tabLabels[tab]}
          </button>
        ))}
      </div>
      <div role="tabpanel">{renderPanelContent()}</div>
    </div>
  );
}
