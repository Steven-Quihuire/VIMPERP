# Tasks: Observability Audit Provisioning

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 1800-2400 (3 migrations + 3 backend slices + 1 web slice) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | Tracker `feature/observability-audit-provisioning` (draft, no-merge) → PR 1 schema → PR 2 sanitizer/middleware → PR 3 recorder/orchestration/sweep → PR 4 admin API → PR 5 admin web |
| Delivery strategy | ask-on-risk |
| Chain strategy | feature-branch-chain |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

Tracker branch `feature/observability-audit-provisioning` is a draft/no-merge integration branch; only the tracker merges to main. Each child PR targets its immediate parent branch so the diff stays focused on one work unit.

| Unit | Goal | Likely PR | Base branch | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|-------------|----------------------|-----------------|-------------------|
| 1 | Schema baseline (company_services, audit JSONB, observability tables) | PR 1 | `feature/observability-audit-provisioning` (tracker) | `pnpm --filter api test db.migration.test.ts` | `pnpm --filter api db:migrate` against Docker Postgres | drop new tables; restore text `details`; legacy `services` column untouched (dual-write) |
| 2 | Sanitizer + correlation + error middleware recording 500s | PR 2 | `pr-1/schema-baseline` | `pnpm --filter api test error-sanitizer.test.ts` | `curl` against `POST /companies` with malformed body (expect sanitized row) | remove `error-sanitizer.ts`; revert middleware; recorder not yet wired |
| 3 | ProvisioningRecorder + create-company orchestration + sweep worker | PR 3 | `pr-2/observability-foundation` | `pnpm --filter api test create-company.test.ts sweep-stale.test.ts` | manual onboarding via `pnpm dev:api`; inspect `provisioning_runs` and `application_errors` | drop `drizzle-provisioning.recorder.ts`; gateway tx semantics unchanged; sweep timer unref'd |
| 4 | Admin API: 6 routes behind `requirePlatformAdmin` | PR 4 | `pr-3/provisioning-orchestration` | `pnpm --filter api test admin.route.test.ts` | `curl -H 'cookie: …platform-admin' /admin/provisioning-runs` | remove 6 routes; existing admin slice (notifications/summary) unaffected |
| 5 | Admin web: list+detail screens, route guards | PR 5 | `pr-4/admin-api` | `pnpm --filter web test app.dashboard-shell.test.tsx` | `pnpm dev:web` as platform-admin vs company user | revert `app.tsx` routes and feature folder; existing dashboard unaffected |

## Phase 1: Database Schema (PR 1)

- [x] 1.1 [RED] write `apps/api/src/db/migrations/__tests__/0003_company_services.test.ts` asserting backfill from text JSON
- [x] 1.2 [GREEN] generate + apply `0003_company_services.sql` (table, dedup backfill, dual-write preserved)
- [x] 1.3 [RED] write `0004_audit_events.test.ts` asserting `details::jsonb` cast + new columns
- [x] 1.4 [GREEN] generate + apply `0004_audit_events.sql` (jsonb cast, `correlation_id`, `entity_type`, `old_values`, `new_values`, indexes)
- [x] 1.5 [RED] write `0005_observability.test.ts` asserting enums, runs/steps/errors tables, partial unique
- [x] 1.6 [GREEN] generate + apply `0005_observability.sql` (enums + 3 tables + indexes)
- [x] 1.7 [GREEN] update `apps/api/src/shared/infrastructure/db/schema.ts` with new tables, enums, columns, types

## Phase 2: Observability Foundation (PR 2)

- [x] 2.1 [RED] write `error-sanitizer.test.ts` for allowlist + regex redaction + fingerprint
- [x] 2.2 [GREEN] create `apps/api/src/shared/infrastructure/observability/error-sanitizer.ts`
- [x] 2.3 [RED] write `error.middleware.test.ts` asserting 500 records sanitized row (no-throw)
- [x] 2.4 [GREEN] modify `error.middleware.ts` to call sanitizer + persist via recorder port
- [x] 2.5 [GREEN] modify `shared/presentation/observability.ts` to honor bounded sanitized `x-correlation-id` and set `response.locals.requestContext`

## Phase 3: Provisioning Orchestration + Sweep (PR 3)

- [x] 3.1 [RED] write `provisioning.recorder.test.ts` (start/succeed/fail/sweep stubs)
- [x] 3.2 [GREEN] create `apps/api/src/features/companies/infrastructure/drizzle-provisioning.recorder.ts`
- [x] 3.3 [RED] extend `features/companies/domain/company.ts` with `ProvisioningRecorder` port + `correlationId` input
- [x] 3.4 [RED] write `create-company.test.ts` for run-start, atomic tx, succeed/fail orchestration
- [x] 3.5 [GREEN] modify `features/companies/application/create-company.ts` to wrap gateway with recorder
- [x] 3.6 [REFACTOR] keep gateway one atomic tx; ensure recorder writes commit OUTSIDE `db.transaction`
- [x] 3.7 [RED] write `sweep-stale-provisioning-runs.test.ts` (only stale `running` → `incomplete`)
- [x] 3.8 [GREEN] create `features/companies/application/sweep-stale-provisioning-runs.ts`
- [x] 3.9 [GREEN] wire Zod-validated interval worker (unref'd) in `apps/api/src/main.ts`; wire deps in `create-app.ts`
- [x] 3.10 modify `drizzle-company.gateway.ts` to insert `company_services` rows + write JSONB audit

## Phase 4: Admin API (PR 4)

- [x] 4.1 [RED] extend `features/admin/domain/admin.ts` with observability read types and gateway port methods
- [x] 4.2 [GREEN] add 6 list/detail queries to `drizzle-admin.gateway.ts` (cursor pagination, Zod filters)
- [x] 4.3 [RED] extend `admin.route.test.ts` with 200/403/401 cases for each new route
- [x] 4.4 [GREEN] add 6 routes in `admin.router.ts` guarded by `requireAuth` + `requirePlatformAdmin`
- [x] 4.5 [GREEN] create 6 use cases under `features/admin/application/` (list/get runs, errors, audit)
- [x] 4.6 [REFACTOR] centralize cursor encoding; no Drizzle rows leak to responses

## Phase 5: Admin Web Workspace (PR 5)

- [x] 5.1 [RED] extend `app.dashboard-shell.test.tsx`: admin sees screens, company user redirected
- [x] 5.2 [GREEN] add 3 list + 3 detail screens under `apps/web/src/features/dashboard/presentation/`
- [x] 5.3 [GREEN] add 3 query hooks + 3 client fns (TanStack Query, `enabled: isPlatformAdmin`)
- [x] 5.4 [GREEN] add types under `features/dashboard/domain/`; HttpClient calls in `infrastructure/`
- [x] 5.5 [GREEN] add `/dashboard/admin/*` routes in `apps/web/src/app/app.tsx` guarded by `canViewAdminSignals`
- [x] 5.6 [REFACTOR] remove any retry/delete affordances; verify empty-state copy per dashboard-shell spec

## Phase 6: Verification

- [ ] 6.1 run `pnpm test` — full unit + route + migration suite green
- [ ] 6.2 run `pnpm --filter api test:coverage` — verify ≥80% on new modules
- [ ] 6.3 run `pnpm build` — both apps compile clean
- [ ] 6.4 manual smoke: failing onboarding leaves run+error rows; admin screens render and 403 for company users
