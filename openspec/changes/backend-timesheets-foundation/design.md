# Design: Backend Timesheets Foundation

## Technical Approach

Backend-only vertical slice under `apps/api/src/features/hr-timesheets/` mirroring `approval-policy` and `hr-employees`: domain + gateway port + errors, application use-case factories, Drizzle gateway with composite-tenant scoping and `23P01` overlap helper, Express router with `requireAuth` + `requireHrCapability` + `ensureCompanyAccess`, centralized error middleware. Three strict-TDD chained PRs (S1 domain+application, S2 Drizzle gateway, S3 router+middleware+wiring) — `sdd-tasks` MUST emit the chain guard. No DB or frontend changes.

## Architecture Decisions

| # | Choice | Rationale |
|---|--------|-----------|
| 1 | State machine in app layer (`draft→submitted→approved|rejected`, `rejected→draft`); DB pair CHECKs are safety net. | Spec mandates app-layer enforcement. |
| 2 | Submit auto-resolves via `approvalPolicyGateway.findActivePolicyForScope(companyId, scopeNodeId)` in submit Tx; Zod strips `approvalPolicyId`. | Spec Odoo decision (1); audit-trail truthful. |
| 3 | Domain `PeriodDate = string` (`'YYYY-MM-DD'`); gateway keeps Drizzle's native string; no `Date` conversion. | Matches `expiresAt: row.expiresAt` precedent in `drizzle-node-management.gateway.ts`. |
| 4 | `hours: number` in domain; mapper uses `Number(row.hours)` mirroring `unitPrice: Number(row.unitPrice)`. | DB `numeric(5,2)` returns string. |
| 5 | `isPeriodOverlapViolation(error)` checks `code === '23P01' && constraint === 'timesheet_periods_no_overlap_excl'`; gateway `createPeriod` wraps insert → `TimesheetPeriodOverlapError`. | Constraint name deterministic; helper unit-tested in S2. |
| 6 | `resolveTimesheetPermissionScope` resolves only to `self` (via `hrErpAccessGateway.getActiveLinkByUserId`) or `direct_reports` (via `hrEmployeesGateway.listDirectReportAssignments`). No `company`/`node+descendants` fallback. Out-of-scope → 404. | Spec "Auth-scoped visibility"; no assigned-approver yet. |
| 7 | Timesheets gateway owns `findActiveAssignment` join against `employeeAssignmentsTable`. Use cases do NOT import `HrEmployeesGateway`. | Avoid app-layer coupling; clean gateway boundary. |
| 8 | Zod mirrors DB CHECKs (`hours > 0 && <= 24`, `entryDate ∈ [periodStart, periodEnd]`); typed domain errors → 400. | `entryDate`-in-range not DB-checked; documented app duty from 0026. |
| 9 | `approve` rejects when `auth.user.id === submittedByUserId` → `TimesheetSelfApprovalError` (409). | DB CHECKs cover pair, not identity. |
| 10 | `CreateAppInput` adds `timesheetGateway?`; router tests use `InMemoryTimesheetsGateway` + stubbed `computeEffectivePermissions`. | Mirrors `approval-policy.router.test.ts`. |
| 11 | `vitest.config.ts` coverage include unchanged. | Proposal decision. |

## Data Flow

```
submitPeriod Tx { SELECT period FOR UPDATE (tenant+actor scope), assert status==='draft',
  resolveActivePolicy(companyId, scopeNodeId),
  UPDATE status='submitted', submittedAt=now(), submittedByUserId=auth.user.id,
         approvalPolicyId=resolved|null }
addEntry { load period, assert status==='draft',
  assert entryDate∈[periodStart,periodEnd], assert 0<hours<=24,
  gateway.createEntry; 23P01→OverlapError;
  23505 unique(period,date,task)→EntryConflictError }
listPeriods { resolveActorEmployeeIds(auth)=[actorEmpId|directReports],
  gateway.listPeriods(companyId, {employeeIds, ...filters}) }
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `apps/api/src/features/hr-timesheets/domain/timesheets.ts` | Create | Types + port + 10 error classes. |
| `apps/api/src/features/hr-timesheets/domain/__tests__/state-machine.test.ts` | Create | S1: state-machine assertions. |
| `apps/api/src/features/hr-timesheets/application/{create,get,list,patch}-period.ts` | Create | create: validates range, lookup assignment, 23P01→overlap. get/list: auth-scoped. patch: draft-only. |
| `apps/api/src/features/hr-timesheets/application/entries/{add,update,remove}-entry.ts` | Create | Entry CRUD; draft guard; range+hours validation. |
| `apps/api/src/features/hr-timesheets/application/{submit,approve,reject,reopen}-period.ts` | Create | State machine; submit resolves policy; approve guards self-approval; reject requires reason. |
| `apps/api/src/features/hr-timesheets/application/__tests__/*.test.ts` | Create | S1: in-memory gateway fakes. |
| `apps/api/src/features/hr-timesheets/infrastructure/drizzle-timesheets.gateway.ts` | Create | Gateway; row mappers; `findActiveAssignment` join; 23P01 helper. |
| `apps/api/src/features/hr-timesheets/infrastructure/drizzle-timesheets.gateway.test.ts` | Create | S2: real PG via `applyMigrationsThrough('0026_timesheets.sql')`. |
| `apps/api/src/features/hr-timesheets/presentation/timesheets.router.ts` | Create | Zod; controllers; `requireHrCapability(key)`; `resolveTimesheetPermissionScope`. |
| `apps/api/src/features/hr-timesheets/presentation/timesheets.router.test.ts` | Create | S3: supertest + `createApp`; 400/403/404/409. |
| `apps/api/src/shared/presentation/error.middleware.ts` | Modify | Register 10 errors → 400/404/409. |
| `apps/api/src/app/create-app.ts` | Modify | Add `timesheetGateway?`; wire slice. |

## Interfaces / Contracts

```ts
// domain/timesheets.ts
export type TimesheetPeriodStatus = 'draft'|'submitted'|'approved'|'rejected';
export type PeriodDate = string; // 'YYYY-MM-DD'
export type TimesheetPeriod = { id; companyId; employeeAssignmentId; periodStart; periodEnd; status;
  submittedAt|null; submittedByUserId|null; approvedAt|null; approvedByUserId|null;
  rejectionReason|null; approvalPolicyId|null; createdAt; updatedAt; };
export type TimeEntry = { id; companyId; periodId; entryDate; hours; projectId|null; taskLabel; note|null; createdAt; updatedAt; };
export type TimesheetGateway = {
  createPeriod(i: {companyId;employeeAssignmentId;periodStart;periodEnd}) => Promise<TimesheetPeriod>;
  getPeriod/listPeriods/patchPeriod; createEntry/getEntry/updateEntry/listEntries; deleteEntry;
  submitPeriod(i: {companyId;periodId;submittedByUserId;approvalPolicyId|null;at}) => Promise<TimesheetPeriod|null>;
  approvePeriod/rejectPeriod/reopenPeriod;
  findActiveAssignment(companyId, assignmentId) => Promise<{id;companyId;employeeId}|null>;
};
// PATCH/entries/* rejected unless status==='draft'; approvePeriod rejects when auth.user.id === submittedByUserId.
```

Routes (all: `requireAuth` + `requireHrCapability(key)` + `ensureCompanyAccess`):

| Method | Route | Permission |
|--------|-------|------------|
| POST/GET | `/companies/:companyId/timesheets` | `hr.timesheets.{write,read}` |
| GET/PATCH | `/companies/:companyId/timesheets/:periodId` | `hr.timesheets.{read,write}` |
| POST/PATCH/DELETE | `/companies/:companyId/timesheets/:periodId/entries[/:entryId]` | `hr.timesheets.write` |
| POST | `/companies/:companyId/timesheets/:periodId/submit` | `hr.timesheets.submit` |
| POST | `/companies/:companyId/timesheets/:periodId/approve` | `hr.timesheets.approve` |
| POST | `/companies/:companyId/timesheets/:periodId/reject` | `hr.timesheets.approve` |
| POST | `/companies/:companyId/timesheets/:periodId/reopen` | `hr.timesheets.write` |

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit (S1) | State machine, validation, codes | `vitest` + `InMemoryTimesheetsGateway` + `InMemoryApprovalPolicyGateway` |
| Integration (S2) | Tenant scope, mapping, 23P01→overlap | Real PG via `applyMigrationsThrough('0026_timesheets.sql')` |
| E2E (S3) | Happy + 400/403/404/409 across 11 endpoints | supertest + `createApp` + `InMemoryTimesheetsGateway` + stubbed `computeEffectivePermissions` |

## Threat Matrix

N/A — pure HTTP API. No routing/shell/subprocess/VCS boundary. Existing `requireAuth` + `errorMiddleware` cover session + errors.

## Migration / Rollout

No migration. Additive on archived 0026 DB foundation. Rollback: revert slice commits, `error.middleware.ts` registrations, `create-app.ts` wiring.

## Open Questions

None blocking. Proposal (1–6) confirmed; spec scopes visibility to `self` + `direct_reports` only.