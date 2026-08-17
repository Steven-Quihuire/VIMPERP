import { randomUUID } from 'node:crypto';

import { and, asc, eq, inArray, isNull } from 'drizzle-orm';

import type { AppDb } from '../../../shared/infrastructure/db/client';
import {
  employeeAssignmentsTable,
  employeesTable,
  timeEntriesTable,
  timesheetPeriodsTable,
} from '../../../shared/infrastructure/db/schema';
import {
  TimesheetAssignmentNotFoundError,
  TimesheetEntryConflictError,
  TimesheetPeriodOverlapError,
  type TimeEntry,
  type TimesheetAssignment,
  type TimesheetGateway,
  type TimesheetPeriod,
  assertCanSubmitPeriod,
} from '../domain/timesheets';

const unwrapCause = (error: unknown): unknown => {
  let candidate = error;

  while (typeof candidate === 'object' && candidate !== null && 'cause' in candidate) {
    const next = (candidate as { cause?: unknown }).cause;

    if (!next) {
      break;
    }

    candidate = next;
  }

  return candidate;
};

export const isPeriodOverlapViolation = (error: unknown) => {
  const candidate = unwrapCause(error);

  return (
    typeof candidate === 'object' &&
    candidate !== null &&
    'code' in candidate &&
    (candidate as { code?: unknown }).code === '23P01' &&
    'constraint' in candidate &&
    (candidate as { constraint?: unknown }).constraint ===
      'timesheet_periods_no_overlap_excl'
  );
};

const isEntryConflictViolation = (error: unknown) => {
  const candidate = unwrapCause(error);

  return (
    typeof candidate === 'object' &&
    candidate !== null &&
    'code' in candidate &&
    (candidate as { code?: unknown }).code === '23505' &&
    'constraint' in candidate &&
    (candidate as { constraint?: unknown }).constraint ===
      'time_entries_period_date_task_idx'
  );
};

const toTimesheetPeriod = (
  row: typeof timesheetPeriodsTable.$inferSelect,
): TimesheetPeriod => ({
  id: row.id,
  companyId: row.companyId,
  employeeAssignmentId: row.employeeAssignmentId,
  periodStart: row.periodStart,
  periodEnd: row.periodEnd,
  status: row.status,
  submittedAt: row.submittedAt,
  submittedByUserId: row.submittedByUserId,
  approvedAt: row.approvedAt,
  approvedByUserId: row.approvedByUserId,
  rejectionReason: row.rejectionReason,
  approvalPolicyId: row.approvalPolicyId,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

const toTimeEntry = (row: typeof timeEntriesTable.$inferSelect): TimeEntry => ({
  id: row.id,
  companyId: row.companyId,
  periodId: row.periodId,
  entryDate: row.entryDate,
  hours: Number(row.hours),
  projectId: row.projectId,
  taskLabel: row.taskLabel,
  note: row.note,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

const toTimesheetAssignment = (row: {
  id: string;
  companyId: string;
  employeeId: string;
  scopeNodeId: string;
}): TimesheetAssignment => ({
  id: row.id,
  companyId: row.companyId,
  employeeId: row.employeeId,
  scopeNodeId: row.scopeNodeId,
});

export const createDrizzleTimesheetsGateway = (
  db: AppDb,
  {
    createId = randomUUID,
    now = () => new Date(),
  }: {
    createId?: () => string;
    now?: () => Date;
  } = {},
): TimesheetGateway => ({
  createPeriod: async (input) => {
    try {
      const [row] = await db
        .insert(timesheetPeriodsTable)
        .values({
          id: createId(),
          companyId: input.companyId,
          employeeAssignmentId: input.employeeAssignmentId,
          periodStart: input.periodStart,
          periodEnd: input.periodEnd,
          status: 'draft',
          submittedAt: null,
          submittedByUserId: null,
          approvedAt: null,
          approvedByUserId: null,
          rejectionReason: null,
          approvalPolicyId: null,
          createdAt: now(),
          updatedAt: now(),
        })
        .returning();

      return toTimesheetPeriod(row!);
    } catch (error) {
      if (isPeriodOverlapViolation(error)) {
        throw new TimesheetPeriodOverlapError();
      }

      throw error;
    }
  },
  getPeriod: async (companyId, periodId) => {
    const [row] = await db
      .select()
      .from(timesheetPeriodsTable)
      .where(
        and(
          eq(timesheetPeriodsTable.companyId, companyId),
          eq(timesheetPeriodsTable.id, periodId),
        ),
      )
      .limit(1);

    return row ? toTimesheetPeriod(row) : null;
  },
  listPeriods: async (companyId, filters) => {
    const employeeFilters = filters?.employeeIds?.length
      ? [inArray(employeeAssignmentsTable.employeeId, filters.employeeIds)]
      : [];
    const statusFilters = filters?.status
      ? [eq(timesheetPeriodsTable.status, filters.status)]
      : [];

    const rows = await db
      .select({ period: timesheetPeriodsTable })
      .from(timesheetPeriodsTable)
      .innerJoin(
        employeeAssignmentsTable,
        and(
          eq(employeeAssignmentsTable.id, timesheetPeriodsTable.employeeAssignmentId),
          eq(employeeAssignmentsTable.companyId, timesheetPeriodsTable.companyId),
        ),
      )
      .where(
        and(
          eq(timesheetPeriodsTable.companyId, companyId),
          ...employeeFilters,
          ...statusFilters,
        ),
      )
      .orderBy(
        asc(timesheetPeriodsTable.periodStart),
        asc(timesheetPeriodsTable.createdAt),
      );

    return rows.map(({ period }) => toTimesheetPeriod(period));
  },
  patchPeriod: async (input) => {
    try {
      const [row] = await db
        .update(timesheetPeriodsTable)
        .set({
          periodStart: input.periodStart,
          periodEnd: input.periodEnd,
          updatedAt: now(),
        })
        .where(
          and(
            eq(timesheetPeriodsTable.companyId, input.companyId),
            eq(timesheetPeriodsTable.id, input.periodId),
          ),
        )
        .returning();

      return row ? toTimesheetPeriod(row) : null;
    } catch (error) {
      if (isPeriodOverlapViolation(error)) {
        throw new TimesheetPeriodOverlapError();
      }

      throw error;
    }
  },
  createEntry: async (input) => {
    try {
      const [row] = await db
        .insert(timeEntriesTable)
        .values({
          id: createId(),
          companyId: input.companyId,
          periodId: input.periodId,
          entryDate: input.entryDate,
          hours: input.hours.toString(),
          projectId: input.projectId,
          taskLabel: input.taskLabel,
          note: input.note,
          createdAt: now(),
          updatedAt: now(),
        })
        .returning();

      return toTimeEntry(row!);
    } catch (error) {
      if (isEntryConflictViolation(error)) {
        throw new TimesheetEntryConflictError();
      }

      throw error;
    }
  },
  getEntry: async (companyId, entryId) => {
    const [row] = await db
      .select()
      .from(timeEntriesTable)
      .where(
        and(eq(timeEntriesTable.companyId, companyId), eq(timeEntriesTable.id, entryId)),
      )
      .limit(1);

    return row ? toTimeEntry(row) : null;
  },
  updateEntry: async (input) => {
    try {
      const [row] = await db
        .update(timeEntriesTable)
        .set({
          entryDate: input.entryDate,
          hours: input.hours.toString(),
          projectId: input.projectId,
          taskLabel: input.taskLabel,
          note: input.note,
          updatedAt: now(),
        })
        .where(
          and(
            eq(timeEntriesTable.companyId, input.companyId),
            eq(timeEntriesTable.id, input.entryId),
          ),
        )
        .returning();

      return row ? toTimeEntry(row) : null;
    } catch (error) {
      if (isEntryConflictViolation(error)) {
        throw new TimesheetEntryConflictError();
      }

      throw error;
    }
  },
  listEntries: async (companyId, periodId) => {
    const rows = await db
      .select()
      .from(timeEntriesTable)
      .where(
        and(
          eq(timeEntriesTable.companyId, companyId),
          eq(timeEntriesTable.periodId, periodId),
        ),
      )
      .orderBy(asc(timeEntriesTable.entryDate), asc(timeEntriesTable.createdAt));

    return rows.map(toTimeEntry);
  },
  deleteEntry: async (companyId, entryId) => {
    const [row] = await db
      .delete(timeEntriesTable)
      .where(and(eq(timeEntriesTable.companyId, companyId), eq(timeEntriesTable.id, entryId)))
      .returning({ id: timeEntriesTable.id });

    return Boolean(row);
  },
  submitPeriod: async (input) => {
    return await db.transaction(async (tx) => {
      const [lockedPeriod] = await tx
        .select()
        .from(timesheetPeriodsTable)
        .where(
          and(
            eq(timesheetPeriodsTable.companyId, input.companyId),
            eq(timesheetPeriodsTable.id, input.periodId),
          ),
        )
        .for('update')
        .limit(1);

      if (!lockedPeriod) {
        return null;
      }

      const period = toTimesheetPeriod(lockedPeriod);
      assertCanSubmitPeriod(period);

      const [assignment] = await tx
        .select({
          id: employeeAssignmentsTable.id,
          companyId: employeeAssignmentsTable.companyId,
          employeeId: employeeAssignmentsTable.employeeId,
          scopeNodeId: employeeAssignmentsTable.scopeNodeId,
        })
        .from(employeeAssignmentsTable)
        .innerJoin(
          employeesTable,
          and(
            eq(employeesTable.id, employeeAssignmentsTable.employeeId),
            eq(employeesTable.companyId, employeeAssignmentsTable.companyId),
          ),
        )
        .where(
          and(
            eq(employeeAssignmentsTable.companyId, input.companyId),
            eq(employeeAssignmentsTable.id, period.employeeAssignmentId),
            isNull(employeeAssignmentsTable.endedAt),
          ),
        )
        .limit(1);

      if (!assignment) {
        throw new TimesheetAssignmentNotFoundError();
      }

      const approvalPolicyId = await input.resolveApprovalPolicyId(assignment.scopeNodeId);

      const [row] = await tx
        .update(timesheetPeriodsTable)
        .set({
          status: 'submitted',
          submittedAt: input.at,
          submittedByUserId: input.submittedByUserId,
          approvalPolicyId,
          updatedAt: input.at,
        })
        .where(
          and(
            eq(timesheetPeriodsTable.companyId, input.companyId),
            eq(timesheetPeriodsTable.id, input.periodId),
          ),
        )
        .returning();

      return row ? toTimesheetPeriod(row) : null;
    });
  },
  approvePeriod: async (input) => {
    const [row] = await db
      .update(timesheetPeriodsTable)
      .set({
        status: 'approved',
        approvedAt: input.at,
        approvedByUserId: input.approvedByUserId,
        updatedAt: input.at,
      })
      .where(
        and(
          eq(timesheetPeriodsTable.companyId, input.companyId),
          eq(timesheetPeriodsTable.id, input.periodId),
        ),
      )
      .returning();

    return row ? toTimesheetPeriod(row) : null;
  },
  rejectPeriod: async (input) => {
    const [row] = await db
      .update(timesheetPeriodsTable)
      .set({
        status: 'rejected',
        rejectionReason: input.rejectionReason,
        approvedAt: null,
        approvedByUserId: null,
        updatedAt: now(),
      })
      .where(
        and(
          eq(timesheetPeriodsTable.companyId, input.companyId),
          eq(timesheetPeriodsTable.id, input.periodId),
        ),
      )
      .returning();

    return row ? toTimesheetPeriod(row) : null;
  },
  reopenPeriod: async (input) => {
    const [row] = await db
      .update(timesheetPeriodsTable)
      .set({
        status: 'draft',
        rejectionReason: null,
        approvedAt: null,
        approvedByUserId: null,
        updatedAt: now(),
      })
      .where(
        and(
          eq(timesheetPeriodsTable.companyId, input.companyId),
          eq(timesheetPeriodsTable.id, input.periodId),
        ),
      )
      .returning();

    return row ? toTimesheetPeriod(row) : null;
  },
  findActiveAssignment: async (companyId, assignmentId) => {
    const [row] = await db
      .select({
        id: employeeAssignmentsTable.id,
        companyId: employeeAssignmentsTable.companyId,
        employeeId: employeeAssignmentsTable.employeeId,
        scopeNodeId: employeeAssignmentsTable.scopeNodeId,
      })
      .from(employeeAssignmentsTable)
      .innerJoin(
        employeesTable,
        and(
          eq(employeesTable.id, employeeAssignmentsTable.employeeId),
          eq(employeesTable.companyId, employeeAssignmentsTable.companyId),
        ),
      )
      .where(
        and(
          eq(employeeAssignmentsTable.companyId, companyId),
          eq(employeeAssignmentsTable.id, assignmentId),
          isNull(employeeAssignmentsTable.endedAt),
        ),
      )
      .limit(1);

    return row ? toTimesheetAssignment(row) : null;
  },
});
