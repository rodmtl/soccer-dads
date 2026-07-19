# Flow 4 — Player: View Team Roster for a Game

Source: `docs/discovery.md` (v1 scope: "Player: view the team roster for a specific date"),
`docs/data-model.md` TeamAssignment entity, `docs/roster-algorithm.md` (N teams, admin-generated).
Depends on Flow 1 (current player resolved) and is reached through Flow 2's Game Detail page (the
"Roster" tab). Read-only for players — generating/editing a roster is admin-only (Flow 7). See
`docs/ux/design-tokens.md` for shared primitives.

## Entry point

The "Roster" tab within a specific game's detail page (sibling to "Details & Attendance" from Flow
2). Always present/tappable for any game, regardless of whether a roster has been generated yet —
the empty state below handles the "not generated" case, rather than hiding the tab.

## User flow

1. Player is on a game's detail page (arrived via Games List or a WhatsApp deep link, per Flow 2).
2. Taps the "Roster" tab.
3. If a roster exists for this game: sees N team sections, each listing its players and their
   `assigned_position` for that game. The current player's own row is visually and textually
   distinguished ("You").
4. If no roster exists yet: sees an explanatory empty state; no action available to the player.
5. No further interaction is available on this screen for a player — it's read-only.

## States

| State | Trigger | Renders |
|---|---|---|
| Loading | Roster fetch in flight | `LoadingSkeleton` |
| Error | Fetch failed | `ErrorState` + retry, `Roster.loadError` |
| Empty (not generated) | Game exists, no `TeamAssignment` rows for it yet | `EmptyState`: `Roster.notGeneratedTitle` ("Teams haven't been announced yet"), `Roster.notGeneratedDescription` ("Check back closer to game day.") |
| Populated | ≥1 `TeamAssignment` row exists for the game | N team sections, each with its player list |

Note: a roster with *some* but not all confirmed players assigned (e.g. admin hand-edited mid-way)
is still "Populated" from this screen's perspective — it renders whatever `TeamAssignment` rows
exist; it does not attempt to reconcile against the Attendance list or flag partial rosters (that
reconciliation, if any, belongs to the admin-facing Flow 7, not this read-only view).

## Component spec: `RosterView`

Props:

```
teams: Array<{
  teamIndex: number
  players: Array<{
    id: string
    name: string                 // admin-entered, rendered as-is
    assignedPosition: 'goalkeeper' | 'defender' | 'midfielder' | 'striker'
  }>
}> | null                        // null while loading; [] is a valid "no teams" distinct from null
isLoading: boolean
error: Error | null
currentPlayerId: string
onRetry(): void
```

- `teams === null` → loading.
- `error !== null` → error.
- `teams !== null && teams.length === 0` (or every team has 0 players — equivalent for v1's
  purposes, since a roster with zero assignments is indistinguishable from "not generated" to a
  player) → empty/not-generated state.
- `teams` populated → one `<section>` per team, heading `Roster.teamHeading` interpolated with
  `teamIndex + 1` (e.g. "Team 1") — `teamIndex` is zero-based internally per data model, displayed
  1-based to players (no team is ever labeled "Team 0").
  - Within each section, a `<ul>` of players: `name` (as-is) + `assignedPosition` label
    (`Position.goalkeeper` etc., translated) shown as text next to the name, not conveyed by color
    alone.
  - The row where `player.id === currentPlayerId` gets a visible "You" badge
    (`Roster.youBadge`) in addition to the name — never *instead of* the name, and never relying on
    position/highlight color alone to convey "this is you."

### Wireframe (mobile — teams stack vertically; wider viewports may lay them out in a
responsive grid, wrapping as needed for N > 2)

```
┌─────────────────────────────┐
│ Game at Parque Central       │  (tab: Details & Attendance | Roster*)
├─────────────────────────────┤
│ Team 1                       │  <h2>
│  • Sam Ortiz — Goalkeeper    │
│  • Jordan Lee — Defender  You│
│  • Priya Nair — Midfielder   │
├─────────────────────────────┤
│ Team 2                       │  <h2>
│  • Alex Kim — Striker        │
│  • ...                       │
└─────────────────────────────┘
```

## Accessibility

- Each team is a `<section aria-labelledby="team-N-heading">` with its own `<h2>` (or `<h3>` if
  nested under the page's own `<h1>`/`<h2>` structure from the shared Game Detail shell) — screen
  reader users can jump team-to-team via heading navigation.
- Player list is a real `<ul>`; each `<li>` contains plain text (name + position), not interactive
  (no buttons/links here — this view has no per-player actions for a player viewer).
- "You" badge is text content within the `<li>` (e.g. a `<span>` reading "You"), not an
  image/icon-only marker, and not conveyed by background color alone.
- Tab order: this screen has no interactive elements besides the Details/Roster tab control
  (shared with Flow 2) and the retry button in the error state — nothing else to sequence.
- Empty/error states follow the same `role`/live-region conventions as `design-tokens.md`
  (`EmptyState` = static, `ErrorState` = `role="alert"`).
