import { afterEach, describe, expect, it } from 'vitest';

import {
  applyMigrationFile,
  applyMigrationsThrough,
  createMigrationTestDatabase,
} from './migration-test-helpers';

const cleanups: Array<() => Promise<void>> = [];

afterEach(async () => {
  while (cleanups.length > 0) {
    await cleanups.pop()?.();
  }
});

describe('timesheets migration', () => {
  it('adds the timesheet tables, enum values, and btree_gist extension', async () => {
    const database = await createMigrationTestDatabase();
    cleanups.push(database.cleanup);

    await applyMigrationsThrough(database.pool, '0025_hr_responsibility_invitations.sql');
    await applyMigrationFile(database.pool, '0026_timesheets.sql');

    const timesheetPeriodColumns = await database.pool.query<{ columnName: string }>(`
      SELECT column_name AS "columnName"
      FROM information_schema.columns
      WHERE table_name = 'timesheet_periods'
      ORDER BY ordinal_position
    `);
    const timeEntryColumns = await database.pool.query<{ columnName: string }>(`
      SELECT column_name AS "columnName"
      FROM information_schema.columns
      WHERE table_name = 'time_entries'
      ORDER BY ordinal_position
    `);
    const enumLabels = await database.pool.query<{ label: string }>(`
      SELECT enumlabel AS label
      FROM pg_enum
      WHERE enumtypid = 'timesheet_status'::regtype
      ORDER BY enumsortorder
    `);
    const extensions = await database.pool.query<{ name: string }>(`
      SELECT extname AS name
      FROM pg_extension
      WHERE extname = 'btree_gist'
    `);

    expect(timesheetPeriodColumns.rows.map((row) => row.columnName)).toEqual([
      'id',
      'company_id',
      'employee_assignment_id',
      'period_start',
      'period_end',
      'status',
      'submitted_at',
      'submitted_by_user_id',
      'approved_at',
      'approved_by_user_id',
      'rejection_reason',
      'approval_policy_id',
      'created_at',
      'updated_at',
    ]);
    expect(timeEntryColumns.rows.map((row) => row.columnName)).toEqual([
      'id',
      'company_id',
      'period_id',
      'entry_date',
      'hours',
      'project_id',
      'task_label',
      'note',
      'created_at',
      'updated_at',
    ]);
    expect(enumLabels.rows.map((row) => row.label)).toEqual([
      'draft',
      'submitted',
      'approved',
      'rejected',
    ]);
    expect(extensions.rows.map((row) => row.name)).toEqual(['btree_gist']);
  }, 30000);

  it('rejects overlapping periods and invalid writes while allowing adjacent periods', async () => {
    const database = await createMigrationTestDatabase();
    cleanups.push(database.cleanup);

    await applyMigrationsThrough(database.pool, '0025_hr_responsibility_invitations.sql');
    await applyMigrationFile(database.pool, '0026_timesheets.sql');

    await database.pool.query(`
      INSERT INTO companies (id, name, status, created_at)
      VALUES ('company-1', 'Timesheets Co', 'active', now())
    `);
    await database.pool.query(`
      INSERT INTO users (id, email, username, password_hash)
      VALUES ('user-1', 'manager@example.com', 'manager', 'hash')
    `);
    await database.pool.query(`
      INSERT INTO employees (id, company_id, full_name, employment_status)
      VALUES ('employee-1', 'company-1', 'Taylor Employee', 'active')
    `);
    await database.pool.query(`
      INSERT INTO positions (id, company_id, name)
      VALUES ('position-1', 'company-1', 'Operator')
    `);
    await database.pool.query(`
      INSERT INTO employee_assignments (
        id,
        company_id,
        employee_id,
        scope_node_id,
        position_id,
        started_at,
        is_primary,
        created_at
      )
      VALUES (
        'assignment-1',
        'company-1',
        'employee-1',
        'company:company-1',
        'position-1',
        now(),
        true,
        now()
      )
    `);
    await database.pool.query(`
      INSERT INTO approval_policies (id, company_id, scope_type, scope_node_id, name, definition, is_active, created_at, updated_at)
      VALUES (
        'approval-policy-1',
        'company-1',
        'company',
        NULL,
        'Default approval policy',
        '{}'::jsonb,
        true,
        now(),
        now()
      )
    `);
    await database.pool.query(`
      INSERT INTO timesheet_periods (
        id,
        company_id,
        employee_assignment_id,
        period_start,
        period_end,
        approval_policy_id
      )
      VALUES (
        '00000000-0000-0000-0000-000000000001',
        'company-1',
        'assignment-1',
        '2026-03-01',
        '2026-03-15',
        'approval-policy-1'
      )
    `);

    await expect(database.pool.query(`
      INSERT INTO timesheet_periods (
        id,
        company_id,
        employee_assignment_id,
        period_start,
        period_end,
        approval_policy_id
      )
      VALUES (
        '00000000-0000-0000-0000-000000000002',
        'company-1',
        'assignment-1',
        '2026-03-10',
        '2026-03-20',
        'approval-policy-1'
      )
    `)).rejects.toThrow(/timesheet_periods_no_overlap_excl/);

    await expect(database.pool.query(`
      INSERT INTO timesheet_periods (
        id,
        company_id,
        employee_assignment_id,
        period_start,
        period_end,
        approval_policy_id
      )
      VALUES (
        '00000000-0000-0000-0000-000000000003',
        'company-1',
        'assignment-1',
        '2026-03-15',
        '2026-03-22',
        'approval-policy-1'
      )
    `)).resolves.toBeDefined();

    await expect(database.pool.query(`
      INSERT INTO time_entries (id, company_id, period_id, entry_date, hours, task_label)
      VALUES (
        '00000000-0000-0000-0000-000000000101',
        'company-1',
        '00000000-0000-0000-0000-000000000001',
        '2026-03-02',
        0,
        'Assembly'
      )
    `)).rejects.toThrow(/time_entries_hours_bounds_chk/);
    await expect(database.pool.query(`
      INSERT INTO time_entries (id, company_id, period_id, entry_date, hours, task_label)
      VALUES (
        '00000000-0000-0000-0000-000000000102',
        'company-1',
        '00000000-0000-0000-0000-000000000001',
        '2026-03-03',
        24.01,
        'Assembly'
      )
    `)).rejects.toThrow(/time_entries_hours_bounds_chk/);
    await expect(database.pool.query(`
      INSERT INTO time_entries (id, company_id, period_id, entry_date, hours, task_label)
      VALUES (
        '00000000-0000-0000-0000-000000000103',
        'company-1',
        '00000000-0000-0000-0000-000000000001',
        '2026-03-04',
        8,
        'Assembly'
      )
    `)).resolves.toBeDefined();

    await expect(database.pool.query(`
      INSERT INTO timesheet_periods (
        id,
        company_id,
        employee_assignment_id,
        period_start,
        period_end,
        status,
        submitted_by_user_id,
        approval_policy_id
      )
      VALUES (
        '00000000-0000-0000-0000-000000000004',
        'company-1',
        'assignment-1',
        '2026-03-23',
        '2026-03-29',
        'submitted',
        'user-1',
        'approval-policy-1'
      )
    `)).rejects.toThrow(/timesheet_periods_submission_pair_chk/);
  }, 30000);
});
