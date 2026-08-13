## Implementation Progress

**Change**: rrhh-foundation
**Mode**: Strict TDD

### Completed Tasks
- [x] 1.1 Bootstrap: `pnpm test` green on `apps/api` and `apps/web`.
- [x] 1.2 RED `db/migrations/__tests__/migration-0022-rrhh-foundation.test.ts`: `applyMigrationsThrough(..., '0021')` proves no legacy `employees` table exists; `0022` creates RRHH tables + partial uniques + CHECKs.
- [x] 1.3 Author `db/migrations/0022_rrhh_foundation.sql` + register it in `meta/_journal.json`.
- [x] 1.4 GREEN the migration test and refactor `apps/api/src/shared/infrastructure/db/schema.ts` to match the additive `0022` schema exactly.

### Files Changed
| File | Action | What Was Done |
|------|--------|---------------|
| `apps/api/src/db/migrations/__tests__/migration-0022-rrhh-foundation.test.ts` | Created | Added strict-TDD migration coverage that proves the live baseline through `0021` has no `employees` table and that `0022` creates the RRHH foundation schema plus constraints. |
| `apps/api/src/db/migrations/0022_rrhh_foundation.sql` | Created | Authored the additive RRHH foundation migration for employees, positions, employee assignments, ERP access links/invitations, and approval policies. |
| `apps/api/src/shared/infrastructure/db/schema.ts` | Modified | Replaced the legacy employee row shape with the additive RRHH foundation tables so Drizzle matches `0022` exactly. |
| `apps/api/src/db/migrations/meta/_journal.json` | Modified | Registered migration `0022_rrhh_foundation` in the Drizzle journal. |
| `openspec/changes/rrhh-foundation/tasks.md` | Modified | Marked PR-1 Phase 1 tasks `1.1` through `1.4` complete for this stacked slice. |
| `openspec/changes/rrhh-foundation/apply-progress.md` | Modified | Merged the previous blocked attempt with the successful PR-1 completion evidence. |

### Work Unit Evidence
| Evidence | Value |
|---|---|
| Focused test command and exact result | `pnpm --filter api exec vitest run src/db/migrations/__tests__/migration-0022-rrhh-foundation.test.ts` → exit `0`; `1` file / `2` tests passed. |
| Runtime harness command/scenario and exact result | `pnpm --filter api test && pnpm --filter web test` → exit `0`; API `56` files / `328` tests passed, Web `30` files / `129` tests passed. Scenario: strict-TDD PR-1 bootstrap plus full regression proof after applying the additive RRHH migration/schema slice. |
| Rollback boundary | Revert only `apps/api/src/db/migrations/__tests__/migration-0022-rrhh-foundation.test.ts`, `apps/api/src/db/migrations/0022_rrhh_foundation.sql`, `apps/api/src/shared/infrastructure/db/schema.ts`, `apps/api/src/db/migrations/meta/_journal.json`, and the PR-1 checkbox/apply-progress artifact updates. |

### TDD Cycle Evidence
| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 1.1 | Existing suites: `apps/api` + `apps/web` | Unit / integration safety net | ✅ `pnpm --filter api test && pnpm --filter web test` passed | ➖ Bootstrap gate only | ✅ Green bootstrap confirmed before RRHH RED work | ➖ Not applicable | ➖ None needed |
| 1.2 | `apps/api/src/db/migrations/__tests__/migration-0022-rrhh-foundation.test.ts` | Integration (real Postgres migration DB) | ✅ Bootstrap suites green | ✅ Wrote two failing migration scenarios first: missing `0022` file and absent RRHH schema/constraints | ✅ Same file passed after landing `0022` and journal registration | ✅ Two cases: baseline/no-legacy-table proof + constraint enforcement proof | ➖ None needed |
| 1.3 | `apps/api/src/db/migrations/__tests__/migration-0022-rrhh-foundation.test.ts` | Integration (real Postgres migration DB) | ✅ Bootstrap suites green | ✅ SQL required by the RED migration spec was absent before implementation | ✅ `0022_rrhh_foundation.sql` plus journal entry satisfied the focused migration suite | ✅ Covered both schema-creation and constraint scenarios from the same RED file | ➖ None needed |
| 1.4 | `apps/api/src/db/migrations/__tests__/migration-0022-rrhh-foundation.test.ts` | Integration (real Postgres migration DB) | ✅ Bootstrap suites green | ✅ Schema mismatch remained until `schema.ts` matched the additive `0022` tables | ✅ Focused migration suite stayed green after the Drizzle schema refactor | ✅ The second test case forced non-trivial partial unique and CHECK coverage | ✅ Schema extraction left the DB contract cleaner and explicit |

### Test Summary
- **Total tests written**: 2
- **Total tests passing**: 2 focused RRHH migration tests; full runtime regression `328` API + `129` Web tests passed
- **Layers used**: Integration (migration DB) + safety-net suites
- **Approval tests**: None — this slice added new migration/schema behavior instead of refactoring existing logic under approval tests
- **Pure functions created**: 0

### Deviations from Design
- None — implementation matches the corrected additive-only PR-1 design.

### Issues Found
- `apps/api` typecheck is already red in the repository baseline, and this PR-1 schema refactor now also exposes the planned follow-up mismatch where `features/org-hierarchy/infrastructure/drizzle-org-hierarchy.gateway.ts` still reads removed legacy employee columns until Phase 2 task `2.7` rewires it to `employee_assignments`.

### Remaining Tasks
- [ ] 2.1 RED `features/hr-employees/domain/__tests__/positions.test.ts`: top-of-hierarchy, vacancy ≤ headcount.
- [ ] 2.2 Author `domain/{positions,employees,employee-assignments,reporting-line}.ts`.
- [ ] 2.3 RED `application/__tests__/create-assignment.test.ts`: auto-close prior active primary in one tx; 409 on duplicate.
- [ ] 2.4 Author `application/{create,update,get,list}-employee.ts`, `create-position.ts`, `create-assignment.ts`, `resolve-reporting-line.ts`, `resolve-direct-reports.ts`.
- [ ] 2.5 Author `infrastructure/drizzle-hr-employees.gateway.ts` + integration test.
- [ ] 2.6 Author `presentation/hr-employees.router.ts` (Zod + controller + router) + Supertest.
- [ ] 2.7 Modify `features/org-hierarchy/infrastructure/drizzle-org-hierarchy.gateway.ts`: `countEmployeesInArea` reads active `employee_assignments`; update test.

### Workload / PR Boundary
- Mode: stacked PR slice
- Current work unit: PR-1 DB foundation
- Boundary: First stacked slice only (Phase 1 / tasks 1.1-1.4)
- Estimated review budget impact: bounded to the additive DB foundation artifacts plus their strict-TDD proof

### Status
4/4 PR-1 tasks complete. This batch is ready for the next stacked slice, with the known follow-up risk that Phase 2 must rewire `countEmployeesInArea` away from removed legacy employee columns.
