# ADR 0001: Hosting and Backend Runtime

**Status:** ACCEPTED — decided by the user on 2026-07-18.

## Context

`specs/initial.md` states, under the same "webapp" heading:

- Backend on **C# (.NET latest version)**
- **Docker compose**
- "App must be the **cheapest way** and we may use **Vercel as the only provider**"

These two constraints conflict at a technical level. Vercel's serverless compute targets Node.js,
Python, Go, Ruby, and its own Edge runtime — it does not run long-lived ASP.NET Core server
processes as a first-class serverless target. There is no supported, "boring" way to deploy a
.NET Web API to Vercel the way you'd deploy a Next.js API route. Community workarounds exist (e.g.
custom builders shelling out to a self-contained .NET binary) but they are fragile, unofficial, and
exactly the kind of clever/novel setup this project should avoid.

So: "keep C#/.NET" and "Vercel as the only provider" cannot both be true. Something has to give.

It's worth noting the spec phrases the two constraints with different confidence: "Backend on
C# (.NET latest version)" is stated flatly, while the hosting line is hedged ("we **may** use
Vercel...", "Monitoring using grafana**?**"). That asymmetry was a signal, not proof, at proposal
time — the user has since resolved it directly (see Decision below).

## Options considered

**Option A — Keep .NET, split hosting.** Vercel hosts only the static React frontend build.
The C#/.NET API and Postgres run on a low-cost container platform (Fly.io, Railway, or Render — all
have low/no-cost tiers suitable for a hobby-scale app). `docker-compose.yml` remains meaningful for
local development and roughly mirrors the API+DB half of production.
- *Cost:* frontend on Vercel free tier (~$0); API+DB on Fly.io/Railway free tier or single-digit
  $/month for the traffic this app will see.
- *Complexity:* two providers instead of one; two deploy pipelines (though both are simple/standard
  ones — static build to Vercel, container/binary deploy to the other platform).
- *Preserves:* the explicit "C#/.NET backend" requirement, and Docker Compose as a real local-dev
  parity tool.
- *Breaks:* literal "Vercel as the only provider."

**Option B — Drop .NET, single-provider Vercel.** Frontend and a thin API both live on Vercel
(API as Vercel serverless/Node.js functions, TypeScript). Postgres hosted externally (e.g. Neon or
Vercel Postgres — a database always needs to live somewhere, so this isn't really "another
provider" in the deploy-pipeline sense).
- *Cost:* effectively $0/month at this app's expected traffic (a few dozen players, a handful of
  games/week) — Vercel's and Neon's free tiers comfortably cover it.
- *Complexity:* lowest — one language (TypeScript) across the whole stack, one deploy target, no
  second hosting account to manage.
- *Preserves:* "cheapest way" and "Vercel as the only provider," literally.
- *Breaks:* the explicit "C#/.NET backend" requirement.

**Option C — Self-host everything on one small VM.** Run the full `docker-compose.yml` stack
(React build served statically, .NET API, Postgres, and Grafana if wanted) on a single cheap VPS
(e.g. Hetzner/DigitalOcean/Oracle free-tier instance, roughly $4–6/month).
- *Cost:* flat $4–6/month regardless of usage — doesn't scale down to $0 the way A/B can, but is
  still cheap in absolute terms.
- *Complexity:* you own OS patching, uptime, backups, TLS certs, restarts after crashes — real
  ops burden for what's meant to be a low-maintenance hobby project.
- *Preserves:* every literal piece of the requested stack (C#, docker-compose, Grafana) running
  exactly as specified, in one environment.
- *Breaks:* "Vercel as the only provider" more completely than Option A does (zero Vercel usage).

## Decision

**Option B — drop .NET entirely, single-provider Vercel**, with the following concrete stack:

- **Framework:** **Next.js (App Router, TypeScript)**. Frontend (React) and backend (Route
  Handlers / Server Actions) live in **one Next.js project**, deployed as **one Vercel project**.
  This is the detail that makes Option B actually simple rather than just "two things instead of
  two things": there's no second deploy pipeline, no CORS configuration between a separate
  frontend and API origin, and no separate versioning/coordination between a `web` and `api`
  package. One `next build`, one Vercel project, one preview URL per PR.
- **ORM:** **Prisma**. Typed schema (`schema.prisma`) as the single source of truth for the data
  model described in `docs/data-model.md`, typed query client, and a migration workflow
  (`prisma migrate`) that replaces what EF Core migrations would have done.
- **Database:** **Postgres via Neon** (serverless Postgres, generous free tier, branching for
  preview environments). Vercel Postgres (itself Neon-backed) is an equally valid pick; Neon is
  named as the default because its free tier and branch-per-preview workflow are slightly more
  mature standalone. This is an implementation-time detail, not a structural one — either
  satisfies "one Postgres database, reachable from serverless functions."
- **Connection pooling:** naive Postgres connections don't work well from serverless functions —
  each invocation can open a new connection, and a burst of concurrent invocations can exhaust
  Postgres's connection limit in seconds. This is handled via **Prisma Accelerate** (Prisma's
  managed connection pooler + query cache, works with any Postgres) or, equivalently, **Neon's
  built-in pooled connection string** (PgBouncer-backed). Either is a one-line connection-string
  change, not new infrastructure to run. Prisma Accelerate is the default pick since it requires
  zero extra setup beyond an env var; Neon's native pooler is the fallback if Accelerate's free
  tier limits become a problem at any point (unlikely at this app's scale).

**Why this specific stack (one sentence):** Next.js is the only framework in the "boring,
well-supported" tier that lets frontend and backend deploy as a single Vercel project with zero
CORS/two-deploy complexity, which is exactly what "cheapest way possible" + "Vercel as the only
provider" are asking for; Prisma + Neon (pooled) is the standard, documented pairing for making
Postgres actually work from Vercel's serverless functions rather than something bespoke.

Option A is no longer under consideration: the user has explicitly chosen to drop .NET rather than
preserve it via split hosting. Option C remains rejected for the reasons above (flat ongoing cost
and real ops burden for a hobby-scale app).

## Consequences

- `docs/architecture.md` and `docs/data-model.md` are updated to reflect this decision as final:
  a single Next.js app rather than separate `apps/web`/`apps/api` projects, Prisma instead of EF
  Core, Vitest instead of xUnit/Testcontainers for the backend side.
- `docker-compose.yml` is retained only for **local Postgres** — there is no separate API service
  to containerize locally anymore, since Next.js dev server (`next dev`) serves both frontend and
  API routes together.
- Grafana's status is unchanged from the original recommendation: **deferred for v1** (see
  `docs/architecture.md`). Nothing about dropping .NET changes that reasoning — it was already
  independent of backend language.
- This decision is now final. Any future change to hosting/backend runtime should be recorded as a
  **new ADR that supersedes this one**, not a silent edit to this file.
