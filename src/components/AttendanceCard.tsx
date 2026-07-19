"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/Button";
import { ToggleButton } from "@/components/ToggleButton";
import type { AttendanceStatusValue } from "@/server/actions/listGames";

const SAVED_MESSAGE_DURATION_MS = 3000;

export interface AttendanceCardProps {
  attendanceStatus: AttendanceStatusValue;
  isSaving: boolean;
  error: Error | null;
  onConfirm(): void;
  onDecline(): void;
  onRetry(): void;
}

// Game Detail — Attendance (docs/ux/02-player-attendance.md): Confirm/Decline
// toggles with optimistic save feedback. The game's own heading/date/address
// are rendered once by GameDetailContainer, above this and the Roster tab
// (see docs/ux/02-player-attendance.md's tab-shell section) — this component
// owns only the Attendance tab's own content.
export function AttendanceCard({
  attendanceStatus,
  isSaving,
  error,
  onConfirm,
  onDecline,
  onRetry,
}: AttendanceCardProps) {
  const t = useTranslations("Attendance");
  const tCommon = useTranslations("Common");
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
