# Flow 2 — Player: Confirm/Decline Attendance

Source: `docs/discovery.md` (v1 scope), `docs/data-model.md` Game/Attendance entities. Depends on
Flow 1 (`docs/ux/01-player-identity.md`) having already resolved a current player. See
`docs/ux/design-tokens.md` for shared primitives (`ToggleButton`, `EmptyState`, `ErrorState`,
`LoadingSkeleton`).

## Entry points

1. **Games list** — the default landing destination after Flow 1, and a persistent nav item
   ("Games"). Shows upcoming games; a player taps one to open its detail.
2. **WhatsApp shared link** — an admin shares a `wa.me` link/text for a specific game
   (`Game.share_text`, per data model). Tapping it opens this app directly at that game's detail
   page (`/{locale}/games/{gameId}` or similar — exact routing is Phase 3's call). If no current
   player is resolved yet, Flow 1's identity gate intercepts first, then returns here automatically
   (see Flow 1's "deep-link preservation").

## Games List

### User flow

1. Player lands here (post-identity-pick, or via nav).
2. Two tabs: **Upcoming** (default) and **Past**. Upcoming = games with date ≥ today, ascending by
   date. Past = date < today, descending (most recent first).
3. Each row shows the game's date, time, location name, and the *current player's own* attendance
   status for that game as a status pill (Confirmed / Declined / No response).
4. Tapping a row opens Game Detail (below) for that game.

### States

| State | Trigger | Renders |
|---|---|---|
| Loading | Games fetch in flight | `LoadingSkeleton` |
| Error | Fetch failed | `ErrorState` + retry (`Games.loadError`) |
| Empty — Upcoming tab | No games with date ≥ today | `EmptyState`: `Games.noUpcomingTitle` ("No upcoming games"), `Games.noUpcomingDescription` ("Check back once your organizer schedules one.") |
| Empty — Past tab | No games with date < today | `EmptyState`: `Games.noPastTitle` ("No past games yet") |
| Populated | ≥1 game in the active tab | List of game rows, sorted per tab as above |

### Component spec: `GamesList`

Props:

```
activeTab: 'upcoming' | 'past'
onTabChange(tab: 'upcoming' | 'past'): void
games: Array<{
  id: string
  date: string          // ISO date, admin-entered
  time: string           // admin-entered
  locationName: string   // admin-entered free text, rendered as-is
  myAttendanceStatus: 'confirmed' | 'declined' | 'no_response'
}> | null                // null while loading
isLoading: boolean
error: Error | null
onSelectGame(gameId: string): void
onRetry(): void
```

- Tabs render as a two-item tab list: `<div role="tablist">` with two `<button role="tab"
  aria-selected>` controlling one `<div role="tabpanel">` — standard tabs pattern, since the two
  views are mutually exclusive views of one conceptual list, not independent navigation
  destinations.
- Status pill text (not color alone) per status: `Attendance.statusConfirmed` ("Confirmed"),
  `Attendance.statusDeclined` ("Declined"), `Attendance.statusNoResponse` ("No response yet").
  Color: green/red/gray per design-tokens.md semantic colors, paired with the text.
- Date/time are formatted via `next-intl` locale-aware formatting (not translation keys themselves
  — they're derived from stored `date`/`time` values, formatted per locale).
- `locationName` is admin-entered free text — rendered as-is, no translation key.

### Accessibility (Games List)

- One `<h1>` for the page (`Games.title`, "Games").
- Tabs: keyboard — `Tab` moves focus to the tab list once (focus lands on the active tab);
  `ArrowLeft`/`ArrowRight` moves between the two tabs and activates the newly focused tab
  (standard ARIA tabs keyboard pattern); `Tab` from the tab list moves into the panel content.
- Each game row is a single `<button>` (or `<a>` if routed) whose accessible name includes date,
  location, and current status, e.g. "Game on {date} at {locationName}, {status}" — not just a
  bare location name, so screen reader users get status without hunting for the pill separately.

## Game Detail — Attendance

### User flow

1. Player arrives at a specific game's detail (from Games List or a deep link).
2. Sees the game's date, time, `locationName`, `address` (all admin-entered where noted, rendered
   as-is).
3. Two tabs within this page: **Details & Attendance** (default) and **Roster** (Flow 4 — enabled
   even if no roster exists yet, showing Flow 4's empty state; not conditionally hidden, so the
   player always has a consistent way to check).
4. On the Attendance tab: two `ToggleButton`s, "I'm in" (confirm) and "Can't make it" (decline),
   reflecting the player's current status. Exactly one is pressed if status is `confirmed` or
   `declined`; neither is pressed if `no_response`.
5. Tapping the un-pressed one of the two sets that status (optimistic update, see below).
6. Tapping the **currently pressed** button again reverts status to `no_response` (undo) — see
   "Design decision" below.

### Design decision: undo-to-no-response

The data model's `no_response` is the default state; nothing in Phase 0/1 mandates whether a player
can revert *back* to `no_response` after confirming/declining. This spec allows it (tapping the
active toggle again clears it) because it costs nothing extra to build (same two buttons, no new
UI) and avoids a dead-end where a player who mis-tapped "Can't make it" has no way back to a neutral
state without an admin's help. **Flagging this as an assumption to confirm before implementation**,
not a resolved Phase 0/1 decision.

### Save behavior (optimistic)

- On tap: immediately reflect the new pressed state, disable both toggle buttons, show a small
  inline "Saving…" indicator (not a full-page block — the rest of the page stays interactive).
- On success: re-enable buttons, show a transient confirmation via `aria-live="polite"` region,
  `Attendance.saved` ("Saved").
- On failure: revert the toggle state to the last known-good value, re-enable buttons, show an
  inline error (`role="alert"`) `Attendance.saveError` ("Couldn't save your response.") with a
  retry action that re-attempts the same status change.

### States

| State | Trigger | Renders |
|---|---|---|
| Loading | Game fetch in flight | `LoadingSkeleton` for the whole detail page |
| Error (page load) | Game fetch failed (e.g. bad/deleted game id from a stale link) | `ErrorState`, `Attendance.gameNotFoundOrLoadError`, retry button; if the id genuinely doesn't exist (404), message instead reads `Games.gameNotFound` ("This game couldn't be found.") with a link back to Games List instead of a retry |
| Populated, no_response | Loaded, player hasn't responded | Both toggles unpressed |
| Populated, confirmed | Loaded, status = confirmed | "I'm in" pressed |
| Populated, declined | Loaded, status = declined | "Can't make it" pressed |
| Saving | Toggle tapped, request in flight | Both toggles disabled, "Saving…" indicator |
| Save error | Request failed | Reverted toggle state + inline `role="alert"` + retry |

### Component spec: `AttendanceCard`

Props:

```
game: { id: string; date: string; time: string; locationName: string; address: string }
attendanceStatus: 'confirmed' | 'declined' | 'no_response'
isSaving: boolean
error: Error | null
onConfirm(): void
onDecline(): void
onRetry(): void
```

- Renders `game.locationName` and `game.address` as-is (admin free text, no translation key);
  date/time via locale-aware formatting.
- Two `ToggleButton`s: "I'm in" (`Attendance.confirmButton`, `pressed = attendanceStatus ===
  'confirmed'`, `onToggle = onConfirm`) and "Can't make it" (`Attendance.declineButton`,
  `pressed = attendanceStatus === 'declined'`, `onToggle = onDecline`); both `disabled` while
  `isSaving`.
- Inline saving indicator: `aria-live="polite"` region showing `Common.saving` while `isSaving`,
  then `Attendance.saved` briefly on success (implementation detail: clears after a few seconds or
  on next interaction).
- Error: `role="alert"` region with `Attendance.saveError` + a `Button` (`Common.retry`) wired to
  `onRetry`.

### Accessibility (Attendance)

- Page `<h1>` uses `locationName` interpolated into a translation string, e.g.
  `Attendance.pageTitle` = "Game at {locationName}" (the surrounding phrase is a translation key;
  `locationName` itself is not translated).
- Details/Attendance vs. Roster tabs: same ARIA tabs pattern as Games List (role="tablist" etc.).
- Toggle buttons: `aria-pressed`, real `<button>`, `Tab` order is "I'm in" then "Can't make it"
  (matches visual left-to-right / top-to-bottom order); `Enter`/`Space` activate.
- The saving/success/error live regions are the *only* `aria-live`/`role="alert"` usage on this
  screen — no redundant announcements.
- Focus stays on the toggle button that was pressed through the save cycle (does not jump away),
  so a screen reader user tracks the state change on the control they just used.
