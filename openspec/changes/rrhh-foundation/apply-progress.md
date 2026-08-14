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
- [x] 3.1 RED `domain/__tests__/erp-access.test.ts`: ambiguous active link rejected.
- [x] 3.2 Author `domain/{erp-access-links,erp-access-invitations}.ts`.
- [x] 3.3 RED `application/__tests__/accept-erp-access-invitation.test.ts`: 204 + session; expired token rejected.
- [x] 3.4 Author `application/{create,accept,list,revoke}-erp-access-invitation.ts`.
- [x] 3.5 Author `infrastructure/drizzle-erp-access.gateway.ts` + integration test.
- [x] 3.6 Author `presentation/hr-erp-access.router.ts` + Supertest.
- [x] 4.1 RED `features/roles-management/domain/__tests__/assignments-permission-scope.test.ts`: `direct_reports` returns only direct reports.
- [x] 4.2 Modify `roles-management/domain/{permissions.ts,assignments.ts}`: add `hr.*` keys + `PermissionScope` union + `evaluateReportingLineScopes` port.
- [x] 4.3 Modify `roles-management/application/compute-effective-permissions.ts`: union reporting-line scope keys.
- [x] 4.4 Author `roles-management/presentation/require-hr-capability.ts` + unit test.
- [x] 4.5 Modify `identity/application/resolve-auth-session.ts`: reject `direct_reports`/`self` as `activeScope`; add test.
- [x] 4.6 RED `approval-policy/domain/__tests__/approval-policy.test.ts`: CHECK rejects mismatched scope.
- [x] 4.7 Author `approval-policy/{domain,application,infrastructure,presentation}/` (CRUD only).
- [x] 4.8 Wire routers + `requireHrCapability` in `app/create-app.ts`; Supertest 403 test.

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
| `apps/api/src/features/hr-erp-access/domain/erp-access-links.ts` | Created | Added ERP access link identity rules plus the ambiguous-active-link domain guard and conflict/not-found errors. |
| `apps/api/src/features/hr-erp-access/domain/erp-access-invitations.ts` | Created | Added ERP access invitation entities, gateway contract, user-membership DTOs, and lifecycle errors. |
| `apps/api/src/features/hr-erp-access/domain/__tests__/erp-access.test.ts` | Created | Wrote the RED/GREEN domain coverage for exact-match acceptance and ambiguous employee/user link rejection. |
| `apps/api/src/features/hr-erp-access/application/erp-access-invitation-token.ts` | Created | Added the invitation token hashing/generation helper for ERP access activation. |
| `apps/api/src/features/hr-erp-access/application/create-erp-access-invitation.ts` | Created | Added the invitation creation use case with employee existence validation, normalized email, token hashing, and expiry handling. |
| `apps/api/src/features/hr-erp-access/application/list-erp-access-invitations.ts` | Created | Added the pending-invitation list use case. |
| `apps/api/src/features/hr-erp-access/application/accept-erp-access-invitation.ts` | Created | Added invitation acceptance orchestration with user creation/reuse, company-user membership enforcement, ambiguity rejection, and session issuance. |
| `apps/api/src/features/hr-erp-access/application/revoke-erp-access-invitation.ts` | Created | Added the active-link revocation use case that preserves the employee identity. |
| `apps/api/src/features/hr-erp-access/application/__tests__/accept-erp-access-invitation.test.ts` | Created | Wrote strict-TDD application coverage for invitation create/list/accept/revoke flows, expired tokens, missing passwords, and ambiguous active links. |
| `apps/api/src/features/hr-erp-access/infrastructure/drizzle-erp-access.gateway.ts` | Created | Added the Drizzle gateway for ERP access invitations, link activation, membership/session writes, and revocation. |
| `apps/api/src/features/hr-erp-access/infrastructure/drizzle-erp-access.gateway.test.ts` | Created | Added real-Postgres integration coverage for persisted invitation acceptance, active links, sessions, memberships, and revocation. |
| `apps/api/src/features/hr-erp-access/presentation/hr-erp-access.router.ts` | Created | Added the ERP access router with company-scoped invitation create/list, public invitation accept, and employee access revoke endpoints. |
| `apps/api/src/features/hr-erp-access/presentation/hr-erp-access.router.test.ts` | Created | Added Supertest coverage for the create/list/accept/revoke invitation lifecycle through `createApp`. |
| `apps/api/src/app/create-app.ts` | Modified | Wired the new HR ERP access gateway, use cases, and router into the API composition root. |
| `apps/api/src/shared/presentation/error.middleware.ts` | Modified | Added HTTP mapping for ERP access invitation and link lifecycle errors. |
| `apps/api/src/features/roles-management/domain/assignments.ts` | Modified | Added reporting-line permission-scope types, evaluation port contract, and a pure helper that resolves `direct_reports` vs `self` employee visibility. |
| `apps/api/src/features/roles-management/domain/__tests__/assignments-permission-scope.test.ts` | Created | Added RED/GREEN domain coverage proving `direct_reports` returns only direct reports and `self` returns only the actor. |
| `apps/api/src/features/roles-management/domain/permissions.ts` | Modified | Seeded the `hr.*` permission catalog keys and registered the HR module permissions alongside inventory and roles. |
| `apps/api/src/features/roles-management/application/compute-effective-permissions.ts` | Modified | Extended effective-permission evaluation to union optional reporting-line permission keys alongside existing org-scope role assignments. |
| `apps/api/src/features/roles-management/application/compute-effective-permissions.test.ts` | Modified | Added focused regression coverage for reporting-line permission-key union behavior. |
| `apps/api/src/features/roles-management/presentation/require-hr-capability.ts` | Created | Added the reusable HR capability middleware factory that evaluates live scoped permissions instead of relying on catalog-only session capabilities. |
| `apps/api/src/features/roles-management/presentation/require-hr-capability.test.ts` | Created | Added unit coverage for allowed, forbidden, and custom permission-scope middleware flows. |
| `apps/api/src/features/identity/application/resolve-auth-session.ts` | Modified | Rejected persisted `direct_reports` and `self` values as invalid active canonical scopes while preserving fallback scope resolution. |
| `apps/api/src/features/identity/application/resolve-auth-session.test.ts` | Modified | Added regression coverage proving reporting-line scope ids never survive as active canonical scopes. |
| `apps/api/src/features/approval-policy/domain/approval-policy.ts` | Created | Added the approval-policy aggregate, gateway contract, DB-aligned scope validation, and not-found/validation errors. |
| `apps/api/src/features/approval-policy/domain/__tests__/approval-policy.test.ts` | Created | Added RED/GREEN domain coverage for company-vs-node scope validation rules matching the database CHECK constraints. |
| `apps/api/src/features/approval-policy/application/{create,list,get,update,deactivate}-approval-policy.ts` | Created | Added CRUD-only approval-policy use cases with scope-node ownership validation and not-found handling. |
| `apps/api/src/features/approval-policy/infrastructure/drizzle-approval-policy.gateway.ts` | Created | Added the Drizzle approval-policy gateway for create/list/get/update/deactivate flows and scope-node lookups. |
| `apps/api/src/features/approval-policy/infrastructure/drizzle-approval-policy.gateway.test.ts` | Created | Added real-Postgres integration coverage for persisted approval-policy CRUD and deactivation behavior. |
| `apps/api/src/features/approval-policy/presentation/approval-policy.router.ts` | Created | Added the approval-policy router with Zod validation and per-route HR capability guards. |
| `apps/api/src/features/approval-policy/presentation/approval-policy.router.test.ts` | Created | Added Supertest `createApp` coverage for approval-policy CRUD and 403 denial when `hr.approval_policy.*` permissions are missing. |
| `apps/api/src/app/create-app.ts` | Modified | Wired the approval-policy gateway, use cases, router, and shared `requireHrCapability` middleware into the API composition root. |
| `apps/api/src/shared/presentation/error.middleware.ts` | Modified | Added approval-policy validation and not-found HTTP mappings. |
| `openspec/changes/rrhh-foundation/tasks.md` | Modified | Marked PR-1 Phase 1 tasks `1.1` through `1.4` complete for this stacked slice. |
| `openspec/changes/rrhh-foundation/tasks.md` | Modified | Marked PR-2 Phase 2 tasks `2.1` through `2.7` complete for this stacked slice. |
| `openspec/changes/rrhh-foundation/tasks.md` | Modified | Marked PR-3 Phase 3 tasks `3.1` through `3.6` complete for this stacked slice. |
| `openspec/changes/rrhh-foundation/tasks.md` | Modified | Marked PR-4 Phase 4 tasks `4.1` through `4.8` complete for this stacked slice. |
| `openspec/changes/rrhh-foundation/apply-progress.md` | Modified | Merged the previous PR-1/PR-2 evidence with the successful PR-3 HR ERP access slice evidence. |
| `openspec/changes/rrhh-foundation/apply-progress.md` | Modified | Merged the previous PR-1/PR-3 evidence with the successful PR-4 approval-policy and HR capability slice evidence. |

### Work Unit Evidence
| Evidence | Value |
|---|---|
| Focused test command and exact result | `pnpm --filter api exec vitest run src/db/migrations/__tests__/migration-0022-rrhh-foundation.test.ts` → exit `0`; `1` file / `2` tests passed. |
| Runtime harness command/scenario and exact result | `pnpm --filter api test && pnpm --filter web test` → exit `0`; API `56` files / `328` tests passed, Web `30` files / `129` tests passed. Scenario: strict-TDD PR-1 bootstrap plus full regression proof after applying the additive RRHH migration/schema slice. |
| Rollback boundary | Revert only `apps/api/src/db/migrations/__tests__/migration-0022-rrhh-foundation.test.ts`, `apps/api/src/db/migrations/0022_rrhh_foundation.sql`, `apps/api/src/shared/infrastructure/db/schema.ts`, `apps/api/src/db/migrations/meta/_journal.json`, and the PR-1 checkbox/apply-progress artifact updates. |

| `PR-2` Focused test command and exact result | `pnpm --filter api exec vitest run src/features/hr-employees/domain/__tests__/positions.test.ts src/features/hr-employees/application/__tests__/create-assignment.test.ts src/features/hr-employees/infrastructure/drizzle-hr-employees.gateway.test.ts src/features/hr-employees/presentation/hr-employees.router.test.ts src/features/org-hierarchy/infrastructure/drizzle-org-hierarchy.gateway.test.ts src/features/org-hierarchy/presentation/org-hierarchy.router.test.ts src/features/roles-management/application/compute-effective-permissions.test.ts src/features/identity/application/resolve-auth-session.test.ts` → exit `0`; `8` files / `80` tests passed. |
| `PR-2` Runtime harness command/scenario and exact result | `pnpm --filter api test` → exit `0`; `60` files / `335` tests passed. Scenario: full API regression after wiring the new `hr-employees` slice and rewiring org-hierarchy area delete preflight to active employee assignments. |
| `PR-2` Rollback boundary | Revert only `apps/api/src/features/hr-employees/**`, `apps/api/src/app/create-app.ts`, `apps/api/src/features/org-hierarchy/infrastructure/drizzle-org-hierarchy.gateway.ts`, `apps/api/src/features/org-hierarchy/infrastructure/drizzle-org-hierarchy.gateway.test.ts`, `apps/api/src/shared/presentation/error.middleware.ts`, and the PR-2 checkbox/apply-progress updates. |
| `PR-3` Focused test command and exact result | `pnpm --filter api exec vitest run src/features/hr-erp-access/domain/__tests__/erp-access.test.ts src/features/hr-erp-access/application/__tests__/accept-erp-access-invitation.test.ts src/features/hr-erp-access/infrastructure/drizzle-erp-access.gateway.test.ts src/features/hr-erp-access/presentation/hr-erp-access.router.test.ts src/features/node-management/application/accept-node-management-invitation.test.ts src/features/node-management/presentation/node-management.router.test.ts` → exit `0`; `6` files / `14` tests passed. |
| `PR-3` Runtime harness command/scenario and exact result | `pnpm --filter api exec vitest run src/features/hr-erp-access/presentation/hr-erp-access.router.test.ts` → exit `0`; `1` file / `1` test passed. Scenario: Supertest create/list/accept/revoke ERP access invitation flow through `createApp`, including session cookie issuance and company-scoped revoke. |
| `PR-3` Rollback boundary | Revert only `apps/api/src/features/hr-erp-access/**`, `apps/api/src/app/create-app.ts`, `apps/api/src/shared/presentation/error.middleware.ts`, and the PR-3 checkbox/apply-progress updates. |
| `PR-4` Focused test command and exact result | `pnpm --filter api exec vitest run src/features/roles-management/domain/__tests__/assignments-permission-scope.test.ts src/features/roles-management/application/compute-effective-permissions.test.ts src/features/roles-management/presentation/require-hr-capability.test.ts src/features/identity/application/resolve-auth-session.test.ts src/features/approval-policy/domain/__tests__/approval-policy.test.ts src/features/approval-policy/infrastructure/drizzle-approval-policy.gateway.test.ts src/features/approval-policy/presentation/approval-policy.router.test.ts` → exit `0`; `7` files / `26` tests passed. |
| `PR-4` Runtime harness command/scenario and exact result | `pnpm --filter api exec vitest run src/features/approval-policy/presentation/approval-policy.router.test.ts` → exit `0`; `1` file / `2` tests passed. Scenario: `createApp`-backed Supertest CRUD flow for approval policies plus a `403` denial when `hr.approval_policy.*` permissions are absent. |
| `PR-4` Rollback boundary | Revert only `apps/api/src/features/approval-policy/**`, `apps/api/src/features/roles-management/domain/assignments.ts`, `apps/api/src/features/roles-management/domain/permissions.ts`, `apps/api/src/features/roles-management/application/compute-effective-permissions.ts`, `apps/api/src/features/roles-management/presentation/require-hr-capability.ts`, `apps/api/src/features/identity/application/resolve-auth-session.ts`, `apps/api/src/app/create-app.ts`, `apps/api/src/shared/presentation/error.middleware.ts`, and the PR-4 checkbox/apply-progress updates. |

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
| 3.1 | `apps/api/src/features/hr-erp-access/domain/__tests__/erp-access.test.ts` | Unit | N/A (new) | ✅ Wrote exact-match and ambiguity assertions before the ERP access link rules existed | ✅ Same file passed after adding `erp-access-links.ts` | ✅ One case allows the same employee-user pair; another rejects employee/user mismatches | ➖ None needed |
| 3.2 | `apps/api/src/features/hr-erp-access/domain/__tests__/erp-access.test.ts` | Unit | N/A (new) | ✅ The RED domain test referenced missing ERP access domain modules first | ✅ Passed after adding `erp-access-links.ts` and `erp-access-invitations.ts` | ✅ The same RED file covers both exact-match and conflicting-link paths | ➖ None needed |
| 3.3 | `apps/api/src/features/hr-erp-access/application/__tests__/accept-erp-access-invitation.test.ts` | Unit | N/A (new) | ✅ Wrote the invitation create/list/accept/revoke scenarios first, including expired-token and missing-password failures | ✅ Same file passed after the ERP access application layer existed | ✅ The file forces create/list lifecycle coverage, successful acceptance, expired rejection, missing-password rejection, and ambiguous-link rejection | ✅ Extracted the invitation token helper and kept orchestration isolated from persistence |
| 3.4 | `apps/api/src/features/hr-erp-access/application/__tests__/accept-erp-access-invitation.test.ts` | Unit | N/A (new) | ✅ The RED file referenced the missing `create`, `accept`, `list`, and `revoke` ERP access use cases first | ✅ Passed after adding the full ERP access application lifecycle | ✅ Create→list→accept→revoke plus error paths ensure the use-case layer is real logic, not a stub | ✅ Username normalization and session issuance stayed in the application boundary |
| 3.5 | `apps/api/src/features/hr-erp-access/infrastructure/drizzle-erp-access.gateway.test.ts` | Integration (real Postgres DB) | N/A (new) | ✅ Wrote the persistence flow before the gateway existed | ✅ Same file passed after adding the Drizzle ERP access gateway and starting Postgres on the host's default Docker context | ✅ One integration path proves invitation persistence, activation, membership/session writes, and revocation | ✅ Row mappers stayed explicit and transaction work remained bounded |
| 3.6 | `apps/api/src/features/hr-erp-access/presentation/hr-erp-access.router.test.ts` | Integration (Supertest) | ✅ `pnpm --filter api exec vitest run src/features/node-management/application/accept-node-management-invitation.test.ts src/features/node-management/presentation/node-management.router.test.ts` passed before shared composition edits | ✅ Wrote the end-to-end ERP access router flow before the router/composition existed | ✅ Same file passed after wiring the router in `create-app.ts` | ✅ The flow triangulates invite creation, pending list, public acceptance, and company-scoped revoke | ✅ Router stays focused on Zod parsing, session cookie issuance, and use-case delegation |
| 4.1 | `apps/api/src/features/roles-management/domain/__tests__/assignments-permission-scope.test.ts` | Unit | ✅ `pnpm --filter api exec vitest run src/features/roles-management/application/compute-effective-permissions.test.ts src/features/identity/application/resolve-auth-session.test.ts src/features/hr-erp-access/presentation/hr-erp-access.router.test.ts src/features/org-hierarchy/presentation/org-hierarchy.router.test.ts` stayed green while the unrelated pre-existing `hr-employees.router.test.ts` still failed `500` vs `201` outside this slice | ✅ Wrote direct-report and self-scope assertions before the new helper existed | ✅ Same file passed after adding the reporting-line scope helper | ✅ Happy path + self edge case | ➖ None needed |
| 4.2 | `apps/api/src/features/roles-management/domain/__tests__/assignments-permission-scope.test.ts` | Unit | ✅ Existing scoped-permission and auth-session suites passed; unrelated pre-existing `hr-employees.router.test.ts` still red outside this slice | ✅ The RED helper tests referenced the missing permission-scope types and evaluation helpers first | ✅ Passed after adding `hr.*` permission keys, the permission-scope union, and the reporting-line port contract | ✅ `direct_reports` and `self` now exercise different scope branches with deduped employee ids | ✅ Kept domain additions pure and framework-free |
| 4.3 | `apps/api/src/features/roles-management/application/compute-effective-permissions.test.ts` | Unit | ✅ Existing `compute-effective-permissions.test.ts` and `resolve-auth-session.test.ts` were green before the PR-4 edits | ✅ Added a failing reporting-line union case before modifying the use case | ✅ Same file passed after unioning reporting-line permission keys | ✅ Existing subtree/exact-node scenarios plus the new `direct_reports` path prove non-trivial behavior | ✅ Preserved the existing org-scope algorithm while extending only the reporting-line seam |
| 4.4 | `apps/api/src/features/roles-management/presentation/require-hr-capability.test.ts` | Unit | N/A (new) | ✅ Wrote allow/deny/custom-scope middleware scenarios before the middleware factory existed | ✅ Same file passed after authoring `require-hr-capability.ts` | ✅ Allowed, forbidden, and custom `direct_reports` scope cases | ✅ Middleware stays thin: active-company validation + delegated permission evaluation |
| 4.5 | `apps/api/src/features/identity/application/resolve-auth-session.test.ts` | Unit | ✅ Existing auth-session scope-resolution suite passed before the `activeScope` validation edit | ✅ Added the failing persisted `direct_reports:*` active-scope scenario first | ✅ Same file passed after rejecting non-canonical reporting-line prefixes | ✅ The suite now covers persisted warehouse scope, subtree fallback, and reporting-line rejection | ✅ Validation stayed local to `toScopeRef` so canonical-scope resolution remains unchanged |
| 4.6 | `apps/api/src/features/approval-policy/domain/__tests__/approval-policy.test.ts` | Unit | N/A (new) | ✅ Wrote the DB-check-aligned scope mismatch assertions before the domain existed | ✅ Same file passed after authoring approval-policy validation rules | ✅ Company/node valid paths plus both mismatch cases | ➖ None needed |
| 4.7 | `apps/api/src/features/approval-policy/infrastructure/drizzle-approval-policy.gateway.test.ts`, `apps/api/src/features/approval-policy/presentation/approval-policy.router.test.ts` | Integration (real Postgres + Supertest) | N/A (new) | ✅ Wrote failing gateway CRUD and `createApp` router scenarios before the slice existed | ✅ Both files passed after adding the approval-policy domain, use cases, gateway, and router | ✅ Gateway CRUD/deactivation plus router CRUD/403 denial cover different persistence and HTTP paths | ✅ Kept validation in the application layer and row mapping in the gateway |
| 4.8 | `apps/api/src/features/approval-policy/presentation/approval-policy.router.test.ts` | Integration (Supertest) | ⚠️ Shared `create-app.ts` safety net confirmed the unrelated pre-existing `hr-employees.router.test.ts` failure (`500` vs `201`) before wiring the new router | ✅ Added the failing `createApp` approval-policy CRUD/403 flow before composition wiring existed | ✅ Same file passed after wiring the router and shared HR guard in `create-app.ts` | ✅ CRUD happy path plus forbidden path through the composed app | ✅ Composition stayed additive: new gateway/use cases/router without changing the existing unrelated red suite |

### Test Summary
- **Focused PR-1 evidence still green**: migration suite `1` file / `2` tests passed; API `328` + Web `129` bootstrap tests passed.
- **Focused PR-2 evidence still green**: `8` files / `80` tests passed; API runtime harness `60` files / `335` tests passed.
- **Focused PR-3 evidence**: `6` files / `14` tests passed; runtime harness `1` file / `1` test passed.
- **Focused PR-4 evidence**: `7` files / `26` tests passed; runtime harness `1` file / `2` tests passed.
- **Layers used**: Unit, integration (real Postgres gateway + Supertest), and safety-net suites.
- **Approval tests**: None — PR-4 added a new approval-policy slice and additive permission-scope behavior instead of refactoring legacy behavior under approval tests.
- **Pure functions created**: 3 (`assertNoAmbiguousActiveErpAccessLink`, `resolveReportingLineScopeEmployeeIds`, `assertValidApprovalPolicyScope`).

### Deviations from Design
- None — implementation matches the PR-1 through PR-4 design boundaries.

### Issues Found
- `pnpm --filter api typecheck` remains red in the repository baseline for pre-existing non-PR-2 issues, including existing org-hierarchy exact-optional-typing mismatches and legacy auth/item test-contract drift outside the `hr-employees` slice.
- Host integration tests required the Docker CLI `default` context because the current CLI default points at an unavailable Docker Desktop socket; `docker --context default compose up -d postgres` restored the real Postgres harness for PR-3.
- The unrelated baseline safety-net `pnpm --filter api exec vitest run src/features/hr-employees/presentation/hr-employees.router.test.ts` is still red in the current workspace (`500` instead of `201` on the first create-employee request) and was not modified in this batch.

### Remaining Tasks
- [ ] 5.1 Author `web/src/features/hr-employees/domain/{employees,positions,assignments}.ts`.
- [ ] 5.2 Author `infrastructure/create-hr-employees-api.ts` + `xxxQueryKeys` + `useEmployees/usePositions/useAssignments`; tests.
- [ ] 5.3 Author `presentation/pages/{employees-list,employee-detail,employee-form,positions-list,position-form,assignment-timeline}.tsx` (RHF + Zod + shadcn); RTL tests.
- [ ] 6.1 Author `web/src/features/hr-erp-access/domain/erp-access.ts`.
- [ ] 6.2 Author `infrastructure/create-erp-access-api.ts` + `useInvitations/useAcceptInvitation`; tests.
- [ ] 6.3 Author `presentation/pages/{invitations-list,accept-invitation}.tsx` (RHF + Zod + shadcn) + RTL tests.
- [ ] 7.1 Author `web/src/features/approval-policy/domain/approval-policy.ts`.
- [ ] 7.2 Author `infrastructure/create-approval-policy-api.ts` + hooks; tests.
- [ ] 7.3 Author `presentation/pages/{policies-list,policy-form}.tsx` (RHF + Zod + shadcn) + tests.
- [ ] 7.4 Modify `web/src/app/main.tsx`: register `/hr/{employees,positions,erp-access,approval-policies}`.
- [ ] 7.5 RED E2E `e2e/rrhh-foundation.spec.ts`: position → assign → invite → accept → resolve manager.
- [ ] 7.6 GREEN E2E; `pnpm test`, `pnpm build`, `pnpm --filter api test:coverage` (≥ 80%); record evidence.

### Workload / PR Boundary
- Mode: stacked PR slice
- Current work unit: PR-4 approval-policy backend
- Boundary: Fourth stacked slice only (Phase 4 / tasks 4.1-4.8)
- Estimated review budget impact: tracked diff is ~243 lines on existing files plus additive approval-policy slice files, bounded under the approved 800-line review budget for PR-4

### Status
25/33 tasks complete. This batch is ready for the next stacked slice (PR-5 web `hr-employees`), with the known follow-up risk that the unrelated baseline `hr-employees.router.test.ts` and repository typecheck drift still exist outside the PR-4 boundary.
