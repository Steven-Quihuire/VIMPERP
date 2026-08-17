# Apply Progress: backend-timesheets-foundation

## Scope

- Current work unit: `remediate-verify-blockers`
- Completed work units: `S1-domain-application`, `S2-drizzle-gateway`, `S3-router-wiring`, `remediate-verify-blockers`
- Delivery strategy: `auto-chain`
- Chain strategy: `feature-branch-chain`
- Size handling: focused chained slice for S3, plus bounded remediation slice after blocked verify

## Completed Tasks

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
- [x] 2.1 RED `infrastructure/drizzle-timesheets.gateway.test.ts` via `applyMigrationsThrough('0026_timesheets.sql')` + `createMigrationTestDatabase`; round-trip CRUD + state ops.
- [x] 2.2 GREEN `infrastructure/drizzle-timesheets.gateway.ts`: mappers (`PeriodDate=string`, `Number(row.hours)`), composite-tenant WHERE, `findActiveAssignment` join.
- [x] 2.3 RED: insert overlapping period → `TimesheetPeriodOverlapError`.
- [x] 2.4 GREEN `isPeriodOverlapViolation` (`code==='23P01' && constraint==='timesheet_periods_no_overlap_excl'`) wrapping `createPeriod`; `EntryConflictError` for `23505`.
- [x] 2.5 Verify `pnpm --filter api test` green; `afterAll` cleans PG.
- [x] 3.1 RED `shared/presentation/error.middleware.test.ts`: 10 failing timesheet error mappings.
- [x] 3.2 GREEN `shared/presentation/error.middleware.ts`: register 10 timesheet domain errors to 400/404/409.
- [x] 3.3 RED `presentation/timesheets.router.test.ts`: createApp + in-memory fixtures fail with missing timesheet routes.
- [x] 3.4 GREEN `presentation/timesheets.router.ts`: 11 endpoints with Zod request validation, `requireAuth`, `requireHrCapability`, and company guard.
- [x] 3.5 RED/GREEN `resolveTimesheetPermissionScope`: prove `self`, `direct_reports`, and out-of-scope → 404.
- [x] 3.6 GREEN `app/create-app.ts`: permission-scope factory rejects company/node fallback and composes visible employee IDs from ERP link + direct reports.
- [x] 3.7 GREEN `CreateAppInput.timesheetGateway?` + `createDrizzleTimesheetsGateway(db)` + `app.use(createTimesheetsRouter(...))` wiring.
- [x] 3.8 Verify green; seeds untouched.
- [x] 4.1 `.atl/skill-registry.md` untouched; `pnpm --filter api typecheck` still reports the same unrelated baseline failures only.
- [x] 4.2 `pnpm --filter api test:coverage` green; V8 lines remain `89.01%`.

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 1.1 | `apps/api/src/features/hr-timesheets/domain/__tests__/state-machine.test.ts` | Unit | ✅ `pnpm --filter api test` → 82 files / 409 tests passing; `pnpm --filter api typecheck` → known unrelated failures in 7 files | ✅ Baseline recorded before S1 edits | ✅ After domain implementation, focused file passed | ✅ 3 behaviors covered: range, entry, lifecycle | ➖ Baseline-only task |
| 1.2 | `apps/api/src/features/hr-timesheets/domain/__tests__/state-machine.test.ts` | Unit | N/A (new) | ✅ Missing module failure on first run | ✅ 3 tests passed after `domain/timesheets.ts` | ✅ Happy + invalid transition + guard edges | ✅ Shared transition/date helpers extracted |
| 1.3 | `apps/api/src/features/hr-timesheets/domain/__tests__/state-machine.test.ts` | Unit | N/A (new) | ✅ Test file written before domain code | ✅ Focused domain test passed | ✅ Draft guard, reopen guard, entry/range guards | ✅ Error + guard definitions centralized |
| 1.4 | `apps/api/src/features/hr-timesheets/application/__tests__/create-period.test.ts` | Unit | N/A (new) | ✅ Missing module failure on first application test run | ✅ Create-period tests passed after use case implementation | ✅ Invalid range, missing assignment, overlap, happy path | ✅ Reused in-memory gateway support |
| 1.5 | `apps/api/src/features/hr-timesheets/application/__tests__/create-period.test.ts` | Unit | N/A (new) | ✅ Test file preceded `create-period.ts` | ✅ 4 create-period tests passing | ✅ Overlap + assignment + success paths | ✅ Validation delegated to shared domain guards |
| 1.6 | `apps/api/src/features/hr-timesheets/application/__tests__/{get-period,list-periods}.test.ts` | Unit | N/A (new) | ✅ Missing module failure on first application test run | ✅ Get/list tests passed after use cases implementation | ✅ Self, direct-report, hidden, status filter | ✅ Visibility logic kept in small use cases |
| 1.7 | `apps/api/src/features/hr-timesheets/application/__tests__/patch-period.test.ts` | Unit | N/A (new) | ✅ Missing module failure on first application test run | ✅ Patch-period tests passed after use case implementation | ✅ Draft success + locked + missing paths | ✅ Draft guard reused from domain |
| 1.8 | `apps/api/src/features/hr-timesheets/application/__tests__/entries/{add,update,remove}-entry.test.ts` | Unit | N/A (new) | ✅ Missing module failure on first application test run | ✅ Entry test files passed after entries use cases implementation | ✅ Add/update/remove happy paths + date/hours/locked/not-found edges | ✅ Shared support + domain validation reused |
| 1.9 | `apps/api/src/features/hr-timesheets/application/__tests__/{submit,approve,reject,reopen}-period.test.ts` | Unit | N/A (new) | ✅ Missing module failure on first application test run | ✅ Lifecycle test files passed after use case implementation | ✅ Policy resolution, self-approval, rejection reason, reopen transition | ✅ Approval-policy port isolated in application layer |
| 1.10 | `apps/api/src/features/hr-timesheets/application/__tests__/{submit,approve,reject,reopen}-period.test.ts` | Unit | N/A (new) | ✅ Tests written before lifecycle use cases | ✅ Submit/approve/reject/reopen tests passing | ✅ Null-policy + invalid transition edges included | ✅ Shared lifecycle guards reused |
| 1.11 | `apps/api/src/features/hr-timesheets/**/__tests__/*.test.ts` | Unit | ✅ Existing suite verified before marking complete | ✅ No new code written before tests in this batch | ✅ `pnpm --filter api test` passed (94 files / 443 tests); `pnpm --filter api test:coverage` passed with 89.01% lines | ✅ End-to-end S1 unit matrix exercised | ✅ Support helpers + guard reuse reduced duplication |
| 2.1 | `apps/api/src/features/hr-timesheets/infrastructure/drizzle-timesheets.gateway.test.ts` | Integration | N/A (new) | ✅ Missing module failure on first focused run | ✅ Focused integration file passed (`4` tests) after gateway implementation | ✅ CRUD/state + tenant-scope assertions exercise multiple DB paths | ✅ Shared PG fixture + deterministic IDs reduced duplication |
| 2.2 | `apps/api/src/features/hr-timesheets/infrastructure/drizzle-timesheets.gateway.test.ts` | Integration | N/A (new) | ✅ Test file written before gateway code | ✅ Domain mappers + composite tenant queries passing against real PG | ✅ `PeriodDate` string and `Number(row.hours)` asserted on read/write/update paths | ✅ Row mappers + error unwrap helpers extracted |
| 2.3 | `apps/api/src/features/hr-timesheets/infrastructure/drizzle-timesheets.gateway.test.ts` | Integration | N/A (new) | ✅ Overlap case written before translation code | ✅ Overlapping insert rejected as `TimesheetPeriodOverlapError` | ✅ Happy adjacent/isolated periods + failing overlap path covered | ✅ Reused shared overlap helper in gateway |
| 2.4 | `apps/api/src/features/hr-timesheets/infrastructure/drizzle-timesheets.gateway.test.ts` | Integration | N/A (new) | ✅ Helper/duplicate-entry assertions written before implementation | ✅ `isPeriodOverlapViolation` + `23505` entry conflict mapping passed | ✅ Positive/negative helper cases + duplicate entry path covered | ✅ Shared cause-unwrapping keeps DB translation logic local |
| 2.5 | `apps/api/src/features/hr-timesheets/infrastructure/drizzle-timesheets.gateway.test.ts` | Integration | ✅ Focused file green before full-suite verify | ✅ No additional production code before verify | ✅ `pnpm --filter api test` passed (`95` files / `447` tests); suite cleanup stayed green with `afterAll` DB teardown | ✅ Focused file + full suite prove S2 slice in isolation and in repo context |
| 3.1 | `apps/api/src/shared/presentation/error.middleware.test.ts` | Integration | ✅ `pnpm --filter api exec vitest run src/shared/presentation/error.middleware.test.ts` → 1 file / 3 tests passing | ✅ 10 new mapping assertions failed at 500 before middleware registration | ✅ Focused file passed with 13 tests after mapping implementation | ✅ 400 + 404 + 409 branches covered across all 10 domain errors | ✅ Table-driven coverage removed duplication |
| 3.2 | `apps/api/src/shared/presentation/error.middleware.test.ts` | Integration | ✅ Existing middleware tests green before edits | ✅ Timesheet errors unhandled before registration | ✅ Error middleware returns typed status/code payloads for all 10 domain errors | ✅ Validation/not-found/conflict cases split across independent assertions | ✅ Mapping branches grouped with existing middleware conventions |
| 3.3 | `apps/api/src/features/hr-timesheets/presentation/timesheets.router.test.ts` | E2E | N/A (new) | ✅ New supertest file failed with 404s before router/wiring | ✅ Focused router file passed (`5` tests) after router + createApp wiring | ✅ Happy path + 400/403/404/409 cover all 11 endpoints through createApp | ✅ Shared auth/HR/timesheet fixtures extracted |
| 3.4 | `apps/api/src/features/hr-timesheets/presentation/timesheets.router.test.ts` | E2E | N/A (new) | ✅ Route expectations written before `timesheets.router.ts` existed | ✅ Zod + middleware + endpoint status contracts all pass | ✅ Create/list/get/patch/entry/lifecycle flows exercise distinct code paths | ✅ Router mirrors approval-policy style and keeps handler bodies small |
| 3.5 | `apps/api/src/features/hr-timesheets/presentation/timesheets.router.test.ts` | E2E | N/A (new) | ✅ Scope assertions written before resolver existed | ✅ `self` and `direct_reports` scopes recorded; outsider returns 404 | ✅ Read routes plus create route prove both visible and hidden targets | ✅ Resolver helpers centralized in create-app |
| 3.6 | `apps/api/src/features/hr-timesheets/presentation/timesheets.router.test.ts` | E2E | ✅ `approval-policy.router.test.ts` + `require-hr-capability.test.ts` passed before `create-app.ts` edits | ✅ createApp lacked timesheet wiring/scope factory before implementation | ✅ Focused cross-slice suite passed (4 files / 25 tests) after factory wiring | ✅ Resolver explicitly avoids `company` and `node+descendants` fallback | ✅ Visible-employee helper dedupes ERP self + direct reports |
| 3.7 | `apps/api/src/features/hr-timesheets/presentation/timesheets.router.test.ts` | E2E | ✅ Existing createApp-backed router tests green before edits | ✅ `timesheetGateway` input and mount path absent before wiring | ✅ createApp-backed timesheet routes pass with injected in-memory gateway and default Drizzle path compiled | ✅ Injected gateway + default gateway paths both exercised across focused/full suite | ✅ Approval-policy adapter kept local to composition root |
| 3.8 | `apps/api/src/features/hr-timesheets/presentation/timesheets.router.test.ts` | E2E | ✅ Focused S3 suite green before full verify | ✅ No production edits after focused suite before verify | ✅ `pnpm --filter api test` passed (`96` files / `462` tests) on final rerun; `pnpm --filter api test:coverage` passed with `89.01%` lines | ✅ Focused + full-suite + coverage prove the slice end to end | ➖ Verification-only task |
| 4.1 | `apps/api/src/features/hr-timesheets/presentation/timesheets.router.test.ts` | E2E | ✅ `git status --short` confirmed `.atl/skill-registry.md` pre-existing and untouched | ✅ No unrelated edits introduced before baseline check | ✅ `pnpm --filter api typecheck` still exits `2` with the same unrelated baseline failures only | ✅ Rechecked after all code changes; no new typecheck debt remained | ➖ Repo hygiene task |
| 4.2 | `apps/api/src/features/hr-timesheets/presentation/timesheets.router.test.ts` | E2E | ✅ Focused + full suite green before coverage | ✅ Coverage command deferred until production code stabilized | ✅ `pnpm --filter api test:coverage` passed (`96` files / `462` tests; `89.01%` lines) | ✅ Coverage stayed above 80% threshold without extra fixtures | ➖ Verification-only task |

## Test Summary

- **Total tests written**: 53
- **Total tests passing**: 53 new S1+S2+S3 tests; final suite `462` passing
- **Layers used**: Unit (34), Integration (14), E2E (5)
- **Approval tests**: None — new slice work
- **Pure functions created**: 14 (`assert*` domain guards + S2 mapper helpers; S3 added orchestration helpers, not new pure-function surfaces)

## Work Unit Evidence

| Work Unit | Evidence | Value |
|---|---|---|
| S1-domain-application | Focused test command and exact result | `pnpm --filter api test -- src/features/hr-timesheets` → exit `0`; `94` test files passed / `443` tests passed |
| S1-domain-application | Runtime harness command/scenario and exact result | `pnpm --filter api test:coverage` → exit `0`; coverage `89.01%` lines with all `94` test files / `443` tests passing |
| S1-domain-application | Rollback boundary | Revert `apps/api/src/features/hr-timesheets/domain/**`, `apps/api/src/features/hr-timesheets/application/**`, and `openspec/changes/backend-timesheets-foundation/{tasks.md,apply-progress.md}` only |
| S2-drizzle-gateway | Focused test command and exact result | `pnpm --filter api exec vitest run src/features/hr-timesheets/infrastructure/drizzle-timesheets.gateway.test.ts` → exit `0`; `1` test file / `4` tests passed |
| S2-drizzle-gateway | Runtime harness command/scenario and exact result | `pnpm --filter api test` → exit `0`; `95` test files / `447` tests passed using the real PostgreSQL migration harness and `afterAll` cleanup |
| S2-drizzle-gateway | Rollback boundary | Revert `apps/api/src/features/hr-timesheets/infrastructure/drizzle-timesheets.gateway.{ts,test.ts}` and `openspec/changes/backend-timesheets-foundation/{tasks.md,apply-progress.md}` only |
| S3-router-wiring | Focused test command and exact result | `pnpm --filter api exec vitest run src/shared/presentation/error.middleware.test.ts src/features/hr-timesheets/presentation/timesheets.router.test.ts src/features/approval-policy/presentation/approval-policy.router.test.ts src/features/roles-management/presentation/require-hr-capability.test.ts` → exit `0`; `4` test files / `25` tests passed |
| S3-router-wiring | Runtime harness command/scenario and exact result | `pnpm --filter api test` → first run hit a transient unrelated `admin.audit.integration` 401 during login, rerun exit `0`; final result `96` test files / `462` tests passed. `pnpm --filter api test:coverage` → exit `0`; `96` files / `462` tests with `89.01%` lines |
| S3-router-wiring | Rollback boundary | Revert `apps/api/src/shared/presentation/error.middleware.{ts,test.ts}`, `apps/api/src/app/create-app.ts`, `apps/api/src/features/hr-timesheets/presentation/*`, and `openspec/changes/backend-timesheets-foundation/{tasks.md,apply-progress.md}` only |

## Remediation — Verify Blockers

- [x] Removed the stray non-technical Phase 5 / task 5.1 from `tasks.md` so the persisted task ledger now reflects only real engineering work.
- [x] Reworked `submitPeriod` so the gateway owns the atomic submit transaction: lock/reload the period row, re-check draft status, reload the active assignment scope, resolve the approval policy inside the transaction, and persist the submitted snapshot in one DB unit.
- [x] Added remediation tests proving stale pre-read submit attempts are rejected and the Drizzle gateway resolves the latest assignment scope during atomic submit.

### Remediation TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| R1 | `openspec/changes/backend-timesheets-foundation/tasks.md` | Artifact | N/A (artifact cleanup only) | ➖ Structural cleanup; verify blocker identified from `verify-report.md` before editing `tasks.md` | ✅ Re-read `tasks.md`: stray Phase 5 removed and no unchecked remediation artifact remains | ➖ Single structural output | ➖ None needed |
| R2 | `apps/api/src/features/hr-timesheets/application/__tests__/submit-period.test.ts`, `apps/api/src/features/hr-timesheets/infrastructure/drizzle-timesheets.gateway.test.ts` | Unit + Integration | ✅ `pnpm --filter api exec vitest run src/features/hr-timesheets/application/__tests__/submit-period.test.ts` → exit `0`; `3` tests passed. ✅ `pnpm --filter api exec vitest run src/features/hr-timesheets/infrastructure/drizzle-timesheets.gateway.test.ts` → exit `0`; `4` tests passed. | ✅ Added a stale-pre-read submit rejection test that failed because submit overwrote an already-approved period. ✅ Updated gateway tests to require in-transaction policy resolution by current assignment scope. | ✅ `pnpm --filter api exec vitest run src/features/hr-timesheets/application/__tests__/submit-period.test.ts` → exit `0`; `4` tests passed. ✅ `pnpm --filter api exec vitest run src/features/hr-timesheets/infrastructure/drizzle-timesheets.gateway.test.ts` → exit `0`; `5` tests passed. | ✅ Unit test covers stale status race; integration test covers latest assignment scope + policy snapshot through the real PostgreSQL harness. | ✅ Moved atomic submit orchestration into the gateway transaction and simplified the use case to pass only the policy resolver callback. |

### Remediation Work Unit Evidence

| Evidence | Value |
|---|---|
| Focused test command and exact result | `pnpm --filter api exec vitest run src/features/hr-timesheets/application/__tests__/submit-period.test.ts src/features/hr-timesheets/infrastructure/drizzle-timesheets.gateway.test.ts` → exit `0`; `2` test files / `9` tests passed |
| Runtime harness command/scenario and exact result | `pnpm --filter api exec vitest run src/features/hr-timesheets/presentation/timesheets.router.test.ts` → exit `0`; `1` test file / `5` tests passed through `createApp` + Supertest |
| Rollback boundary | Revert `apps/api/src/features/hr-timesheets/{domain/timesheets.ts,application/submit-period.ts,application/__tests__/submit-period.test.ts,application/__tests__/support.ts,infrastructure/drizzle-timesheets.gateway.ts,infrastructure/drizzle-timesheets.gateway.test.ts}` plus `openspec/changes/backend-timesheets-foundation/{tasks.md,apply-progress.md}` only |

## Deviations from Design

- Previous submit-flow deviation resolved: `TimesheetGateway.submitPeriod` now performs the design-required transaction with `SELECT ... FOR UPDATE`, re-checks draft status from the locked row, reloads the active assignment scope, resolves the policy snapshot inside the transaction, and updates the submitted fields atomically.
- `findActiveAssignment` still returns `scopeNodeId` in addition to `id/companyId/employeeId`; this remains the clean boundary that lets submit resolve policy scope without leaking HR gateway dependencies into the application layer.
- `create-app.ts` still adapts approval-policy lookups by exact `scopeNodeId`, but that lookup now runs through the submit gateway's transaction callback instead of across separate pre-submit reads and writes.

## Remaining Tasks

- None.

## Status

- S1, S2, S3, cross-cutting 4.1/4.2, and remediation `remediate-verify-blockers` complete.
- Ready for `sdd-verify`.
