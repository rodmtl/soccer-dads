# Flow 8 — Admin: Mark Payment Status Per Player Per Game

Source: `docs/discovery.md` (v1 scope: mark, per player per game, whether payment was made),
`docs/data-model.md` Payment entity (`unique(game_id, player_id)`, `paid: boolean` default false;
"a game with no Payment rows is treated as free"). Assumes an authenticated Admin. See
`docs/ux/design-tokens.md` for shared primitives (`ToggleButton`, `ErrorState`, `LoadingSkeleton`,
`EmptyState`).

## Entry point

The "Payments" tab within a specific game's admin detail view (sibling to Flow 5's game fields and
Flow 7's Roster tab).

## Scope of this screen

Per `docs/data-model.md`, payment only makes sense for players actually attending. This screen
lists players with `Attendance.status = confirmed` for this game — not every player in the system,
and not declined/no-response players. If a `Payment` row doesn't yet exist for a given confirmed
player, they're treated as unpaid (`paid = false`, matching the schema default) until the admin
marks otherwise; no row needs to be pre-created for every player up front.

## User flow

1. Admin opens a game's Payments tab.
2. Sees a summary count (e.g. "3 of 8 paid") and a list of confirmed players, each with a
   paid/unpaid toggle.
3. Taps a player's toggle to flip their status; saves immediately (optimistic, same pattern as
   Flows 2/3/7).
4. No "mark all paid" bulk action is specified for v1 (not requested; flagged as a possible future
   addition, not built now to avoid scope creep beyond what Phase 0/1 asked for).

## States

| State | Trigger | Renders |
|---|---|---|
| Loading | Fetching confirmed players + payment status | `LoadingSkeleton` |
| Error | Fetch failed | `ErrorState` + retry, `AdminPayments.loadError` |
| Empty | Zero players with `status = confirmed` for this game | `EmptyState`: `AdminPayments.noConfirmedTitle` ("No confirmed players yet"), description `AdminPayments.noConfirmedDescription` ("Payment tracking appears here once players confirm attendance.") |
| Populated | ≥1 confirmed player | Summary count + list of player rows, each with a paid/unpaid toggle reflecting current state |
| Row saving | A toggle was just tapped, request in flight | That row's toggle disabled, shows a brief inline "saving" affordance; other rows remain interactive |
| Row save error | Toggle request failed | That row's toggle reverts to prior value, inline `role="alert"` scoped to the row, `AdminPayments.rowSaveError` ("Couldn't update payment status.") + retry |

## Component spec: `PaymentTracker`

Props:

```
game: { id: string }
players: Array<{
  id: string
  name: string          // admin-entered, as-is
  paid: boolean
  isSaving?: boolean
  error?: Error | null
}> | null                // null while loading
isLoading: boolean
loadError: Error | null
onTogglePaid(playerId: string): void
onRetryRow(playerId: string): void
onRetryLoad(): void
```

- Summary line above the list: `AdminPayments.summary` ("{paidCount} of {totalCount} paid"),
  computed from `players` (not a separate prop — derived in the component or by the caller,
  either is fine, but it must always reflect the current list, including mid-flight optimistic
  state).
- Each row: player name (as-is) + a `ToggleButton` (reused from design-tokens.md) with `pressed =
  paid`, accessible name `aria-label="{name} paid"` (needed because "Paid" alone repeated per row
  is ambiguous — same reasoning as Flow 7's per-row selects), `onToggle = () =>
  onTogglePaid(player.id)`, `disabled = isSaving`.
- Visual paid/unpaid distinction follows design-tokens.md's semantic color rule (green = paid, gray
  = unpaid) paired with text/icon, never color alone — the toggle button's own label text changes
  state (e.g. "Paid" vs. "Unpaid", not just a color swap) per the shared `ToggleButton` spec's
  "never color alone" requirement.

### Wireframe (mobile)

```
┌─────────────────────────────┐
│ Payments — Game at Parque    │
│ Central                      │
│ 3 of 8 paid                  │  AdminPayments.summary
├─────────────────────────────┤
│ Sam Ortiz          [ Unpaid ]│
│ Jordan Lee         [✓ Paid  ]│
│ Priya Nair         [✓ Paid  ]│
│ Alex Kim           [ Unpaid ]│
│ ...                          │
└─────────────────────────────┘
```

## Accessibility

- Summary count is plain text, not a live region (it's not an async event notification by itself —
  it updates as a direct consequence of a toggle the admin just activated, and that toggle's own
  state change is the primary thing announced; re-announcing the recomputed summary on every toggle
  would be redundant noise per design-tokens.md's live-region guidance).
- Each row's toggle: `aria-pressed` state change is what a screen reader announces on toggle,
  consistent with the shared `ToggleButton` component; no extra `aria-live` region needed for the
  toggle itself.
- Row-save error: `aria-describedby` linking the toggle to its inline `role="alert"` message,
  scoped per row (same reasoning as Flow 7).
- Focus order: page heading → summary text (not focusable) → player rows in list order, one toggle
  per row.
- List rendered as `<ul>`/`<li>` (or a table with Name/Status columns) — either is acceptable as
  long as each row's name and toggle are programmatically associated (e.g. both within the same
  `<li>`), not visually adjacent but structurally disconnected.
