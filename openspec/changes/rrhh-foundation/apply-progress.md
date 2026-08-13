## Implementation Progress

**Change**: rrhh-foundation
**Mode**: Strict TDD

### Completed Tasks
- [x] 1.1 Bootstrap: `pnpm test` green on `apps/api` and `apps/web`.
- [x] 1.2 RED `db/migrations/__tests__/migration-0022-rrhh-foundation.test.ts`: `applyMigrationsThrough(..., '0021')` proves no legacy `employees` table exists; `0022` creates RRHH tables + partial uniques + CHECKs.
- [x] 1.3 Author `db/migrations/0022_rrhh_foundation.sql` + register it in `meta/_journal.json`.
- [x] 1.4 GREEN the migration test and refactor `apps/api/src/shared/infrastructure/db/schema.ts` to match the additive `0022` schema exactly.
- [x] 2.1 RED `features/hr-employees/domain/__tests__/positions.test.ts`: top-of-hierarchy, vacancy ≤ headcount.
- [x] 2.2 Author `domain/{positions,employees,employee-assignments,reporting-line}.ts`.
- [x] 2.3 RED `application/__tests__/create-assignment.test.ts`: auto-close prior active primary in one tx; 409 on duplicate.
- [x] 2.4 Author `application/{create,update,get,list}-employee.ts`, `create-position.ts`, `create-assignment.ts`, `resolve-reporting-line.ts`, `resolve-direct-reports.ts`.
- [x] 2.5 Author `infrastructure/drizzle-hr-employees.gateway.ts` + integration test.
- [x] 2.6 Author `presentation/hr-employees.router.ts` (Zod + controller + router) + Supertest.
- [x] 2.7 Modify `features/org-hierarchy/infrastructure/drizzle-org-hierarchy.gateway.ts`: `countEmployeesInArea` reads active `employee_assignments`; update test.

### Files Changed
| File | Action | What Was Done |
|------|--------|---------------|
| `apps/api/src/db/migrations/__tests__/migration-0022-rrhh-foundation.test.ts` | Created | Added strict-TDD migration coverage that proves the live baseline through `0021` has no `employees` table and that `0022` creates the RRHH foundation schema plus constraints. |
| `apps/api/src/db/migrations/0022_rrhh_foundation.sql` | Created | Authored the additive RRHH foundation migration for employees, positions, employee assignments, ERP access links/invitations, and approval policies. |
| `apps/api/src/shared/infrastructure/db/schema.ts` | Modified | Replaced the legacy employee row shape with the additive RRHH foundation tables so Drizzle matches `0022` exactly. |
| `apps/api/src/db/migrations/meta/_journal.json` | Modified | Registered migration `0022_rrhh_foundation` in the Drizzle journal. |
| `apps/api/src/features/hr-employees/domain/positions.ts` | Created | Added HR position rules for top-of-hierarchy validation and vacancy/headcount calculation. |
| `apps/api/src/features/hr-employees/domain/employees.ts` | Created | Added the employee aggregate and the HR gateway contract for employees, positions, assignments, and scope-node lookups. |
| `apps/api/src/features/hr-employees/domain/employee-assignments.ts` | Created | Added the employee-assignment entity and duplicate-active-assignment domain conflict. |
| `apps/api/src/features/hr-employees/domain/reporting-line.ts` | Created | Added the reporting-line DTO returned by manager/direct-report resolution use cases. |
| `apps/api/src/features/hr-employees/domain/__tests__/positions.test.ts` | Created | Wrote the RED/GREEN domain coverage for top positions, vacancy counts, and headcount overflow rejection. |
| `apps/api/src/features/hr-employees/application/{create,update,get,list}-employee.ts` | Created | Added employee CRUD-facing use-case entry points for the backend slice. |
| `apps/api/src/features/hr-employees/application/{create-position,create-assignment,resolve-reporting-line,resolve-direct-reports}.ts` | Created | Added position creation, assignment orchestration, manager resolution, and direct-report resolution use cases. |
| `apps/api/src/features/hr-employees/application/__tests__/create-assignment.test.ts` | Created | Wrote RED/GREEN application coverage for auto-closing the prior primary assignment and duplicate-assignment conflicts. |
| `apps/api/src/features/hr-employees/infrastructure/drizzle-hr-employees.gateway.ts` | Created | Added the Drizzle gateway for employees, positions, assignments, and reporting-line reads. |
| `apps/api/src/features/hr-employees/infrastructure/drizzle-hr-employees.gateway.test.ts` | Created | Added real-postgres integration coverage for persisted employees, positions, assignments, managers, and direct reports. |
| `apps/api/src/features/hr-employees/presentation/hr-employees.router.ts` | Created | Added the HR employees router with Zod parsing for employee, position, assignment, and reporting-line endpoints. |
| `apps/api/src/features/hr-employees/presentation/hr-employees.router.test.ts` | Created | Added Supertest coverage for the full PR-2 happy path across employee, position, assignment, manager, and direct-report endpoints. |
| `apps/api/src/app/create-app.ts` | Modified | Wired the new HR employees gateway, use cases, and router into the API composition root. |
| `apps/api/src/features/org-hierarchy/infrastructure/drizzle-org-hierarchy.gateway.ts` | Modified | Rewired `countEmployeesInArea` to count active `employee_assignments` instead of removed legacy employee columns. |
| `apps/api/src/features/org-hierarchy/infrastructure/drizzle-org-hierarchy.gateway.test.ts` | Modified | Updated org-hierarchy infrastructure coverage to model active employee assignments for area delete preflight. |
| `apps/api/src/shared/presentation/error.middleware.ts` | Modified | Added HTTP mapping for the new HR employee not-found and conflict domain errors. |
| `openspec/changes/rrhh-foundation/tasks.md` | Modified | Marked PR-1 Phase 1 tasks `1.1` through `1.4` complete for this stacked slice. |
| `openspec/changes/rrhh-foundation/tasks.md` | Modified | Marked PR-2 Phase 2 tasks `2.1` through `2.7` complete for this stacked slice. |
| `openspec/changes/rrhh-foundation/apply-progress.md` | Modified | Merged the previous PR-1 evidence with the successful PR-2 HR-employees slice evidence. |

### Work Unit Evidence
| Evidence | Value |
|---|---|
| Focused test command and exact result | `pnpm --filter api exec vitest run src/db/migrations/__tests__/migration-0022-rrhh-foundation.test.ts` → exit `0`; `1` file / `2` tests passed. |
| Runtime harness command/scenario and exact result | `pnpm --filter api test && pnpm --filter web test` → exit `0`; API `56` files / `328` tests passed, Web `30` files / `129` tests passed. Scenario: strict-TDD PR-1 bootstrap plus full regression proof after applying the additive RRHH migration/schema slice. |
| Rollback boundary | Revert only `apps/api/src/db/migrations/__tests__/migration-0022-rrhh-foundation.test.ts`, `apps/api/src/db/migrations/0022_rrhh_foundation.sql`, `apps/api/src/shared/infrastructure/db/schema.ts`, `apps/api/src/db/migrations/meta/_journal.json`, and the PR-1 checkbox/apply-progress artifact updates. |

| `PR-2` Focused test command and exact result | `pnpm --filter api exec vitest run src/features/hr-employees/domain/__tests__/positions.test.ts src/features/hr-employees/application/__tests__/create-assignment.test.ts src/features/hr-employees/infrastructure/drizzle-hr-employees.gateway.test.ts src/features/hr-employees/presentation/hr-employees.router.test.ts src/features/org-hierarchy/infrastructure/drizzle-org-hierarchy.gateway.test.ts src/features/org-hierarchy/presentation/org-hierarchy.router.test.ts src/features/roles-management/application/compute-effective-permissions.test.ts src/features/identity/application/resolve-auth-session.test.ts` → exit `0`; `8` files / `80` tests passed. |
| `PR-2` Runtime harness command/scenario and exact result | `pnpm --filter api test` → exit `0`; `60` files / `335` tests passed. Scenario: full API regression after wiring the new `hr-employees` slice and rewiring org-hierarchy area delete preflight to active employee assignments. |
| `PR-2` Rollback boundary | Revert only `apps/api/src/features/hr-employees/**`, `apps/api/src/app/create-app.ts`, `apps/api/src/features/org-hierarchy/infrastructure/drizzle-org-hierarchy.gateway.ts`, `apps/api/src/features/org-hierarchy/infrastructure/drizzle-org-hierarchy.gateway.test.ts`, `apps/api/src/shared/presentation/error.middleware.ts`, and the PR-2 checkbox/apply-progress updates. |

### TDD Cycle Evidence
| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 1.1 | Existing suites: `apps/api` + `apps/web` | Unit / integration safety net | ✅ `pnpm --filter api test && pnpm --filter web test` passed | ➖ Bootstrap gate only | ✅ Green bootstrap confirmed before RRHH RED work | ➖ Not applicable | ➖ None needed |
| 1.2 | `apps/api/src/db/migrations/__tests__/migration-0022-rrhh-foundation.test.ts` | Integration (real Postgres migration DB) | ✅ Bootstrap suites green | ✅ Wrote two failing migration scenarios first: missing `0022` file and absent RRHH schema/constraints | ✅ Same file passed after landing `0022` and journal registration | ✅ Two cases: baseline/no-legacy-table proof + constraint enforcement proof | ➖ None needed |
| 1.3 | `apps/api/src/db/migrations/__tests__/migration-0022-rrhh-foundation.test.ts` | Integration (real Postgres migration DB) | ✅ Bootstrap suites green | ✅ SQL required by the RED migration spec was absent before implementation | ✅ `0022_rrhh_foundation.sql` plus journal entry satisfied the focused migration suite | ✅ Covered both schema-creation and constraint scenarios from the same RED file | ➖ None needed |
| 1.4 | `apps/api/src/db/migrations/__tests__/migration-0022-rrhh-foundation.test.ts` | Integration (real Postgres migration DB) | ✅ Bootstrap suites green | ✅ Schema mismatch remained until `schema.ts` matched the additive `0022` tables | ✅ Focused migration suite stayed green after the Drizzle schema refactor | ✅ The second test case forced non-trivial partial unique and CHECK coverage | ✅ Schema extraction left the DB contract cleaner and explicit |
| 2.1 | `apps/api/src/features/hr-employees/domain/__tests__/positions.test.ts` | Unit | N/A (new) | ✅ Wrote top-of-hierarchy and vacancy/headcount assertions before the domain rules existed | ✅ Same file passed after adding `positions.ts` | ✅ Happy path + headcount overflow edge case | ➖ None needed |
| 2.2 | `apps/api/src/features/hr-employees/domain/__tests__/positions.test.ts` | Unit | N/A (new) | ✅ Domain contract referenced missing HR domain files first | ✅ Passed after adding the employee, position, assignment, and reporting-line domain modules | ✅ Domain files support both top-position and vacancy scenarios | ➖ None needed |
| 2.3 | `apps/api/src/features/hr-employees/application/__tests__/create-assignment.test.ts` | Unit | N/A (new) | ✅ Wrote the failing auto-close and duplicate-conflict application scenarios first | ✅ Same file passed after `create-assignment.ts` existed | ✅ Two cases: auto-close prior primary + 409-equivalent conflict path | ➖ None needed |
| 2.4 | `apps/api/src/features/hr-employees/application/__tests__/create-assignment.test.ts` | Unit | N/A (new) | ✅ The RED assignment tests referenced the missing use cases | ✅ Assignment orchestration passed once employee/position/reporting-line use cases landed | ✅ Assignment flow now supports both mutation and read resolution use cases | ✅ Kept the use-case layer thin and domain-driven |
| 2.5 | `apps/api/src/features/hr-employees/infrastructure/drizzle-hr-employees.gateway.test.ts` | Integration (real Postgres DB) | N/A (new) | ✅ Wrote the persistence and reporting-line integration scenario before the gateway existed | ✅ Same file passed after adding the Drizzle HR gateway | ✅ One scenario covers employee/position creation; another path verifies manager/direct-report reads from persisted assignments | ✅ Minimal mappers and transaction boundary kept the gateway explicit |
| 2.6 | `apps/api/src/features/hr-employees/presentation/hr-employees.router.test.ts` | Integration (Supertest) | ✅ Existing router suites green before composition edits | ✅ Wrote the end-to-end HR router flow before the router/composition existed | ✅ Same file passed after wiring the router in `create-app.ts` | ✅ The flow triangulates create employee, create position, assign, manager read, and direct-reports read | ✅ Router stays focused on Zod parsing plus use-case delegation |
| 2.7 | `apps/api/src/features/org-hierarchy/infrastructure/drizzle-org-hierarchy.gateway.test.ts` | Unit/integration hybrid fake DB | ✅ `src/features/org-hierarchy/infrastructure/drizzle-org-hierarchy.gateway.test.ts` was green before edit | ✅ Updated the area dependency test to fail until `countEmployeesInArea` consumed `employee_assignments` | ✅ Existing gateway test passed after the rewire | ✅ The area preflight scenario now proves active assignments block deletion | ➖ None needed |

### Test Summary
- **Total tests written**: 2
- **Total tests passing**: 2 focused RRHH migration tests, 7 focused PR-2 tests, full API runtime regression `335` tests, and PR-1 bootstrap runtime regression `328` API + `129` Web tests passed
- **Layers used**: Unit, integration (migration DB + real Postgres gateway + Supertest), and safety-net suites
- **Approval tests**: None — this slice added new migration/schema behavior instead of refactoring existing logic under approval tests
- **Pure functions created**: 0

### Deviations from Design
- None — implementation matches the PR-1/PR-2 design boundaries.

### Issues Found
- `apps/api` typecheck is already red in the repository baseline, and this PR-1 schema refactor now also exposes the planned follow-up mismatch where `features/org-hierarchy/infrastructure/drizzle-org-hierarchy.gateway.ts` still reads removed legacy employee columns until Phase 2 task `2.7` rewires it to `employee_assignments`.
- `pnpm --filter api typecheck` remains red in the repository baseline for pre-existing non-PR-2 issues, including existing org-hierarchy exact-optional-typing mismatches and legacy auth/item test-contract drift outside the `hr-employees` slice.

### Remaining Tasks
- [ ] 3.1 RED `domain/__tests__/erp-access.test.ts`: ambiguous active link rejected.
- [ ] 3.2 Author `domain/{erp-access-links,erp-access-invitations}.ts`.
- [ ] 3.3 RED `application/__tests__/accept-erp-access-invitation.test.ts`: 204 + session; expired token rejected.
- [ ] 3.4 Author `application/{create,accept,list,revoke}-erp-access-invitation.ts`.
- [ ] 3.5 Author `infrastructure/drizzle-erp-access.gateway.ts` + integration test.
- [ ] 3.6 Author `presentation/hr-erp-access.router.ts` + Supertest.

### Workload / PR Boundary
- Mode: stacked PR slice
- Current work unit: PR-2 hr-employees backend
- Boundary: Second stacked slice only (Phase 2 / tasks 2.1-2.7)
- Estimated review budget impact: bounded to the new backend HR employees slice, org-hierarchy rewire, and strict-TDD proof

### Status
11/33 tasks complete. This batch is ready for the next stacked slice (PR-3 `hr-erp-access`), with the known follow-up risk that repository-wide API typecheck remains red from pre-existing baseline issues outside this batch.
