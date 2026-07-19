// Game.date is stored as a timezone-less Postgres DATE column (see
// docs/data-model.md); Prisma surfaces it as a JS Date anchored to UTC
// midnight. Used both for the Games List "is this upcoming or past"
// comparison/sort (string comparison works since ISO dates sort
// chronologically) and as the raw value sent to the client, which formats
// it for display itself via next-intl (see docs/ux/design-tokens.md's
// locale-aware date/time formatting requirement) — this helper only reads
// the UTC date-only component back out, it does not decide a display
// format.
export function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}
