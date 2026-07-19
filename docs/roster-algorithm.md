# Roster-Balancing Algorithm (v1)

This describes the approach in plain language / pseudocode. It is deliberately a simple,
explainable heuristic, not an optimization solver — for a group of a few dozen players, a solver
would be speculative complexity with no real benefit over a good greedy/randomized approach.

**Generalized to N teams (2026-07-18):** the original version of this document assumed exactly two
teams. That assumption was wrong — see `docs/discovery.md`'s resolved open question on team count.
The admin sets the number of teams **per game** (2, 3, 4, or more, depending on turnout and venue),
and this algorithm must distribute confirmed players across however many teams that game has. The
approach below is a generalization of the same tiered-shuffle-snake-draft idea from a 2-way split to
an N-way split; nothing about the underlying mental model changes.

## Inputs

- The list of players with `Attendance.status = confirmed` for the game being rostered.
- Each player's `rating` (0–100) and `positions` (1–2 of goalkeeper/defender/midfielder/striker),
  from `Player`.
- **Number of teams, `N`**: an admin-set integer field on the `Game` being rostered (`Game.
  number_of_teams`, see `docs/data-model.md`) — not a fixed constant. `N` is expected to be a small
  integer (2–4 is the realistic range for a garage league), but the algorithm makes no assumption
  about an upper bound beyond "more teams than confirmed players doesn't make sense" (see
  Edge cases below).

## Goal

Produce `N` teams that are roughly even by (a) total/average rating and (b) position coverage
(e.g. don't put every defender on one team and every striker on another), while still being
**random** each time it's run, as the spec requires — not the same deterministic split every time.
This must hold for `N = 2` exactly as it did before, and generalize cleanly to `N = 3`, `N = 4`, etc.

## Approach: tiered-shuffle snake draft across N teams

1. **Goalkeepers first.** Collect confirmed players who list `goalkeeper` among their positions.
   - Shuffle them randomly and assign up to one to each of the `N` teams (team order for this
     assignment step is itself randomized, not always team 1, 2, 3...).
   - If there are more goalkeeper-preferring players than teams (`count > N`), the excess are
     treated as flexible/outfield for the remaining steps — a player who prefers goalkeeper but
     isn't picked as *the* keeper for their team still gets placed via the normal draft below, just
     not necessarily in goal.
   - If there are fewer goalkeeper-preferring players than teams (`count < N`), the remaining teams
     play without a dedicated keeper for that game — a real possibility in a garage league, and the
     admin can manually adjust afterward.
   - If zero: no team gets a dedicated keeper; no special handling needed.

2. **Bucket the rest by rating into small tiers.** Sort remaining (non-assigned) confirmed players
   by `rating` descending, then group into tiers of similar rating (e.g. every few consecutive
   players by rank, or a fixed band like ±5 rating points — exact tier width is a tuning detail for
   implementation, not an architectural decision). Shuffle players *within* each tier randomly. This
   keeps the overall strength ordering intact (so the draft below still balances by rating) while
   making the specific pairing/order random each run, satisfying "must be random."

3. **Snake draft the shuffled, tiered list across N teams.** Walk the list in tier-then-shuffled
   order and assign in a boustrophedon ("snake") pattern across all `N` teams: pick 1 → team 1,
   picks 2..N → teams 2..N in order, then the direction reverses — the next `N` picks go back
   teams N, N-1, ..., 1 — and so on, alternating direction every `N` picks. (This is exactly the
   `N = 2` case's `A, B, B, A, A, B, B, A, ...` pattern generalized: e.g. for `N = 3` the order is
   `1, 2, 3, 3, 2, 1, 1, 2, 3, ...`.) This is the standard multi-team "snake draft" pattern used in
   fantasy leagues with more than two sides, and it keeps cumulative rating close across all N
   teams simultaneously without needing an optimizer.

4. **Position tiebreak.** When a step in the draft could reasonably go to more than one team (e.g.
   several players in the same shuffled tier being placed back to back), prefer assigning a player
   to whichever *eligible* team currently has the **fewest** players sharing that player's preferred
   position — this nudges toward even position coverage across all N teams without overriding the
   rating-driven snake order. With N teams this is a min-pick over N running position counts rather
   than a binary A-vs-B comparison, but the rule itself is unchanged.

5. **Remainder players.** If the confirmed count doesn't divide evenly by `N`, the leftover
   players (fewer than `N` of them) are placed one at a time on whichever remaining team(s) have the
   fewest players so far (or benched, admin's call) — ties broken randomly. This is the same "odd
   player out" rule as the 2-team case, just resolved against N running team sizes instead of two.

6. **Persist the result.** Write one `TeamAssignment` row per (game, player) with the resulting
   `team_index` (an integer `0..N-1`, or `1..N` — see `docs/data-model.md`; not a fixed `A`/`B`
   enum) and an `assigned_position` (defaulting to one of the player's preferred `positions`,
   falling back to whichever slot they were drafted to fill).

## Edge cases specific to N teams

- **`N` greater than the number of confirmed players.** Not a valid input — the admin cannot split
  6 confirmed players into 8 teams. The application layer should reject or warn on this before
  invoking the algorithm; this document doesn't prescribe the exact UX (Phase 2's concern) but
  flags that `number_of_teams` needs a sanity check against confirmed-attendance count at
  generation time, not just at game-creation time (since attendance can still change afterward).
- **`N = 1`.** Degenerate case — "one team" means no balancing decision to make at all; the
  algorithm can short-circuit and assign everyone to team 1. Whether this is a meaningful game
  configuration at all is a product question, not an algorithmic one.
- **Changing `number_of_teams` after a roster already exists.** Changing the team count on a game
  that already has `TeamAssignment` rows implies those rows are stale (they reference team indices
  under the old N). Treat this the same as any other "regenerate" — see below: it replaces existing
  `TeamAssignment` rows rather than trying to reshuffle in place.

## Editing and re-running

- The admin can hand-edit any `TeamAssignment` row at any time (move a player between any of the
  `N` teams, change their assigned position) — this is a direct update, not a re-run of the
  algorithm.
- The admin can also explicitly **regenerate**, which re-runs the algorithm from the current
  confirmed-attendance list and the game's current `number_of_teams`, and **replaces** all
  `TeamAssignment` rows for that game. Because this discards any manual edits (and because changing
  `number_of_teams` between generations changes what a "team" even refers to), the UI (Phase 2)
  should confirm before doing this.

## Why this approach (one sentence)

A tiered-shuffle snake draft generalizes cleanly from 2 to N teams — it's the same
schoolyard/fantasy-league draft mental model used by leagues that split into more than two sides —
so it still needs no bespoke optimizer or external solver for a group this size, regardless of how
many teams a given game has.
