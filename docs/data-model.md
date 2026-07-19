# Data Model — GarageLeague Participant Registration

Baseline: PostgreSQL, accessed via Prisma (see `docs/architecture.md` and
`docs/adr/0001-hosting-and-backend-runtime.md`). Entity/field names below are logical (a later
implementation phase maps these to an actual `prisma/schema.prisma` model and generated
migrations — this document intentionally does not write schema-specific code).

## Entities

### Admin

The league organizer. Distinct from `Player` — an Admin is an authenticated account (email +
password); a Player is **not** authenticated at all in v1 (confirmed, see `docs/discovery.md`
assumption 1) — a player acts as themselves by picking their name from a list, no login.

| Field | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| email | string, unique | login identifier |
| password_hash | string | never store plaintext |
| created_at | timestamp | |

### Player

A league member. Created/edited only by an Admin (v1).

| Field | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| name | string | required |
| age | int | required |
| positions | string[] | max **2** values, each one of `goalkeeper`, `defender`, `midfielder`, `striker`; order does not imply priority unless the UI decides otherwise later |
| rating | int | 0–100, **default 60**; admin-only visibility (see discovery.md assumption 5) |
| phone | string, optional | |
| email | string, optional | |
| facebook_profile | string (URL), optional | |
| created_at / updated_at | timestamp | |

Constraint: `positions` array length ≤ 2, each element restricted to the four allowed position
values (enforced at the application layer; Postgres `CHECK` constraint on array length is also
reasonable).

### Game

Created by Admin. One row per (date, location) pair.

| Field | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| date | date | |
| time | time | kickoff time |
| location_name | string | e.g. "Parque Central" |
| address | string | required, per spec |
| number_of_teams | int | **admin-set per game**, default 2; how many teams the roster algorithm should split confirmed players into for *this* game (e.g. 2, 3, 4 — not a global constant; see `docs/discovery.md` resolved open question and `docs/roster-algorithm.md`) |
| share_text | string (derived) | pre-filled WhatsApp share text/link (`wa.me/?text=...`), generated from date/time/address — not user-entered |
| created_by | uuid (FK → Admin.id) | |
| created_at | timestamp | |

Constraint: **unique (date, location_name)** — matches "only one game per date & per location."

Constraint: `number_of_teams` ≥ 1 (application-layer check; `CHECK (number_of_teams >= 1)` in
Postgres is also reasonable). It can be edited after creation (e.g. admin realizes turnout is
bigger/smaller than expected), but editing it after a roster already exists effectively
invalidates the existing `TeamAssignment` rows for that game — see the roster-algorithm doc's note
on regenerating after a team-count change.

### Attendance

One row per (game, player): whether that player is confirmed to attend that game.

| Field | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| game_id | uuid (FK → Game.id) | |
| player_id | uuid (FK → Player.id) | |
| status | enum: `confirmed`, `declined`, `no_response` | default `no_response` |
| responded_at | timestamp, nullable | set when status changes away from `no_response` |

Constraint: **unique (game_id, player_id)**.

### TeamAssignment (roster)

The persisted *result* of a roster generation for one game — not computed on the fly, since the
admin must be able to view and hand-edit it at any time without re-running the algorithm.

| Field | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| game_id | uuid (FK → Game.id) | |
| player_id | uuid (FK → Player.id) | |
| team_index | int | **arbitrary team number, not a fixed A/B enum** — an integer in `0..Game.number_of_teams - 1` (or `1..number_of_teams`; exact zero- vs. one-indexing is an implementation detail) identifying which of that game's N teams this player is on. Generalized 2026-07-18 from a hardcoded `A`/`B` enum — see `docs/discovery.md` resolved open question and `docs/roster-algorithm.md` |
| assigned_position | enum: `goalkeeper`, `defender`, `midfielder`, `striker` | the position they'll play *that game*; usually one of the player's `positions` but the admin can override |
| generated_at | timestamp | when the algorithm (last) produced this row |
| updated_by | uuid (FK → Admin.id), nullable | set if an admin hand-edited the row after generation |

Constraint: **unique (game_id, player_id)** — a player is on at most one team per game.

Constraint: `team_index` must be within the range implied by that game's `Game.number_of_teams` at
the time the row was written (application-layer check, since it depends on a sibling row's field
rather than a simple column constraint). There is no separate `Team` entity — `team_index` is just
an integer label scoped to `(game_id)`, not a foreign key to a table of teams, since teams have no
identity or attributes of their own beyond "which game, which index."

### Payment

One row per (game, player): whether that player has paid for that game. Only created/relevant for
games that aren't free — the presence of a row (or a non-null `paid`) implies payment is being
tracked for that game; a game with no Payment rows is treated as free.

| Field | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| game_id | uuid (FK → Game.id) | |
| player_id | uuid (FK → Player.id) | |
| paid | boolean | default `false` |
| amount | decimal, optional | if the league wants to record how much, not required for v1's "did they pay" flag |
| marked_by | uuid (FK → Admin.id) | |
| marked_at | timestamp | |

Constraint: **unique (game_id, player_id)**.

## Relationships

```
Admin 1───* Game            (created_by)
Admin 1───* Payment          (marked_by)
Admin 1───* TeamAssignment   (updated_by, nullable)

Player 1───* Attendance
Player 1───* TeamAssignment
Player 1───* Payment

Game   1───* Attendance
Game   1───* TeamAssignment
Game   1───* Payment
```

In words:

- A **Game** has many **Attendance** rows (one per player who's been asked to respond — in
  practice, this can be created lazily the first time a player interacts with a game, or eagerly
  for every existing player when the game is created; either is fine, this doc doesn't mandate
  one).
- A **Game** has many **TeamAssignment** rows once a roster has been generated — the set of
  players with `status = confirmed` in Attendance is the *input* to roster generation; the
  TeamAssignment rows are the *output*.
- A **Game** has many **Payment** rows, one per player being tracked for payment on that game.
- A **Player** accumulates history across many games via all three of the above, but v1 has no
  requirement to surface that history as stats/trends (see discovery.md out-of-scope list).

## Player identity — resolved

`docs/discovery.md` (assumption 1) confirms: no login for players in v1. A player acts as
themselves by picking their name from `Player` in a list — no password, no account, no
`user_id`/login reference on `Player`. The `Player` entity above is final as modeled; no auth
column is added.

## Roster-balancing algorithm

See `docs/roster-algorithm.md`.
