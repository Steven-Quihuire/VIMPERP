# Proposal: Frontend HR Timesheets (Registro de horas)

## Intent

The timesheets backend is complete (11 routes, 464 passing tests) but has no UI. This change delivers the Registro de horas web experience: managers review team timesheets, employees enter and submit hours. Design verified one backend gap — no route reads period entries — so a minimal additive read endpoint is in scope; all other work is frontend.

## Scope

### In Scope
- Backend read endpoint `GET /companies/:companyId/timesheets/:periodId/entries` — scoped, read-only entries list (router, controller, use case, Zod; no schema change)
- Web feature slice `apps/web/src/features/hr-timesheets/` (domain/application/infrastructure/presentation)
- Periods list (status filter); detail view with entries in a weekly grid fed by the new endpoint
- Draft-only entry CRUD; submit / approve / reject (reason required) / reopen actions
- Manager team-review and employee self-entry flows honoring backend scope (`hr.timesheets.*`, self + direct reports)
- Company-scoped routes `hr/timesheets` and `hr/timesheets/:periodId`; HR sidebar entry
- Friendly mapping of typed API errors (overlap, conflict, state violations, self-approval)

### Out of Scope
- Inventory (any)
- Backend beyond the entries read endpoint: no DB/migrations, writes, pagination
- Server-side pagination / date-range / employee filters (list offers `?status=` only)
- Projects module, overtime modeling, per-day caps

## Capabilities

### New Capabilities
- `hr-timesheets-web`: desktop UI for timesheet periods and entries — list, detail, draft editing, workflow actions, permission-aware visibility

### Modified Capabilities
- `hr-timesheets`: add a period-entries read requirement (scoped `GET .../entries`)
- `dashboard-shell`: add Timesheets navigation link in the HR section (catalog-nav precedent)

## Approach

Backend: one additive vertical-slice endpoint mirroring existing timesheets routes (Zod params/DTO, use case, repository reuse, same scope checks). Frontend: feature-first slice mirroring `hr-employees`/`hr-erp-access` patterns — typed `HttpClient` adapter, TanStack Query hooks, Zustand for UI-only state, React Hook Form + Zod, shadcn-style components. Detail composes period metadata with endpoint entries; action availability derives from status plus capabilities; server state never copied into client stores.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/api/src/features/hr-timesheets/` | Modified | New GET entries route, controller, use case, tests |
| `apps/web/src/features/hr-timesheets/` | New | Full vertical slice |
| `apps/web/src/app/app.tsx` | Modified | Company-scoped routes + HR nav entry |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| List endpoint lacks pagination; large teams load many periods | Med | Client-side filter/sort; backend pagination as follow-up |
| Known api typecheck baseline FAIL gates verify | Med | Unrelated org-hierarchy issue; document expected baseline |
| Three-paradigm UX bloats the first slice | Med | Spec/design fix a minimal layout: list + weekly grid + actions |

## Rollback Plan

Revert this change's commits: remove the web feature slice, routes/nav entry in `app.tsx`, and the additive api route/use case. No DB, migration, or data impact.

## Dependencies

- Timesheets API: 11 routes, typed errors, permission scope; entries read endpoint added here
- Repo baseline: api typecheck/build exits 2 on unrelated org-hierarchy code

## Success Criteria

- [ ] `GET .../entries` returns scoped period entries; api feature tests green
- [ ] Manager lists, views, approves, rejects (reason), and reopens team periods
- [ ] Employee creates/edits draft entries and submits own period
- [ ] Typed API errors surface as actionable messages
- [ ] `pnpm --filter web test`, typecheck, and lint green for web
