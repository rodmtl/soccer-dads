// Shared discriminated result shapes for Server Actions.
//
// Next.js does NOT preserve custom Error subclass identity across the
// client/server boundary a "use server" action crosses (the client's
// `.catch()` only ever receives a generic Error once serialized) — an
// `instanceof CustomError` check in a Server Component/Client Component
// caller therefore silently never matches in a real deployment, even though
// it matches in unit tests that `vi.mock` the action in the same JS realm
// (no real serialization boundary). See the security-audit/QA follow-up on
// docs/ux/02-player-attendance.md for the specific bug this caused.
//
// Actions return one of these instead of throwing a custom class, so
// callers branch on `result.ok`/`result.reason` (plain data, always safe to
// serialize) rather than `catch` + `instanceof`.
export type InvalidPlayerFailure = { ok: false; reason: "invalid_player" };
export type NotFoundFailure = { ok: false; reason: "not_found" };
export type Success<T> = { ok: true; data: T };

// Used by actions that only need to validate the player id (e.g. listGames —
// there's no single "not found" resource for a whole list).
export type PlayerActionResult<T> = Success<T> | InvalidPlayerFailure;

// Used by actions scoped to one game (getGameAttendance, setAttendance),
// which can also fail because that game id doesn't exist.
export type GameActionResult<T> = Success<T> | InvalidPlayerFailure | NotFoundFailure;
