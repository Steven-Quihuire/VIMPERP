# Exploration: observability-audit-provisioning

> Artifact: `explore` (SDD exploration phase)
> Change: `observability-audit-provisioning`
> Date: 2026-07-28
> Mode: hybrid (Engram + OpenSpec)
> Author: sdd-explore executor

## Current State

> Disk-verified facts (read directly from the working tree, not assumed from memory).
> These correct the stale `sdd-init/vimcore` Engram note that claimed the repo was
> greenfield / "not a git repository". That fact is **no longer true**.

The repository is a **working pnpm + Turbo monorepo** with real product features:

- **Git initialized.** `git log` shows real commits (`feat: add company onboarding foundation`,
  `feat: add dashboard admin desktop theme`, `feat: add e2e ci coverage gates`, `test: stabilize
  onboarding validation assertion`, `chore: archive vimcore erp bootstrap specs`). Last commit
  `13f733c`.
- **Backend** (`apps/api/src`, Express 5 + Drizzle + PostgreSQL + Zod), feature-first vertical
  slices: `admin`, `companies`, `identity`, `sample-health`. Composition root in
  `apps/api/src/app/create-app.ts`.
- **Frontend** (`apps/web/src`, React + Vite + TanStack Query + Zustand + shadcn path), feature-first
  slices: `auth`, `dashboard`, `desktop-access`, `onboarding`, `sample`, `theme`.
- **Tests:** Vitest (`pnpm test`), `supertest` API route tests per feature, Playwright e2e at
  `e2e/app.e2e.spec.ts`. Strict TDD enabled (`openspec/config.yaml`).
- **Drizzle:** `drizzle.config.ts` (schema → `src/shared/infrastructure/db/schema.ts`, migrations →
  `src/db/migrations/`). 3 migrations applied: `0000` (users/sessions/memberships), `0001`
  (companies, company_profiles, branches, theme_preferences, notifications, audit_events),
  `0002` (notifications index).

### Company creation flow (the provisioning path under audit)

`POST /companies` (`features/companies/presentation/company.router.ts`) → `createCreateCompany`
use case → `CompanyOnboardingGateway.createCompany` → `createDrizzleCompanyOnboardingGateway`
(`features/companies/infrastructure/drizzle-company.gateway.ts`).

The gateway runs **one atomic Drizzle transaction** inserting seven tables in order:
`companies` → `company_profiles` → `branches` → `memberships` → `theme_preferences` →
`notifications` → `audit_events`. On any failure the whole transaction rolls back — which is
desirable for business atomicity but means **no durable process visibility survives a failure**:
the run, which step failed, and the technical error are all invisible after the rollback.

### Observability already present (frontend + infra)

- `apps/api/src/shared/presentation/observability.ts`: pino logger, `createRequestMetrics`
  (in-memory Prometheus-style counters: `http_requests_total`, `http_requests_in_flight`), and
  `createRequestContextMiddleware` that mints a **`requestId` per request** (correlation id),
  sets it as the `x-request-id` response header, and logs `{ method, path, requestId,
  responseTimeMs, statusCode }` on `finish`. `/metrics` exposes the text-format counters.
- `error.middleware.ts` maps domain/Zod errors to `{ error: { code, message } }`. A 500 swallows
  the real error — only the generic message is returned; the stack is not persisted anywhere.
- **No** OpenTelemetry, Loki, Sentry, or external structured-log sink. This matches the initial
  architectural recommendation (PostgreSQL + structured JSON logs + correlation_id + Super Admin
  views for the MVP).

### Admin surface already present

- `features/admin`: `AdminGateway` port (`getCompanySummary`, `listNotifications`) +
  `createDrizzleAdminGateway`. Routes `GET /admin/companies/summary` and
  `GET /admin/notifications`, both guarded by `requireAuth` + `requirePlatformAdmin`.
- Frontend `features/dashboard`: `DashboardPage` already renders the summary (`totalCompanies`,
  `notificationCount`, `auditEventCount`) and notifications list **only for platform-admin**
  (`canViewAdminSignals`). `dashboard-client.ts` reuses the typed `HttpClient`.

So `auditEventCount` is already surfaced — but the underlying `audit_events` rows are not yet
listable/filterable individually, and there is no provisioning/technical-error surface at all.

### Schema normalization gaps (verified in `schema.ts`)

| Table | Issue | Normal form |
|---|---|---|
| `company_profiles.services` | `text` holding `JSON.stringify(services[])` — a repeating group inside one cell | **1NF violation** |
| `audit_events.details` | `text` holding `JSON.stringify({...})` — structured payload in text | **1NF violation** (but acceptable as JSONB) |
| `memberships` | **No primary key**, no unique constraint, no foreign keys | Integrity / 2NF-ish |
| `branches`, `notifications`, `theme_preferences`, `company_profiles` | No FK to `companies`/`users` | Referential integrity |
| `audit_events`, `provisioning_*` (proposed) | No `correlation_id` column to pivot log ⇄ DB | Observability linkage |
| No `provisioning_runs` / `provisioning_steps` / `application_errors` | do not exist | New models |

## Affected Areas

- `apps/api/src/shared/infrastructure/db/schema.ts` — add `provisioning_runs`,
  `provisioning_steps`, `application_errors`; refactor `company_profiles.services` → dedicated
  `company_services` table; change `audit_events.details` `text`→`jsonb`, add `correlation_id`;
  add FKs + PKs to `memberships` and other tables.
- `apps/api/src/db/migrations/*` — new migration(s) via `drizzle-kit generate`/`migrate`.
  ALTER of `audit_events.details` text→jsonb and the `services` split need care (see Risks).
- `apps/api/src/features/companies/infrastructure/drizzle-company.gateway.ts` — split services
  insert into `company_services`; record a `provisioning_run` + per-step rows; the business
  transaction must stay atomic while observability is recorded outside it.
- `apps/api/src/features/companies/application/create-company.ts` — likely wrap instrumentation
  here (or an observed gateway) so the domain/port contract stays stable.
- `apps/api/src/features/admin/` — expand `AdminGateway` port + Drizzle adapter + routes for
  provisioning runs, steps, errors, and audit-event listing/filtering. Update
  `admin.route.test.ts` in-memory gateway fixtures.
- `apps/api/src/app/create-app.ts` — wire new gateways/routes.
- `apps/api/src/shared/presentation/observability.ts` — propagate `requestId` into the DB path
  so provisioning/audit rows carry the same `correlation_id` as the pino log line.
- `apps/web/src/features/dashboard/` — extend `dashboard-client.ts`, `dashboard` domain types,
  and `DashboardPage` (or new hosted route) to surface provisioning/errors/audit to
  platform-admins. Keep TanStack Query for server state, Zustand only for ephemeral UI.
- `openspec/specs/` — the `company-onboarding` spec gains observability deltas; new specs for
  the provisioning/admin capabilities may be created in the spec phase.

## Approaches

### 1. One atomic transaction keeps owning everything; observability recorded inside it (rejected)

Insert `provisioning_runs`/`steps`/`application_errors` as additional statements inside the
existing `db.transaction(...)`.

- Pros: single transaction, all-or-nothing, simplest mental model.
- Cons: **defeats the purpose** — when the onboarding transaction fails and rolls back, the
  provisioning run + step + error rows roll back too, leaving no trace of the failure. This is
  the exact problem the change is meant to solve.
- Effort: Low, but wrong.

### 2. Keep business writes in one transaction; record observability in a SEPARATE, dedicated transaction outside it (recommended)

The use case layer orchestrates: (a) open a provisional `provisioning_run` row (status
`running`, `correlation_id`, `actor`, `companyId?`) **before** the business transaction; (b)
execute the gateway's atomic business transaction; (c) on success, update the run to `succeeded`
and append `provisioning_steps`; on failure, catch the error, record an `application_errors`
row + the `provisioning_steps` that completed + mark the run `failed`, **all in their own
transaction(s) that survive the business rollback**.

- Pros: business atomicity preserved (still one transaction for the 7 tables), failures are now
  durably visible with the correlation id matching the pino log line, and the audit/provisioning
  models are cleanly separated from applicationErrors. Matches the initial architectural
  recommendation (separate audit / provisioning / technical errors).
- Cons: introduces orchestration complexity in the use case and a second transaction boundary;
  ordering/consistency between business commit and observability commit must be reasoned about
  (if observability write fails after business commit, the run stays "running" — needs a
  reconciliation/sweeper job or a "succeeded-business / observability-incomplete" state).
- Effort: Medium.

### 3. Event-sourced / outbox pattern

Write an outbox row in the business transaction; a worker projects it into provisioning/audit
tables asynchronously.

- Pros: fully decoupled, survives crashes, replayable.
- Cons: way over scope for an MVP, adds a worker process and at-least-once delivery concerns,
  contradicts the "PostgreSQL + structured JSON logs + correlation_id" MVP recommendation; no
  external broker approved.
- Effort: High.

### 4. Pure structured logs, no DB tables for provisioning

Skip `provisioning_runs`/`steps`/`application_errors` SQL tables; log structured JSON via pino
and query via Loki later.

- Pros: zero schema migration, cheapest.
- Cons: explicitly rejected by the initial architecture recommendation ("do NOT use pure text
  logs in SQL; separate audit events, provisioning runs/steps, technical application errors,
  and later external structured logs"). No admin UI can pivot without Loki/Sentry, which are
  deferred.
- Effort: Low, but wrong for the stated goal.

## Recommended slice shape (MVP for this change)

.normalize + observability schema first, instrumentation second, admin surface third.

### Slice A — Schema & normalization (DB only)
- New tables: `provisioning_runs`, `provisioning_steps`, `application_errors`.
- Refactor: `company_profiles.services` text → new `company_services(company_id, service)`
  child table (1NF fix), backfilled from existing JSON.
- Refactor: `audit_events.details` text → `jsonb`; add `correlation_id` text column + index.
- Integrity: add PK + unique to `memberships (user_id, company_id)`; add FKs to
  `branches`, `notifications`, `theme_preferences`, `company_profiles`, `memberships`,
  `audit_events` (nullable where platform-admin rows legitimately have null `company_id`).
- Migration generated and verified against a real Compose Postgres.

### Slice B — Instrumentation (backend, no new API yet)
- Observe createCompany: open run, execute business tx, finalize run/steps/error records in
  separate transactions outside the business one. Carry `correlation_id` (requestId) end to end.
- Keep the `CompanyOnboardingGateway` port stable; instrument at the use-case or an observed
  gateway wrapper so domain code is unchanged.
- Idempotency-key support on `POST /companies` (recommended but can defer — see questions).

### Slice C — Admin API (read side)
- Extend `AdminGateway` + routes: `GET /admin/provisioning/runs` (filter by status/company),
  `/admin/provisioning/runs/:id` (with steps), `GET /admin/errors` (recent technical errors),
  `GET /admin/audit-events` (list + filter by type/company).
- All guarded by `requirePlatformAdmin` like the existing two endpoints.

### Slice D — Admin UI (frontend)
- Reuse TanStack Query + existing `HttpClient`. Extend `dashboard-client.ts` + a new
  "Provisioning & Audit" admin section gated by `canViewAdminSignals`. Zustand only for
  ephemeral filter state.

This split keeps each slice under the 800-line review budget and maps to reviewable work-unit
commits / chained PRs per the `work-unit-commits` skill.

## Recommendation

Adopt **Approach 2** (separate observability transactions, single business transaction) and the
**four-slice MVP shape (A–D)**. Rationale:

- It preserves the atomic company-onboarding guarantee that already exists (acceptance contract
  for `company-onboarding` spec must not regress) while making failures durably inspectable.
- It honors the initial architecture recommendation: separate audit / provisioning / technical
  errors in PostgreSQL, keep structured JSON logs + correlation_id, defer OTel/Loki/Sentry.
- It is deliverable as reviewable work-unit commits and chained PR slices (each under the
  800-line / 400-line guardrails), satisfying the `work-unit-commits` and clean-architecture
  skills.
- Frontend reuses existing `HttpClient` + TanStack Query patterns; backend reuses the existing
  `AdminGateway` port shape, so dependency direction stays `domain → none`,
  `application → domain`, `infrastructure → application`, `presentation → application`.

Open questions for the proposal phase (recommended defaults, not detected facts):
- Should idempotency-key support land in this change or the next one? (Recommend: B-slice,
  but confirm.)
- JSONB `details` shape — free-form per `audit_events.type` or a typed schema per type?
- Retention window for `application_errors` / `provisioning_runs` (30/90/365 days?).
- Does platform-admin need to see raw error stacks/messages, or only sanitized summaries?
- Retry policy: manual re-trigger from admin UI in this slice, or read-only visibility first?

## Risks

- **Migration of `audit_events.details` text→jsonb:** all existing rows are produced by
  `JSON.stringify(...)` so they cast cleanly, but the migration must `USING details::jsonb` and
  should validate parseability on a snapshot first. Back up before applying.
- **Splitting `company_profiles.services`:** must backfill `company_services` from the existing
  JSON arrays in the same migration; guard against duplicate/empty service strings.
- **Adding NOT NULL FKs:** existing rows may orphan (e.g. `memberships` rows with null
  `company_id` for platform-admins). Use **nullable FKs** where legitimate, and verify orphan
  counts before adding constraints.
- **Adding a PK to `memberships`:** if duplicate `(user_id, company_id)` rows exist today the
  ALTER fails; dedupe in the migration.
- **Observability write failure after business commit:** the run row could stay `running`
  forever. Need an explicit reconciliation state or a sweeper. At minimum, document the
  "business-succeeded / observability-unconfirmed" window.
- **Review budget:** the full schema + instrumentation + admin (API+UI) almost certainly exceeds
  800 changed lines. **Use chained PRs** (Slice A → B → C → D). Confirm before splitting when the
  change grows (PR strategy: ask before splitting).
- **`correlation_id` end-to-end:** the pino `requestId` is currently request-scoped only; it must
  be threaded from the request context into the use case / gateway so the DB row's
  `correlation_id` matches the log line. Forgetting this breaks the admin pivot.
- **Sensitive data in `application_errors`:** error stacks and context payloads may contain PII
  or secrets. Decide sanitization policy (hash stacks, redact payloads) before persisting.
- **Test strategy:** unit tests with in-memory gateways + a fake provisioning/audit recorder;
  **integration tests need a real Postgres** (testcontainers or the Compose DB) to validate the
  JSONB cast, FK constraints, and the out-of-transaction observability ordering — the supertest
  route tests alone cannot prove the migration is safe.

## Ready for Proposal

**Yes.** The repo state is no longer greenfield (correcting the stale `sdd-init/vimcore`
memory); the company onboarding atomic transaction, existing observability middleware, and admin
surface are all verified on disk. The four-slice MVP shape is clear, low-risk, and reviewable as
chained PRs. The orchestrator should tell the user:

- The initial architecture recommendation (separate audit/provisioning/errors, PostgreSQL +
  JSON logs + correlation_id, defer OTel/Loki/Sentry) is still the right MVP target; this
  exploration refines it into four slices.
- The proposal phase should resolve the 5 product questions below and the open defaults above
  before spec/design freeze the migration and the observability ordering.
- Expect a >800-line change → plan for chained PRs from the task phase onward.