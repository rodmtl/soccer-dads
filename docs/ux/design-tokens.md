# Design Tokens & Shared Conventions

Phase 2 output. Applies to every screen in `docs/ux/`. This is not a visual brand system — no
brand/hex values are decided yet, and that's deliberate (implementation detail, deferred). What
*is* decided here is the structural stuff `ts-react-tdd-coder` needs to build consistent,
accessible, testable components from day one, since **no components exist in this codebase yet**
— everything specified across these docs is the *first* version of the design system, not a reuse
of something pre-existing.

## Spacing scale

Use Tailwind's default spacing scale as-is (4px base unit: `1`→4px, `2`→8px, `3`→12px, `4`→16px,
`6`→24px, `8`→32px, ...). Don't invent a custom scale. Component specs in these docs refer to
spacing qualitatively ("comfortable padding", "tight list"); exact Tailwind class choice is an
implementation detail for Phase 3, as long as it's drawn from the default scale, not arbitrary
pixel values.

Minimum touch target: **44×44 CSS px** for any tappable control (buttons, toggle buttons, list
items acting as buttons) — this app is used from phones (WhatsApp deep links), so touch ergonomics
matter more than desktop density.

## Color usage (neutral, brand TBD)

No brand palette is chosen yet — defer exact hex values to implementation/Tailwind config. What's
fixed now:

- **Neutral base**: grayscale for backgrounds, borders, body text (Tailwind's `gray`/`slate`
  scale is fine as a placeholder).
- **One accent** for primary actions/links (exact hue not decided — pick any Tailwind accent color
  consistently, e.g. `blue`, at implementation time; every primary button/link in the app must use
  the *same* accent).
- **Semantic colors**, used only for state, never as decoration:
  - Success / confirmed / paid → green family.
  - Danger / declined / error → red family.
  - Warning / stale / needs-attention → amber/yellow family.
  - Neutral / no-response / not-yet-set → gray family.
- **Color is never the only signal.** Every status conveyed by color (attendance status, paid/
  unpaid, stale roster) must also be conveyed by text or an icon with a text alternative. This
  matters for color-blind users and is called out per-flow below.

## Contrast

**WCAG AA is the minimum bar for everything**: 4.5:1 for normal text, 3:1 for large text (≥18pt or
≥14pt bold) and for UI component boundaries/focus indicators. This applies to every state
(disabled included, though disabled controls get a documented AA exemption per WCAG — don't rely
on that exemption as an excuse for low-contrast disabled text; keep it legible). No specific hex
pairs are prescribed here since the palette isn't chosen yet, but this constraint is non-negotiable
and must be checked in Phase 6 (QA) regardless of what palette Phase 3 lands on.

## Typography

- System font stack (no custom webfont decided/needed for a hobby-scale app) via Tailwind's
  default `font-sans`.
- Scale: `text-sm` (secondary/meta text: timestamps, helper text) / `text-base` (body) /
  `text-lg`–`text-xl` (section headings) / `text-2xl` (page titles). Don't introduce more than
  these four levels without a reason.
- Line length/wrapping: form labels and player/game names must wrap, never truncate silently
  (admin-entered free text — names, addresses — can be arbitrary length; truncation without a way
  to see the full value is an accessibility and usability bug for this app specifically, since
  names are how players identify themselves in Flow 1).

## Internationalization / translation-key conventions

- All app-authored copy (labels, buttons, empty/loading/error states, confirmation dialogs,
  validation messages, status text) is written as a translation key present in **both**
  `messages/en.json` and `messages/fr.json` before a piece of UI is done — no hardcoded English
  strings, per `docs/architecture.md`.
- Key namespace per flow, matching the example in `docs/architecture.md`
  (`Game.createButton`, `Roster.regenerateConfirm`): this spec uses `PlayerIdentity.*`,
  `Games.*`, `Attendance.*`, `Profile.*`, `Roster.*`, `AdminGames.*`, `AdminPlayers.*`,
  `AdminRoster.*`, `AdminPayments.*`, and a shared `Common.*` namespace for cross-cutting strings
  (`Common.retry`, `Common.cancel`, `Common.save`, `Common.loading`, `Common.tryAgain`).
- **Admin-entered free text is never translated and never routed through `next-intl`.** Player
  names, game `location_name`, and `address` are stored once and rendered as-is regardless of
  locale (`docs/discovery.md` assumption 9, confirmed). Each flow doc below explicitly marks which
  on-screen text is a translation key vs. raw stored data, since this distinction changes both what
  goes in `messages/*.json` and what a test asserts on (a translation-key render vs. a literal
  passed-through prop value).
- Dates/times are formatted through `next-intl`'s date/time formatting (locale-aware day/month
  names, 12h vs 24h per locale convention), not hand-built strings.

## Shared component primitives

These primitives are referenced by name in the flow-specific docs instead of being redefined per
flow. `ts-react-tdd-coder` should treat each as its own component with its own test file.

### `Button`

Props: `variant: 'primary' | 'secondary' | 'danger' | 'ghost'`, `size: 'md' | 'sm'`, `isLoading?:
boolean`, `disabled?: boolean`, standard native `<button>` props (`type`, `onClick`, `aria-*`),
`children` (accessible name via visible text — icon-only buttons are not used anywhere in this
spec; if one is ever introduced it needs an explicit `aria-label`).

- Renders a native `<button>` (never a styled `<div>`).
- `isLoading` shows a spinner *and* keeps the button's text (e.g. "Saving…"), never a spinner-only
  button with no text — the accessible name must stay meaningful mid-action.
- `disabled` sets the native `disabled` attribute (removes it from the tab order and screen reader
  interaction, which is correct here since every disabled use in this spec is "not actionable yet",
  not "actionable but hidden").
- Keyboard: standard native button behavior (`Enter`/`Space` activate, reachable via `Tab`).

### `ToggleButton`

Used for anything that's a two-state or multi-state *selection* rather than a navigation action:
attendance Confirm/Decline (Flow 2), position selection (Flow 3, Flow 6), paid/unpaid (Flow 8).

Props: `pressed: boolean`, `onToggle(): void`, `disabled?: boolean`, `children` (accessible name).

- Renders `<button type="button" aria-pressed={pressed}>`.
- Visual "selected" state must not rely on color alone — pair with a checkmark glyph, filled vs.
  outlined style, or equivalent text change (e.g. "✓ Confirmed" vs. "Confirm").
- Keyboard: `Enter`/`Space` toggle; reachable via `Tab`.

### `EmptyState`

Props: `title: string` (translation key), `description?: string` (translation key),
`action?: {label: string; onClick(): void}`.

- Renders inside a `<div role="status">`-free plain container (empty state is not an alert; it's
  static content) with a heading (`h2`/`h3` depending on nesting) and optional body text and
  action button.
- Used whenever a list/collection legitimately has zero items (distinct from "zero items because
  of a failed fetch", which is `ErrorState`, and distinct from "zero items because a filter/search
  matched nothing", which each flow spells out separately since the correct message differs).

### `ErrorState` / inline error banner

Props: `message: string` (translation key, generic — never surfaces raw server/exception text to
the user), `retryLabel: string` (translation key, e.g. `Common.retry` — caller-supplied, kept
explicit rather than resolved internally so this primitive stays a plain presentational component
with no hidden dependency on rendering under a specific i18n provider), `onRetry?(): void`.

- Renders `<div role="alert">` containing the message and, if `onRetry` is provided, a `Button`
  labeled with `retryLabel`.
- `role="alert"` means this is announced immediately to assistive tech when it mounts — appropriate
  since it represents an unexpected failure, not routine empty content.
- For **inline, per-field or per-row** errors (e.g. a form field failing validation, one roster row
  failing to save) use `aria-describedby` pointing to a `<p id="...">` with `role="alert"` scoped
  to that field/row rather than a page-level banner, so multiple simultaneous errors don't all
  compete for one region.

### `LoadingSkeleton`

Props: `rows?: number` (default 3), `label: string` (translation key, e.g. `Common.loading`).

- Renders a visually-obvious placeholder (shimmering/gray blocks — visual detail is
  implementation's call) wrapped in `<div role="status" aria-live="polite">` with visually-hidden
  text equal to `label`, so screen reader users get "Loading…" once instead of silence or repeated
  announcements as skeleton rows re-render.

### `ConfirmDialog`

Used for any destructive/hard-to-reverse action gated behind confirmation (Flow 7's regenerate
roster is the only user of this in v1, but it's specified generically for future reuse).

Props: `isOpen: boolean`, `title: string`, `description: string`, `confirmLabel: string`,
`cancelLabel: string` (all translation keys), `onConfirm(): void`, `onCancel(): void`.

- Renders a modal `<div role="dialog" aria-modal="true" aria-labelledby={titleId}
  aria-describedby={descriptionId}>`.
- **Focus management**: on open, focus moves to the dialog's first focusable element (the Cancel
  button, since Cancel is the safer default focus target for a destructive-confirmation dialog).
  On close (either button, or `Escape`), focus returns to whatever element triggered the dialog.
- **Focus trap**: `Tab`/`Shift+Tab` cycle only within the dialog while open.
- **Keyboard**: `Escape` triggers `onCancel`. `Enter` on the focused button activates it (standard
  button behavior — no global "Enter always confirms" shortcut, to avoid accidental confirms).
- Backdrop click triggers `onCancel` (equivalent to Escape/Cancel button — never equivalent to
  Confirm).

### `SearchableList` (filter-as-you-type list of selectable items)

Used by Flow 1 (pick player identity) and reusable by admin list screens (Flow 5/6 player and game
tables) for client-side name filtering.

Props: `items: Array<{id: string; label: string}>`, `searchLabel: string` (translation key),
`noResultsMessage: string` (translation key), `onSelect(id: string): void`, `renderItem?`
(optional per-flow custom row content beyond plain label).

- Renders a labeled `<input type="text">` (native `<label>` associated via `htmlFor`/`id`) followed
  by a `<ul>` of `<li>` containing a `<button>` per item (whole row is one focusable button, not a
  bare `<li>` with a click handler).
- Filtering is client-side substring match, case-insensitive, against `label`, on every keystroke.
- If filtering yields zero results (but `items` was non-empty before filtering), render
  `noResultsMessage` in place of the list — this is distinct from `EmptyState` (zero items overall)
  since the correct copy differs ("No matches for 'x'" vs. "No players yet").
- Keyboard: `Tab` into the search input; typing filters; `Tab` continues into the filtered list in
  DOM order; each row is a real `<button>`, so arrow-key list navigation is not required (standard
  tab order is sufficient and simpler to implement/test correctly) — this is a deliberate
  simplification vs. a full ARIA combobox/listbox pattern, appropriate because the input is a plain
  filter, not an autocomplete-into-textbox widget.

## Layout conventions

- Mobile-first: player-facing flows (1–4) are designed primarily for a phone viewport (WhatsApp
  deep links are the most likely entry point), then scaled up. Admin flows (5–8) may assume a wider
  viewport is more common (desk-based admin work) but must remain usable down to phone width — no
  admin-only desktop requirement.
- Player-facing nav: a simple two-item nav ("Games", "My profile" — see Flow 4's "Roster" is
  reached *through* a game, not a top-level nav item) persistent across player screens once an
  identity is picked (bottom nav bar on mobile, top nav on wider viewports — exact chrome is
  implementation's call).
- Admin nav: sidebar or top nav with "Games" and "Players" as top-level sections; "Roster" and
  "Payments" for a specific game are reached through that game's detail view (tabs), not top-level
  nav items, per Flow 7/8.
- Admin authentication (login form) is out of scope for these 8 flow docs — Phase 0/1 confirms a
  standard authenticated Admin account exists (email + password); Flows 5–8 all assume the viewer
  is already an authenticated Admin. The login screen itself is ordinary (email + password fields,
  submit, generic "invalid credentials" error) and doesn't need a dedicated UX doc, but it must
  still meet the accessibility bar in this document if/when built.

## Accessibility baseline (applies to every flow)

- **Semantic HTML first.** Real `<button>`, `<a>`, `<input>`/`<label>`, `<ul>`/`<li>`, heading
  levels that nest correctly (no skipped levels) — ARIA roles are added only where native semantics
  fall short (e.g. `role="dialog"` for modals, `role="alert"` for error surfaces, `aria-pressed`
  for toggle buttons), never as a substitute for using the right native element.
- **Every interactive element has an explicit accessible name** — visible label text, or an
  `aria-label`/`aria-labelledby` when the visible content alone is ambiguous (e.g. repeated
  per-row "Edit" links in a table need a name that includes what's being edited, like `aria-label="Edit {game.locationName}"`). This is called out per-component in each flow doc, not left
  implicit.
- **Focus order matches visual/reading order.** No positive `tabindex` values anywhere. Focus is
  never silently lost (e.g. after a row is removed from a list, focus moves to a sensible
  neighboring element, not to `<body>`).
- **Focus indicator is always visible** and meets the 3:1 non-text contrast minimum — never
  `outline: none` without a replacement that meets contrast.
- **Live regions** are used deliberately, not everywhere: `aria-live="polite"` for
  non-critical async confirmations ("Saved", "Copied"), `role="alert"` (implicitly assertive) for
  failures, and nothing else marked live (over-using live regions creates screen-reader noise).
- **`<html lang>`** is managed by `next-intl`'s routing automatically per locale segment
  (`/en/...` → `lang="en"`, `/fr/...` → `lang="fr"`) — flow docs don't repeat this.
- Every flow doc below states its specific keyboard interaction and focus-order expectations in
  addition to these baseline rules, since "reuse the baseline" is not a substitute for a per-screen
  answer.
