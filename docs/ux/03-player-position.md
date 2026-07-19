# Flow 3 — Player: Set Preferred Pitch Position(s)

Source: `docs/discovery.md` (v1 scope: "Player: set a preferred pitch position (up to 2...)"),
`docs/data-model.md` Player entity (`positions: string[]`, max 2, values `goalkeeper` / `defender`
/ `midfielder` / `striker`). This lives on the player's own profile (not per-game) — a game never
asks a player to re-pick a position; `Player.positions` is the single, persistent source of truth
that the roster algorithm (`docs/roster-algorithm.md`) reads from. Depends on Flow 1 having
resolved a current player. See `docs/ux/design-tokens.md` for shared primitives (`ToggleButton`,
`LoadingSkeleton`, `ErrorState`).

## Where this lives

A "My Profile" screen, reached via the persistent player nav (Flow 1's layout conventions). This
screen shows the player's own record:

- `name` — read-only (admin-entered, admin-edited only; not editable here).
- `age` — read-only (same reason).
- `rating` — **not shown here.** Deferred per `docs/adr/0002-player-rating-privacy-deferred.md`:
  v1 has no real player authentication, so a rating-fetching action can't verify the caller
  actually is the player whose rating it's returning — anyone could request anyone's rating by
  supplying a different id. Withheld from every player-facing screen (own profile included) until
  a real identity mechanism exists. Admin still edits it — see `docs/ux/06-admin-player-crud.md`.
- `positions` — the only field this screen lets the player edit, via the position picker below.

## User flow

1. Player opens "My Profile" from nav.
2. Sees name/age (read-only) and their current position selection (0, 1, or 2 of the four
   options selected).
3. Taps a position to toggle it.
4. Change saves automatically (no separate "Save" button — see design decision below);
   confirmation surfaces inline.
5. Player leaves the screen whenever satisfied; there's no separate exit step.

## Design decision: auto-save per toggle, not an explicit Save button

Consistent with Flow 2's attendance toggles (optimistic, immediate save), this screen auto-saves
each toggle rather than batching changes behind a "Save" button. Rationale: it's the same
interaction shape already used elsewhere in the app (consistency), and there's no multi-field form
here where batching would reduce round-trips — it's a single 4-way toggle group. **Flagging as a
design decision to confirm**, not dictated by Phase 0/1.

## Position picker interaction

Four toggle buttons: Goalkeeper, Defender, Midfielder, Striker (order fixed, matches this list,
translation keys `Position.goalkeeper`/`Position.defender`/`Position.midfielder`/`Position.striker`
— reused everywhere a position is displayed/selected across the app, including Flow 4, 6, 7).

- Tapping an **unselected** button when fewer than 2 are currently selected → selects it.
- Tapping a **selected** button → always deselects it (regardless of count).
- Tapping an **unselected** button when 2 are already selected → **rejected**: selection doesn't
  change, and an inline validation message appears: `Profile.maxPositionsMessage` ("You can choose
  up to 2 positions."). This message is transient/contextual (appears on the rejected attempt,
  tied to an `aria-live="polite"` region so it's announced) — it is not a permanently-shown error,
  since selecting exactly 0, 1, or 2 are all valid resting states.
- A persistent helper text below the four buttons at all times (not just on rejection):
  `Profile.positionsSelectedCount` ("{count} of 2 selected").

## States

| State | Trigger | Renders |
|---|---|---|
| Loading | Fetching current player's record | `LoadingSkeleton` |
| Error (load) | Fetch failed | `ErrorState` + retry |
| Populated | Loaded | Read-only name/age block + `PositionPicker` reflecting current `positions` |
| Saving | A toggle was just tapped, request in flight | The toggled button shows a brief "saving" affordance (e.g. subtle spinner adjacent, not replacing its label); other three buttons remain interactive (each toggle is independent) unless a save is already in flight for a *different* button, in which case all four are briefly disabled to avoid racing updates |
| Save error | Toggle request failed | That toggle reverts to its prior state, inline `role="alert"` `Profile.saveError` ("Couldn't update your positions.") with retry re-attempting the same toggle |
| Max-reached rejection | Player taps a 3rd position while 2 already selected | No state change; `Profile.maxPositionsMessage` announced via polite live region |

## Component spec: `PositionPicker`

Reused verbatim (same component, different container/copy context) by Flow 6 (admin editing a
player's positions on their behalf) and displayed read-only style in Flow 4/7 (showing a player's
assigned position — those contexts use plain text, not this interactive component; only Flows 3
and 6 render it as editable).

Props:

```
selectedPositions: Array<'goalkeeper' | 'defender' | 'midfielder' | 'striker'>
maxSelected: number          // always 2 for v1, kept as a prop rather than a hardcoded constant
maxReachedMessage: string    // translation key text, supplied by the caller (e.g. Profile.maxPositionsMessage
                              // here, AdminPlayers.maxPositionsMessage in Flow 6) so this shared
                              // component isn't hardcoded to one namespace/copy across its two callers
isSaving: boolean
disabledPositions?: Array<'goalkeeper' | 'defender' | 'midfielder' | 'striker'>  // none in v1; reserved for future permission-gated variants
error: Error | null
onToggle(position: 'goalkeeper' | 'defender' | 'midfielder' | 'striker'): void
```

Behavior:

- Renders 4 `ToggleButton`s in a fixed order (goalkeeper, defender, midfielder, striker), laid out
  as a 2×2 grid on narrow viewports, single row on wider ones.
- `pressed` per button = `selectedPositions.includes(position)`.
- On tap of an unpressed button when `selectedPositions.length >= maxSelected`: does **not** call
  `onToggle` — instead surfaces `maxReachedMessage` locally (component-level display state, not a
  prop the parent needs to manage beyond supplying the message text, since the rejection itself is
  a pure UI-level decision with no server round-trip).
- On tap of a pressed button, or an unpressed button under the max: calls `onToggle(position)`
  unconditionally — the parent owns the actual save.
- Helper text `Profile.positionsSelectedCount` always rendered below the grid.
- `error` prop, if set, renders inline (`role="alert"`) below the grid with retry left to the
  parent (parent re-supplies the same `onToggle` call — this component doesn't track "last
  attempted toggle" itself since the parent already knows what it just tried to save).

### Wireframe (mobile)

```
┌─────────────────────────────┐
│ My Profile                  │  <h1>
├─────────────────────────────┤
│ Jordan Lee            (read-only, admin-entered)
│ Age 34                 (rating not shown — see ADR 0002)
├─────────────────────────────┤
│ Preferred positions          Profile.positionsLabel
│  [ Goalkeeper ]  [✓Defender]
│  [ Midfielder ]  [ Striker ]
│  2 of 2 selected             Profile.positionsSelectedCount
└─────────────────────────────┘
```

## Accessibility

- Page `<h1>` = `Profile.title` ("My Profile").
- Read-only fields (`name`, `age`) rendered as plain text with a visually-associated
  label (`Profile.ageLabel`) — not editable inputs, so no form semantics
  needed there, just `<dt>/<dd>` or labeled paragraphs.
- Each position `ToggleButton`'s accessible name is the position label itself (`Position.goalkeeper`
  etc.) — the pressed/unpressed state is exposed via `aria-pressed`, not baked into the name text
  (avoid "Goalkeeper (selected)" duplicating what `aria-pressed` already conveys to assistive
  tech, though the *visual* label may still show a checkmark glyph per design-tokens.md's
  "never color alone" rule — that's a visual affordance, not the accessible name).
- Max-reached message and per-toggle error message are both `aria-live="polite"` (validation
  feedback, not a page-breaking failure) — except the save-failure banner, which is `role="alert"`
  since it represents an actual failed request, consistent with Flow 2's convention.
- Focus order: name/age (non-interactive, not in tab order) → Goalkeeper → Defender →
  Midfielder → Striker, matching the 2×2 grid's reading order (left-to-right, top-to-bottom).
- Keyboard: `Tab` between the four toggle buttons; `Enter`/`Space` toggles the focused one.
