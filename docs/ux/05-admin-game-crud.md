# Flow 5 — Admin: Create/Edit a Game

Source: `docs/discovery.md` (v1 scope: create games, one per date+location, address+time,
WhatsApp-shareable), `docs/data-model.md` Game entity (unique `(date, location_name)`,
`number_of_teams`, derived `share_text`). Assumes an authenticated Admin (see
`docs/ux/design-tokens.md`'s layout conventions note — login screen itself isn't specified here).
See `docs/ux/design-tokens.md` for shared primitives (`Button`, `ErrorState`, `LoadingSkeleton`,
`EmptyState`).

## Entry points

- Admin nav → "Games" → **Admin Games List** (all games, not filtered to upcoming — admin needs to
  see/edit past games too, e.g. to fix a typo or check history).
- From that list: "Create game" button → **Game Form** (create mode).
- From a row in that list: "Edit" action → **Game Form** (edit mode, pre-filled).

## Admin Games List

### States

| State | Trigger | Renders |
|---|---|---|
| Loading | Fetch in flight | `LoadingSkeleton` |
| Error | Fetch failed | `ErrorState` + retry, `AdminGames.loadError` |
| Empty | Zero games exist | `EmptyState`: `AdminGames.noGamesTitle` ("No games yet"), action button `AdminGames.createFirstGame` ("Create your first game") wired to open the form |
| Populated | ≥1 game | Table/list: Date, Time, Location, # Teams, Roster status (`AdminGames.rosterGenerated` / `AdminGames.rosterNotGenerated`), Edit action per row |

Sorted descending by date (most recently created/most relevant first) — admin's own call, not
constrained by Phase 0/1; flagged as a reasonable default, not a hard requirement.

### Component spec: `AdminGamesList`

Props:

```
games: Array<{
  id: string
  date: string
  time: string
  locationName: string
  numberOfTeams: number
  hasRoster: boolean
}> | null
isLoading: boolean
error: Error | null
onCreateGame(): void
onEditGame(gameId: string): void
onRetry(): void
```

- Each row's Edit control has an accessible name that includes identifying info, e.g.
  `aria-label="Edit game at {locationName} on {date}"` — a bare repeated "Edit" per row fails the
  "every interactive element has an accessible name" requirement in practice (ambiguous among
  many rows).

## Game Form (create/edit)

### Fields

| Field | Input type | Validation |
|---|---|---|
| Date | `<input type="date">` | required |
| Time | `<input type="time">` | required |
| Location name | text | required |
| Address | text (or textarea if addresses run long) | required |
| Number of teams | `<input type="number">`, min 1 | required, integer ≥ 1 (per `docs/roster-algorithm.md`'s `N ≥ 1`); default value on **create** is `2` (data model's stated default) |

All four of date/time/location/address/number-of-teams are **admin-entered free text or plain
values** — not translation keys themselves. Field *labels*, helper text, and validation messages
around them are translation keys (`AdminGames.dateLabel`, `AdminGames.numberOfTeamsHelp`, etc.).

### User flow — create

1. Admin taps "Create game," lands on the empty form (number_of_teams pre-filled to 2).
2. Fills in date, time, location, address; adjusts team count if needed.
3. Submits.
4. On success: navigates to the game's edit view (or a confirmation screen), which now shows the
   **WhatsApp share section** (below) — the share text can't exist until the game (and its
   derived `share_text`) exists server-side.
5. On duplicate-conflict error (below): stays on the form, sees the conflict message, can edit
   date/location and resubmit.

### User flow — edit

1. Admin opens an existing game from the list; form pre-fills all fields.
2. Edits any field, submits.
3. If `number_of_teams` is changed **and** a roster already exists for this game (`hasRoster ===
   true`), show a non-blocking warning banner *before* submission is even attempted (as soon as the
   field value differs from its original and a roster exists):
   `AdminGames.teamCountChangeWarning` ("Changing the number of teams means the existing roster
   will need to be regenerated.") — informative only; does not block save. Actual regeneration
   happens in Flow 7, not here.
4. Submits; same success/conflict/error handling as create.

### Duplicate `(date, location_name)` conflict — error UX

- On submit, if the server reports a conflict (existing game with the same date + location, and
  this isn't that same game being edited):
  - Render a **form-level** banner (`role="alert"`) above the fields: `AdminGames.duplicateError`
    ("A game already exists on {date} at {locationName}.") with `date`/`locationName` interpolated
    from the submitted values (echoing back what the admin typed, not translated).
  - Additionally mark both the Date and Location fields `aria-invalid="true"` and
    `aria-describedby` pointing to that same banner's id — the conflict is a compound-field issue,
    not attributable to one field alone, so both fields point at one shared message rather than
    duplicating it twice.
  - If the server can identify the conflicting game's id, include a `AdminGames.viewExistingGame`
    ("View existing game") link/button navigating to that game's edit view — optional enhancement,
    not required if the backend doesn't surface the id.
  - Form remains editable; nothing is cleared. Admin can change date or location and resubmit.

### Other error states

- **Field validation** (required field empty, `number_of_teams < 1` or non-integer): inline
  per-field error text (`aria-describedby`, `aria-invalid`) on submit attempt (not on every
  keystroke) — e.g. `AdminGames.dateRequired`, `AdminGames.numberOfTeamsMin`.
- **Server/network error** (non-conflict failure): form-level `role="alert"` banner
  `AdminGames.saveError` ("Couldn't save this game."), form stays filled, submit button re-enabled
  for retry.
- **Loading** (edit mode only, fetching the existing game before the form can render): full-form
  `LoadingSkeleton`.

### Component spec: `GameForm`

Props:

```
mode: 'create' | 'edit'
initialValues?: {
  date: string; time: string; locationName: string; address: string; numberOfTeams: number
}
hasExistingRoster?: boolean       // edit mode only; drives the team-count-change warning
isSubmitting: boolean
submitError:
  | { type: 'validation'; fields: Record<string, string> }   // fieldName -> message key
  | { type: 'conflict'; message: string; conflictingGameId?: string }
  | { type: 'server'; message: string }
  | null
onSubmit(values: { date: string; time: string; locationName: string; address: string; numberOfTeams: number }): void
```

## WhatsApp share section

Shown on the Game Form once a game exists (post-create success, and always in edit mode). Not part
of the form fields — `share_text` is server-derived, read-only here.

Props (as a distinct component, `GameShareSection`):

```
shareText: string      // derived, contains admin-entered location/address as-is plus app-authored framing copy
shareUrl: string        // e.g. https://wa.me/?text=<encoded shareText>
onCopy(): void
```

- Read-only `<textarea readonly>` (or equivalent) displaying `shareText`, with a visible label
  `AdminGames.shareTextLabel` ("Share message").
- "Copy text" `Button` (`AdminGames.copyButton`) → calls `onCopy` (clipboard write happens in the
  parent/implementation; success surfaces a transient `aria-live="polite"` confirmation
  `AdminGames.copied` ("Copied")).
- "Open WhatsApp" — a plain `<a href={shareUrl}>` styled as a button (`AdminGames.openWhatsApp`),
  opens in a new tab (`target="_blank" rel="noopener noreferrer"`).
- Note: the *framing* portion of `shareText` (e.g. "Game at {location}, {date} {time} —
  {address}. Reply to confirm!") is composed server-side from a translation-keyed template plus
  interpolated raw values (`location_name`, `address`) — meaning the template wording is
  locale-aware (an admin viewing in French sees French framing text) while the interpolated
  location/address stay as-is regardless of locale. This is called out explicitly because it's the
  one place raw and translated content are concatenated into a single string.

## Accessibility

- Form uses a real `<form>` with a submit `Button` (`AdminGames.saveButton`, "Save game"); `Enter`
  in any single-line text field submits the form (native behavior).
- Every field has a visible `<label>` associated via `htmlFor`/`id`.
- Focus order matches visual top-to-bottom field order: Date → Time → Location → Address → Number
  of teams → Save button.
- On validation failure, focus moves to the first invalid field (standard "jump to first error"
  pattern) so keyboard/screen-reader users don't have to hunt for what failed.
- Duplicate-conflict banner: `role="alert"`, and since it appears after an async submit (not on
  page load), it's announced immediately — placed in the DOM so tab order reaches it right after
  the form's start, not buried at the page bottom.
- Admin Games List: table (if implemented as an HTML `<table>`) uses proper `<th scope="col">`
  headers; if implemented as a list of cards instead, each card's structure still exposes the same
  labeled data (date/time/location/team count/roster status) as text, not as unlabeled visual
  columns.
