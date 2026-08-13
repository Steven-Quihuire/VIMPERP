# Tasks: RRHH V1 Foundation for ERP SaaS

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

## Review Workload Forecast

~2,700–3,100 LOC across 7 PRs. Backend PRs still exceed the 400-line review budget. Split: PR-1 additive DB foundation → PR-2 hr-employees → PR-3 hr-erp-access → PR-4 approval-policy + identity/org-tree MOD → PR-5..7 web. Delivery `ask-on-risk`; chain `stacked-to-main`.

## Suggested Work Units

| Unit | Goal | PR | Test | Harness | Rollback |
|------|------|----|------|---------|----------|
| 1 | DB foundation tables from the real `0021` baseline | PR-1 | `apps/api` `migration-0022-rrhh-foundation` vitest | dev+pg; apply through `0021`, then `0022` | drop `0022`; revert `schema.ts` |
| 2 | Backend `hr-employees` | PR-2 | `apps/api` features/hr-employees vitest | Supertest `/companies/:id/hr-employees` | delete feature; tables remain |
| 3 | Backend `hr-erp-access` | PR-3 | `apps/api` features/hr-erp-access vitest | cURL invitation accept | delete feature; tables remain |
| 4 | Backend `approval-policy` + identity/org-tree MOD | PR-4 | `apps/api` approval-policy + roles-mgmt/domain vitest | Supertest 403 on missing `hr.*` | delete `approval-policy`; revert `PermissionScope` |
| 5 | Frontend `hr-employees` | PR-5 | `apps/web` features/hr-employees vitest | web dev + manual flow | delete slice; revert route |
| 6 | Frontend `hr-erp-access` | PR-6 | `apps/web` features/hr-erp-access vitest | manual accept-page submit | delete slice; revert route |
| 7 | Frontend `approval-policy` + E2E | PR-7 | web approval-policy vitest + `pnpm e2e rrhh-foundation.spec.ts` | Playwright HR happy path | delete slice; revert route |

## Phase 1: DB Foundation (PR-1)

- [x] 1.1 Bootstrap: `pnpm test` green on `apps/api` and `apps/web`.
- [x] 1.2 RED `db/migrations/__tests__/migration-0022-rrhh-foundation.test.ts`: `applyMigrationsThrough(..., '0021')` proves no legacy `employees` table exists; `0022` creates RRHH tables + partial uniques + CHECKs.
- [x] 1.3 Author `db/migrations/0022_rrhh_foundation.sql` + register it in `meta/_journal.json`.
- [x] 1.4 GREEN the migration test and refactor `apps/api/src/shared/infrastructure/db/schema.ts` to match the additive `0022` schema exactly.

## Phase 2: Backend — hr-employees (PR-2)

- [x] 2.1 RED `features/hr-employees/domain/__tests__/positions.test.ts`: top-of-hierarchy, vacancy ≤ headcount.
- [x] 2.2 Author `domain/{positions,employees,employee-assignments,reporting-line}.ts`.
- [x] 2.3 RED `application/__tests__/create-assignment.test.ts`: auto-close prior active primary in one tx; 409 on duplicate.
- [x] 2.4 Author `application/{create,update,get,list}-employee.ts`, `create-position.ts`, `create-assignment.ts`, `resolve-reporting-line.ts`, `resolve-direct-reports.ts`.
- [x] 2.5 Author `infrastructure/drizzle-hr-employees.gateway.ts` + integration test.
- [x] 2.6 Author `presentation/hr-employees.router.ts` (Zod + controller + router) + Supertest.
- [x] 2.7 Modify `features/org-hierarchy/infrastructure/drizzle-org-hierarchy.gateway.ts`: `countEmployeesInArea` reads active `employee_assignments`; update test.

## Phase 3: Backend — hr-erp-access (PR-3)

- [ ] 3.1 RED `domain/__tests__/erp-access.test.ts`: ambiguous active link rejected.
- [ ] 3.2 Author `domain/{erp-access-links,erp-access-invitations}.ts`.
- [ ] 3.3 RED `application/__tests__/accept-erp-access-invitation.test.ts`: 204 + session; expired token rejected.
- [ ] 3.4 Author `application/{create,accept,list,revoke}-erp-access-invitation.ts`.
- [ ] 3.5 Author `infrastructure/drizzle-erp-access.gateway.ts` + integration test.
- [ ] 3.6 Author `presentation/hr-erp-access.router.ts` + Supertest.

## Phase 4: Backend — approval-policy + identity/org-tree MODIFIED (PR-4)

- [ ] 4.1 RED `features/roles-management/domain/__tests__/assignments-permission-scope.test.ts`: `direct_reports` returns only direct reports.
- [ ] 4.2 Modify `roles-management/domain/{permissions.ts,assignments.ts}`: add `hr.*` keys + `PermissionScope` union + `evaluateReportingLineScopes` port.
- [ ] 4.3 Modify `roles-management/application/compute-effective-permissions.ts`: union reporting-line scope keys.
- [ ] 4.4 Author `roles-management/presentation/require-hr-capability.ts` + unit test.
- [ ] 4.5 Modify `identity/application/resolve-auth-session.ts`: reject `direct_reports`/`self` as `activeScope`; add test.
- [ ] 4.6 RED `approval-policy/domain/__tests__/approval-policy.test.ts`: CHECK rejects mismatched scope.
- [ ] 4.7 Author `approval-policy/{domain,application,infrastructure,presentation}/` (CRUD only).
- [ ] 4.8 Wire routers + `requireHrCapability` in `app/create-app.ts`; Supertest 403 test.

## Phase 5: Frontend — hr-employees (PR-5)

- [ ] 5.1 Author `web/src/features/hr-employees/domain/{employees,positions,assignments}.ts`.
- [ ] 5.2 Author `infrastructure/create-hr-employees-api.ts` + `xxxQueryKeys` + `useEmployees/usePositions/useAssignments`; tests.
- [ ] 5.3 Author `presentation/pages/{employees-list,employee-detail,employee-form,positions-list,position-form,assignment-timeline}.tsx` (RHF + Zod + shadcn); RTL tests.

## Phase 6: Frontend — hr-erp-access (PR-6)

- [ ] 6.1 Author `web/src/features/hr-erp-access/domain/erp-access.ts`.
- [ ] 6.2 Author `infrastructure/create-erp-access-api.ts` + `useInvitations/useAcceptInvitation`; tests.
- [ ] 6.3 Author `presentation/pages/{invitations-list,accept-invitation}.tsx` (RHF + Zod + shadcn) + RTL tests.

## Phase 7: Frontend — approval-policy + integration (PR-7)

- [ ] 7.1 Author `web/src/features/approval-policy/domain/approval-policy.ts`.
- [ ] 7.2 Author `infrastructure/create-approval-policy-api.ts` + hooks; tests.
- [ ] 7.3 Author `presentation/pages/{policies-list,policy-form}.tsx` (RHF + Zod + shadcn) + tests.
- [ ] 7.4 Modify `web/src/app/main.tsx`: register `/hr/{employees,positions,erp-access,approval-policies}`.
- [ ] 7.5 RED E2E `e2e/rrhh-foundation.spec.ts`: position → assign → invite → accept → resolve manager.
- [ ] 7.6 GREEN E2E; `pnpm test`, `pnpm build`, `pnpm --filter api test:coverage` (≥ 80%); record evidence.

## Gating

HR scopes `direct_reports`/`self` depend on canonical `canonical-org-rbac-hierarchy` active-scope contract (PR-3). If blocked, ship reduced V1 (company/node+descendants/self); defer `direct_reports`. Out of scope: payroll, salary, taxes, ATS, attendance, time off, benefits, trainings, performance, surveys, OKRs, contract signing, approval workflows.
