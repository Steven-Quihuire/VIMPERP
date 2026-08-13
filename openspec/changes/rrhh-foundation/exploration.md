# Exploration: RRHH V1 Foundation for ERP SaaS

## Current State

Vimcore is a pnpm/Turbo monorepo: `apps/api` (Express 5 + Drizzle + PostgreSQL) and `apps/web` (React 19 + TanStack Query + Zustand). Every feature follows domain/application/infrastructure/presentation vertical slices. The SDD contract is hybrid (OpenSpec repo-local source of truth + Engram session context), strict TDD via Vitest/Playwright, 80% coverage threshold.

### Org tree + RBAC spine (the model RRHH must extend)
A canonical scope model is being established by the **active** `canonical-org-rbac-hierarchy` change (PR-1/PR-2 landed; **PR-3 active-scope session + PR-4 single-parent validation NOT landed** — see `apply-progress.md` tasks 3.1–4.6):

- `scope_nodes` projection table (trigger-maintained, one row per addressable org node). PG enum `scope_node_type = company | division | local | area | warehouse | point-of-sale`. **The canonical proposal freezes this enum — future node types use the `node_type` discriminator, not new enum values.** (`schema.ts:284`)
- `role_assignments` FK to `scope_nodes.id` with RESTRICT; `mode = subtree_inclusive | exact_node`. (`schema.ts:226`)
- `ScopeResolver` (`shared/infrastructure/scope-hierarchy/scope-hierarchy.port.ts`): `getLineage`, `isAuthorized`, `listAuthorizedDescendants`. One recursive `WITH RECURSIVE` lineage read (`drizzle-scope-resolver.ts`).
- `ProfileEffectivePermissions` use case: assignment on an ancestor scope applies to the active scope via lineage.
- Permission catalog (`roles-management/domain/permissions.ts`): families `normal | reserved`; seeds `catalog.read/write/delete`, `roles.read/write/assign`, `platform.*`.
- Identity-level `AuthCapability` (`identity/domain/auth.ts:46`) is a **separate, hardcoded** enum of `catalog.*` only; `deriveAuthCapabilities` derives it from `AuthRole` (platform-admin / company-owner / company-user). There is a **two-layer authorization tension**: `AuthCapability` (identity) vs `Permission` catalog (roles-management). Consumers like `org-tree.router` call `hasAuthCapability(auth.capabilities, 'catalog.read')`.

### Existing employees scaffolding (a pre-existing table, no feature folder)
There is **no `employees-management` feature folder** in `apps/api/src/features` or `apps/web/src/features`. But a minimal `employeesTable` already exists and is referenced by org-hierarchy delete preflights:

- `employeesTable` (`schema.ts:560`): `id, companyId (NOT NULL, RESTRICT), userId (nullable, RESTRICT), position (free text, NOT NULL), areaId (nullable, RESTRICT), createdAt`. Partial unique index `employees_company_user_unique_idx(companyId, userId) WHERE userId IS NOT NULL`.
- Referenced by `org-hierarchy/domain/org-hierarchy.ts:156` `countEmployeesInArea(areaId)`, implemented in `drizzle-org-hierarchy.gateway.ts:964`, used in `delete-area.ts`. It is mocked in hierarchical delete tests.

**This existing table directly contradicts the V1 domain decisions:**
1. `position` is free text, not a Position entity with `reports_to_position_id` → must evolve to FK.
2. `areaId` is a single parent field, not an `EmployeeAssignment` history model → must be replaced.
3. `userId` is an optional direct column on the employee row → `Employee != User` requires decoupling into an explicit ERP-access link (invitation-gated), not an inline nullable `userId`.
Migrating it is non-destructive (backfill) territory and touches the `countEmployeesInArea` contract surface.

### Organization-node responsibility vs employee-manager (two distinct concepts, confirmed)
- `node_responsibilities` (`schema.ts:309`): one **active** `responsibleUserId` per `scope_node` (unique partial index on active scope node), `managedRoleKey = 'node-manager'`, `baseMembershipRole = 'company-user'`. This is "who governs this org node" — **NOT** an employee's direct manager.
- `node_management_invitations` (`schema.ts:351`): invitation flow that creates/links a user account + grants the managed role + base membership on accept. Reusable pattern for RRHH ERP-access invitations.
- RRHH reporting hierarchy (Position `reports_to_position_id` → active `EmployeeAssignment`) is an **orthogonal** people-hierarchy chain. No schema collision, but they must not be conflated.

### Approval / policy
No `ApprovalPolicy` model exists. Only `PRIVACY_POLICY_VERSION` / `privacy_policy_acceptances` exists in `companies`. ApprovalPolicy is net-new domain groundwork (V1: model + base only, no workflows).

## Affected Areas

DB (foundation must land first per DB→BACKEND→FRONTEND):
- `apps/api/src/shared/infrastructure/db/schema.ts` — evolve `employeesTable` (rename/repurpose `position`→FK, replace `areaId` with assignment history, decouple `userId`); add `positionsTable`, `employeeAssignmentsTable`, `erpAccessLinkTable`/`erpAccessInvitationsTable`, `approvalPoliciesTable`.
- `apps/api/src/db/migrations/00XX_*.sql` (+ meta snapshot + journal) — non-destructive migration with backfill; keep `scope_node_type` enum frozen.
- `apps/api/src/db/migrations/__tests__/` — new migration tests; update `drizzle-org-hierarchy.gateway.test.ts` references that mock `employeesTable`/`countEmployeesInArea`.

Backend (apps/api/src/features):
- NEW `hr-employees` feature slice (+ domain/application/infrastructure/presentation): employee master, assignments/history, reporting-hierarchy reads.
- NEW `hr-positions` (or folded into hr-employees): Position CRUD + `reports_to_position_id` + vacancies/headcount.
- NEW `hr-erp-access` feature slice: ERP access link/invitations (reuse `node-management` invitation domain patterns, NOT the same tables).
- NEW `approval-policy` feature slice (domain only): model + base CRUD; no workflows.
- `roles-management/domain/{permissions.ts,assignments.ts}` + `application/compute-effective-permissions.ts` + `application/scope-matcher.ts` — extend permission scope union to express `direct_reports` and `self` (NOT as `scope_nodes` types); add `hr.*` permission keys to `permissionCatalogSeeds`.
- `identity/domain/auth.ts` / `roles-management` — decide authz layer for HR endpoints (roles-management `Permission` catalog vs identity `AuthCapability`); add hr capabilities following `requireTenantCapability` guard pattern.
- `org-hierarchy/domain/org-hierarchy.ts` — update `countEmployeesInArea` (and any area-delete preflight) contract as employee shape evolves; possibly generalize to scope-node-based counts.
- `app/create-app.ts` — wire new feature routers/composition root.

Frontend (apps/web/src/features):
- NEW `hr-employees`, `hr-positions`, `hr-erp-access` feature slices (domain/application/infrastructure/presentation): TanStack Query keys/mutations, Zustand client state, shadcn forms (RHF + Zod), pages.
- `shared` HttpClient + ERP access invitation acceptance UI (parallel to auth/node-management invitation flows).

Specs (OpenSpec capability deltas):
- NEW `hr-employees`, `hr-erp-access`, `approval-policy` capability specs (delta ADD).
- MODIFIED `roles-management` (permission scope extension) and `identity-access` (capability/hierarchical scope context) will need deltas IF the permission-scope changes touch their contracts.
- `org-hierarchy` spec delta may need a MODIFIED requirement on employee-dependent delete preflights once the employee shape changes.

## Approaches

1. **Single change, multiple capability deltas, stacked-to-main delivery** — one `rrhh-foundation` change that ADDS `hr-employees`, `hr-erp-access`, `approval-policy` capabilities and MODIFIES `roles-management`/`identity-access`; deliver as a stacked PR chain (DB migration first, then api, then web) mirroring the canonical change's stacked-to-main proven pattern.
   - Pros: one coherent change boundary for V1 foundation; apply/verify/archive happen once; reuses the review-budget-friendly chained pattern already validated by `canonical-org-rbac-hierarchy`; the user can review the full scope upfront (coherence requirement).
   - Cons: change is wide; risk of a single change touching multiple feature boundaries (OpenSpec rule "one active change per feature boundary") — acceptable only because these are COUPLED foundation pieces of one RRHH V1 capability-set, not unrelated work.
   - Effort: Medium-High

2. **Multiple chained changes** — split into `rrhh-positions-employees`, `rrhh-erp-access`, `rrhh-approval-policy`, `rrhh-permission-scopes` as separate sequentially-archived changes.
   - Pros: strictest adherence to "one change per feature boundary"; smallest reviewable units; each can be applied/verified/archived independently.
   - Cons: breaks the user's explicit "coherent upfront V1 foundation" requirement; permission scopes (`direct_reports`/`self`) and reporting hierarchy couple positions+assignments tightly, so splitting them creates artificial boundaries; more archive/delta-merge overhead and higher drift risk across spec boundaries.
   - Effort: High (coordination cost)

3. **One mega-capability** — collapse everything into one new `rrhh` capability spec.
   - Pros: simplest boundary.
   - Cons: violates screaming/clean feature-first boundaries; mixes ERP-access (an access/identity concern) with people-management and approval-policy (distinct domain); makes future payroll/performance additions impossible to scope without re-opening the same capability; hardest to verify/archive cleanly.
   - Effort: Medium but unmaintainable

### Recommendation

**Approach 1.** Keep `rrhh-foundation` as ONE change with multiple capability deltas, delivered stacked-to-main. Capability split:
- `hr-employees` (NEW) — Employee Master + organization linkage + Position + `EmployeeAssignment` history + reporting hierarchy + headcount/vacancies. Positions and assignments live together because `Position.reports_to_position_id` + active `EmployeeAssignment.positionId` jointly define the hierarchy — splitting them is artificial.
- `hr-erp-access` (NEW) — Employee↔User invitation-gated activation, reusing the `node-management` invitation domain pattern.
- `approval-policy` (NEW) — ApprovalPolicy domain model + base CRUD, no workflows.
- `roles-management` + `identity-access` (MODIFIED) — extend permission scope union to express `company | node+descendants | direct_reports | self`. **Critical constraint: do NOT add `direct_reports`/`self` to the frozen `scope_node_type` enum.** Model them as an additive permission-scope dimension in the roles-management domain (e.g. a discriminated `PermissionScope` union separate from `ScopeRef`), evaluated by an extended `compute-effective-permissions`, not by the `scope_nodes` lineage resolver.

Sequence DB→BACKEND→FRONTEND per capability and stack after the canonical change's PR-3 (active-scope session) lands, since RRHH permission scopes depend on the active-scope context that PR-3 generalizes.

### Risks

- **Dependency on unlanded canonical PR-3/PR-4.** RRHH permission scopes (`direct_reports`, `self`) ride on the active-scope session generalization that tasks 3.1–4.6 have NOT delivered. Starting before PR-3 risks rework. Mitigation: sequence RRHH after canonical PR-3, or carve a minimal `self` proof that does not require active-scope.
- **`scope_node_type` enum is frozen.** Adding `employee`/`position`/`direct_reports`/`self` as scope node types would violate the canonical contract and break the trigger-maintained projection. Mitigation: keep these as a separate permission-scope union; never insert `scope_nodes` rows for people/positions.
- **Existing `employeesTable` migration safety.** Evolving `position (text)`→FK, replacing `areaId`→assignment history, and decoupling `userId`→ERP-access link must be backfilled non-destructively; `countEmployeesInArea` and its mocked tests must be updated in the same slice. Mitigation: migration tests first (RED), backfill + quarantine-style guard, update org-hierarchy contract in the same PR.
- **Two-layer authorization ambiguity.** Identity `AuthCapability` (hardcoded `catalog.*`) vs roles-management `Permission` catalog. HR endpoints must pick one consistently. Mitigation: decide in proposal/spec (recommend roles-management `Permission` catalog + `compute-effective-permissions`, add `hr.*` keys; deprecate ad-hoc `AuthCapability` growth).
- **Reporting-hierarchy vs node-responsibility conflation.** Both are "who/what reports to whom" conceptually but model different things. Mitigation: explicitly document the separation in the design; never reuse `node_responsibilities` for employee-manager.
- **Node-management invitation duplication.** RRHH ERP-access invitations could duplicate the `node_management_invitations` pattern. Mitigation: reuse the domain pattern but separate tables; avoid coupling HRPeople activation to org-node management semantics.
- **Change-boundary drift during archive.** One change touching 5 capabilities risks delta-merge conflicts with the in-flight canonical change. Mitigation: archive canonical first or coordinate deltas; keep HR modifications to roles-management/identity-access additive only.

### Ready for Proposal

Yes. Before the orchestrator runs `sdd-propose`, confirm with the user:
1. Capability split = Approach 1 (`hr-employees` + `hr-erp-access` + `approval-policy` NEW; `roles-management` + `identity-access` MODIFIED).
2. Sequencing: stack `rrhh-foundation` AFTER `canonical-org-rbac-hierarchy` PR-3 (active-scope session) — or accept a reduced V1 permission-scope that excludes `direct_reports` until PR-3 lands.
3. Authorization layer for HR endpoints: roles-management `Permission` catalog (recommended) vs identity `AuthCapability`.
4. `Employee != User` decoupling is to be enforced by evolving `employeesTable` (drop inline `userId`) gated by an ERP-access invitation, accepting a non-destructive migration of the existing table.