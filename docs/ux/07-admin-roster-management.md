# Flow 7 — Admin: Generate/Edit Team Roster

Source: `docs/discovery.md` (v1 scope: generate randomized, position/rating-balanced roster;
edit anytime), `docs/data-model.md` TeamAssignment entity, `docs/roster-algorithm.md` (full
algorithm — this doc only covers how the admin triggers/views/edits its *result*, not the
balancing logic itself). Assumes an authenticated Admin. See `docs/ux/design-tokens.md` for shared
primitives (`Button`, `ConfirmDialog`, `ErrorState`, `LoadingSkeleton`, `EmptyState`).

## Entry point

The "Roster" tab within a specific game's **admin** detail view (sibling to the Game Form /
game-detail fields from Flow 5, and to the "Payments" tab from Flow 8).

## User flow — first generation

1. Admin opens a game's Roster tab; no roster exists yet.
2. Sees the count of currently-confirmed players (from `Attendance.status = confirmed`) versus the
   game's `number_of_teams`.
3. If confirmed count < `number_of_teams`: "Generate roster" is disabled, with an inline
   explanation (per `docs/roster-algorithm.md`'s edge case: N must not exceed confirmed players).
4. Otherwise: taps "Generate roster" → algorithm runs server-side → result renders as N team
   sections.

## User flow — editing an existing roster

1. Admin opens a game's Roster tab; a roster already exists, rendered as N team sections, each
   listing players with their `assigned_position`.
2. Per player row, two controls: a "Team" selector (move this player to a different team index) and
   a "Position" selector (change their `assigned_position` for this game only — does not alter
   `Player.positions`, their standing preference).
3. Changing either selector saves immediately (optimistic, same pattern as Flow 2/3), scoped to
   that one `TeamAssignment` row.
4. Admin may instead tap "Regenerate roster" — this is gated behind `ConfirmDialog` (per
   `docs/roster-algorithm.md`'s explicit note that regeneration should be confirmed, since it
   discards manual edits and re-runs the full algorithm against current confirmed attendance and
   the game's *current* `number_of_teams`).

## Stale-roster warning

If the game's `number_of_teams` has changed since the roster was last generated (i.e. the existing
`TeamAssignment` rows imply a different team count than the game's current `number_of_teams` — e.g.
max `team_index` + 1 ≠ current `number_of_teams`), show a non-blocking warning banner above the
team sections: `AdminRoster.staleTeamCountWarning` ("The number of teams has changed since this
roster was generated. Regenerate to apply {numberOfTeams} teams.") The existing roster remains
fully viewable and hand-editable in its old shape until the admin explicitly regenerates — this
mirrors Flow 5's warning shown at game-edit time, surfaced again here since the admin may land on
this tab without having just edited the game.

## States

| State | Trigger | Renders |
|---|---|---|
| Loading | Fetching roster + confirmed-attendance count | `LoadingSkeleton` |
| Error (load) | Fetch failed | `ErrorState` + retry, `AdminRoster.loadError` |
| Empty, generation blocked | No roster yet, confirmed count < `number_of_teams` | `EmptyState`: `AdminRoster.notEnoughConfirmedTitle` ("Not enough confirmed players"), description `AdminRoster.notEnoughConfirmedDescription` ("{confirmedCount} confirmed, {numberOfTeams} teams needed.") — "Generate roster" button rendered but `disabled` |
| Empty, ready to generate | No roster yet, confirmed count ≥ `number_of_teams` | `EmptyState`-style prompt: `AdminRoster.readyToGenerateTitle` ("Ready to generate teams"), `AdminRoster.readyToGenerateDescription` ("{confirmedCount} confirmed players for {numberOfTeams} teams.") + enabled "Generate roster" button |
| Generating | "Generate roster" tapped, request in flight | Button shows loading state (`Common.generating`), rest of the (empty) view stays as-is until the result returns |
| Generation error | Generate request failed | `role="alert"` banner `AdminRoster.generateError` ("Couldn't generate the roster."), button re-enabled for retry |
| Populated | ≥1 `TeamAssignment` row exists | N team sections, each with editable player rows; "Regenerate roster" button always available alongside |
| Regenerating | Confirmed in `ConfirmDialog`, request in flight | Team sections show a loading overlay/skeleton (previous roster is about to be replaced) |
| Regeneration error | Regenerate request failed | `role="alert"` banner `AdminRoster.regenerateError`; **previous roster is preserved** (not cleared) since the replace didn't actually happen server-side |
| Row-save error | A single team/position change failed to save | That row's selector reverts to its prior value, inline `role="alert"` scoped to that row, `AdminRoster.rowSaveError` ("Couldn't save this change.") + retry |

## Component spec: `RosterManager`

Props:

```
game: { id: string; numberOfTeams: number }
confirmedCount: number
roster: Array<{
  teamIndex: number
  players: Array<{
    id: string
    name: string                 // admin-entered, as-is
    assignedPosition: 'goalkeeper' | 'defender' | 'midfielder' | 'striker'
    isSaving?: boolean
    error?: Error | null
  }>
}> | null                        // null = not generated yet
isLoading: boolean
loadError: Error | null
isGenerating: boolean
generateError: Error | null
isRegenerating: boolean
regenerateError: Error | null
isStale: boolean                 // number_of_teams changed since last generation
onGenerate(): void
onRegenerateRequest(): void       // opens the ConfirmDialog
onRegenerateConfirm(): void       // actually re-runs generation
onRegenerateCancel(): void
onMovePlayer(playerId: string, newTeamIndex: number): void
onChangePosition(playerId: string, newPosition: 'goalkeeper' | 'defender' | 'midfielder' | 'striker'): void
onRetryRowSave(playerId: string): void
onRetryGenerate(): void
```

Per-player row controls:

- **Team selector**: a `<select>` (or equivalent) with one option per `0..numberOfTeams-1`,
  labeled with the 1-based team number (`Roster.teamOption` → "Team {n}"). Accessible name must
  include the player's name since many identical selects appear on one screen:
  `aria-label="{playerName}'s team"`.
- **Position selector**: a `<select>` with the four position options (`Position.goalkeeper`, etc.).
  Accessible name: `aria-label="{playerName}'s position"`.
- Both selectors: `onChange` fires the respective callback immediately (no separate save button per
  row — consistent with the app's established optimistic-save pattern).

### Wireframe (admin, populated, N=2)

```
┌───────────────────────────────────────────────┐
│ Roster — Game at Parque Central                │
│ [ Regenerate roster ]                           │
├───────────────────────────────────────────────┤
│ Team 1                                          │
│  Sam Ortiz     [Team: 1 ▾] [Position: GK ▾]     │
│  Jordan Lee    [Team: 1 ▾] [Position: DEF ▾]    │
├───────────────────────────────────────────────┤
│ Team 2                                          │
│  Alex Kim      [Team: 2 ▾] [Position: ST ▾]     │
│  Priya Nair    [Team: 2 ▾] [Position: MID ▾]    │
└───────────────────────────────────────────────┘
```

## Component spec: `RegenerateConfirmDialog`

Reuses `ConfirmDialog` from `docs/ux/design-tokens.md` with:

- `title = AdminRoster.regenerateConfirmTitle` ("Regenerate this roster?")
- `description = AdminRoster.regenerateConfirmDescription` ("This replaces the current team
  assignments, including any manual changes you've made, with a new random draft.")
- `confirmLabel = AdminRoster.regenerateConfirmButton` ("Regenerate")
- `cancelLabel = Common.cancel` ("Cancel")

Per `docs/ux/design-tokens.md`'s `ConfirmDialog` spec: focus opens on Cancel (the safer default for
a destructive action), traps focus while open, returns focus to the "Regenerate roster" button on
close.

## Accessibility

- Team sections use the same `<section>` + `<h2>`/`<h3>` heading pattern as Flow 4's read-only
  roster view, for consistency between the admin and player renderings of the same underlying data.
- Every `<select>` has a unique, player-specific accessible name (see above) — this is the one
  place in the app with many visually-identical repeated controls, so it's called out explicitly as
  the highest-risk spot for an ambiguous-accessible-name bug.
- Row-level save errors use `aria-describedby` linking the failed selector to its inline
  `role="alert"` message, not a page-level banner, so simultaneous multi-row failures (rare, but
  possible if several changes are made quickly) don't collide into one region.
- "Generate roster" / "Regenerate roster" buttons: standard `Button` component, disabled state
  (not-enough-confirmed case) has a visible, programmatically associated reason
  (`aria-describedby` pointing at the `AdminRoster.notEnoughConfirmedDescription` text) rather than
  a disabled button with no explanation.
- Focus order: page heading → stale-warning banner (if present) → Generate/Regenerate button →
  team sections in team-index order → within each team, players in list order, each player's Team
  selector before their Position selector.
