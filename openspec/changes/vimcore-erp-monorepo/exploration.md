# Exploration: vimcore/erp frontend + backend monorepo bootstrap

> Artifact: `explore` (SDD exploration phase)
> Change: `vimcore-erp-monorepo`
> Date: 2026-07-27
> Mode: hybrid (Engram + OpenSpec)
> Author: sdd-explore executor

## Current State

The `/home/linux/Vimcore` repository is a **greenfield SDD-only scaffold**. Detected facts (verified by reading the filesystem, not assumed):

- **No git repository.** `git status` returns `fatal: not a git repository`. The repo has never been initialized.
- **No application source code.** The root contains only `.atl/` (skill registry) and `openspec/` (SDD artifacts).
- **No package manager manifest.** No `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `pnpm-lock.yaml`, `node_modules/`, or any `.ts`/`.tsx`/`.js` source file exists.
- **No tooling configuration.** No `tsconfig.json`, ESLint, Prettier, Vitest/Jest, Playwright, or CI config present.
- **No Docker artifacts.** No `Dockerfile`, `docker-compose.yml`, or `.dockerignore`.
- **No test runner.** `openspec/config.yaml` confirms `testing.strict_tdd: false`, `runner.framework: none`, all layers `false`, no linter/type-checker/formatter. The config's own `rules.tasks` already mandates: *"Bootstrap task must establish test runner before any implementation task"*.
- **SDD init is complete.** `openspec/config.yaml` and the `openspec/changes/` + `openspec/specs/` skeleton exist. The skill registry at `.atl/skill-registry.md` is populated.

Proposed stack (from `openspec/config.yaml` context block, **unconfirmed defaults** pending this proposal phase):
- pnpm workspace with Turbo/Turborepo-style orchestration
- React frontend (screaming/clean architecture, TanStack Query, Zustand, shadcn/ui, TypeScript)
- Node + Express 5 + Drizzle + PostgreSQL backend (TypeScript)
- Docker Compose for local development
- Strict TDD enabled only after bootstrap installs a runner

There is no existing architecture, patterns, tests, or coupling to preserve. This is a zero-constraint greenfield bootstrap.

## Affected Areas

Because the repo is empty, "affected areas" are the files/structures that the first bootstrap slice will **introduce** (not modify):

- `/home/linux/Vimcore/package.json` — root workspace manifest (does not exist yet).
- `/home/linux/Vimcore/pnpm-workspace.yaml` — workspace package globs (does not exist yet).
- `/home/linux/Vimcore/turbo.json` — task pipeline (`build`, `test`, `lint`, `typecheck`, `dev`) with caching (does not exist yet).
- `/home/linux/Vimcore/apps/` and `/home/linux/Vimcore/packages/` — workspace package roots (do not exist yet). First-slice likely: `apps/web` (React) and `apps/api` (Express) plus `packages/` shared (tsconfig, eslint, types, ui) introduced incrementally.
- `/home/linux/Vimcore/tsconfig.base.json` — shared TS config (does not exist yet).
- `/home/linux/Vimcore/Dockerfile.*` and `/home/linux/Vimcore/docker-compose.yml` — containerization (do not exist yet).
- `/home/linux/Vimcore/.gitignore`, `/home/linux/Vimcore/.editorconfig`, `/home/linux/Vimcore/.prettierrc`, `/home/linux/Vimcore/eslint.config.*` — repo hygiene (do not exist yet).
- `/home/linux/Vimcore/openspec/config.yaml` — will need updates after bootstrap (set `test_command`, `build_command`, flip `strict_tdd: true`, populate `testing` block). This file already exists and must be edited, not recreated.

## Approaches

### 1. Monorepo-first with top-level Turbo orchestration (recommended)

Bootstrap the **workspace shell + tooling** before any app package. The first slice establishes pnpm workspaces, Turbo pipelines, shared tsconfig/eslint/prettier, a Vitest runner at the root, Docker Compose with PostgreSQL, and a trivial health-check endpoint + page so the pipeline is provably green end to end. Product features arrive only in later slices.

- Pros:
  - Enforces testing, typecheck, lint/format, and strict TDD gates from day one (matches the SDD init mandate).
  - Turbo caching and `pnpm -r` filtering are in place before features create coupling.
  - The composition root (shared `packages/`) is defined incrementally, avoiding premature abstraction.
  - Docker Compose for PostgreSQL can land with the very first backend slice so Drizzle migrations run against a real DB early.
  - Reviewable as a single chained-PR bootstrap story under the 800-line review budget.
- Cons:
  - More upfront configuration before the first user-visible feature (acceptable: it IS the bootstrap).
  - Turbo adds a build-graph dependency; teams not familiar with it need onboarding.
- Effort: Medium (mostly config, no business logic).

### 2. App-first, add workspace tooling later

Scaffold `apps/web` and `apps/api` as standalone pnpm packages, defer `pnpm-workspace.yaml`/`turbo.json`/shared config until later.

- Pros:
  - Fastest path to a running frontend and backend.
  - Minimal initial config.
- Cons:
  - Defeats the point of a monorepo; cross-package refactor and shared types break down.
  - Postpones the test/lint/typecheck/TDD gates the SDD init requires, violating the "bootstrap task must establish test runner before any implementation task" rule.
  - Likely requires a painful consolidation slice later (move files into workspaces, rewire imports).
  - Skills (`react-screaming-clean-architecture`, `node-express-drizzle-clean-architecture`) both mandate pnpm and feature-first vertical slices — easier to honor in a workspace from the start.
- Effort: Low initially, High to retrofit.

### 3. Nx instead of Turbo for orchestration

Use Nx with pnpm workspaces for richer task graphing, generators, and affected commands.

- Pros:
  - Mature generator story, strong `nx affected` for CI.
  - First-class pnpm support.
- Cons:
  - Heavier mental model and config than Turbo; more boilerplate for a 2-app bootstrap.
  - Both clean-architecture skills are tool-agnostic but written around pnpm + simple scripts; Nx generators add an opinion layer not requested by the user.
  - User intent explicitly named "Turbo/Turborepo-style tooling"; selecting Nx contradicts the stated default.
- Effort: Medium-High.

### First-slice bootstrap boundaries (applies to recommended approach)

The bootstrap slice must establish, in this order, before any product feature:

1. **Repo hygiene:** `git init`, `.gitignore`, `.editorconfig`, root `package.json` (private, no publish), `pnpm-workspace.yaml` globs (`apps/*`, `packages/*`).
2. **Tooling core:** `turbo.json` with `build`, `test`, `lint`, `format`, `typecheck`, `dev` pipelines (caching on for everything except `dev`); `tsconfig.base.json` (strict, `noUncheckedIndexedAccess`, etc.); flat ESLint config + Prettier shared via `packages/` (introduced when the second consumer appears — start inline at root).
3. **Test runner:** Vitest at the root with workspace project globbing, `pnpm -r test` as the `test_command`. A single trivial `sum` test proves the runner works. At this point `openspec/config.yaml` must be updated: `testing.strict_tdd: true`, `runner.framework: vitest`, layers `unit: true`, `test_command: "pnpm -r test"`, `apply.tdd: true`.
4. **Frontend skeleton** (`apps/web`): Vite + React + TypeScript, TanStack Query provider stub, Zustand installed but no store yet, shadcn/ui init deferred to the first feature (keeps bootstrap lean), `react-screaming-clean-architecture` feature-first folder skeleton with one empty sample feature showing the `domain/application/infrastructure/presentation` boundaries. Typecheck + lint + a Vitest DOM test for the sample feature.
5. **Backend skeleton** (`apps/api`): Express 5 + TypeScript + Drizzle + Zod, `node-express-drizzle-clean-architecture` feature-first folder skeleton with one empty sample feature (health/sanity) showing the boundaries, centralized error handler, config validation, graceful shutdown hook, Drizzle configured against the Compose Postgres, `drizzle-kit` wired for `generate`/`migrate`. Typecheck + lint + a Vitest API test for the health route.
6. **Docker Compose:** `docker-compose.yml` with a `postgres` service (healthcheck), and `apps/api` + `apps/web` runnable via Compose or via `pnpm --filter` dev scripts (clearly documented). Non-root production image direction noted but a dev-first image is acceptable for the bootstrap.
7. **Pipeline proof:** `pnpm install && pnpm typecheck && pnpm lint && pnpm test && pnpm -r build` all green; `pnpm dev` boots both apps against Compose Postgres.

The boundary is intentionally **vertical-slice-tooling-only**: no CRUD feature, no entity beyond a sanity/health one. Product features begin in subsequent SDD changes.

## Recommendation

Adopt **Approach 1 (Monorepo-first with Turbo orchestration)** with the **first-slice bootstrap boundaries** above. Rationale:

- It is the only approach that satisfies the SDD init mandate ("bootstrap task must establish test runner before any implementation task") without retrofit pain.
- It matches the user's stated intent ("pnpm monorepo with Turbo/Turborepo-style tooling") rather than contradicting it (Approach 3) or deferring it (Approach 2).
- Both loaded skills (`react-screaming-clean-architecture`, `node-express-drizzle-clean-architecture`) implicitly assume pnpm + feature-first vertical slices on top of a working workspace; the bootstrap gives them a clean foundation to land into.
- It keeps the first slice under the 800-line review budget (config + skeletons + one sanity feature each side) and reviewable as a single chained-PR bootstrap, with product features split into later SDD changes.

Open questions for the proposal phase to confirm with the user (these are recommended defaults, not detected facts):
- Confirm pnpm as the sole package manager and Turbo as the orchestrator (vs Nx).
- Confirm Vitest as the runner (picking it now maximizes shared config across web + api; alternative is Playwright-only for e2e + Vitest for unit/integration).
- Confirm Drizzle-Kit migration workflow (push vs migrate) and whether the bootstrap includes a `users`-style sanity entity or stays health-only.
- Confirm the single vs multiple shared `packages/*` strategy at the bootstrap (recommend: introduce `packages/tsconfig` and `packages/eslint` only — defer `packages/ui`, `packages/types`, `packages/schemas` until a second consumer appears).

## Risks

- **Test-runner lag violates SDD gate.** If bootstrap is split and the test runner lands in a later slice, the "no implementation before test runner" rule is violated. Mitigation: keep runner installation inside the first slice, before any app skeleton.
- **Premature shared-package abstraction.** Introducing `packages/ui`, `packages/schemas`, `packages/types` before a second consumer creates unused abstraction. Mitigation: introduce shared packages only when a second consumer appears (rule stated above).
- **Turbo caching masking test failures.** If the `test` task is cached, a red test can be hidden behind a green cache hit. Mitigation: cache `test` only in CI mode, or set `cache: false` for `test` in dev, relying on Turbo for `build`/`typecheck`/`lint` only.
- **Drizzle migration drift vs Compose ephemeral Postgres.** A disposable container can mask migration-order bugs. Mitigation: persist the Postgres volume in Compose and require `drizzle-kit migrate` as part of the api dev setup.
- **React Compiler assumption.** `react-screaming-clean-architecture` assumes React Compiler may be enabled (it bans `useMemo`/`useCallback`/`React.memo` when on). The bootstrap should decide explicitly whether RC is on; if undecided, default off for the first slice and revisit.
- **Docker for the frontend in dev.** Running Vite inside Docker adds HMR friction. Mitigation: keep the web dev server on the host via `pnpm --filter web dev`, use Compose only for Postgres + (optionally) api.
- **Greenfield = nothing to verify against.** There are no existing tests/patterns to anchor to, so the bootstrap's correctness is judged only by "does the pipeline go green." That is the correct bar for this slice but must be stated explicitly in the verify phase.

## Ready for Proposal

**Yes.** The repo state is unambiguous (greenfield, SDD-init-only), the stack proposal is aligned with both loaded skills and the SDD init config, and the first-slice boundaries are clear. The orchestrator should tell the user:

- This exploration confirmed the repo is empty and ready for a greenfield bootstrap.
- Recommend Approach 1 (Monorepo-first + Turbo) and the first-slice boundaries above.
- The proposal phase should explicitly confirm the open questions listed under Recommendation (pnpm+Turbo, Vitest, Drizzle workflow, shared-package timing) before the spec/design phases freeze the architecture.