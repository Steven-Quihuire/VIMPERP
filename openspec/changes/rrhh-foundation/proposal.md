# Proposal: RRHH V1 Foundation for ERP SaaS

## Intent

Establish an upfront-coherent RRHH V1 foundation (Employee Master, organization linkage, Positions, assignment history, reporting hierarchy, ERP-access invitations, hierarchical permission scopes, ApprovalPolicy groundwork) so later spec/design/tasks/apply/verify/archive do not drift. Sequence DB → BACKEND → FRONTEND; start from the real migration baseline through `0021`, which does not include a legacy `employees` table.

## Scope

### In Scope
- Employee Master with `Employee != User`.
- Position entity (`reports_to_position_id`, vacancies/headcount).
- `EmployeeAssignment` history (one active per employee) replacing `areaId`.
- Reporting-hierarchy reads; ERP access link + invitation-gated activation.
- Permission scopes `company | node+descendants | direct_reports | self`.
- ApprovalPolicy domain model + base CRUD (no workflows).
- Additive creation of the RRHH employee foundation from the real migration baseline.

### Out of Scope
Payroll, salary, taxes; ATS/recruiting; attendance/biometric; time off/overtime; benefits; trainings; performance; surveys; OKRs; contract signing; approval workflows.

## Capabilities

> Contract for sdd-spec. Researched `openspec/specs/`.

### New Capabilities
- `hr-employees`: Employee Master, Position, assignments/history, reporting hierarchy, headcount/vacancies.
- `hr-erp-access`: Employee↔User activation via invitation.
- `approval-policy`: ApprovalPolicy model + base CRUD.

### Modified Capabilities
- `identity-access`: add `direct_reports | self` to the permission-scope union; add `hr.*` permission keys; resolve HR authorization via the roles-management `Permission` catalog + `compute-effective-permissions`, not identity `AuthCapability`. *Adapted from exploration's "MODIFIED roles-management": `roles-management` is a feature folder, not an OpenSpec capability — roles/permission/active-scope behavior is owned by the `identity-access` spec ("Protected Access and Roles", "Active Scope Context").*
- `org-tree`: evolve the employee-dependent delete-preflight contract as the employee shape changes. *Name may become `org-hierarchy` once `canonical-org-rbac-hierarchy` archives; retarget the delta at spec time.*

## DB-First Invariants (coherence locks)

- `scope_node_type` enum FROZEN: never add `employee | position | direct_reports | self`.
- `direct_reports | self` = additive permission-scope union in the roles-management domain, not `scope_nodes` rows.
- No inline nullable `userId` on employee — gated via `erpAccessLink` + invitation.
- `Position.reports_to_position_id` single-parent; one-active `EmployeeAssignment` replaces `areaId`.
- Never reuse `node_responsibilities` for employee-manager; reporting hierarchy is orthogonal (people-chain vs org-node governance).

## Approach

One change, multiple capability deltas, stacked-to-main mirroring the canonical pattern. Per capability: Drizzle schema + non-destructive migration (RED tests, backfill) first, then api feature slices (domain → application → infrastructure → presentation), then web slices. Reuse the `node-management` invitation pattern with separate tables for ERP-access.

## Affected Areas

| Area | Impact |
|------|--------|
| `apps/api/src/shared/infrastructure/db/schema.ts`, `db/migrations/00XX_*.sql` (+ meta/journal) | Modified/New — create the RRHH employee foundation tables and constraints from the real `0021` baseline. |
| `apps/api/src/features/hr-employees`, `hr-erp-access`, `approval-policy` | New — vertical slices. |
| `apps/api/src/features/roles-management` (domain/permissions, application/scope-matcher, compute-effective-permissions), `identity`, `org-hierarchy/domain` | Modified — permission-scope union, `hr.*` keys, `countEmployeesInArea` preflight. |
| `apps/web/src/features/hr-employees`, `hr-erp-access` | New — TanStack Query + Zustand + RHF/Zod + shadcn pages. |
| `openspec/specs/{hr-employees,hr-erp-access,approval-policy,identity-access,org-tree}` | New/Modified — capability deltas. |

## Risks

| Risk | Lik | Mitigation |
|------|-----|------------|
| Canonical active-scope session (PR-3) not landed | Med | Gate `direct_reports`/`self` evaluation behind the active-scope contract; carve a reduced V1 (sans `direct_reports`) if blocked. |
| Baseline drift in PR-1 artifacts | Med | RED migration test first; prove `0021` has no legacy `employees` table and keep PR-1 additive-only. |
| Frozen enum violation | Low | DB-first invariants; never insert people/positions as scope nodes. |
| Two-layer authz ambiguity (`AuthCapability` vs `Permission` catalog) | Med | Decide in spec: roles-management `Permission` catalog; stop growing `AuthCapability`. |
| Delta drift vs in-flight canonical change | Med | Keep `identity-access`/`org-tree` deltas additive; coordinate archive order. |

## Rollback Plan

Revert by dropping only the RRHH foundation tables introduced by `0022`; remove new routers from `create-app.ts`; delete `hr-*` feature folders and web slices. Keep rollback deletion-only for PR-1.

## Dependencies

- **Logical (not branch) dependency** on the active-scope context generalized by `canonical-org-rbac-hierarchy` — needed for `direct_reports`/`self` evaluation. Kept decoupled from transient branch state; only the final contract matters.
- Reuses the archived `node-management` invitation domain pattern (separate tables).

## Success Criteria

- [ ] RRHH foundation tables are created additively from the real `0021` baseline; org-hierarchy delete preflight stays green once its follow-up PR lands.
- [ ] `hr-employees`, `hr-erp-access`, `approval-policy` capabilities exist end-to-end (DB → api → web).
- [ ] Permission-scope union supports `company | node+descendants | direct_reports | self` without touching `scope_node_type`.
- [ ] DB-level enforcement of `Employee != User`, Position `reports_to_position_id`, one-active `EmployeeAssignment`.
- [ ] `pnpm test` + `pnpm build` green; coverage ≥ 80%.
