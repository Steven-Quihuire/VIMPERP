# Tasks: Frontend HR Timesheets (Registro de horas)

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

Estimated changed lines ~1180 (430 backend + 750 frontend). Auto-chain with feature-branch-chain. PRs: backend → foundation → UI; PR #1 targets the tracker branch, PR #2 targets PR #1, and PR #3 targets PR #2. Maintainer authorized updating this plan and splitting into smaller sub-phases/PRs if implementation exceeds the forecast or review burden.

### Work Units

**Unit 1** — `GET .../timesheets/:periodId/entries` + `hr.timesheets.read` (PR #1 base: feature/tracker branch). `pnpm --filter api test -- hr-timesheets resolve-auth-session`. supertest 200 own/direct, 200 empty, 403, 400; vitest in-memory gateway. Rollback: revert `list-entries.ts`, router entries, cap union, `resolveScopedCapabilities`, `create-app`.

**Unit 2** — `HttpError.code`, `AuthCapability`+predicate, DTOs/Zod, typed API, queries, draft store, friendly error (PR #2 base: PR #1 branch). `pnpm --filter web test -- http-client auth-domain create-hr-timesheets-api hr-timesheets-queries weekly-entry-draft-store friendly-timesheet-error`. vitest fetch mock; `QueryClient` keys+invalidation. Rollback: delete `features/hr-timesheets/{domain,application,infrastructure}`; revert http-client `code`, auth union.

**Unit 3** — list + detail + draft edit + actions + sidebar + routes + e2e (PR #3 base: PR #2 branch). `pnpm --filter web test -- hr-timesheets app.hr-routes app.dashboard-shell dashboard-app-sidebar`; `pnpm exec playwright test e2e/timesheets.spec.ts`. Testing Library + MSW; Playwright manager-approve + self-submit. Rollback: revert pages/components, sidebar Timesheets, `app.tsx` HR routes.

## Phase 1

- [x] 1.1 RED: cap union — `features/identity/domain/__tests__/auth-capabilities.test.ts`
- [x] 1.2 GREEN: add `hr.timesheets.read|write|submit|approve` → `features/identity/domain/auth.ts`
- [x] 1.3 RED: `hr.timesheets.read` granted/omitted — `features/identity/application/__tests__/resolve-auth-session.test.ts`
- [x] 1.4 GREEN: whitelist in `resolveScopedCapabilities`
- [x] 1.5 RED: own/direct entries, out-of-scope throws `TimesheetPeriodNotFoundError`, empty `[]` — `features/hr-timesheets/application/__tests__/list-entries.test.ts`
- [x] 1.6 GREEN: create `features/hr-timesheets/application/list-entries.ts` (mirror `get-period.ts`)
- [x] 1.7 RED: supertest 200 own/empty, 403, 400 — `features/hr-timesheets/presentation/timesheets.router.test.ts`
- [x] 1.8 GREEN: add `GET .../timesheets/:periodId/entries` to router
- [x] 1.9 Wire `createListEntriesUseCase` in `app/create-app.ts`; pass `listEntries`

## Phase 2

- [x] 2.1 RED: `HttpError.code` propagates — `shared/lib/http/http-client.test.ts`
- [x] 2.2 GREEN: add `readonly code?: string`; extract `body.error.code`
- [x] 2.3 RED: `AuthCapability` + `hasTimesheetReadVisibility` — `features/auth/domain/auth.test.ts`
- [x] 2.4 GREEN: extend `AuthCapability`; export `hasTimesheetReadVisibility`
- [x] 2.5 RED: DTOs/Zod + action predicates — `features/hr-timesheets/domain/__tests__/timesheets-domain.test.ts`
- [x] 2.6 GREEN: create `features/hr-timesheets/domain/timesheets.ts`
- [x] 2.7 RED: 11 methods + `code` — `features/hr-timesheets/infrastructure/create-hr-timesheets-api.test.ts`
- [x] 2.8 GREEN: create `features/hr-timesheets/infrastructure/create-hr-timesheets-api.ts`
- [x] 2.9 RED: keys stable; mutations invalidate `period`+`periodEntries`+`periodsList` — `features/hr-timesheets/application/hr-timesheets-queries.test.tsx`
- [x] 2.10 GREEN: create `features/hr-timesheets/application/hr-timesheets-queries.ts`
- [x] 2.11 RED: draft buffer + reject-dialog — `features/hr-timesheets/application/weekly-entry-draft-store.test.ts`
- [x] 2.12 GREEN: create `features/hr-timesheets/application/weekly-entry-draft-store.ts`
- [x] 2.13 RED: typed codes → friendly Spanish; unknown fallback — `features/hr-timesheets/domain/__tests__/friendly-timesheet-error.test.ts`
- [x] 2.14 GREEN: create `features/hr-timesheets/domain/friendly-timesheet-error.ts`

## Phase 3

- [x] 3.1 RED: status filter narrows list; friendly error — `features/hr-timesheets/presentation/pages/__tests__/timesheet-periods-list.test.tsx`
- [x] 3.2 GREEN: create `features/hr-timesheets/presentation/pages/timesheet-periods-list.tsx`
- [x] 3.3 RED: composes period+entries; conflict banner; non-editable hides controls — `features/hr-timesheets/presentation/pages/__tests__/timesheet-period-detail.test.tsx`
- [x] 3.4 GREEN: create `features/hr-timesheets/presentation/pages/timesheet-period-detail.tsx`
- [x] 3.5 RED: create/update/delete only when editable — `features/hr-timesheets/presentation/components/__tests__/weekly-entry-editor.test.tsx`
- [x] 3.6 GREEN: create `features/hr-timesheets/presentation/components/weekly-entry-editor.tsx`
- [x] 3.7 RED: Timesheets iff `hasTimesheetReadVisibility` true, hidden even when `hasHrResponsibility` true — `features/dashboard/presentation/__tests__/dashboard-app-sidebar.test.tsx`
- [x] 3.8 GREEN: add `Timesheets` to `hrItems` in `dashboard-app-sidebar.tsx` gated by `hasTimesheetReadVisibility`
- [x] 3.9 RED: fetch stubs + headings — extend `app.hr-routes.test.tsx`
- [x] 3.10 GREEN: add `HrTimesheetsRoute` + `HrTimesheetDetailRoute` in `app/app.tsx`
- [x] 3.11 RED scenario: authorized empty-list route reaches the authenticated Timesheets UI — `e2e/timesheets.spec.ts`
- [x] 3.12 GREEN Playwright: seed RRHH foundation and run the authorized empty-list scenario
