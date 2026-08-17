# Proposal: Backend Timesheets Foundation

## Intent

Migration `0026` (archived) landed tables, seeds, tests — no backend: slice, use cases, gateway, routes, wiring. Deliver the `hr-timesheets` API per the DB→BACKEND line: state machine, reject reason, `entryDate`-in-period, `23P01` overlap, policy snapshot.

## Scope

### In Scope
- New slice `apps/api/src/features/hr-timesheets/` (vertical slice).
- Routes `/companies/:companyId/timesheets…`: period create/list/get/PATCH; entry add/update/remove; `submit|approve|reject|reopen`. Permissions `hr.timesheets.read|write|submit|approve`; actor = `auth.user.id`.
- State machine `draft→submitted→approved|rejected`; `reopen: rejected→draft`.
- Submit-time policy auto-resolution; `23P01`→overlap→409; error-middleware mapping; `create-app.ts` wiring; strict-TDD tests (in-memory, real-PG, supertest).

### Out of Scope (Non-goals)
Frontend; schema/migrations; projects/`projectId` FK; approval-workflow engine (policy JSON uninterpreted); per-day caps/overtime (future module); audit_events; RLS; company-wide listing; assigned-approver visibility.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `hr-timesheets`: add backend requirements (lifecycle, entries, submit snapshot, approval rules, auth-scoped access, API); widen the DB-only scope-boundary requirement to permit API (UI excluded).

## Decisions (Odoo-inspired)

User-confirmed: (1) submit auto-resolves the active policy (never from body; NULL only if none matches). (2) rejected reopens to draft for resubmit. (3) entries editable only in `draft`. (4) no self-approval. (5) per-entry `0<hours≤24` + `entryDate` in range; per-day cap deferred. (6) list auth-scoped (self/direct_reports), not company-wide.

Defaults (vetoable): empty-period submit allowed; no period delete; PATCH period only in `draft`.

Basis: Odoo approvals are admin-configured; access rules split own/all/admin; post-refusal correction standard.

## Approach

Reuse approval-policy/hr-employees patterns: use-case factories, composite-tenant Drizzle gateway, `requireHrCapability`+`ensureCompanyAccess`, centralized errors. Strict-TDD chained slices: S1 domain+application (in-memory); S2 Drizzle gateway (real PG, `23P01`, date-mode); S3 router+middleware+wiring (supertest).

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `apps/api/src/features/hr-timesheets/` | New | vertical slice |
| `apps/api/src/shared/presentation/error.middleware.ts` | Modified | domain errors→HTTP |
| `apps/api/src/app/create-app.ts` | Modified | wire slice |
| `apps/api/vitest.config.ts` | Modified | coverage include (optional) |

## Risks

| Risk | L | Mitigation |
|---|---|---|
| Exceeds 800-line budget | High | auto-chain slices; sdd-tasks forecast |
| `23P01` translation novel | Med | tested S2 gateway helper |
| Baseline typecheck failures (7 files) | Med | keep separate |
| Drizzle `date` → string | Med | fixed domain shape; tested mapping |

## Rollback Plan

Backend-only, additive: revert slice commits, middleware registrations, wiring; seeds remain valid unused.

## Dependencies

DB foundation (0026, seeds); approval-policy feature for submit resolution.

## Success Criteria

- [ ] Tenancy+permission+scope enforced; cross-company → 403.
- [ ] Reopen + self-approval rejection proven.
- [ ] Overlap insert → 409 via `23P01`.
- [ ] `pnpm --filter api test` green under strict TDD.

## Delivery

One PR exceeds the 800-line budget → chained PRs S1→S2→S3 (`auto-chain`); sdd-tasks MUST emit the guard forecast.

## Next

sdd-spec (delta `hr-timesheets`), then sdd-design (policy resolution, date-mode, reopen contract, error→HTTP codes), before sdd-tasks/apply.
