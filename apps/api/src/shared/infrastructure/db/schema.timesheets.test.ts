import { describe, expect, it } from 'vitest';

import { getTableColumns } from 'drizzle-orm';
import { getTableConfig } from 'drizzle-orm/pg-core';

import {
  timeEntriesTable,
  timesheetPeriodsTable,
  timesheetStatusEnum,
} from './schema';

describe('timesheet schema metadata', () => {
  it('defines the period enum, tenant-safe foreign keys, and pair checks', () => {
    expect(timesheetStatusEnum.enumValues).toEqual([
      'draft',
      'submitted',
      'approved',
      'rejected',
    ]);

    const columns = getTableColumns(timesheetPeriodsTable);
    const config = getTableConfig(timesheetPeriodsTable);

    expect(timesheetPeriodsTable[Symbol.for('drizzle:Name') as never]).toBe(
      'timesheet_periods',
    );
    expect(columns.id.notNull).toBe(true);
    expect(columns.id.hasDefault).toBe(true);
    expect(columns.companyId.notNull).toBe(true);
    expect(columns.employeeAssignmentId.notNull).toBe(true);
    expect(columns.periodStart.notNull).toBe(true);
    expect(columns.periodEnd.notNull).toBe(true);
    expect(columns.status.enumValues).toEqual(timesheetStatusEnum.enumValues);
    expect(columns.status.hasDefault).toBe(true);
    expect(columns.submittedAt.notNull).toBe(false);
    expect(columns.submittedByUserId.notNull).toBe(false);
    expect(columns.approvedAt.notNull).toBe(false);
    expect(columns.approvedByUserId.notNull).toBe(false);
    expect(columns.approvalPolicyId.notNull).toBe(false);

    expect(config.foreignKeys.map((foreignKey) => foreignKey.getName()).sort()).toEqual([
      'timesheet_periods_approval_policy_company_fk',
      'timesheet_periods_approval_policy_id_approval_policies_id_fk',
      'timesheet_periods_approved_by_user_id_users_id_fk',
      'timesheet_periods_company_id_companies_id_fk',
      'timesheet_periods_employee_assignment_company_fk',
      'timesheet_periods_employee_assignment_id_employee_assignments_id_fk',
      'timesheet_periods_submitted_by_user_id_users_id_fk',
    ]);
    expect(config.checks.map((check) => check.name).sort()).toEqual([
      'timesheet_periods_approval_pair_chk',
      'timesheet_periods_end_after_start_chk',
      'timesheet_periods_submission_pair_chk',
    ]);
    expect(config.indexes.map((index) => index.config.name).sort()).toEqual([
      'timesheet_periods_assignment_idx',
      'timesheet_periods_company_idx',
      'timesheet_periods_id_company_idx',
      'timesheet_periods_status_idx',
    ]);
  });

  it('defines bounded time entries with tenant-safe period linkage and no project foreign key', () => {
    const columns = getTableColumns(timeEntriesTable);
    const config = getTableConfig(timeEntriesTable);

    expect(timeEntriesTable[Symbol.for('drizzle:Name') as never]).toBe('time_entries');
    expect(columns.id.notNull).toBe(true);
    expect(columns.id.hasDefault).toBe(true);
    expect(columns.companyId.notNull).toBe(true);
    expect(columns.periodId.notNull).toBe(true);
    expect(columns.entryDate.notNull).toBe(true);
    expect(columns.taskLabel.notNull).toBe(true);
    expect(columns.projectId.notNull).toBe(false);
    expect((columns.hours as { precision?: number; scale?: number }).precision).toBe(5);
    expect((columns.hours as { precision?: number; scale?: number }).scale).toBe(2);

    expect(config.foreignKeys.map((foreignKey) => foreignKey.getName()).sort()).toEqual([
      'time_entries_company_id_companies_id_fk',
      'time_entries_period_company_fk',
      'time_entries_period_id_timesheet_periods_id_fk',
    ]);
    expect(
      config.foreignKeys.some((foreignKey) => foreignKey.getName().includes('project')),
    ).toBe(false);
    expect(config.checks.map((check) => check.name)).toEqual([
      'time_entries_hours_bounds_chk',
    ]);
    expect(config.indexes.map((index) => index.config.name).sort()).toEqual([
      'time_entries_company_idx',
      'time_entries_id_company_idx',
      'time_entries_period_date_task_idx',
      'time_entries_period_idx',
    ]);
  });
});
