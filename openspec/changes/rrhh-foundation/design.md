# Design: RRHH V1 Foundation for ERP SaaS

## Technical Approach

Deliver one `rrhh-foundation` change with five capability deltas (three NEW, two MODIFIED), stacked-to-main mirroring the canonical `canonical-org-rbac-hierarchy` pattern. Architecture order is **DB → BACKEND → FRONTEND**, and DB-first invariants are the source of truth:

- PR-1 starts from the real migration baseline through `0021`, which has no legacy `employees` table. The DB slice therefore creates the RRHH foundation tables additively in `0022` with RED migration tests, instead of planning backfill or cleanup migrations against a nonexistent table.
- Backend feature slices land second, reusing `roles-management` `Permission` catalog + `compute-effective-permissions` for HR authorization; the legacy `AuthCapability` enum stays frozen on `catalog.*` and HR endpoints authorize through the catalog.
- Web slices land third, composed against the same query/mutation contract pattern as `node-management`.

Reporting hierarchy, node responsibility, ERP access, permission scopes, and approval-policy foundations are kept as **orthogonal** slices with explicit import boundaries; the active-scope session from canonical PR-3 is consumed only as input, not extended.

## Architecture Decisions

| # | Decision | Choice | Alternative rejected | Rationale |
|---|----------|--------|---------------------|-----------|
| 1 | Employee ↔ Position | `employees` (master) + `positions` (with `reports_to_position_id` FK, nullable for top) joined via `employee_assignments` (history) | Keep `employeesTable.position` free text; collapse position into employee row | `Employee != Position`; reporting line = position lineage, not employee; free text blocks vacancies and headcount. |
| 2 | Org linkage | `employee_assignments` (assignment history) keyed by `(employee_id, scope_node_id, position_id, started_at, ended_at)` with partial unique on `(employee_id) WHERE ended_at IS NULL` for one-active primary | Single `employees.area_id` column; many-to-many join table | Spec requires history + one-active auto-close; partial unique enforces it DB-side without triggers. |
| 3 | Reporting line | Resolved at read time by joining active primary `employee_assignment` → `position` → `position.reports_to_position_id` chain | Materialized path/closure table on positions | Hierarchy is shallow and mutable; closure table adds reconciliation risk in V1. Read cost is bounded by `direct_reports` evaluation only. |
| 4 | Employee ↔ User | Separate `erp_access_links` (1 active per `(employee_id, company_id)` partial unique; 1 active per `(user_id, company_id)` partial unique) and `erp_access_invitations` (mirrors `node_management_invitations` schema pattern, separate table) | Reuse `node_management_invitations`; keep inline nullable `employeesTable.userId` | Different lifecycle (HR activation ≠ org-node governance); separate tables avoid coupling + spec rule "reuse pattern, separate tables". |
| 5 | Permission scope extension | Add a discriminated `PermissionScope = { kind: 'company' } \| { kind: 'node+descendants', scope: ScopeRef } \| { kind: 'direct_reports' } \| { kind: 'self' }` value object in `roles-management/domain`; extend `compute-effective-permissions` to evaluate the new kinds via a dedicated `evaluateReportingLineScopes` port (depends on HR gateway). `ScopeRef` and `scope_node_type` enum stay frozen. | Add `employee | direct_reports | self` to `scope_node_type` pg enum; new `reporting_line_scopes` table | Canonical proposal explicitly freezes `scope_node_type`; mixing reporting-line into the tree breaks the trigger-maintained projection and conflates addressability with people-chain. |
| 6 | HR authorization layer | New permission keys `hr.employees.read/write/assign`, `hr.positions.read/write`, `hr.erp_access.invite/revoke`, `hr.approval_policy.read/write` seeded into `permissionCatalogSeeds` (family `normal`); HR routers guard via `requireHrCapability` that calls `compute-effective-permissions` and matches the key. | Grow `AuthCapability` enum; per-endpoint ad-hoc role checks | Roles-management `Permission` catalog is the only generic + scope-aware mechanism; `AuthCapability` is hardcoded `catalog.*` and cannot express scopes. |
| 7 | Active scope for HR scopes | `direct_reports`/`self` are evaluated against the employee's reporting line, never set as the canonical active scope. `resolve-auth-session` rejects `direct_reports`/`self` if written as `activeScope`. | Allow `activeScope` to be a reporting-line value | Spec delta "Active Company Context" requires reporting-line scopes never become active scope values; protected by both validation and `compute-effective-permissions` (which treats them as evaluation-time inputs only). |
| 8 | ApprovalPolicy scope | Two columns: `scope_type IN ('company','division','local','area','warehouse','point-of-sale')` + `scope_node_id NULL` (company-level when null). CHECK rejects `scope_type != 'company' AND scope_node_id IS NULL` and `scope_type = 'company' AND scope_node_id IS NOT NULL`. No `direct_reports`/`self`/`employee` scope kinds. | Reuse generic scope-tree `ScopeRef` enum union | Spec explicitly forbids reporting-line scopes in ApprovalPolicy; reuse enum but constrain to org-tree values only via the CHECK. |
| 9 | PR-1 migration baseline | `0022_rrhh_foundation.sql` is additive only: create `employees`, `positions`, `employee_assignments`, `erp_access_links`, `erp_access_invitations`, and `approval_policies` directly from the real baseline through `0021`; no backfill, rename, or cleanup migration is part of PR-1. | Assume a legacy `employees` table exists and plan `0023`/`0024` around it | Apply already proved the live chain through `0021` never creates that table, so PR-1 must match the repository's executable baseline rather than a historical assumption. |
| 10 | Sequencing | DB foundation creation (PR-1) → backend feature slices stacked per capability (PR-2 `hr-employees`, PR-3 `hr-erp-access`, PR-4 `approval-policy` + `identity-access`/`org-tree` MODIFIED) → web slices (PR-5..PR-7). Gates behind canonical `canonical-org-rbac-hierarchy` archive so active-scope is stable. | Single mega-PR; per-feature separate changes | Spec mandate "one change, multiple capability deltas, stacked-to-main"; same proven pattern. |
| 11 | Authorization reuse | `requireAuth` middleware (existing) for session; new `requireHrCapability(key)` factory in `roles-management/presentation` that takes the resolved `AuthSession` + `currentContext` and delegates to `compute-effective-permissions`. | Per-router custom guards | Keeps HR endpoints consistent with catalog-driven authorization; no per-endpoint capability leaks. |
| 12 | Frontend data shape | Each feature exposes its own `createXxxApi` (typed `HttpClient` over `fetch`) and `xxxQueryKeys` + `useXxx` hooks in `application/`; pages in `presentation/` compose shadcn forms (RHF + Zod) and TanStack Query; no Axios, no copy-into-Zustand. | Mirror node-management exactly | Project convention from `react-screaming-clean-architecture` skill; matches existing `node-management` feature. |

## Data Flow

### Employee assignment + reporting-line resolution

```
POST /companies/:id/hr-employees/:empId/assignments
  → createAssignment use case (hr-employees/application)
      → Tx { close prior active primary (UPDATE employee_assignments SET ended_at=now()
                WHERE employee_id=$1 AND ended_at IS NULL),
             INSERT new assignment (id, employee_id, scope_node_id, position_id, started_at) }
  → return new assignment DTO
```

### Direct manager / direct reports read

```
GET /companies/:id/hr-employees/:empId/reports/manager
  → resolveReportingLine use case
      → fetch active primary assignment.position_id → position
      → fetch position.reports_to_position_id → parent position
      → fetch active primary assignment for parent position's employees (LIMIT 1)
      → return manager DTO (or null if top-of-hierarchy)
```

### Permission-scope evaluation for HR endpoints

```
requireHrCapability('hr.employees.read')(auth, req)
  → computeEffectivePermissions({ companyId, userId, currentContext })
      → existing lineage + assignments path (company | node+descendants)
      → + evaluateReportingLineScopes({ companyId, userId, currentScope })
            → load actor's employee (via erp_access_links)
            → for 'self' → { scope_employees: [actorEmployeeId] }
            → for 'direct_reports' → { scope_employees: positions
                  WHERE reports_to_position_id IN actor's-active-position-chain }
      → merge permission keys from in-scope assignments
  → 200/403
```

### ERP access invitation accept

```
POST /hr-erp-access/invitations/:token/accept
  → acceptErpAccessInvitation use case
      → hash token, find invitation
      → find-or-create user (mirrors accept-node-management-invitation)
      → Tx { INSERT erp_access_link (employee_id, user_id, company_id, is_active=true),
             UPDATE erp_access_invitations SET accepted_at, accepted_by_user_id,
             ensure company-user membership }
      → set session cookie, 204
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `apps/api/src/shared/infrastructure/db/schema.ts` | Modify | Define the RRHH foundation tables (`employees`, `positions`, `employee_assignments`, `erp_access_links`, `erp_access_invitations`, `approval_policies`) to match the additive PR-1 migration baseline. |
| `apps/api/src/db/migrations/0022_rrhh_foundation.sql` | Create | Create the RRHH foundation tables, indexes, CHECK constraints, and partial uniques directly from the live baseline through `0021`. |
| `apps/api/src/db/migrations/__tests__/migration-0022-rrhh-foundation.test.ts` | Create | RED migration test that proves `applyMigrationsThrough(..., '0021')` has no legacy `employees` table and that `0022` creates the RRHH foundation schema correctly. |
| `apps/api/src/features/hr-employees/{domain,application,infrastructure,presentation}` | Create | New vertical slice: `domain/employees.ts`, `domain/positions.ts`, `domain/employee-assignments.ts`, `domain/reporting-line.ts`; `application/{create,update,get,list}-employee.ts`, `create-position.ts`, `get-reporting-line.ts`, `resolve-direct-reports.ts`; `infrastructure/drizzle-hr-employees.gateway.ts`; `presentation/hr-employees.router.ts` (Zod + controller + router). |
| `apps/api/src/features/hr-erp-access/{domain,application,infrastructure,presentation}` | Create | Reuse invitation lifecycle pattern from `node-management`: `domain/hr-erp-access.ts`, `application/{create,accept,list,revoke}-erp-access-invitation.ts`; gateway + router. |
| `apps/api/src/features/approval-policy/{domain,application,infrastructure,presentation}` | Create | Domain model + base CRUD; no workflow engine. |
| `apps/api/src/features/roles-management/domain/permissions.ts` | Modify | Add `hr.*` keys to `permissionCatalogSeeds`; export `hrPermissionKeys`. |
| `apps/api/src/features/roles-management/domain/assignments.ts` | Modify | Add `PermissionScope` discriminated union (`company` / `node+descendants` / `direct_reports` / `self`) and `evaluateReportingLineScopes` port; do NOT touch `ScopeType` or `scopeTypeValues`. |
| `apps/api/src/features/roles-management/application/compute-effective-permissions.ts` | Modify | After collecting `inScopeAssignments`, union with keys derived from `evaluateReportingLineScopes` for the `direct_reports`/`self` scopes. |
| `apps/api/src/features/roles-management/presentation/require-hr-capability.ts` | Create | Factory for HR endpoint guards. |
| `apps/api/src/features/identity/application/resolve-auth-session.ts` | Modify | Reject `direct_reports`/`self` as `activeScope` value (validation, not silent drop). |
| `apps/api/src/features/org-hierarchy/infrastructure/drizzle-org-hierarchy.gateway.ts` | Modify | Replace `countEmployeesInArea` body with: count `employee_assignments` where `scope_node_id` resolves to the area via `scope_nodes` and `ended_at IS NULL`. Update gateway test mocks. |
| `apps/api/src/features/org-hierarchy/application/delete-area.ts` | Modify | Use new preflight counter signature (same shape). |
| `apps/api/src/app/create-app.ts` | Modify | Wire `createDrizzleHrEmployeesGateway`, `createDrizzleErpAccessGateway`, `createDrizzleApprovalPolicyGateway`; instantiate use cases; mount three new routers; pass `requireHrCapability` factory. |
| `apps/web/src/features/hr-employees/{domain,application,infrastructure,presentation}` | Create | Domain types, TanStack Query keys/hooks, `createHrEmployeesApi`, pages (employee list/detail/form, position list/form, assignment timeline). |
| `apps/web/src/features/hr-erp-access/{domain,application,infrastructure,presentation}` | Create | Invitation list/accept page; reuse `accept-invitation-page.tsx` shape. |
| `apps/web/src/features/approval-policy/{domain,application,infrastructure,presentation}` | Create | Policy list/form pages. |
| `apps/web/src/app/main.tsx` | Modify | Register new routes `/hr/employees`, `/hr/positions`, `/hr/erp-access`, `/hr/approval-policies`. |

## Interfaces / Contracts

```ts
// hr-employees/domain/positions.ts
export type Position = {
  id: string;
  companyId: string;
  name: string;
  reportsToPositionId: string | null; // null = top-of-hierarchy
  headcount: number;                   // 0..N; >= active primary assignments
  isActive: boolean;
  createdAt: Date;
};

// hr-employees/domain/employee-assignments.ts
export type EmployeeAssignment = {
  id: string;
  companyId: string;
  employeeId: string;
  scopeNodeId: string;                 // FK scope_nodes.id (org-tree only)
  positionId: string;
  startedAt: Date;
  endedAt: Date | null;                // null = active
  isPrimary: boolean;                  // exactly one active primary per employee
};
// DB invariants: partial unique (employee_id) WHERE ended_at IS NULL AND is_primary = true
//                partial unique (employee_id, scope_node_id) WHERE ended_at IS NULL (optional non-primary)

// roles-management/domain/assignments.ts (additive)
export type PermissionScope =
  | { kind: 'company' }
  | { kind: 'node+descendants'; scope: ScopeRef }
  | { kind: 'direct_reports' }
  | { kind: 'self' };

export type ReportingLineScopes = {
  scope_employees: string[];           // employee ids in the computed scope
};

// hr-erp-access/domain/hr-erp-access.ts
export type ErpAccessLink = {
  id: string;
  companyId: string;
  employeeId: string;
  userId: string;
  isActive: boolean;
  createdAt: Date;
  revokedAt: Date | null;
};
// partial unique (employee_id, company_id) WHERE is_active = true
// partial unique (user_id, company_id) WHERE is_active = true

export type ErpAccessInvitation = { /* mirrors NodeManagementInvitation without scope refs */ };

// approval-policy/domain/approval-policy.ts
export type ApprovalPolicy = {
  id: string;
  companyId: string;
  scopeType: OrgTreeScopeType;         // 'company'|'division'|'local'|'area'|'warehouse'|'point-of-sale'
  scopeNodeId: string | null;          // null ONLY when scopeType = 'company'
  name: string;
  definition: unknown;                 // opaque JSON; workflows out of scope
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};
```

## Testing Strategy

| Layer | What | How |
|-------|------|-----|
| Migration unit | Additive RRHH table creation, partial uniques, CHECK constraints, and proof of the real baseline through `0021` | `migration-0022-rrhh-foundation.test.ts` using `migration-test-helpers` (apply through `0021`, assert no legacy `employees` table, apply `0022`, inspect `information_schema` + `pg_indexes`). RED first, asserts fail before migration, pass after. |
| Domain unit | `EmployeeAssignment` one-active invariant, vacancy computation, top-of-hierarchy position validity, `PermissionScope` discriminants, ApprovalPolicy CHECK | Vitest in `hr-employees/domain/__tests__`, `roles-management/domain/__tests__`. |
| Application unit | `createAssignment` closes prior active primary inside one tx; `resolveReportingLine` returns manager/reports; `acceptErpAccessInvitation` rejects ambiguous active link; `evaluateReportingLineScopes` returns only direct reports | Vitest with in-memory gateway fakes (mock `evaluateReportingLineScopes` port + existing assignment gateway pattern). |
| Gateway integration | Real Drizzle reads/writes against `vimcore_migration_*` test DB; `countEmployeesInArea` post-migration correctness | `drizzle-hr-employees.gateway.test.ts` mirrors `drizzle-org-hierarchy.gateway.test.ts`. |
| Router integration | Zod parse, HTTP status, 403 on missing capability, 409 on conflict | Supertest + `requireHrCapability` mock. |
| Web unit | `useHrEmployees` query keys, mutation invalidations, `accept-invitation-page.tsx` form submit | Vitest + Testing Library, mirror `node-management-queries.test.tsx`. |
| Web E2E | Create position → assign employee → invite ERP access → accept → resolve direct manager | Playwright under `e2e/`. |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary is touched by this design.

## Migration / Rollout

| Step | Action | Reversible? |
|------|--------|-------------|
| 1 | Merge migration `0022_rrhh_foundation.sql` to create the RRHH foundation tables from the real baseline through `0021` | Yes — drop the new tables. |
| 2 | Deploy backend with new feature routers behind capability checks | Yes — flag `HR_V1_ENABLED` (default off). |
| 3 | Smoke test on staging: new HR endpoints reject without capability, and org-tree preflight remains green once its PR lands | N/A |
| 4 | Enable `HR_V1_ENABLED=true` per tenant; archive change after verify | N/A |

Rollback before enablement: revert PRs and run forward SQL that drops only the RRHH foundation tables introduced by `0022`.

## Open Questions

- None blocking. Two clarifying items for `sdd-tasks`:
  - Confirm stacking strategy (one PR per capability slice vs one mega-PR) given the 400-line budget.
  - Confirm whether `is_primary` is a column on `employee_assignments` or derived from "one active assignment per employee" (spec wording allows both; default chosen: column, DB-enforced by partial unique).
