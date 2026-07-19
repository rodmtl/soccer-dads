# Soccer Dads

A small webapp for running a garage/pickup soccer league: schedule games, track attendance,
generate balanced team rosters, and track per-game payments. Bilingual (English/French) from v1.

See `docs/discovery.md` for the full problem statement and scope, and `docs/architecture.md` /
`docs/data-model.md` for the technical design.

## Stack

- [Next.js](https://nextjs.org/) (App Router, TypeScript) — one project serving both the frontend
  and the backend (Route Handlers / Server Actions).
- [Tailwind CSS](https://tailwindcss.com/) for styling.
- [Prisma](https://www.prisma.io/) ORM against Postgres.
- [next-intl](https://next-intl.dev/) for English/French internationalization.
- [Vitest](https://vitest.dev/) + [React Testing Library](https://testing-library.com/react) for
  unit/component tests, [Playwright](https://playwright.dev/) for e2e.
- Deployed on [Vercel](https://vercel.com/); Postgres hosted on [Neon](https://neon.tech/) in
  production.

See `docs/adr/0001-hosting-and-backend-runtime.md` for why this stack was chosen.

## Running locally

Requires Node.js 22+ and Docker (for local Postgres).

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the env template and adjust if needed:

   ```bash
   cp .env.example .env
   ```

3. Start local Postgres:

   ```bash
   docker compose up -d postgres
   ```

4. Generate the Prisma client and apply migrations:

   ```bash
   npx prisma generate
   npx prisma migrate dev
   ```

5. Start the dev server:

   ```bash
   npm run dev
   ```

   The app is available at [http://localhost:3000](http://localhost:3000) (redirects to
   `/en` or `/fr`).

## Scripts

| Script                | Purpose                                  |
| --------------------- | ----------------------------------------- |
| `npm run dev`          | Start the Next.js dev server              |
| `npm run build`        | Production build                          |
| `npm start`            | Run the production build                  |
| `npm run lint`         | ESLint                                    |
| `npm run typecheck`    | `tsc --noEmit`                             |
| `npm test`             | Vitest (unit/component tests)             |
| `npm run test:e2e`     | Playwright (e2e tests)                    |
| `npm run format`       | Prettier, write mode                      |

## Project structure

See `docs/architecture.md`'s "Repo layout" section for the full rationale. In short:

- `src/app/[locale]/` — pages and layouts, locale-scoped.
- `src/components/` — React components.
- `src/server/actions/` — Server Actions.
- `src/server/services/` — framework-agnostic business logic (e.g. the roster algorithm).
- `src/lib/` — Prisma client singleton, shared utilities.
- `src/i18n/` — next-intl routing/request config.
- `prisma/schema.prisma` — the data model.
- `messages/en.json` / `messages/fr.json` — all UI copy, key-parity required.
- `tests/unit/`, `tests/e2e/` — Vitest and Playwright tests.

## Contributing

This repo follows a strict test-first workflow — see `CLAUDE.md` for the full development process.
