import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';

import {
  applyMigrationsThrough,
  createMigrationTestDatabase,
} from '../../../db/migrations/__tests__/migration-test-helpers';
import type { AppDb } from '../../../shared/infrastructure/db/client';
import {
  approvalPoliciesTable,
  companiesTable,
  employeeAssignmentsTable,
  employeesTable,
  positionsTable,
  scopeNodesTable,
  timeEntriesTable,
  timesheetPeriodsTable,
  usersTable,
} from '../../../shared/infrastructure/db/schema';
import {
  TimesheetEntryConflictError,
  TimesheetPeriodOverlapError,
} from '../domain/timesheets';
import {
  createDrizzleTimesheetsGateway,
  isPeriodOverlapViolation,
} from './drizzle-timesheets.gateway';

let db: AppDb;
let cleanup: (() => Promise<void>) | undefined;

const now = new Date('2026-08-17T12:00:00.000Z');

const createDb = async () => {
  const database = await createMigrationTestDatabase();
  await applyMigrationsThrough(database.pool, '0026_timesheets.sql');

  const db = drizzle(database.pool, {
    schema: await import('../../../shared/infrastructure/db/schema'),
  }) as AppDb;

  return { db, pool: database.pool, cleanup: database.cleanup };
};

const seedCompanyFixture = async (companyId: string, assignmentId: string, employeeId: string) => {
  await db.insert(companiesTable).values({
    id: companyId,
    name: `${companyId} name`,
    status: 'active',
    createdAt: now,
  });
  await db.insert(usersTable).values([
    {
      id: `${companyId}-submitter`,
      email: `${companyId}-submitter@example.com`,
      username: `${companyId}-submitter`,
      passwordHash: 'hashed',
    },
    {
      id: `${companyId}-approver`,
      email: `${companyId}-approver@example.com`,
      username: `${companyId}-approver`,
      passwordHash: 'hashed',
    },
  ]);
  await db.insert(scopeNodesTable).values({
    id: `area:${companyId}-area-1`,
    nodeType: 'area',
    sourceId: `${companyId}-area-1`,
    companyId,
    parentScopeNodeId: `company:${companyId}`,
    name: `${companyId} Operations`,
    createdAt: now,
  });
  await db.insert(employeesTable).values({
    id: employeeId,
    companyId,
    fullName: `${companyId} Employee`,
    employmentStatus: 'active',
    createdAt: now,
    updatedAt: now,
  });
  await db.insert(positionsTable).values({
    id: `${companyId}-position-1`,
    companyId,
    name: `${companyId} Operator`,
    createdAt: now,
  });
  await db.insert(employeeAssignmentsTable).values({
    id: assignmentId,
    companyId,
    employeeId,
    scopeNodeId: `area:${companyId}-area-1`,
    positionId: `${companyId}-position-1`,
    startedAt: now,
    endedAt: null,
    isPrimary: true,
    createdAt: now,
  });
  await db.insert(approvalPoliciesTable).values({
    id: `${companyId}-policy-1`,
    companyId,
    scopeType: 'area',
    scopeNodeId: `area:${companyId}-area-1`,
    name: `${companyId} approval policy`,
    definition: { steps: ['manager'] },
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });
};

describe('createDrizzleTimesheetsGateway', () => {
  beforeAll(async () => {
    const database = await createDb();
    db = database.db;
    cleanup = database.cleanup;
  });

  beforeEach(async () => {
    await db.delete(timeEntriesTable);
    await db.delete(timesheetPeriodsTable);
    await db.delete(approvalPoliciesTable);
    await db.delete(employeeAssignmentsTable);
    await db.delete(positionsTable);
    await db.delete(employeesTable);
    await db.delete(scopeNodesTable);
    await db.delete(usersTable);
    await db.delete(companiesTable);
  });

  afterAll(async () => {
    await cleanup?.();
  });

  it('round-trips periods and entries with tenant scoping, assignment lookup, and state persistence', async () => {
    await seedCompanyFixture('company-1', 'assignment-1', 'employee-1');
    await seedCompanyFixture('company-2', 'assignment-2', 'employee-2');

    const gateway = createDrizzleTimesheetsGateway(db, {
      createId: (() => {
        let sequence = 0;
        return () => `00000000-0000-0000-0000-${`${++sequence}`.padStart(12, '0')}`;
      })(),
      now: () => now,
    });

    const period = await gateway.createPeriod({
      companyId: 'company-1',
      employeeAssignmentId: 'assignment-1',
      periodStart: '2026-08-11',
      periodEnd: '2026-08-17',
    });
    await gateway.createPeriod({
      companyId: 'company-2',
      employeeAssignmentId: 'assignment-2',
      periodStart: '2026-08-11',
      periodEnd: '2026-08-17',
    });

    expect(period.periodStart).toBe('2026-08-11');
    expect(period.periodEnd).toBe('2026-08-17');

    await expect(gateway.getPeriod('company-1', period.id)).resolves.toMatchObject({
      id: period.id,
      companyId: 'company-1',
      periodStart: '2026-08-11',
      periodEnd: '2026-08-17',
      status: 'draft',
    });
    await expect(gateway.getPeriod('company-2', period.id)).resolves.toBeNull();

    await expect(
      gateway.findActiveAssignment('company-1', 'assignment-1'),
    ).resolves.toMatchObject({
      id: 'assignment-1',
      companyId: 'company-1',
      employeeId: 'employee-1',
      scopeNodeId: 'area:company-1-area-1',
    });

    await expect(
      gateway.listPeriods('company-1', { employeeIds: ['employee-1'] }),
    ).resolves.toEqual([
      expect.objectContaining({ id: period.id, companyId: 'company-1' }),
    ]);
    await expect(
      gateway.listPeriods('company-1', { employeeIds: ['employee-2'] }),
    ).resolves.toEqual([]);

    const patched = await gateway.patchPeriod({
      companyId: 'company-1',
      periodId: period.id,
      periodStart: '2026-08-12',
      periodEnd: '2026-08-18',
    });

    expect(patched).toMatchObject({
      id: period.id,
      periodStart: '2026-08-12',
      periodEnd: '2026-08-18',
    });

    const entry = await gateway.createEntry({
      companyId: 'company-1',
      periodId: period.id,
      entryDate: '2026-08-13',
      hours: 7.5,
      projectId: null,
      taskLabel: 'Inventory count',
      note: 'Cycle count',
    });

    expect(entry.hours).toBe(7.5);
    expect(typeof entry.hours).toBe('number');
    await expect(gateway.getEntry('company-1', entry.id)).resolves.toMatchObject({
      id: entry.id,
      hours: 7.5,
      taskLabel: 'Inventory count',
    });

    const updatedEntry = await gateway.updateEntry({
      companyId: 'company-1',
      entryId: entry.id,
      entryDate: '2026-08-14',
      hours: 8.25,
      projectId: null,
      taskLabel: 'Inventory count',
      note: 'Adjusted count',
    });

    expect(updatedEntry).toMatchObject({
      id: entry.id,
      entryDate: '2026-08-14',
      hours: 8.25,
      note: 'Adjusted count',
    });
    await expect(gateway.listEntries('company-1', period.id)).resolves.toEqual([
      expect.objectContaining({ id: entry.id, hours: 8.25 }),
    ]);

    const submitted = await gateway.submitPeriod({
      companyId: 'company-1',
      periodId: period.id,
      submittedByUserId: 'company-1-submitter',
      at: new Date('2026-08-19T09:00:00.000Z'),
      resolveApprovalPolicyId: (scopeNodeId) => {
        expect(scopeNodeId).toBe('area:company-1-area-1');

        return Promise.resolve('company-1-policy-1');
      },
    });

    expect(submitted).toMatchObject({
      id: period.id,
      status: 'submitted',
      submittedByUserId: 'company-1-submitter',
      approvalPolicyId: 'company-1-policy-1',
    });

    const approved = await gateway.approvePeriod({
      companyId: 'company-1',
      periodId: period.id,
      approvedByUserId: 'company-1-approver',
      at: new Date('2026-08-19T10:00:00.000Z'),
    });

    expect(approved).toMatchObject({
      id: period.id,
      status: 'approved',
      approvedByUserId: 'company-1-approver',
    });

    const rejectedPeriod = await gateway.createPeriod({
      companyId: 'company-1',
      employeeAssignmentId: 'assignment-1',
      periodStart: '2026-08-18',
      periodEnd: '2026-08-25',
    });
    await gateway.submitPeriod({
      companyId: 'company-1',
      periodId: rejectedPeriod.id,
      submittedByUserId: 'company-1-submitter',
      at: new Date('2026-08-26T09:00:00.000Z'),
      resolveApprovalPolicyId: (scopeNodeId) => {
        expect(scopeNodeId).toBe('area:company-1-area-1');

        return Promise.resolve('company-1-policy-1');
      },
    });

    const rejected = await gateway.rejectPeriod({
      companyId: 'company-1',
      periodId: rejectedPeriod.id,
      rejectionReason: 'Needs corrections',
    });

    expect(rejected).toMatchObject({
      id: rejectedPeriod.id,
      status: 'rejected',
      rejectionReason: 'Needs corrections',
      approvedAt: null,
      approvedByUserId: null,
    });

    const reopened = await gateway.reopenPeriod({
      companyId: 'company-1',
      periodId: rejectedPeriod.id,
    });

    expect(reopened).toMatchObject({
      id: rejectedPeriod.id,
      status: 'draft',
      rejectionReason: null,
    });

    await expect(gateway.deleteEntry('company-1', entry.id)).resolves.toBe(true);
    await expect(gateway.listEntries('company-1', period.id)).resolves.toEqual([]);
  });

  it('translates overlapping periods to TimesheetPeriodOverlapError', async () => {
    await seedCompanyFixture('company-1', 'assignment-1', 'employee-1');

    const gateway = createDrizzleTimesheetsGateway(db, {
      createId: (() => {
        let sequence = 100;
        return () => `00000000-0000-0000-0000-${`${++sequence}`.padStart(12, '0')}`;
      })(),
      now: () => now,
    });

    await gateway.createPeriod({
      companyId: 'company-1',
      employeeAssignmentId: 'assignment-1',
      periodStart: '2026-09-01',
      periodEnd: '2026-09-07',
    });

    await expect(
      gateway.createPeriod({
        companyId: 'company-1',
        employeeAssignmentId: 'assignment-1',
        periodStart: '2026-09-05',
        periodEnd: '2026-09-10',
      }),
    ).rejects.toBeInstanceOf(TimesheetPeriodOverlapError);
  });

  it('translates duplicate period-day-task entries to TimesheetEntryConflictError', async () => {
    await seedCompanyFixture('company-1', 'assignment-1', 'employee-1');

    const gateway = createDrizzleTimesheetsGateway(db, {
      createId: (() => {
        let sequence = 200;
        return () => `00000000-0000-0000-0000-${`${++sequence}`.padStart(12, '0')}`;
      })(),
      now: () => now,
    });

    const period = await gateway.createPeriod({
      companyId: 'company-1',
      employeeAssignmentId: 'assignment-1',
      periodStart: '2026-10-01',
      periodEnd: '2026-10-07',
    });

    await gateway.createEntry({
      companyId: 'company-1',
      periodId: period.id,
      entryDate: '2026-10-03',
      hours: 8,
      projectId: null,
      taskLabel: 'Packing',
      note: null,
    });

    await expect(
      gateway.createEntry({
        companyId: 'company-1',
        periodId: period.id,
        entryDate: '2026-10-03',
        hours: 6,
        projectId: null,
        taskLabel: 'Packing',
        note: 'duplicate',
      }),
    ).rejects.toBeInstanceOf(TimesheetEntryConflictError);
  });

  it('recognizes only the timesheet overlap exclusion violation', () => {
    expect(
      isPeriodOverlapViolation({
        code: '23P01',
        constraint: 'timesheet_periods_no_overlap_excl',
      }),
    ).toBe(true);
    expect(
      isPeriodOverlapViolation({
        code: '23P01',
        constraint: 'other_constraint',
      }),
    ).toBe(false);
    expect(
      isPeriodOverlapViolation({
        code: '23505',
        constraint: 'timesheet_periods_no_overlap_excl',
      }),
    ).toBe(false);
  });

  it('submits atomically with the latest assignment scope and a transaction-safe status reload', async () => {
    await seedCompanyFixture('company-1', 'assignment-1', 'employee-1');

    await db.insert(scopeNodesTable).values({
      id: 'area:company-1-area-2',
      nodeType: 'area',
      sourceId: 'company-1-area-2',
      companyId: 'company-1',
      parentScopeNodeId: 'company:company-1',
      name: 'company-1 Finance',
      createdAt: now,
    });
    await db.insert(approvalPoliciesTable).values({
      id: 'company-1-policy-2',
      companyId: 'company-1',
      scopeType: 'area',
      scopeNodeId: 'area:company-1-area-2',
      name: 'company-1 finance approval policy',
      definition: { steps: ['director'] },
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    const gateway = createDrizzleTimesheetsGateway(db, {
      createId: (() => {
        let sequence = 300;
        return () => `00000000-0000-0000-0000-${`${++sequence}`.padStart(12, '0')}`;
      })(),
      now: () => now,
    });

    const period = await gateway.createPeriod({
      companyId: 'company-1',
      employeeAssignmentId: 'assignment-1',
      periodStart: '2026-11-01',
      periodEnd: '2026-11-07',
    });

    await db
      .update(employeeAssignmentsTable)
      .set({ scopeNodeId: 'area:company-1-area-2' })
      .where(eq(employeeAssignmentsTable.id, 'assignment-1'));

    const submitted = await gateway.submitPeriod({
      companyId: 'company-1',
      periodId: period.id,
      submittedByUserId: 'company-1-submitter',
      at: new Date('2026-11-08T09:00:00.000Z'),
      resolveApprovalPolicyId: (scopeNodeId) => {
        expect(scopeNodeId).toBe('area:company-1-area-2');

        return Promise.resolve(
          scopeNodeId === 'area:company-1-area-2' ? 'company-1-policy-2' : null,
        );
      },
    });

    expect(submitted).toMatchObject({
      id: period.id,
      status: 'submitted',
      approvalPolicyId: 'company-1-policy-2',
    });
  });

});
