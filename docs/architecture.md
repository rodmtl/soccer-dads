# Architecture — GarageLeague Participant Registration

This document reflects the **ACCEPTED** decision in
`docs/adr/0001-hosting-and-backend-runtime.md`: **Option B** — drop the C#/.NET backend entirely,
run a single **Next.js (App Router, TypeScript)** application that serves both the frontend and
the backend (Route Handlers / Server Actions), deployed as one Vercel project, backed by Postgres
(Neon) via Prisma with connection pooling.

## Repo layout

A single Next.js app, not a split `apps/web` / `apps/api` monorepo. There's no second deployable
unit anymore — Route Handlers and Server Actions *are* the backend, and they live in the same
project as the UI, build together, and deploy together. Introducing a monorepo/workspaces split at
this project's size would be speculative structure with no current second app to justify it.

```
/
├── src/
│   ├── app/                  # Next.js App Router: pages, layouts, Route Handlers
│   │   ├── (routes)/         # UI pages (games, roster, players, etc.)
│   │   └── api/              # Route Handlers, where a REST-shaped endpoint is warranted
│   ├── components/           # React components
│   ├── server/                # Server Actions, service functions called by routes/actions
│   │   ├── actions/           # "use server" Server Actions
│   │   └── services/          # framework-agnostic business logic (roster algorithm, etc.)
│   ├── lib/                  # Prisma client singleton, shared utilities
│   ├── i18n/                  # next-intl config: request config, routing/locale config
│   └── styles/                # Tailwind entry, global CSS
├── messages/
│   ├── en.json                # English UI copy, keyed (not hardcoded strings)
│   └── fr.json                # French UI copy, same key set as en.json
├── prisma/
│   ├── schema.prisma          # single source of truth for the data model
│   └── migrations/
├── tests/
│   ├── unit/                  # Vitest: components, services, Server Actions/route handlers
│   └── e2e/                   # Playwright
├── docs/
│   ├── adr/
│   │   └── 0001-hosting-and-backend-runtime.md
│   ├── discovery.md
│   ├── architecture.md
│   ├── data-model.md
│   └── roster-algorithm.md
├── specs/
│   └── initial.md
├── .github/
│   └── workflows/
│       └── ci.yml
├── docker-compose.yml        # local dev only: postgres (no app service — `next dev` runs the app)
├── .env.example
├── .gitignore
├── LICENSE                   # choice pending user confirmation
├── README.md
└── SECURITY.md
```

Module boundary: UI components never talk to Prisma directly — they call Server Actions or fetch
Route Handlers, which call `src/server/services/*` for business logic (e.g. the roster-balancing
algorithm), which use the Prisma client from `src/lib`. This keeps the data-access and
business-logic layer testable in isolation from React, and keeps Prisma's generated types out of
client-bundled code paths.

## Internationalization (i18n): English + French from v1

`docs/discovery.md`'s open question on content language is now resolved: the app must ship
**bilingual English/French, both required at launch** — this is a real v1 requirement, not a
deferred nice-to-have, and it affects repo structure and how UI code gets written from Phase 2
onward.

**Library choice: `next-intl`.** For a Next.js App Router project, `next-intl` is the boring,
well-supported choice — it's purpose-built for App Router (Server Components, layouts, metadata,
middleware-based locale routing), has first-class TypeScript support for typed message keys, and is
the most widely adopted i18n library in the Next.js ecosystem, which matters for a hobby-scale
project that wants long-term maintenance from an active community rather than something in-house.
The alternative considered was rolling a minimal custom solution (a `messages/*.json` lookup with no
library) — rejected because locale-aware routing (`/en/...` vs `/fr/...`), `<html lang>` handling,
number/date formatting, and pluralization are exactly the kind of undifferentiated complexity a
library should own, and `next-intl` costs one dependency, not meaningful architectural risk.

**What this means for repo structure:**

- `messages/en.json` and `messages/fr.json` (see repo layout above) hold all app-authored UI copy,
  keyed by a shared key namespace (e.g. `Game.createButton`, `Roster.regenerateConfirm`) — the two
  files must stay in key-parity; a key present in one and missing in the other is a bug, not a
  fallback case to design around.
- `src/i18n/` holds `next-intl`'s request config and routing config (locale list `["en", "fr"]`,
  default locale, and the middleware that resolves a request's locale from the URL/cookie/
  `Accept-Language` header).
- Routes live under a `src/app/[locale]/` segment (standard `next-intl` App Router convention) so
  every page is locale-scoped; a root-level redirect sends `/` to the resolved default locale.

**What this means for how UI is built, starting Phase 2:** from Phase 2 (UX design) onward, **all
UI copy must be authored as translation keys referencing `messages/en.json` /
`messages/fr.json`, in both languages, from the start** — not hardcoded English strings with
translation deferred to later. This is a real scope addition: every label, button, empty/error/
loading state, confirmation dialog, and validation message that Phase 2 specifies needs to exist in
both files before Phase 3 implementation is considered done for that piece of UI. `ts-react-tdd-
coder` should treat "copy exists only in `en.json`" the same as a missing test — not shippable.

**Admin-entered free text is not translated — confirmed.** Content a human typed into the app (a
game's `location_name`/`address`, a player's `name`) is stored once and rendered as-is regardless
of the viewer's locale: no translation-service integration, and no dual-language entry fields.
This is settled (see `docs/discovery.md` assumption 9) — no per-locale columns on `Game`/`Player`
are needed in `prisma/schema.prisma`.

## Postgres

- Single database, single schema for v1 — no need for schema-per-tenant since this models one
  league (see discovery.md out-of-scope: multi-tenant).
- **Local dev:** a `postgres` service in `docker-compose.yml` (this is now the *only* service in
  that file — the app itself runs via `next dev`, not a container, since there's no separate API
  process anymore). Seeded via `prisma migrate dev` + a seed script (`prisma/seed.ts`).
- **Production:** managed Postgres on **Neon**, connected through a pooled connection string
  (Neon's built-in PgBouncer-backed pooler, or Prisma Accelerate — see ADR 0001 for the tradeoff).
  Plain, unpooled Postgres connections are not viable here: each serverless function invocation can
  open its own connection, and a handful of concurrent requests is enough to exhaust Postgres's
  connection limit without pooling in front of it.
- **Migrations:** Prisma migrations (`prisma/migrations/`, generated by `prisma migrate dev`
  locally) applied in CI/deploy via `prisma migrate deploy` — never applied manually against
  production.

## Monitoring: is Grafana justified for v1?

**No — deferred.** This is unchanged from the original recommendation and doesn't depend on which
backend language was chosen. The spec asks "Monitoring using Grafana?" with a hedge, and at this
app's real scale (a handful of admins, a few dozen players, a handful of games a week) a
Grafana+Prometheus stack is disproportionate: it needs its own persistent host (can't run on
Vercel), its own uptime/maintenance, and there's essentially no traffic volume or SLA pressure to
justify dashboards and alerting infrastructure for v1.

**v1 default instead:** rely on what Vercel already gives for free — request logs, deploy logs,
function invocation/error visibility in the Vercel dashboard — plus Neon's own connection/query
metrics, plus, if genuinely wanted, a free external uptime pinger (e.g. UptimeRobot / Better Stack
free tier) for "is the app up" alerting. This covers "did something break" for a hobby-scale app
with zero extra infrastructure to run or pay for.

**When to revisit:** if the league grows (multiple leagues/tenants, meaningfully higher traffic,
or an actual on-call/reliability need), Grafana becomes reasonable — at that point it would need
its own persistent host (not Vercel, since Vercel functions are stateless/ephemeral), reading from
Postgres and/or a metrics endpoint. Not built now because it would be config/infrastructure with
no current user of the dashboards it produces.

## Test tooling

- **Components/UI:** Vitest + React Testing Library — unchanged from `CLAUDE.md`'s stated default.
- **Server Actions / Route Handlers ("backend" logic):** tested with **Vitest**, directly against
  the exported functions — a Server Action or Route Handler is just an async function, so it's
  called in the test the same way a unit test calls any function, with the Prisma client mocked
  (e.g. via `vitest-mock-extended` or a thin repository interface) for pure unit tests, and against
  a real throwaway Postgres for integration tests that need to verify actual constraints (e.g. the
  unique `(game_id, player_id)` constraint) — the same real-database-in-CI approach the previous
  Testcontainers plan used, just run via `docker compose up postgres` in the CI job instead of a
  separate xUnit/Testcontainers setup.
- **e2e:** Playwright, run against a deployed Vercel preview (or `next build && next start`
  locally) — unchanged in approach, just now a single app to point it at instead of two.
- One test framework (Vitest) across the whole stack, which was Option B's stated appeal in the
  original ADR draft and is now the actual state of things — no xUnit/Testcontainers-for-.NET to
  maintain.

## CI plan (GitHub Actions)

A single job, triggered on pull requests targeting `main` (per `CLAUDE.md`'s required-checks
policy), since there's one app now:

1. **`build-and-test`**: install → `lint` (ESLint) → `typecheck` (`tsc --noEmit`) → `test` (Vitest,
   including Server Action/Route Handler unit tests; integration tests that need Postgres spin up
   `docker compose up -d postgres` first) → `build` (`next build`).
2. **`e2e`** (separate, slightly slower job, PRs into `main` specifically): Playwright against a
   Vercel preview deployment URL, per `CLAUDE.md`'s default CI plan.

Both jobs must pass before merge (branch protection required-status-checks, to be configured once
the GitHub repo exists, per `CLAUDE.md`).

## What's deliberately not decided here

- Neon vs. Vercel Postgres as the specific managed-Postgres provider — both are Neon-backed and
  either satisfies "one pooled Postgres database, reachable from serverless functions"; picked at
  actual account-setup time.
- Prisma Accelerate vs. Neon's native pooled connection string for pooling — either is a one-line
  config change; start with whichever is faster to wire up when the Neon project is created (see
  ADR 0001).
- LICENSE choice — per `CLAUDE.md`, this must be confirmed with the user directly, not assumed.
