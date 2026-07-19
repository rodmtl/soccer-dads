"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ToggleButton } from "@/components/ToggleButton";
import { POSITION_VALUES, type Position } from "@/server/services/positions";

export interface PositionPickerProps {
  selectedPositions: Position[];
  maxSelected: number;
  // Caller-supplied translated text (e.g. Profile.maxPositionsMessage here,
  // AdminPlayers.maxPositionsMessage in Flow 6) so this shared component
  // isn't hardcoded to one namespace across its callers (docs/ux/03-player-position.md).
  maxReachedMessage: string;
  // Caller-supplied, already-interpolated helper text (e.g. "1 of 2
  // selected", built from Profile.positionsSelectedCount here,
  // AdminPlayers.positionsSelectedCount-equivalent in Flow 6) — same
  // rationale as maxReachedMessage: docs/ux/06-admin-player-crud.md reuses
  // this component verbatim under a different copy namespace, so no text is
  // resolved internally against a hardcoded namespace.
  selectedCountMessage: string;
  // Caller-supplied translated text shown (role="alert") when `error` is
  // set, for the same cross-namespace-reuse reason as the two props above.
  saveErrorMessage: string;
  isSaving: boolean;
  // Reserved for future permission-gated variants; unused in v1.
  disabledPositions?: Position[];
  error: Error | null;
  onToggle(position: Position): void;
}

// docs/ux/03-player-position.md's PositionPicker: a fixed-order 4-way toggle
// group (goalkeeper, defender, midfielder, striker) shared verbatim by the
// player profile (Flow 3) and the future admin player editor (Flow 6). Only
// `Common.saving` is resolved internally (via next-intl) since that's a
// genuinely cross-flow, non-namespaced string already used the same way by
// AttendanceCard — every other piece of copy here is caller-supplied so this
// component never hardcodes a Profile-only or AdminPlayers-only namespace.
export function PositionPicker({
  selectedPositions,
  maxSelected,
  maxReachedMessage,
  selectedCountMessage,
  saveErrorMessage,
  isSaving,
  disabledPositions = [],
  error,
  onToggle,
}: PositionPickerProps) {
  const t = useTranslations("Position");
  const tCommon = useTranslations("Common");
  const [showMaxReachedMessage, setShowMaxReachedMessage] = useState(false);

  // The rejection message is transient, tied to the attempt that triggered
  // it — once the actual selection changes (a toggle succeeded, or a save
  // completed/reverted), it's no longer relevant and clears itself. Adjusted
  // during render (React's documented pattern for resetting state in
  // response to a prop change, https://react.dev/learn/you-might-not-need-an-effect)
  // rather than in a useEffect, which would cause an extra commit.
  const [previousSelectedPositions, setPreviousSelectedPositions] =
    useState(selectedPositions);
  if (previousSelectedPositions !== selectedPositions) {
    setPreviousSelectedPositions(selectedPositions);
    setShowMaxReachedMessage(false);
  }

  function handleToggle(position: Position) {
    const isSelected = selectedPositions.includes(position);
    if (!isSelected && selectedPositions.length >= maxSelected) {
      setShowMaxReachedMessage(true);
      return;
    }
    onToggle(position);
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-2 sm:grid-flow-col sm:grid-cols-none">
        {POSITION_VALUES.map((position) => (
          <ToggleButton
            key={position}
            pressed={selectedPositions.includes(position)}
            onToggle={() => handleToggle(position)}
            // Intentional simplification: only one save can be in flight at
            // a time from this group (isSaving is a single shared boolean,
            // not tracked per-position), so all four disable together
            // rather than independently racing each other.
            disabled={isSaving || disabledPositions.includes(position)}
          >
            {t(position)}
          </ToggleButton>
        ))}
      </div>
      <p>{selectedCountMessage}</p>
      <div aria-live="polite">{isSaving ? tCommon("saving") : null}</div>
      <div aria-live="polite">{showMaxReachedMessage ? maxReachedMessage : null}</div>
      {error !== null ? <p role="alert">{saveErrorMessage}</p> : null}
    </div>
  );
}
