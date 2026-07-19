// Shared next-intl `useFormatter().dateTime()` options for rendering a
// Game's date/time (see docs/ux/design-tokens.md's locale-aware date/time
// formatting requirement) — used by both GamesList and AttendanceCard so a
// given game's date/time renders identically wherever it appears.
//
// `timeZone: "UTC"` matches how these values are stored: Game.date/Game.time
// are timezone-less Postgres DATE/TIME columns (see docs/data-model.md),
// surfaced by Prisma as UTC-anchored instants — formatting in the viewer's
// local timezone would shift the displayed day/hour away from what the
// admin actually entered.
// Not given an explicit `Intl.DateTimeFormatOptions` annotation on purpose:
// that type is wider than next-intl's own `DateTimeFormatOptions` (e.g. for
// `timeZoneName`), so an annotated constant fails to type-check when passed
// into `useFormatter().dateTime()`. Left as an inferred literal, it
// structurally satisfies next-intl's narrower type just fine.
export const GAME_DATE_FORMAT = {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
} as const;

export const GAME_TIME_FORMAT = {
  hour: "numeric",
  minute: "2-digit",
  timeZone: "UTC",
} as const;
