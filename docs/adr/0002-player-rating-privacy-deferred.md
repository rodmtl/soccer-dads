# ADR 0002: Defer showing a player's own rating until real identity exists

**Status:** ACCEPTED — decided by the user on 2026-07-19.

## Context

`docs/discovery.md` assumption 5 originally stated that a player may see their own numeric
`rating`, while other players' ratings stay admin-only. The Phase 3 implementation of the
position-preference flow (`docs/ux/03-player-position.md`) built a profile screen that fetches and
displays the current player's own rating via a `getOwnProfile` Server Action.

Phase 5 security audit flagged this as a HIGH-severity finding: v1 has **no real player
authentication** (see `docs/discovery.md` assumption 1 — a player is identified only by picking a
name from a list, no password, and that choice is stored client-side in `localStorage`). Server
Actions like `getOwnProfile` validate that the supplied id refers to *some* real `Player` row
(`assertPlayerExists`), but have no way to verify the caller actually *is* that player. Since
`listPlayers()` already exposes every player's id publicly (required for the identity picker to
work at all), anyone can request any other player's rating by supplying a different id — via
devtools, or by editing the `localStorage` value directly.

This differs from the already-accepted risk in assumption 1 ("anyone with app access can act as
any player" — e.g., mark someone else's attendance). That risk is scoped to *actions a trusted
group member might plausibly need to do on another's behalf* (or a low-stakes prank). Silently
exposing every player's private rating to any visitor is a different, unbounded exposure with no
comparable justification.

## Decision

Withhold player-rating display from every player-facing screen, including the player's own
profile, until a real identity/session mechanism exists. `getOwnProfile` does not return `rating`.
The position-preference profile screen (`docs/ux/03-player-position.md`) shows only name, age, and
positions — not rating.

This is **not** a change to who can *set* ratings — that remains admin-only, unaffected by this
ADR, since admin actions are a separate (if similarly unauthenticated-today) surface not addressed
here.

## Consequences

- `docs/ux/03-player-position.md`'s profile screen spec is amended to drop the rating display
  requirement.
- If/when a real player identity mechanism is added (e.g. a signed session cookie issued when a
  player is picked, validated server-side instead of trusting a client-supplied id), this ADR
  should be superseded and `getOwnProfile` can safely return `rating` again.
- No other Phase 3 slice currently exposes another privacy-sensitive field this way; future slices
  that return player-specific sensitive data should check against this same identity gap before
  shipping, not discover it independently at Phase 5 each time.
