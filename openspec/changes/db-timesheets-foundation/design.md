# Design: Timesheets DB Foundation

## Technical Approach

DB-only addition that lands migration `0026_timesheets.sql` with two new tables, one enum, an EXCLUDE USING gist overlap constraint backed by a freshly-installed `btree_gist` extension, additive permission seeds, and a per-migration real-PostgreSQL test. Schema lives in `apps/api/src/shared/infrastructure/db/schema.ts`; mirror the multi-tenancy pattern (companyId restrict + composite tenant FKs + unique `(id, companyId)`) that already protects `employee_assignments`. The `approvalPolicyId` column is a nullable snapshot FK — `approval_policies` is left untouched, per the resolved open point.

## Architecture Decisions

### Decision: One migration, no per-feature splits

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Single `0026_timesheets.sql` | Atomic, one journal entry, one test | **Chosen** |
| Split per-table migrations (0026 periods, 0027 entries, 0028 EXCLUDE) | Smaller diffs but EXCLUDE depends on `timesheet_periods`; ordering gets noisy | Rejected |

### Decision: `EXCLUDE USING gist` overlap enforcement

| Option | Tradeoff | Decision |
|--------|----------|----------|
| `EXCLUDE USING gist (employee_assignment_id WITH =, daterange(period_start, period_end, '[)') WITH &&)` | Real daterange overlap, handles custom company date ranges, adjacent ranges trivially allowed because half-open `[)` excludes the end date. Requires `btree_gist` (first use; documented) | **Chosen** |
| Partial unique `(employee_assignment_id, period_start)` | Only enforces a fixed start-day; rejects back-to-back weeks with no gap | Rejected |
| App-layer check only | No DB safety net, no concurrent-write protection | Rejected |

### Decision: `btree_gist` extension install

`CREATE EXTENSION IF NOT EXISTS btree_gist` is the FIRST statement in `0026_timesheets.sql`, before any `timesheet_periods` DDL. Postgres 17 (docker image `postgres:17-alpine`, CI, dev) is the supported runtime and ships the extension. Migration test asserts `pg_extension WHERE extname = 'btree_gist'` after apply. No schema.ts change for the extension (extensions are server-wide, not in the Drizzle meta graph).

### Decision: approval policy binding via nullable FK snapshot

Add nullable `approval_policy_id text REFERENCES approval_policies(id) ON DELETE restrict` on `timesheet_periods`. No column added to `approval_policies`. Snapshot semantics: app writes the FK at submit time; later policy edits don't affect historical periods.

### Decision: `hr.timesheets.*` permission keys

Append `hr.timesheets.read|write|submit|approve` (4 keys, `family: 'normal'`) to `hrPermissionKeys` array in `permissions.ts`. Re-export via `permissionCatalogSeeds` is automatic (it already spreads `hrPermissionKeys`). No `hr.timesheets.delete` — approval state machine + audit provide soft delete; destructive ops deferred to app-phase change.

### Decision: Permission catalog additive — no replacement

The existing `hrPermissionKeys` array keeps all prior keys. Adding new entries to a `const` array is additive; downstream `permissionCatalogSeeds` spread picks them up. The DB `permissions` table is upserted on app startup by the roles-management seeder; new keys are auto-inserted.

## Schema (Drizzle — `apps/api/src/shared/infrastructure/db/schema.ts`)

```ts
export const timesheetStatusEnum = pgEnum('timesheet_status', [
  'draft', 'submitted', 'approved', 'rejected',
]);

export const timesheetPeriodsTable = pgTable(
  'timesheet_periods',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: text('company_id').notNull().references(() => companiesTable.id, { onDelete: 'restrict' }),
    employeeAssignmentId: text('employee_assignment_id').notNull().references(() => employeeAssignmentsTable.id, { onDelete: 'restrict' }),
    periodStart: date('period_start').notNull(),
    periodEnd: date('period_end').notNull(),
    status: timesheetStatusEnum('status').notNull().default('draft'),
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    submittedByUserId: text('submitted_by_user_id').references(() => usersTable.id, { onDelete: 'restrict' }),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    approvedByUserId: text('approved_by_user_id').references(() => usersTable.id, { onDelete: 'restrict' }),
    rejectionReason: text('rejection_reason'),
    approvalPolicyId: text('approval_policy_id').references(() => approvalPoliciesTable.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('timesheet_periods_id_company_idx').on(t.id, t.companyId),
    foreignKey({ columns: [t.employeeAssignmentId, t.companyId], foreignColumns: [employeeAssignmentsTable.id, employeeAssignmentsTable.companyId], name: 'timesheet_periods_employee_assignment_company_fk' }),
    foreignKey({ columns: [t.approvalPolicyId, t.companyId], foreignColumns: [approvalPoliciesTable.id, approvalPoliciesTable.companyId], name: 'timesheet_periods_approval_policy_company_fk' }),
    check('timesheet_periods_end_after_start_chk', sql`${t.periodEnd} >= ${t.periodStart}`),
    check('timesheet_periods_submission_pair_chk', sql`(${t.submittedAt} IS NULL AND ${t.submittedByUserId} IS NULL) OR (${t.submittedAt} IS NOT NULL AND ${t.submittedByUserId} IS NOT NULL)`),
    check('timesheet_periods_approval_pair_chk', sql`(${t.approvedAt} IS NULL AND ${t.approvedByUserId} IS NULL) OR (${t.approvedAt} IS NOT NULL AND ${t.approvedByUserId} IS NOT NULL)`),
    index('timesheet_periods_company_idx').on(t.companyId),
    index('timesheet_periods_assignment_idx').on(t.employeeAssignmentId),
    index('timesheet_periods_status_idx').on(t.companyId, t.status),
  ],
);
// EXCLUDE constraint added via hand-written SQL inside 0026 (drizzle-kit does not emit EXCLUDE DDL).

export const timeEntriesTable = pgTable(
  'time_entries',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: text('company_id').notNull().references(() => companiesTable.id, { onDelete: 'restrict' }),
    periodId: uuid('period_id').notNull().references(() => timesheetPeriodsTable.id, { onDelete: 'restrict' }),
    entryDate: date('entry_date').notNull(),
    hours: numeric('hours', { precision: 5, scale: 2 }).notNull(),
    projectId: uuid('project_id'),  // NO FK — projects module absent (documented debt)
    taskLabel: text('task_label').notNull(),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('time_entries_id_company_idx').on(t.id, t.companyId),
    foreignKey({ columns: [t.periodId, t.companyId], foreignColumns: [timesheetPeriodsTable.id, timesheetPeriodsTable.companyId], name: 'time_entries_period_company_fk' }),
    check('time_entries_hours_bounds_chk', sql`${t.hours} > 0 AND ${t.hours} <= 24`),
    uniqueIndex('time_entries_period_date_task_idx').on(t.periodId, t.entryDate, t.taskLabel),
    index('time_entries_company_idx').on(t.companyId),
    index('time_entries_period_idx').on(t.periodId),
  ],
);
```

## Migration `0026_timesheets.sql`

Statement order (each terminated with `--> statement-breakpoint`):

1. `CREATE EXTENSION IF NOT EXISTS btree_gist;`
2. `CREATE TYPE timesheet_status AS ENUM ('draft','submitted','approved','rejected');`
3. `CREATE TABLE timesheet_periods (...)` with column-level FKs (companies, employee_assignments, users×2, approval_policies), inline CHECKs, default timestamps.
4. `CREATE TABLE time_entries (...)` with column-level FKs, CHECK, defaults.
5. `ALTER TABLE` statements adding composite-tenant FKs (`timesheet_periods_employee_assignment_company_fk`, `timesheet_periods_approval_policy_company_fk`, `time_entries_period_company_fk`) — matches the generated-name convention `timesheet_periods_employee_assignment_id_employee_assignments_id_fk` for the column FKs.
6. `CREATE UNIQUE INDEX timesheet_periods_id_company_idx`, `timesheet_periods_company_idx`, `timesheet_periods_assignment_idx`, `timesheet_periods_status_idx`, `time_entries_*`.
7. Hand-written exclusion (drizzle-kit does not emit EXCLUDE; precedent: hand-written triggers in `0016_canonical_scope_nodes.sql`):
   ```sql
   ALTER TABLE timesheet_periods
     ADD CONSTRAINT timesheet_periods_no_overlap_excl
     EXCLUDE USING gist (
       employee_assignment_id WITH =,
       daterange(period_start, period_end, '[)') WITH &&
     );
   ```
   Half-open `[)` is intentional so adjacent ranges (end=2026-03-15, start=2026-03-16) do NOT overlap.
8. `meta/_journal.json` entry: `idx: 25, tag: '0026_timesheets', when: <now+ms>, breakpoints: true`. New snapshot `0026_snapshot.json` is generated by `drizzle-kit generate` and committed.

## Permission Seeds — `permissions.ts` patch

Additive edits only:

```ts
export const hrPermissionKeys = [
  'hr.employees.read', 'hr.employees.write', 'hr.employees.assign',
  'hr.positions.read', 'hr.positions.write',
  'hr.erp_access.invite', 'hr.erp_access.revoke',
  'hr.approval_policy.read', 'hr.approval_policy.write',
  // NEW ↓
  'hr.timesheets.read', 'hr.timesheets.write',
  'hr.timesheets.submit', 'hr.timesheets.approve',
] as const;
```

`permissionCatalogSeeds` already spreads `hrPermissionKeys.map(...)` so DB seeds auto-extend. `modulePermissionRegistry` already maps `'hr' → hrPermissionKeys`, so `getCompanyOwnerPermissionKeys(['hr'])` and `getCompanyUserPermissionKeys(['hr'])` pick them up.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `apps/api/src/shared/infrastructure/db/schema.ts` | Modify | Add `timesheetStatusEnum`, `timesheetPeriodsTable`, `timeEntriesTable` (above code) |
| `apps/api/src/db/migrations/0026_timesheets.sql` | Create | btree_gist + enum + 2 tables + composite FKs + indexes + EXCLUDE |
| `apps/api/src/db/migrations/meta/_journal.json` | Modify | Append `0026_timesheets` entry |
| `apps/api/src/db/migrations/meta/0026_snapshot.json` | Create | drizzle-kit generate output |
| `apps/api/src/db/migrations/__tests__/migration-0026-timesheets.test.ts` | Create | Schema + constraint assertions |
| `apps/api/src/features/roles-management/domain/permissions.ts` | Modify | Append 4 keys to `hrPermissionKeys` |

## Testing Strategy

Per-migration test (`migration-0026-timesheets.test.ts`), one file, two `it` blocks, both via `createMigrationTestDatabase`:

| Layer | What | Approach |
|-------|------|----------|
| Unit (real PG) | Baseline-to-0026 columns | `applyMigrationsThrough(0025) → applyMigrationFile(0026)`; assert `information_schema.columns` ordered for both tables; assert `pg_extension WHERE extname='btree_gist'` is present; assert enum labels |
| Integration (real PG) | Constraints fire | Insert company, user, employee, assignment, approval_policy; assert overlap rejected by `timesheet_periods_no_overlap_excl`, adjacent ranges accepted, hours bounds CHECK rejects `0`/`24.01`/negatives, submission pair CHECK rejects `submitted_at NULL, submitted_by_user_id NOT NULL` |

Journal test (`migration-journal.test.ts`) already validates `drizzle-kit migrate` end-to-end; new entry is auto-picked up.

## Data Flow (confirm-time — described, app-phase implements)

```
Draft period ──submit──▶ submitted (set submittedAt + submittedByUserId + approvalPolicyId)
        │
        ▼
   approved (set approvedAt + approvedByUserId; status enum CHECKs fire)
        │
        ▼
  rejected (rejectionReason required by app; DB allows NULL)
```

EXCLUDE prevents two open ranges for the same `employee_assignment_id` at any time. App is responsible for transitioning status atomically with the pair writes (DB pair CHECKs catch partial writes).

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary in this DB-only change.

## Migration / Rollout

Single migration `0026_timesheets.sql`; runs once on `pnpm dev`, `pnpm test` (via `migration-journal.test.ts`), and CI. Rollback: drop `time_entries`, drop `timesheet_periods`, drop exclusion constraint, drop enum, drop `btree_gist` only if no other EXCLUDE-backed migration still depends on it. Inventory's `stock_quants_company_item_scope_lot_uk` is a plain `btree ... NULLS NOT DISTINCT` unique index, so the cross-feature sharing note applies only to future `btree_gist`/EXCLUDE consumers, not inventory. Feature unreleased — no data migration.

## Open Questions

None. All proposal/spec open points resolved in the decisions table above. Per-day aggregate cap (e.g. ≤16h across lines) deferred to app-phase (not DB-CHECK-expressible without triggers). Projects FK deferred until projects module lands.
