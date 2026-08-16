# Proposal: Timesheets DB Foundation

## Intent

Enable the "Registro de horas" module at the DB layer only: normalized timesheet periods per employee assignment with **custom date ranges** per company, a draft→submitted→approved|rejected state machine, approval-policy **snapshot** binding at submit, and per-line time entries. No API, UI, or application logic.

## Scope

### In Scope
- `timesheet_periods`: id `uuid defaultRandom`; companyId NOT NULL FK restrict; employeeAssignmentId NOT NULL FK + composite tenant FK `(employeeAssignmentId, companyId)→(id, company_id)`; periodStart/periodEnd date, CHECK end >= start; status pgEnum `draft|submitted|approved|rejected`; nullable pair CHECKs (submittedAt↔submittedByUserId, approvedAt↔approvedByUserId) FK users; rejectionReason; **approvalPolicyId nullable FK restrict (snapshot at submit — approval_policies untouched)**; unique (id, companyId); timestamps; **EXCLUDE USING gist (employeeAssignmentId WITH =, daterange(periodStart, periodEnd) WITH &&)** = overlap prevention.
- `time_entries`: id uuid; companyId FK restrict; periodId FK + composite tenant FK; entryDate date; hours `numeric(5,2)` CHECK > 0 AND <= 24; projectId uuid **nullable, NO FK** (projects module absent); taskLabel text; note; unique (periodId, entryDate, task dimension).
- pgEnum `timesheet_status`; migration `0026` containing `CREATE EXTENSION btree_gist` (first use — documented) + hand-written EXCLUDE SQL (precedent: 0016 triggers).
- Permission seeds: `hr.timesheets.read|write|submit|approve` added to permissions.ts catalog (family `normal`).
- Per-file migration test (`createMigrationTestDatabase`): overlap rejected, adjacent ranges allowed, CHECKs/enum verified.

### Out of Scope
Routes/controllers/use cases, frontend, approval_policies changes, projects module/FK, overtime modeling, per-day aggregate caps (not row-CHECK-expressible), RLS, audit_events writes.

## Capabilities

### New Capabilities
- `hr-timesheets`: timesheet period/entry storage, state machine, overlap prevention, approval snapshot binding, permission keys.

### Modified Capabilities
- None. Permission keys are additive seeds; identity-access spec behavior unchanged.

## Approach

Extend `schema.ts` replicating the multi-tenancy pattern (companyId restrict + composite tenant FKs + unique (id, companyId)). `drizzle-kit generate` baseline + hand-written extension/EXCLUDE SQL. Strict TDD: migration test written first.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/api/src/shared/infrastructure/db/schema.ts` | Modified | 2 tables, 1 enum, tenant FKs, exclusion constraint |
| `apps/api/src/db/migrations/0026_*.sql` + `meta/_journal.json` | New | btree_gist + timesheets DDL |
| `apps/api/src/db/migrations/__tests__/migration-0026-*.test.ts` | New | Schema + constraint assertions |
| `apps/api/src/features/roles-management/domain/permissions.ts` | Modified | `hr.timesheets.*` catalog keys |

## Risks

| Risk | Likelihood | Mitigation |
|-----|------------|------------|
| btree_gist first use; extension privilege on hosted PG | Low | Docker postgres:17 CI is fine; CREATE EXTENSION documented in migration |
| Nullable projectId without FK = normalization debt | Accepted | Documented; FK when projects module lands |
| Per-day total cap not DB-enforceable | Accepted | App-layer check in a later app-phase change |

## Rollback Plan

Drop `time_entries`, `timesheet_periods`, enum, exclusion constraint (and extension if unused elsewhere); revert migration files + journal entry. Feature unreleased — no data migration.

## Dependencies

- Lands **FIRST**; `db-inventory-foundation` builds on schema.ts after this change (sequencing to avoid conflicts, no data dependency).

## Success Criteria

- [ ] Migration applies clean on fresh DB + CI; journal test green
- [ ] Overlapping period per assignment rejected; adjacent ranges allowed
- [ ] Status/timestamp pair CHECKs and hours bounds enforced
- [ ] `pnpm test` + typecheck green

## Assumptions

Accepted (binding): hours numeric(5,2) 0<h≤24, no DB overtime; approver = users.id; uuid PKs; full tenancy pattern on every new table; per-migration tests mandatory; period state machine with transition-timestamp CHECKs.
