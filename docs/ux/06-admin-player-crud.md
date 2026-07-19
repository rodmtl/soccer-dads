# Flow 6 — Admin: Create/Edit Players

Source: `docs/discovery.md` (v1 scope: create/edit players, rate players, set/change position),
`docs/data-model.md` Player entity. Assumes an authenticated Admin. See
`docs/ux/design-tokens.md` for shared primitives (`Button`, `ErrorState`, `LoadingSkeleton`,
`EmptyState`, `SearchableList`) and `docs/ux/03-player-position.md` for the reused `PositionPicker`
component.

## Entry points

- Admin nav → "Players" → **Admin Players List**.
- From that list: "Create player" button → **Player Form** (create mode).
- From a row: "Edit" action → **Player Form** (edit mode, pre-filled, including current `rating`).

## Admin Players List

### States

| State | Trigger | Renders |
|---|---|---|
| Loading | Fetch in flight | `LoadingSkeleton` |
| Error | Fetch failed | `ErrorState` + retry, `AdminPlayers.loadError` |
| Empty | Zero players exist | `EmptyState`: `AdminPlayers.noPlayersTitle` ("No players yet"), action `AdminPlayers.createFirstPlayer` ("Create your first player") |
| Populated | ≥1 player | Search box (reuses `SearchableList`'s filter-by-name behavior, but rendering a table row per match rather than a plain button, so it's specified as a filter over `players` feeding a table, not a literal reuse of the `SearchableList` component wholesale) + table: Name, Age, Positions, Rating, Edit action |

Sorted alphabetically by name by default (consistent with Flow 1's picker), since the list is
expected to grow to "a few dozen" (per discovery.md's scale assumption) and needs to stay scannable.

### Component spec: `AdminPlayersList`

Props:

```
players: Array<{
  id: string
  name: string
  age: number
  positions: Array<'goalkeeper' | 'defender' | 'midfielder' | 'striker'>
  rating: number
}> | null
isLoading: boolean
error: Error | null
searchQuery: string
onSearchChange(query: string): void
onCreatePlayer(): void
onEditPlayer(playerId: string): void
onRetry(): void
```

- `positions` column renders each as its translated label (`Position.goalkeeper`, etc.),
  comma-separated, or an em-dash placeholder `AdminPlayers.noPositionsSet` ("—") if empty (a
  player can have 0 positions set, e.g. right after creation before anyone's assigned one).
- Edit action per row: `aria-label="Edit {name}"` (same reasoning as Flow 5's game rows).

## Player Form (create/edit)

### Fields

| Field | Input type | Validation |
|---|---|---|
| Name | text | required |
| Age | `<input type="number">`, min 1 | required, positive integer |
| Positions | `PositionPicker` (reused from Flow 3) | max 2, same toggle interaction as Flow 3 |
| Rating | `<input type="number">`, min 0, max 100 | required, integer 0–100; default **60** on create |
| Phone | `<input type="tel">` | optional; no format enforced beyond browser default (international group, no fixed pattern mandated by Phase 0/1) |
| Email | `<input type="email">` | optional; native email format validation |
| Facebook profile | `<input type="url">` | optional; native URL format validation |

`name` is the one field whose *value* is later shown as unsstranslated free text elsewhere in the
app (Flow 1's picker, Flow 4's roster). The form's field *labels* (`AdminPlayers.nameLabel`, etc.)
are translation keys; the entered `name` value itself is not.

### Rating field — design decision

A native `<input type="number" min="0" max="100">` is specified rather than a custom slider,
because: it has correct built-in keyboard support (arrow keys increment/decrement, direct typing),
native validation semantics, and no extra custom-component a11y work for a single numeric value.
A slider is not introduced since nothing in Phase 0/1 requires a visual "at a glance" rating
widget beyond the players list already showing the numeric rating in its own column. **Flagged as
a design decision**, not a hard requirement — a slider could be layered on later without changing
the underlying data contract.

### Max-2-positions constraint

Identical interaction to Flow 3's `PositionPicker` (reused verbatim, same component): tapping a 3rd
position when 2 are already selected is rejected with the same
`Profile.maxPositionsMessage`-equivalent copy, but namespaced for this context:
`AdminPlayers.maxPositionsMessage` ("This player can have up to 2 positions.") — same component,
different copy prop, since the picker component takes its message text as a prop rather than
hardcoding it (see the component's prop list in `03-player-position.md`; this doc's addition:
`PositionPicker` needs a `maxReachedMessage: string` prop, not a hardcoded translation key, so both
Flow 3 and Flow 6 can supply their own namespaced copy — this is a correction/addition to the
`PositionPicker` prop list in `03-player-position.md`).

### States

| State | Trigger | Renders |
|---|---|---|
| Loading (edit) | Fetching existing player | `LoadingSkeleton` |
| Populated | Loaded (edit) or fresh (create, rating pre-filled to 60) | Full form |
| Validation error | Required field missing/invalid on submit | Inline per-field error, focus moves to first invalid field |
| Server/network error | Save request failed | Form-level `role="alert"` banner `AdminPlayers.saveError` ("Couldn't save this player."), form stays filled |
| Saving | Submit in flight | Submit button shows loading state, disabled, fields remain visible but non-editable during submit |
| Success | Save succeeded | Navigates back to Players List (or stays on edit view with a transient confirmation — implementation's call), list reflects the change |

There is no duplicate-name conflict handling: `Player.name` has no uniqueness constraint in
`docs/data-model.md`, so two players can share a name — this is intentionally not treated as an
error.

### Component spec: `PlayerForm`

Props:

```
mode: 'create' | 'edit'
initialValues?: {
  name: string; age: number
  positions: Array<'goalkeeper' | 'defender' | 'midfielder' | 'striker'>
  rating: number
  phone?: string; email?: string; facebookProfile?: string
}
isSubmitting: boolean
submitError:
  | { type: 'validation'; fields: Record<string, string> }
  | { type: 'server'; message: string }
  | null
onSubmit(values: {
  name: string; age: number
  positions: Array<'goalkeeper' | 'defender' | 'midfielder' | 'striker'>
  rating: number
  phone?: string; email?: string; facebookProfile?: string
}): void
```

## Out of scope for this flow (flagging, not designing)

- **Deleting/deactivating a player** is not mentioned anywhere in `docs/discovery.md`'s v1 scope
  and isn't designed here. If needed later, it would need its own confirmation-dialog spec (similar
  pattern to Flow 7's regenerate confirm) plus a decision on what happens to that player's
  historical `Attendance`/`TeamAssignment`/`Payment` rows — flagged as an open question for the
  user, not assumed.

## Accessibility

- Same conventions as Flow 5's Game Form: real `<form>`, visible `<label>` per field, focus order
  top-to-bottom (Name → Age → Positions → Rating → Phone → Email → Facebook → Save), first-invalid-
  field focus on validation failure, `role="alert"` for server errors.
- `PositionPicker` accessibility requirements are identical to Flow 3's (see that doc) — this is
  the same component instance type, just with admin-facing copy props.
- Optional fields (Phone/Email/Facebook) are visually and programmatically marked optional (e.g.
  label text "Phone (optional)" via a translation key that already includes the qualifier, rather
  than relying on the absence of a red asterisk alone to communicate optionality) so screen reader
  users don't have to infer required-ness from `aria-required`'s absence.
