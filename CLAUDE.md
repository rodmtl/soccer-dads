# soccer-dads — Development Workflow

This file defines how this webapp gets built, end to end, using **test-driven development**,
**clean code**, and a **public GitHub** repository. It also defines the specialized subagents
that own each phase of the workflow (see `.claude/agents/`).

## Philosophy

- **Test-first, always.** No production code is written before a failing test exists for it
  (red → green → refactor). Tests describe behavior, not implementation.
- **Clean code over clever code.** Small functions, meaningful names, no dead code, no premature
  abstraction. Three similar lines beat a speculative helper.
- **Small, reviewable increments.** One feature/slice at a time, each ending in a green test suite
  and a mergeable PR.
- **Security and accessibility are not optional passes.** They're gated steps in the workflow
  below, not an afterthought before launch.
- **Public repo hygiene from commit #1.** No secrets, no committed `.env` files, a real LICENSE,
  and a CI pipeline that runs on every PR — because this repo is public from day one.

## Default Tech Stack

Adjust once the project scope is known, but the default assumption is:

- **Frontend:** React + TypeScript, Vite
- **Unit/component tests:** Vitest + React Testing Library
- **E2E tests:** Playwright
- **Lint/format:** ESLint + Prettier (strict TS config, no `any` without justification)
- **State:** local/component state first; only reach for a global store (Zustand/Redux/etc.)
  when the architect agent decides cross-cutting state actually needs it
- **CI:** GitHub Actions — lint, typecheck, unit tests, build, (e2e on PR to main)

### This project (Soccer Dads): decided stack

This app's stack has already been decided and is **final** — see
`docs/adr/0001-hosting-and-backend-runtime.md` (ACCEPTED). Don't re-litigate this; treat it as the
default for all work in this repo unless a new ADR supersedes it:

- **Framework:** Next.js (App Router, TypeScript) — one project, one Vercel deploy, serving both
  the frontend (React) and the backend (Route Handlers / Server Actions). No separate `apps/api`.
- **Styling:** Tailwind CSS.
- **Data layer:** Prisma ORM against Postgres hosted on Neon, accessed through a pooled connection
  (Prisma Accelerate or Neon's native pooler) — required because serverless functions can't use
  unpooled Postgres connections safely.
- **Hosting:** Vercel only (frontend + backend + previews), per the "cheapest way possible /
  Vercel as the only provider" requirement in `specs/initial.md`.
- **Tests:** Vitest + React Testing Library for components; Vitest directly against Server Action
  / Route Handler functions for backend logic; Playwright for e2e.
- **i18n:** `next-intl` for English/French bilingual support (both required at launch, not
  deferred) — see `docs/architecture.md`'s internationalization section. All UI copy from Phase 2
  onward is written as translation keys in `messages/en.json` / `messages/fr.json`, not hardcoded
  strings.
- No C#/.NET anywhere in this repo — that option was considered and explicitly rejected in favor
  of a single-language, single-provider stack.

## GitHub & Repo Conventions (public repo)

- **Branching:** trunk-based off `main`. Feature branches named `feat/<slug>`, `fix/<slug>`,
  `chore/<slug>`.
- **Commits:** Conventional Commits (`feat:`, `fix:`, `test:`, `refactor:`, `chore:`, `docs:`).
- **PRs required** for everything landing on `main`. No direct pushes to `main`.
- **PR template** must include: what/why, test evidence (commands run + output), and a checklist
  matching "Definition of Done" below.
- **Required files:** `LICENSE` (confirm choice with user before adding), `README.md`,
  `SECURITY.md` (vulnerability reporting process), `.env.example` (never a real `.env`),
  `.gitignore` covering `node_modules`, build output, and env files.
- **Secrets:** never committed. Use GitHub Actions secrets / environment variables. Any file that
  might contain credentials gets a second look before `git add`.
- **Branch protection:** required status checks (lint, typecheck, test, build) before merge, once
  the repo is created on GitHub.
- Nothing is pushed to GitHub, and no destructive git operation runs, without explicit
  confirmation from the user first.

## End-to-End Workflow

Each phase below names the subagent that owns it (defined in `.claude/agents/`). Phases run
roughly in order for a new app, then cycle for each subsequent feature (Phases 3–6 repeat per
feature slice).

| # | Phase | Owner agent | Exit criteria |
|---|-------|-------------|----------------|
| 0 | Discovery & requirements | `software-architect` (with user) | Problem, users, and scope are written down; out-of-scope is explicit |
| 1 | Architecture & project scaffolding | `software-architect` | Tech choices, folder structure, module boundaries, ADRs recorded |
| 2 | UX & interaction design | `ux-design-specialist` | User flows, wireframes/component specs, accessibility requirements, design tokens |
| 3 | TDD implementation | `ts-react-tdd-coder` | Feature implemented behind passing tests written first; suite green |
| 4 | Code quality review | `code-quality-reviewer` | No blocking readability/duplication/SOLID issues; suggestions applied or explicitly deferred |
| 5 | Security audit | `security-audit-specialist` | No open high/critical findings (OWASP Top 10, deps, secrets, unsafe patterns) |
| 6 | QA & acceptance | `qa-specialist` | Acceptance criteria verified end-to-end, a11y and cross-browser checks pass, regressions checked |
| 7 | Release | `software-architect` + user | CI green on `main`, version tagged, changelog updated |

### Phase details

**0 — Discovery.** Clarify the actual product: who uses it, what problem it solves, and what's
explicitly out of scope for v1. Ambiguous or ambitious requests get scoped down, not guessed at.

**1 — Architecture.** Decide the stack (or confirm the default above), the project layout, data
model, and any external services/APIs. Record non-obvious decisions as short ADRs
(`docs/adr/NNNN-title.md`). Scaffold the repo, CI config, lint/test tooling.

**2 — UX design.** Before any component is coded, define the flow, states (empty/loading/error),
and accessibility requirements. Hand the `ts-react-tdd-coder` agent a spec, not a vague idea.

**3 — TDD implementation.** For each unit of behavior: write a failing test → write the minimum
code to pass → refactor with tests green. Component tests via Testing Library assert on behavior
users can observe, not internals. No test is skipped or commented out to get to green.

**4 — Code quality review.** Independent pass over the diff for clarity, duplication, naming, and
whether abstractions are earned. This agent doesn't rewrite features — it flags and proposes
precise fixes.

**5 — Security audit.** Review the diff and dependency tree for injection risks, unsafe DOM
handling (XSS), auth/session handling, secret leakage, and vulnerable dependencies. This runs
before every merge to `main`, not just before releases — the repo is public.

**6 — QA.** Verify the feature actually does what Phase 0/2 specified, exercised as a user would
(not just "tests pass"). Checks accessibility, responsive behavior, and that nothing else broke.

**7 — Release.** Confirm CI is green, tag a version, update the changelog. Anything touching
`git push`, tags, or GitHub repo settings is confirmed with the user first.

## Subagents

Defined in `.claude/agents/` and invocable via the Agent tool:

- **`software-architect`** — system design, tech stack, scaffolding, ADRs (Phases 0, 1, 7)
- **`ux-design-specialist`** — flows, wireframes, component specs, accessibility design (Phase 2)
- **`ts-react-tdd-coder`** — TypeScript/React implementation, strictly test-first (Phase 3)
- **`code-quality-reviewer`** — clean code / readability / duplication review (Phase 4)
- **`security-audit-specialist`** — OWASP/dependency/secrets audit (Phase 5)
- **`qa-specialist`** — end-to-end acceptance, a11y, regression testing (Phase 6)

Default flow for a new feature: architect (if it touches structure) → ux-design-specialist →
ts-react-tdd-coder → code-quality-reviewer → security-audit-specialist → qa-specialist. Small,
purely internal changes (refactors, bugfixes with no new UI) can skip Phase 2.

## Definition of Done (every PR)

- [ ] Tests were written before the implementation and fail-then-pass was actually observed
- [ ] `lint`, `typecheck`, `test`, and `build` all pass locally and in CI
- [ ] No `console.log`/debug leftovers, no commented-out code, no skipped tests
- [ ] Code quality review completed, findings resolved or explicitly deferred with reason
- [ ] Security audit completed, no open high/critical findings
- [ ] Accessibility checked (keyboard nav, labels/roles, color contrast) for any new UI
- [ ] No secrets, credentials, or `.env` files in the diff
- [ ] PR description explains why, not just what
