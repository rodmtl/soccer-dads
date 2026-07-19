"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AttendanceCard } from "@/components/AttendanceCard";
import { ErrorState } from "@/components/ErrorState";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import {
  getGameAttendance,
  type GameDetails,
} from "@/server/actions/getGameAttendance";
import { setAttendance } from "@/server/actions/setAttendance";
import type { AttendanceStatusValue } from "@/server/actions/listGames";

export interface GameDetailContainerProps {
  gameId: string;
  playerId: string;
  onInvalidPlayer(): void;
}

// Wires the presentational AttendanceCard to getGameAttendance/setAttendance
// (see docs/ux/02-player-attendance.md's Game Detail — Attendance section).
// This is also the WhatsApp deep-link entry point's destination: `gameId`
// alone (via the route) is enough to load this, no prior list navigation
// required.
//
// Both actions return a discriminated `{ ok, ... }` result rather than
// throwing a custom Error subclass — Next.js does not preserve custom Error
// subclass identity across the Server Action client/server boundary, so an
// `instanceof` check here would never actually match in a real deployment
// (see src/server/actions/actionResult.ts).
export function GameDetailContainer({
  gameId,
  playerId,
  onInvalidPlayer,
}: GameDetailContainerProps) {
  const t = useTranslations("Games");
  const tAttendance = useTranslations("Attendance");
  const tCommon = useTranslations("Common");

  const [game, setGame] = useState<GameDetails | null>(null);
  const [status, setStatus] = useState<AttendanceStatusValue>("no_response");
  const [isLoading, setIsLoading] = useState(true);
  const [isGameNotFound, setIsGameNotFound] = useState(false);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<Error | null>(null);

  const lastKnownGoodStatusRef = useRef<AttendanceStatusValue>("no_response");
  const pendingStatusRef = useRef<AttendanceStatusValue | null>(null);
  const onInvalidPlayerRef = useRef(onInvalidPlayer);
  useEffect(() => {
    onInvalidPlayerRef.current = onInvalidPlayer;
  });

  useEffect(() => {
    let cancelled = false;

    getGameAttendance(gameId, playerId)
      .then((result) => {
        if (cancelled) return;

        if (!result.ok) {
          if (result.reason === "invalid_player") {
            onInvalidPlayerRef.current();
          } else if (result.reason === "not_found") {
            setIsGameNotFound(true);
          }
          return;
        }

        setGame(result.data.game);
        setStatus(result.data.status);
        lastKnownGoodStatusRef.current = result.data.status;
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        setLoadError(caught instanceof Error ? caught : new Error("Unknown error"));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [gameId, playerId, loadAttempt]);

  function handleLoadRetry() {
    setIsLoading(true);
    setLoadError(null);
    setLoadAttempt((previousAttempt) => previousAttempt + 1);
  }

  function applyStatus(nextStatus: AttendanceStatusValue) {
    pendingStatusRef.current = nextStatus;
    setStatus(nextStatus);
    setIsSaving(true);
    setSaveError(null);

    setAttendance(gameId, playerId, nextStatus)
      .then((result) => {
        if (!result.ok) {
          if (result.reason === "invalid_player") {
            onInvalidPlayerRef.current();
            return;
          }
          // "not_found" here means the game was deleted mid-session (rare) —
          // there's no dedicated UI for that during a save, so it's treated
          // like any other failed save: revert + generic retryable error.
          setStatus(lastKnownGoodStatusRef.current);
          setSaveError(new Error("Game not found"));
          return;
        }

        setStatus(result.data.status);
        lastKnownGoodStatusRef.current = result.data.status;
      })
      .catch((caught: unknown) => {
        setStatus(lastKnownGoodStatusRef.current);
        setSaveError(caught instanceof Error ? caught : new Error("Unknown error"));
      })
      .finally(() => setIsSaving(false));
  }

  function handleConfirm() {
    applyStatus(status === "confirmed" ? "no_response" : "confirmed");
  }

  function handleDecline() {
    applyStatus(status === "declined" ? "no_response" : "declined");
  }

  function handleSaveRetry() {
    if (pendingStatusRef.current !== null) applyStatus(pendingStatusRef.current);
  }

  if (isLoading) {
    return <LoadingSkeleton rows={4} label={tCommon("loading")} />;
  }

  if (isGameNotFound) {
    return (
      <div role="alert" className="flex flex-col items-center gap-2 p-6 text-center">
        <p>{t("gameNotFound")}</p>
        <Link href="/games" className="min-h-11 text-blue-600 underline">
          {t("backToList")}
        </Link>
      </div>
    );
  }

  if (loadError !== null) {
    return (
      <ErrorState
        message={tAttendance("gameNotFoundOrLoadError")}
        retryLabel={tCommon("retry")}
        onRetry={handleLoadRetry}
      />
    );
  }

  if (game === null) {
    return null;
  }

  return (
    <AttendanceCard
      game={game}
      attendanceStatus={status}
      isSaving={isSaving}
      error={saveError}
      onConfirm={handleConfirm}
      onDecline={handleDecline}
      onRetry={handleSaveRetry}
    />
  );
}
