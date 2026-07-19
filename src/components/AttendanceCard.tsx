"use client";

import { useEffect, useRef, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Button } from "@/components/Button";
import { ToggleButton } from "@/components/ToggleButton";
import { GAME_DATE_FORMAT, GAME_TIME_FORMAT } from "@/lib/gameDateTimeFormats";
import type { AttendanceStatusValue } from "@/server/actions/listGames";
import type { GameDetails } from "@/server/actions/getGameAttendance";

const SAVED_MESSAGE_DURATION_MS = 3000;

export interface AttendanceCardProps {
  game: GameDetails;
  attendanceStatus: AttendanceStatusValue;
  isSaving: boolean;
  error: Error | null;
  onConfirm(): void;
  onDecline(): void;
  onRetry(): void;
}

// Game Detail — Attendance (docs/ux/02-player-attendance.md): Confirm/Decline
// toggles with optimistic save feedback. `game.locationName`/`game.address`
// are admin-entered free text rendered as-is (no translation key); date/time
// are formatted per-locale via next-intl (see docs/ux/design-tokens.md).
export function AttendanceCard({
  game,
  attendanceStatus,
  isSaving,
  error,
  onConfirm,
  onDecline,
  onRetry,
}: AttendanceCardProps) {
  const t = useTranslations("Attendance");
  const tCommon = useTranslations("Common");
  const format = useFormatter();
  const [showSaved, setShowSaved] = useState(false);
  const wasSavingRef = useRef(isSaving);

  useEffect(() => {
    const justFinishedSaving = wasSavingRef.current && !isSaving && error === null;
    wasSavingRef.current = isSaving;

    if (!justFinishedSaving) return;

    setShowSaved(true);
    const timeoutId = setTimeout(() => setShowSaved(false), SAVED_MESSAGE_DURATION_MS);
    return () => clearTimeout(timeoutId);
  }, [isSaving, error]);

  function handleConfirm() {
    setShowSaved(false);
    onConfirm();
  }

  function handleDecline() {
    setShowSaved(false);
    onDecline();
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">
        {t("pageTitle", { locationName: game.locationName })}
      </h1>
      <p>
        {format.dateTime(new Date(game.date), GAME_DATE_FORMAT)} ·{" "}
        {format.dateTime(new Date(game.time), GAME_TIME_FORMAT)}
      </p>
      <p>{game.address}</p>
      <div className="flex gap-2">
        <ToggleButton
          pressed={attendanceStatus === "confirmed"}
          onToggle={handleConfirm}
          disabled={isSaving}
        >
          {t("confirmButton")}
        </ToggleButton>
        <ToggleButton
          pressed={attendanceStatus === "declined"}
          onToggle={handleDecline}
          disabled={isSaving}
        >
          {t("declineButton")}
        </ToggleButton>
      </div>
      <div aria-live="polite">
        {isSaving ? tCommon("saving") : null}
        {!isSaving && showSaved ? t("saved") : null}
      </div>
      {error !== null ? (
        <div role="alert" className="flex items-center gap-2">
          <p>{t("saveError")}</p>
          <Button variant="secondary" onClick={onRetry}>
            {tCommon("retry")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
