# UX Specs — Soccer Dads (Phase 2)

Phase 2 output of the workflow in the repo's `CLAUDE.md`: flows, states, component contracts, and
accessibility requirements for every v1 feature, ready for `ts-react-tdd-coder` to implement
test-first (Phase 3). Grounded in Phase 0/1 outputs — `docs/discovery.md`, `docs/data-model.md`,
`docs/roster-algorithm.md`, `docs/architecture.md` — nothing here expands scope beyond those.

Start with **`design-tokens.md`** — it defines the shared component primitives (`Button`,
`ToggleButton`, `EmptyState`, `ErrorState`, `LoadingSkeleton`, `ConfirmDialog`, `SearchableList`)
and cross-cutting conventions (spacing, color, contrast, i18n key conventions, accessibility
baseline) that every flow doc below builds on rather than re-specifying.

## Flows

| # | Flow | File | Actor |
|---|---|---|---|
| 1 | Pick your identity (no login — pick your name) | [`01-player-identity.md`](./01-player-identity.md) | Player |
| 2 | Confirm/decline attendance for a game | [`02-player-attendance.md`](./02-player-attendance.md) | Player |
| 3 | Set preferred pitch position(s) | [`03-player-position.md`](./03-player-position.md) | Player |
| 4 | View team roster for a game | [`04-player-roster-view.md`](./04-player-roster-view.md) | Player |
| 5 | Create/edit a game | [`05-admin-game-crud.md`](./05-admin-game-crud.md) | Admin |
| 6 | Create/edit players | [`06-admin-player-crud.md`](./06-admin-player-crud.md) | Admin |
| 7 | Generate/edit team roster | [`07-admin-roster-management.md`](./07-admin-roster-management.md) | Admin |
| 8 | Mark payment status per player per game | [`08-admin-payment-tracking.md`](./08-admin-payment-tracking.md) | Admin |

## How these docs are structured

Each flow doc covers, in this order:

1. **Source** — which Phase 0/1 doc(s) it's grounded in.
2. **Entry points** — how a user gets here (nav, deep link, another screen).
3. **User flow** — steps from entry to exit/success.
4. **States** — a table of every state (loading, error, empty, populated, and any permission-gated
   or save-in-flight variant) with its trigger and what renders. "Just show the data" is never a
   complete entry — every table includes at least loading/error/empty/populated.
5. **Component spec(s)** — prop shapes and per-state rendering behavior precise enough to write
   Testing Library tests directly against, without needing to ask "what should this render when
   X."
6. **Accessibility** — semantic structure, ARIA where native semantics fall short, keyboard
   interaction, focus order, and accessible-name requirements specific to that screen (in addition
   to the baseline in `design-tokens.md`, which applies everywhere and isn't repeated per flow).

## Cross-flow relationships (read order matters for a few of these)

- **Flow 1 gates Flows 2–4.** No player-facing screen renders without a current player resolved
  first; Flow 1 also defines the "switch player" mechanism used from every other player screen's
  chrome.
- **Flow 2's Game Detail page hosts Flow 4** as its "Roster" tab (player-facing, read-only).
- **Flow 5's Game Form hosts the WhatsApp share section**, which is what produces the link a player
  follows into Flow 2's entry point (b).
- **Flow 3's `PositionPicker` component is reused by Flow 6** (admin editing a player's positions on
  their behalf) — same component contract, different copy/context; see the note in
  `06-admin-player-crud.md` about the `maxReachedMessage` prop that makes this reuse possible.
- **Flow 5's admin game view hosts Flow 7 and Flow 8 as sibling tabs** ("Roster", "Payments") on the
  same per-game admin detail screen, alongside the game's own editable fields.
- **Flow 7 depends on Flow 2's confirmed-attendance data** (roster generation's input) and on
  Flow 5's `number_of_teams` field (its `N`); Flow 4 is the read-only player-facing view of Flow 7's
  output.
- **Flow 8 depends on Flow 2's confirmed-attendance data** to determine which players even appear
  (declined/no-response players aren't shown for payment tracking).

## Bilingual copy — what's a translation key vs. what's shown as-is

Every flow doc calls this out locally, but as a project-wide summary:

- **Translation keys (both `messages/en.json` and `messages/fr.json`, per `docs/architecture.md`)**:
  every app-authored label, button, heading, empty/loading/error/validation message, confirmation
  dialog, and status-pill text across all 8 flows.
- **Shown as-is, never translated, never routed through `next-intl`** (per `docs/discovery.md`
  assumption 9, confirmed): `Player.name`, `Game.location_name`, `Game.address`. These values are
  admin-entered free text and render identically to every viewer regardless of locale. The one
  place raw and translated text are concatenated into a single string is the WhatsApp share text in
  `05-admin-game-crud.md` (translated framing template + raw interpolated location/address) — see
  that doc's "WhatsApp share section."

## Assumptions and open questions raised during Phase 2

These are UX-level calls made to keep moving where Phase 0/1 didn't fully specify an interaction.
None of them change scope or data model — they're all about interaction detail within the
already-agreed feature set. Flagged here for the user to confirm before Phase 3 implementation
locks them in:

1. **Undo-to-`no_response`** (Flow 2): a player can tap their currently-active Confirm/Decline
   toggle again to revert to `no_response`. Not mandated by Phase 0/1; assumed for a better dead-end
   -free interaction. See `02-player-attendance.md`.
2. **Auto-save, no explicit Save button** for position selection (Flow 3) and payment/roster edits
   (Flows 7–8), matching the optimistic-save pattern already used for attendance — chosen for
   interaction consistency across the app, not dictated by discovery/data-model docs.
3. **Rating input is a plain number field, not a slider** (Flow 6) — a deliberate simplicity choice;
   flagged in case a more visual widget is wanted later.
4. **Player deletion/deactivation is out of scope** (Flow 6) — never mentioned in `docs/discovery.md`,
   not designed here. Needs a product decision (what happens to that player's historical
   Attendance/TeamAssignment/Payment rows) before it's designed, if ever wanted.
5. **Games list sort order (Flow 1's player picker, Flow 5's admin list)** — alphabetical / most-
   recent-first defaults chosen without an explicit requirement; low-risk, but flagged as a
   default, not a mandate.
6. **Bulk "mark all paid" is not included** in Flow 8 — not requested in scope, and adding it later
   is additive (no rework implied) if wanted.
7. **Admin login screen itself isn't specified** in these docs (see `design-tokens.md`'s layout
   conventions) — Phase 0/1 confirms an authenticated Admin account exists, but the login form's
   UX is treated as ordinary/boilerplate and out of these 8 flows' scope; flag if a dedicated spec
   is wanted before Phase 3.
