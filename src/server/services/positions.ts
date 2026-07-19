// Position enum values, in the fixed display order used everywhere a
// position is shown/selected (docs/ux/03-player-position.md: "order fixed,
// matches this list, translation keys Position.goalkeeper/.../.striker —
// reused everywhere a position is displayed/selected across the app").
export const POSITION_VALUES = ["goalkeeper", "defender", "midfielder", "striker"] as const;

export type Position = (typeof POSITION_VALUES)[number];

// Exported so callers (e.g. ProfileContainer) don't independently redeclare
// this same "2" rule as a second constant.
export const MAX_POSITIONS = 2;

// Server-side boundary for the position picker (docs/ux/03-player-position.md):
// the client's PositionPicker only enforces max-2 as a UI convenience (it
// blocks a 3rd tap before ever calling onToggle) — this is the real
// validation, since a client can always call updateOwnPositions directly
// with an arbitrary body. Checks: array of ≤2 values, each one of the four
// allowed positions, no duplicates (see docs/data-model.md's Player entity).
export function isValidPositionsUpdate(positions: unknown): positions is Position[] {
  if (!Array.isArray(positions)) return false;
  if (positions.length > MAX_POSITIONS) return false;

  const allValid = positions.every((value): value is Position =>
    (POSITION_VALUES as readonly string[]).includes(value as string),
  );
  if (!allValid) return false;

  return new Set(positions).size === positions.length;
}
