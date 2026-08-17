# Tasks: Backend Timesheets Foundation

## Review Workload Forecast

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High
800-line budget risk: High

| Field                   | Value                                   |
| ----------------------- | --------------------------------------- |
| Estimated changed lines | 1100–1300 (S1 ~900 / S2 ~350 / S3 ~450) |
| Suggested split         | PR 1 (S1) → PR 2 (S2) → PR 3 (S3)       |
| Delivery strategy       | auto-chain                              |

### Work Units

| Unit | PR  | Test cmd                                                                                            | Harness                                                | Rollback                                                                                                |
| ---- | --- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| S1   | 1   | `pnpm --filter api test -- hr-timesheets/{domain,application}`                                      | `pnpm --filter api test:coverage`                      | `features/hr-timesheets/{domain,application}`                                                           |
| S2   | 2   | `pnpm --filter api test -- hr-timesheets/infrastructure/drizzle-timesheets.gateway.test.ts`         | `createMigrationTestDatabase` w/ `0026_timesheets.sql` | `features/hr-timesheets/infrastructure/drizzle-timesheets.gateway.{ts,test.ts}`                         |
| S3   | 3   | `pnpm --filter api test -- hr-timesheets/presentation shared/presentation/error.middleware.test.ts` | supertest vs `createApp`                               | `shared/presentation/error.middleware.ts`, `app/create-app.ts`, `features/hr-timesheets/presentation/*` |

> Orchestrator MUST resolve `pending` → `stacked-to-main`/`feature-branch-chain` before PR creation.

## Phase 1 — S1: Domain + Application (in-memory TDD)

- [x] 1.1 Baseline `pnpm --filter api test`: only 7 pre-existing typecheck failures.
- [x] 1.2 RED `domain/__tests__/state-machine.test.ts`: transitions, reopen→draft, draft-only guards.
- [x] 1.3 GREEN `domain/timesheets.ts`: types, `TimesheetGateway` port, 10 errors, `assertValidPeriodRange`, `assertEntryInPeriod`.
- [x] 1.4 RED `application/__tests__/create-period.test.ts`: range + overlap w/ `InMemoryTimesheetsGateway`.
- [x] 1.5 GREEN `application/create-period.ts`: range + `findActiveAssignment` + throws `TimesheetPeriodOverlapError`.
- [x] 1.6 RED/GREEN `application/__tests__/{get-period,list-periods}.test.ts` + `application/{get-period,list-periods}.ts`: self/direct_reports visible; out-of-scope → 404.
- [x] 1.7 RED/GREEN `application/__tests__/patch-period.test.ts` + `application/patch-period.ts`: non-draft → `TimesheetLockedError`.
- [x] 1.8 RED/GREEN `application/__tests__/entries/{add,update,remove}-entry.test.ts` + `application/entries/{add,update,remove}-entry.ts`: `0<hours≤24`, `entryDate∈[periodStart,periodEnd]`, draft-only.
- [x] 1.9 RED `application/__tests__/{submit,approve,reject,reopen}-period.test.ts`: submit auto-resolves policy, self-approval denied, rejection reason, reopen rejected→draft.
- [x] 1.10 GREEN `application/{submit,approve,reject,reopen}-period.ts` calling `approvalPolicyGateway.findActivePolicyForScope`.
- [x] 1.11 REFACTOR + Verify: dedupe errors, extract shared guards, `pnpm --filter api test` green, baseline typecheck unchanged.

## Phase 2 — S2: Drizzle Gateway (real PG, `23P01`)

- [x] 2.1 RED `infrastructure/drizzle-timesheets.gateway.test.ts` via `applyMigrationsThrough('0026_timesheets.sql')` + `createMigrationTestDatabase`; round-trip CRUD + state ops.
- [x] 2.2 GREEN `infrastructure/drizzle-timesheets.gateway.ts`: mappers (`PeriodDate=string`, `Number(row.hours)`), composite-tenant WHERE, `findActiveAssignment` join.
- [x] 2.3 RED: insert overlapping period → `TimesheetPeriodOverlapError`.
- [x] 2.4 GREEN `isPeriodOverlapViolation` (`code==='23P01' && constraint==='timesheet_periods_no_overlap_excl'`) wrapping `createPeriod`; `EntryConflictError` for `23505`.
- [x] 2.5 Verify `pnpm --filter api test` green; `afterAll` cleans PG.

## Phase 3 — S3: Router + Error Middleware + Wiring

- [x] 3.1 RED extend `shared/presentation/error.middleware.test.ts`: 10 cases mapping 400/404/409.
- [x] 3.2 GREEN register 10 error classes → HTTP in `shared/presentation/error.middleware.ts`.
- [x] 3.3 RED `presentation/timesheets.router.test.ts` (supertest + `createApp` + `InMemoryTimesheetsGateway` + stubbed `computeEffectivePermissions`): happy + 400/403/404/409 for 11 endpoints.
- [x] 3.4 GREEN `presentation/timesheets.router.ts`: Zod mirroring DB CHECKs, 11 endpoints, `requireAuth` + `requireHrCapability(key)` + `ensureCompanyAccess`.
- [x] 3.5 RED `resolveTimesheetPermissionScope`: self, direct_reports, out-of-scope → 404.
- [x] 3.6 GREEN `resolveTimesheetPermissionScope` factory in `app/create-app.ts`; reject `company`/`node+descendants` per design #6.
- [x] 3.7 GREEN add `timesheetGateway?: TimesheetGateway` to `CreateAppInput`; wire `createDrizzleTimesheetsGateway(db)`; `app.use(createTimesheetsRouter(...))`.
- [x] 3.8 Verify green; seeds untouched.

## Phase 4 — Cross-cutting

- [x] 4.1 `.atl/skill-registry.md` untouched; 7-file baseline typecheck unchanged.
- [x] 4.2 `pnpm --filter api test:coverage`; note V8 delta if <80 lines.
