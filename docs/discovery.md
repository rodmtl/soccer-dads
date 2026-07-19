# Discovery — Soccer Dads Participant Registration

Phase 0 output. Source spec: `specs/initial.md`.

## Problem statement

A recurring informal ("garage league") soccer group needs a lightweight way to:

- schedule games at a given address/time,
- let players confirm whether they're coming and what position they prefer,
- let an organizer build balanced teams (however many the game needs) from whoever confirmed, and
- track who's paid for a given game (when the game isn't free).

There is currently no tooling — this is presumably being coordinated over chat/WhatsApp today,
which is why "shareable via WhatsApp" and "cheapest possible" hosting matter: this is a hobby-scale
tool for a small, trusted group, not a commercial product.

## Primary users

1. **Player** — a member of the league. Confirms attendance for a game, sets/changes a preferred
   pitch position (goalkeeper, defender, midfielder, striker — max 2), and looks up the team
   roster for a specific date.
2. **Admin** — the league organizer (likely one person, possibly a small handful). Creates games,
   creates/edits player records, rates players, generates and edits team rosters, and marks
   per-player payment status per game.

These are the only two roles in v1. There is no "team captain" or other intermediate role.

## v1 scope

**In scope:**

- Player: confirm/decline attendance for a specific game.
- Player: set a preferred pitch position (up to 2, from goalkeeper/defender/midfielder/striker).
- Player: view the team roster for a specific date.
- Admin: create a game — one per (date, location) pair — with address, time, and **number of
  teams for that game** (e.g. 2, 3, or 4 — admin sets this per game, based on turnout/venue, not a
  fixed global constant; see resolved open question below and `docs/roster-algorithm.md`); generate
  a WhatsApp-shareable link/message for it.
- Admin: create and edit player records (name, position(s), age, optional phone/email/Facebook,
  rating 0–100, default 60).
- Admin: rate players and set/change a player's preferred position(s).
- Admin: generate a randomized, position- and rating-balanced roster across the game's admin-set
  number of teams; edit the roster at any time afterward.
- Admin: mark, per player per game, whether payment was made.
- App UI is bilingual (English/French) from v1 — see resolved open question below and
  `docs/architecture.md`'s internationalization section.

**Explicitly out of scope for v1:**

- **Phase 2 from the spec**: posting a survey to a WhatsApp group, collecting group-member votes,
  and registering results in the app. Noted as a future phase only.
- Any WhatsApp Business API / bot integration. "Shareable via WhatsApp" in v1 means generating a
  standard `wa.me` share link or pre-filled share text a human sends manually — not an automated
  bot posting into a group.
- Online/in-app payment processing (Stripe, etc.). Payment tracking is a manual boolean/status the
  admin sets after collecting money out-of-band (cash, e-transfer, whatever the group already
  uses).
- Player self-registration / public sign-up. Admin creates player records; there's no "create your
  own account" flow in v1.
- Multi-league / multi-tenant support. The app models one garage league.
- Configurable team *sizes* independent of an even split, or in-game substitutions/rotations across
  teams. Team *count* is admin-configurable per game (resolved, see below), but within that, the
  algorithm still aims for as-even-as-possible distribution — it does not support, e.g., "Team A
  gets 8 players and Team B gets 5 on purpose."
- Historical stats, standings, leaderboards, or performance-over-time tracking beyond the single
  current `rating` value per player.
- Native mobile apps. Web, responsive, is the only client.
- Languages beyond English and French. Both are required at launch (resolved, see below), but a
  third language is out of scope for v1 unless raised later.

## Assumptions (spec gaps)

The spec leaves several things unstated. These are the assumptions made to keep moving, listed so
they can be corrected:

1. **Player identity / "who am I" problem — resolved, no login for v1.** The spec describes
   players confirming attendance and setting a preferred position, but never describes a login
   system, and admin — not the player — is the one who *creates* player records. Confirmed
   approach: a player picks their name from a list of existing players to act as that player (no
   password, no account, no magic link). This is a trust-based mechanism appropriate for a small
   known group — anyone with app access can act as any player, which is accepted for v1. See
   `docs/data-model.md`'s Admin/Player section.
2. **Admin authentication.** Assumed there is at least one authenticated admin account (simple
   credential-based login), distinct from the player-facing side, which in v1 may have no
   authentication at all beyond "pick your name."
3. **Game uniqueness.** "Only one game per date & per location" is read as: the pair (date,
   location) is unique. The same date can have multiple games at different locations; the same
   location can host games on different dates.
4. **Number of teams — resolved.** Not fixed at two. The admin specifies the number of teams
   **per game** (e.g. 2, 3, or 4) at game-creation/edit time, depending on turnout and venue. The
   roster-balancing algorithm (`docs/roster-algorithm.md`) and data model (`docs/data-model.md`,
   `Game.number_of_teams` and `TeamAssignment.team_index`) have been generalized to N teams
   accordingly. See the resolved open question below.
5. **Ratings are admin/private by default.** Assumed players do not see other players' numeric
   ratings (avoids friction in a social group); only admin sees/edits ratings. Players do see their
   own rating and their own team assignment.
6. **Payment is tracked, not processed.** No payment gateway; "payment done" is a manual
   admin-set flag per (game, player).
7. **Timezone/locale.** Single timezone assumed (the league's home timezone) — no multi-timezone
   support needed for v1.
8. **Scale.** Expected order of magnitude: a few dozen players, one or a handful of games per
   week. This shapes the hosting/cost decisions in `docs/architecture.md` and
   `docs/adr/0001-hosting-and-backend-runtime.md` — this is a hobby-scale app, not a system that
   needs to handle real concurrency or growth pressure.
9. **Bilingual scope: app copy only, not admin-entered free text — confirmed.** "English/French
   from v1" (resolved below) means all *app-authored* UI copy — labels, buttons, emails, validation
   messages, static page text. Admin-entered free text (a game's `location_name`/`address`, a
   player's name) is **not** translated at all: stored once, displayed as-is to every viewer
   regardless of locale. No translation-service integration, and no manual dual-language entry
   fields either. This is confirmed, not a default — see resolved open question below.

## Open questions for the user (before Phase 2 / Phase 3)

- ~~Confirm the hosting/backend-runtime decision in
  `docs/adr/0001-hosting-and-backend-runtime.md`~~ — **resolved 2026-07-18**: Option B (drop
  .NET, Next.js + Prisma + Postgres/Neon, single Vercel project). ADR is now ACCEPTED.
- ~~Confirm the player-identity approach (assumption 1 above): is "pick your name from a list, no
  password" acceptable for v1, or is real authentication required?~~ — **resolved 2026-07-18**: no
  login for players in v1. A player picks their name from a list to act as that player (confirm
  attendance, set position) — no password, no magic link, no account. Admin retains a real
  authenticated login (assumption 2), unchanged.
- ~~Confirm whether "two teams per game" is always true, or whether some games split into more than
  two teams.~~ — **resolved 2026-07-18**: no, team count is variable. The admin sets the number of
  teams **per game** (2, 3, 4, ...) depending on turnout/venue. `docs/roster-algorithm.md` and
  `docs/data-model.md` have been updated to generalize the balancing algorithm and the
  `TeamAssignment`/`Game` model to arbitrary N, not a hardcoded two-team split.
- ~~Confirm content language (English/Spanish/other) — doesn't block architecture, but blocks UX
  copy in Phase 2.~~ — **resolved 2026-07-18**: the app is **bilingual English/French, both
  required at v1 launch** (not a deferred/single-language decision). This is a real scope addition,
  not just a copy detail — see `docs/architecture.md`'s internationalization section for the
  `next-intl` recommendation and its effect on repo structure.
- ~~Is admin-entered free text (game address/location name, player names) translated, or shown
  as-is?~~ — **resolved 2026-07-18**: no translation, at all — shown as-is in both locales. No
  machine-translation integration and no dual-language entry fields. See assumption 9 above.
