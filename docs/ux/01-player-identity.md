# Flow 1 — Player: Pick Your Identity

Source: `docs/discovery.md` assumption 1 (resolved: no login, pick-your-name), `docs/data-model.md`
Player entity. See `docs/ux/design-tokens.md` for shared primitives (`SearchableList`,
`EmptyState`, `ErrorState`, `LoadingSkeleton`) referenced below.

## Why this flow exists

There is no player login. Every player-facing action (confirm/decline attendance, set position,
view roster) is performed "as" a specific `Player` row, so the app needs to know *which* player is
currently using the device before any of those actions are available. This screen is that
one-time (per device) resolution step — deliberately **not** a login form: no password, no email
verification, just "which of these names are you."

## Persistence: "current player" across visits

- On selecting a player, store `Player.id` in `localStorage` under a single key, e.g.
  `garageleague.currentPlayerId`.
- On every load of a player-facing route, the app reads this key:
  - **Missing** (first visit, or cleared) → show the identity picker (this flow) before rendering
    the requested page.
  - **Present but stale** (id no longer exists — admin deleted/never had that player, or
    `localStorage` was tampered with) → treat as missing: show the picker again. The app does not
    error here; it just re-resolves.
  - **Present and valid** → skip this flow entirely; render the requested destination immediately.
- **Switching identity**: every player-facing screen has a persistent, low-emphasis control ("Not
  you?" / switch-player link, translation key `PlayerIdentity.switchPlayer`) in the app chrome
  (header or footer). Activating it clears the stored id and returns to this picker.
- **Deep-link preservation**: if the picker is shown because a player followed a WhatsApp link
  straight to a specific game (Flow 2's entry point (b)), the originally requested destination is
  preserved (e.g. as a return-to path) and the app navigates there immediately after identity is
  chosen — the player never has to re-find that game manually. This applies equally when the
  picker is triggered via the "switch player" control from within a game screen.

## User flow

1. Player opens the app (fresh visit, cleared storage, or after tapping "switch player").
2. If no destination was already implied (plain app open), default destination after picking is
   the Games list (Flow 2). If a destination was implied (deep link, switch-player from a specific
   screen), that destination is used instead.
3. Picker loads the list of all players (name only — no other `Player` fields are shown or needed
   here).
4. Player optionally types into the search box to narrow the list by name.
5. Player taps/activates their name.
6. Identity is persisted (step above) and the app navigates to the resolved destination.

There is no "cancel" — this screen is a hard gate; a player cannot use the player-facing app
without completing it. There is no explicit "sign out" beyond "switch player," since there was
never an authenticated session to end.

## States

| State | Trigger | What renders |
|---|---|---|
| Loading | Player list fetch in flight | `LoadingSkeleton` (rows≈6), `Common.loading` label |
| Error | Player list fetch failed | `ErrorState` with `PlayerIdentity.loadError` message and a retry button re-triggering the fetch |
| Empty (no players exist) | Fetch succeeded, zero players | `EmptyState`: title `PlayerIdentity.noPlayersTitle` ("No players yet"), description `PlayerIdentity.noPlayersDescription` ("Ask your league organizer to add players before you can join a game."). No action button — players cannot create player records themselves (admin-only, per scope) |
| Populated | Fetch succeeded, ≥1 player | Search input + alphabetically-sorted (localeaware, by `name`) list of player-name buttons via `SearchableList` |
| No search matches | Populated, but search term matches 0 players | `SearchableList`'s built-in no-results message, `PlayerIdentity.noSearchMatches` ("No players match '{query}'") — distinct from the Empty state above |

## Component spec: `PlayerIdentityPicker`

Props:

```
players: Array<{ id: string; name: string }> | null   // null while loading
isLoading: boolean
error: Error | null
onSelectPlayer(playerId: string): void
onRetry(): void
```

Behavior per prop combination:

- `isLoading === true` → render `LoadingSkeleton`, ignore `players`/`error`.
- `error !== null` (and not loading) → render `ErrorState` with `onRetry` wired to the `onRetry`
  prop.
- `players !== null && players.length === 0` → render `EmptyState` (no-players variant above).
- `players !== null && players.length > 0` → render:
  - A page heading (`h1`), translation key `PlayerIdentity.title` ("Who are you?").
  - `SearchableList` with `items = players.map(p => ({ id: p.id, label: p.name }))`,
    `searchLabel = PlayerIdentity.searchLabel` ("Search your name"),
    `noResultsMessage = PlayerIdentity.noSearchMatches`, `onSelect = onSelectPlayer`.
- Note: `players[].name` is admin-entered free text (per data model) and is rendered **as-is**, not
  through `next-intl` — it is not a translation key. Everything else on this screen (heading,
  search label, empty/error copy) *is* a translation key.

## Accessibility

- Page has one `<h1>` (`PlayerIdentity.title`).
- Search input has a visible `<label>` (`PlayerIdentity.searchLabel`), associated via `htmlFor`.
- Player list items are real `<button>` elements inside `<li>`, each with accessible name equal to
  the player's name (no truncation — long names wrap, per design-tokens.md typography section).
- Focus order: search input → each visible list button in list order (`Tab`); typing in the search
  input does not steal focus away from the input itself.
- On selecting a player, focus moves to the main heading of the destination screen (standard route
  transition focus management — avoids focus landing on `<body>`).
- Retry button (error state) and empty-state text have accessible names via visible text (no
  icon-only controls).
- `EmptyState` and `SearchableList`'s no-results message are static content, not `role="alert"` —
  neither represents an unexpected failure.

## Open question to confirm before implementation

- Sort order for the picker list assumes plain alphabetical by `name`. If the group is small and
  informal, a "most recently used on this device" ordering might reduce friction further — not
  designed here since it adds a second persisted value (recent-players history) with no
  requirement calling for it; flagged as a possible v1.1 tweak, not a blocker.
