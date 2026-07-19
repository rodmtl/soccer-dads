"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ErrorState } from "@/components/ErrorState";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { PositionPicker } from "@/components/PositionPicker";
import { getOwnProfile, type OwnProfileData } from "@/server/actions/getOwnProfile";
import { updateOwnPositions } from "@/server/actions/updateOwnPositions";
import { MAX_POSITIONS, type Position } from "@/server/services/positions";

export interface ProfileContainerProps {
  playerId: string;
  onInvalidPlayer(): void;
}

// Wires the read-only profile fields and PositionPicker to
// getOwnProfile/updateOwnPositions (see docs/ux/03-player-position.md's My
// Profile screen). Both actions return a discriminated { ok, ... } result
// rather than throwing a custom Error subclass — Next.js does not preserve
// custom Error subclass identity across the Server Action client/server
// boundary, so an `instanceof` check here would never actually match in a
// real deployment (see src/server/actions/actionResult.ts).
export function ProfileContainer({ playerId, onInvalidPlayer }: ProfileContainerProps) {
  const t = useTranslations("Profile");
  const tCommon = useTranslations("Common");

  const [profile, setProfile] = useState<OwnProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);

  const [positions, setPositions] = useState<Position[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<Error | null>(null);

  const lastKnownGoodPositionsRef = useRef<Position[]>([]);
  const onInvalidPlayerRef = useRef(onInvalidPlayer);
  useEffect(() => {
    onInvalidPlayerRef.current = onInvalidPlayer;
  });

  useEffect(() => {
    let cancelled = false;

    getOwnProfile(playerId)
      .then((result) => {
        if (cancelled) return;

        if (!result.ok) {
          if (result.reason === "invalid_player") {
            onInvalidPlayerRef.current();
          }
          return;
        }

        setProfile(result.data);
        setPositions(result.data.positions);
        lastKnownGoodPositionsRef.current = result.data.positions;
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
  }, [playerId, loadAttempt]);

  function handleLoadRetry() {
    setIsLoading(true);
    setLoadError(null);
    setLoadAttempt((previousAttempt) => previousAttempt + 1);
  }

  // No dedicated "Retry" button/handler on a save failure (unlike
  // AttendanceCard's Confirm/Decline pair): re-tapping the same
  // now-reverted toggle *is* the retry action, unambiguously, since this is
  // a single toggle group rather than two mutually-exclusive buttons where
  // "retry" could otherwise mean either one.
  function handleToggle(position: Position) {
    const nextPositions = positions.includes(position)
      ? positions.filter((selected) => selected !== position)
      : [...positions, position];

    setPositions(nextPositions);
    setIsSaving(true);
    setSaveError(null);

    updateOwnPositions(playerId, nextPositions)
      .then((result) => {
        if (!result.ok) {
          if (result.reason === "invalid_player") {
            onInvalidPlayerRef.current();
            return;
          }
          // "invalid_positions" here means the client-side max-2 guard was
          // bypassed (a bug, or a tampered-with request) — there's no
          // dedicated UI for that from this screen's normal interaction, so
          // it's treated like any other failed save: revert + generic error.
          setPositions(lastKnownGoodPositionsRef.current);
          setSaveError(new Error("Invalid positions"));
          return;
        }

        setPositions(result.data.positions);
        lastKnownGoodPositionsRef.current = result.data.positions;
      })
      .catch((caught: unknown) => {
        setPositions(lastKnownGoodPositionsRef.current);
        setSaveError(caught instanceof Error ? caught : new Error("Unknown error"));
      })
      .finally(() => setIsSaving(false));
  }

  if (isLoading) {
    return <LoadingSkeleton rows={4} label={tCommon("loading")} />;
  }

  if (loadError !== null) {
    return (
      <ErrorState
        message={t("loadError")}
        retryLabel={tCommon("retry")}
        onRetry={handleLoadRetry}
      />
    );
  }

  if (profile === null) {
    return null;
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <p>{profile.name}</p>
      <dl>
        <div>
          <dt>{t("ageLabel")}</dt>
          <dd>{profile.age}</dd>
        </div>
      </dl>
      <h2 className="text-lg font-medium">{t("positionsLabel")}</h2>
      <PositionPicker
        selectedPositions={positions}
        maxSelected={MAX_POSITIONS}
        maxReachedMessage={t("maxPositionsMessage")}
        selectedCountMessage={t("positionsSelectedCount", { count: positions.length })}
        saveErrorMessage={t("saveError")}
        isSaving={isSaving}
        error={saveError}
        onToggle={handleToggle}
      />
    </div>
  );
}
