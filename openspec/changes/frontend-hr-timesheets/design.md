# Design: Frontend HR Timesheets (Registro de horas)

## Technical Approach

Two-sided vertical slice. **Backend (additive, read-only)**: new `list-entries` use case + `GET /companies/:companyId/timesheets/:periodId/entries` route, reusing `timesheetGateway.listEntries` and the `get-period` scope pattern. **Frontend**: feature-first slice `apps/web/src/features/hr-timesheets/` mirroring `hr-employees` (typed `HttpClient`, TanStack Query, RHF+Zod). Detail composes `getPeriod` + `listEntries`; sidebar gains one entry gated by the new `hr.timesheets.read` capability. **Auth contract**: extend `AuthCapability` on both API + web; whitelist `hr.timesheets.read` in `resolveScopedCapabilities`. Server-side capability/scope checks remain authoritative.

## Architecture Decisions

| Decision | Choice | Tradeoff | Final |
| --- | --- | --- | --- |
| Entry read source | New `GET /companies/:companyId/timesheets/:periodId/entries` | One extra round-trip vs `getPeriod` returning entries | Cleaner contract; gateway `listEntries` already exists |
| Gateway change | None — reuse `TimesheetGateway.listEntries` | — | Implemented + tested at infrastructure layer |
| Use-case shape | Mirror `get-period`: load period + assignment, assert `visibleEmployeeIds` | ~10 LOC overlap | Matches existing pattern |
| Router guard | `requireTimesheetCapability('hr.timesheets.read')` + `resolveTimesheetPermissionScope` | Same auth as `getPeriod` | Reuse existing permission + scope wiring |
| Sidebar gating + capability union | `hasTimesheetReadVisibility(session)` (new). Extend `authCapabilityValues` + `AuthCapability` with `hr.timesheets.read\|write\|submit\|approve`; whitelist in `resolveScopedCapabilities` | Wider union touches typed tests in identity/items/org-tree | Spec requires per-user timesheet visibility, NOT generic HR-responsibility. Server still authoritative; nav is UX hint matching spec |
| Error mapping | Add `code` on `HttpError`; central `friendlyTimesheetError` | Touches shared `http-client.ts` | Six codes share 409/400 — helper needed |
| UI state | Zustand: weekly-entry draft buffer + reject-dialog visibility | One small store | Spec isolation, no server copy |
| Server state | Two queries (`useTimesheetPeriod`, `useTimesheetPeriodEntries`); mutations invalidate both | One extra key per period | Clean invalidation |

## Data Flow

```
List   → useTimesheetPeriods(status?)        → GET /companies/:c/timesheets?status=
Detail → useTimesheetPeriod(c,p)              → GET /companies/:c/timesheets/:p
       → useTimesheetPeriodEntries(c,p)       → GET /companies/:c/timesheets/:p/entries
Mutations (createEntry/updateEntry/deleteEntry/submit/approve/reject/reopen) →
  invalidate period + periodEntries + listPeriods keys; onError → banner.
```

## File Changes

### Backend (additive)

| File | Action |
|------|--------|
| `apps/api/src/features/hr-timesheets/application/list-entries.ts` (+ tests) | Create: load period + assignment, assert `visibleEmployeeIds`, call `gateway.listEntries`, throw `TimesheetPeriodNotFoundError` on miss; in-memory cases |
| `apps/api/src/features/hr-timesheets/presentation/timesheets.router.ts` (+ tests) | Add `GET /companies/:companyId/timesheets/:periodId/entries` (Zod, `requireHrCapability('hr.timesheets.read')`); supertest: 200 own/direct-report, 403 out-of-scope, 200 empty, Zod rejects |
| `apps/api/src/app/create-app.ts` | Wire `createListEntriesUseCase`; pass `listEntries` to router (resolve `visibleEmployeeIds` like `getPeriod`) |
| `apps/api/src/features/identity/domain/auth.ts` | Extend `authCapabilityValues` + `AuthCapability` with `hr.timesheets.read\|write\|submit\|approve` |
| `apps/api/src/features/identity/application/resolve-auth-session.ts` (+ tests) | Whitelist `hr.timesheets.read` in `resolveScopedCapabilities` filter; test proves scoped role with grant yields the capability |

### Frontend (new slice)

| File | Action |
|------|--------|
| `apps/web/src/features/hr-timesheets/{domain,application,infrastructure,presentation}/` | Create DTOs/Zod, queries, typed adapter, pages, components, tests |
| `apps/web/src/features/hr-timesheets/application/weekly-entry-draft-store.ts` | Zustand (drafts + reject-dialog visibility) |
| `apps/web/src/shared/lib/http/http-client.ts` (+ tests) | Add `code` on `HttpError`; cover extraction |
| `apps/web/src/features/auth/domain/auth.ts` (+ tests) | Extend `AuthCapability`; export `hasTimesheetReadVisibility(session)` predicate + truthy/falsy cases |
| `apps/web/src/features/dashboard/presentation/dashboard-app-sidebar.tsx` | Add `Timesheets` to `hrItems`; render only when `hasTimesheetReadVisibility(session)`; HR group still `canConfigureHr \|\| hasHrResponsibility` |
| `apps/web/src/app/app.tsx` (+ `app.hr-routes.test.tsx`, `app.dashboard-shell.test.tsx`) | `HrTimesheetsRoute` for `/dashboard/hr/timesheets` + `/:periodId` inside `ProtectedDashboardShell`; tests cover new routes and RED case: sidebar hidden when `capabilities` omit `hr.timesheets.read` even with `hasHrResponsibility` true |

## Interfaces / Contracts

```ts
// domain/timesheets.ts (existing — preserved verbatim)
export type TimesheetPeriodStatus = 'draft'|'submitted'|'approved'|'rejected';
export type IsoDate = `${number}-${number}-${number}`;
export type TimesheetPeriod = { id; companyId; employeeAssignmentId;
  periodStart: IsoDate; periodEnd: IsoDate; status: TimesheetPeriodStatus;
  submittedAt|null; submittedByUserId|null; approvedAt|null; approvedByUserId|null;
  rejectionReason|null; approvalPolicyId|null; createdAt; updatedAt };
export type TimesheetEntry = { id; companyId; periodId; entryDate: IsoDate; hours;
  projectId|null; taskLabel; note|null; createdAt; updatedAt };

// API + Web auth (delta)
export const authCapabilityValues = [
  'catalog.read','catalog.write','catalog.delete',
  'hr.timesheets.read','hr.timesheets.write','hr.timesheets.submit','hr.timesheets.approve',
] as const;
export type AuthCapability = (typeof authCapabilityValues)[number];
export const hasTimesheetReadVisibility = (s: AuthSession) =>
  s.capabilities.includes('hr.timesheets.read');

// shared/lib/http/http-client.ts (delta)
export class HttpError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) { ... }
}

// infrastructure/create-hr-timesheets-api.ts
export type HrTimesheetsApi = {
  listPeriods(c, status?): Promise<TimesheetPeriod[]>;
  getPeriod(c, p): Promise<TimesheetPeriod>;        // metadata only
  listEntries(c, p): Promise<TimesheetEntry[]>;     // NEW
  // create/update/delete, submit/approve/reopen, reject — unchanged
};
```

Action visibility (presentation): `submit` on `draft`; `approve|reject` on `submitted` and `submittedByUserId !== session.user.id`; `reopen` on `rejected`.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit (backend) | `list-entries` (own/direct-report visible, out-of-scope → error, empty list); router Zod rejects bad params | Vitest + `InMemoryTimesheetsGateway` + supertest |
| Unit (infra) | Each endpoint path/method/body; `code` propagates | `fetch` mock |
| Unit (app) | Query keys stable; mutations invalidate period + entries keys | `QueryClient` + Vitest |
| Unit (domain) | `friendlyTimesheetError` maps every code | Pure tests |
| Component | Filter narrows list; grid renders entries; reject dialog; banner copy | Testing Library + MSW |
| Integration | Routes resolve; sidebar Timesheets hidden when `hr.timesheets.read` absent (even with `hasHrResponsibility` true); workflow invalidates list | `app.hr-routes.test.tsx` + `app.dashboard-shell.test.tsx` |
| E2E | Manager approves; employee self-submits | Playwright |

## Threat Matrix

N/A — no shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary. Read-only Express handler with Zod + Drizzle parameterised queries; reuses `requireAuth` + `requireHrCapability('hr.timesheets.read')`.

## Migration / Rollout

No data migration. Fully additive: one router endpoint, one use case, one composition-root wiring, one frontend slice, one capability-union extension. Rollback = revert commits.

## Open Questions

- [ ] `useCreatePeriod` exposed now, or deferred to manager-only flow using `hr-employees` picker?
- [ ] Per-day row creation inline vs "Add entry" affordance per row? Spec is silent on UX.

Resolved: route typo `periods/:periodId/entries` → canonical `GET /companies/:companyId/timesheets/:periodId/entries`. Resolved: sidebar uses per-user `hr.timesheets.read` capability, not generic HR-responsibility; capability union extended on both API + web.
