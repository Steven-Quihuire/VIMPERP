import type { PeriodDate, TimeEntry, TimesheetAssignment, TimesheetGateway, TimesheetPeriod, TimesheetPeriodStatus } from '../../domain/timesheets';
import {
  TimesheetAssignmentNotFoundError,
  TimesheetEntryConflictError,
  TimesheetPeriodOverlapError,
  assertCanSubmitPeriod,
} from '../../domain/timesheets';

type ApprovalPolicyRecord = {
  id: string;
  companyId: string;
  scopeNodeId: string;
};

const overlaps = (
  leftStart: PeriodDate,
  leftEnd: PeriodDate,
  rightStart: PeriodDate,
  rightEnd: PeriodDate,
) => !(leftEnd < rightStart || rightEnd < leftStart);

export const buildAssignment = (
  overrides: Partial<TimesheetAssignment> = {},
): TimesheetAssignment => ({
  id: 'assignment-1',
  companyId: 'company-1',
  employeeId: 'employee-1',
  scopeNodeId: 'area:scope-1',
  ...overrides,
});

export const buildPeriod = (
  overrides: Partial<TimesheetPeriod> = {},
): TimesheetPeriod => ({
  id: 'period-1',
  companyId: 'company-1',
  employeeAssignmentId: 'assignment-1',
  periodStart: '2026-08-10',
  periodEnd: '2026-08-16',
  status: 'draft',
  submittedAt: null,
  submittedByUserId: null,
  approvedAt: null,
  approvedByUserId: null,
  rejectionReason: null,
  approvalPolicyId: null,
  createdAt: new Date('2026-08-10T09:00:00.000Z'),
  updatedAt: new Date('2026-08-10T09:00:00.000Z'),
  ...overrides,
});

export const buildEntry = (overrides: Partial<TimeEntry> = {}): TimeEntry => ({
  id: 'entry-1',
  companyId: 'company-1',
  periodId: 'period-1',
  entryDate: '2026-08-10',
  hours: 8,
  projectId: null,
  taskLabel: 'Inventory count',
  note: null,
  createdAt: new Date('2026-08-10T09:00:00.000Z'),
  updatedAt: new Date('2026-08-10T09:00:00.000Z'),
  ...overrides,
});

export class InMemoryTimesheetsGateway implements TimesheetGateway {
  periods: TimesheetPeriod[] = [];
  entries: TimeEntry[] = [];
  assignments: TimesheetAssignment[] = [buildAssignment()];

  private periodCounter = 1;
  private entryCounter = 1;

  async createPeriod(input: {
    companyId: string;
    employeeAssignmentId: string;
    periodStart: PeriodDate;
    periodEnd: PeriodDate;
  }) {
    const conflict = this.periods.find(
      (period) =>
        period.companyId === input.companyId &&
        period.employeeAssignmentId === input.employeeAssignmentId &&
        overlaps(period.periodStart, period.periodEnd, input.periodStart, input.periodEnd),
    );

    if (conflict) {
      throw new TimesheetPeriodOverlapError();
    }

    const created = buildPeriod({
      id: `period-${++this.periodCounter}`,
      companyId: input.companyId,
      employeeAssignmentId: input.employeeAssignmentId,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
    });

    this.periods.push(created);
    return await Promise.resolve(created);
  }

  async getPeriod(companyId: string, periodId: string) {
    return await Promise.resolve(
      this.periods.find(
        (period) => period.companyId === companyId && period.id === periodId,
      ) ?? null,
    );
  }

  async listPeriods(companyId: string, filters?: {
    employeeIds?: string[];
    status?: TimesheetPeriodStatus;
  }) {
    const periods = this.periods.filter((period) => period.companyId === companyId);

    return await Promise.resolve(
      periods.filter((period) => {
        if (filters?.status && period.status !== filters.status) {
          return false;
        }

        if (!filters?.employeeIds) {
          return true;
        }

        const assignment = this.assignments.find(
          (candidate) =>
            candidate.companyId === companyId &&
            candidate.id === period.employeeAssignmentId,
        );

        return assignment
          ? filters.employeeIds.includes(assignment.employeeId)
          : false;
      }),
    );
  }

  async patchPeriod(input: {
    companyId: string;
    periodId: string;
    periodStart: PeriodDate;
    periodEnd: PeriodDate;
  }) {
    const period = this.periods.find(
      (candidate) =>
        candidate.companyId === input.companyId && candidate.id === input.periodId,
    );

    if (!period) {
      return await Promise.resolve(null);
    }

    const conflict = this.periods.find(
      (candidate) =>
        candidate.companyId === input.companyId &&
        candidate.id !== input.periodId &&
        candidate.employeeAssignmentId === period.employeeAssignmentId &&
        overlaps(candidate.periodStart, candidate.periodEnd, input.periodStart, input.periodEnd),
    );

    if (conflict) {
      throw new TimesheetPeriodOverlapError();
    }

    period.periodStart = input.periodStart;
    period.periodEnd = input.periodEnd;
    period.updatedAt = new Date('2026-08-11T09:00:00.000Z');
    return await Promise.resolve(period);
  }

  async createEntry(input: {
    companyId: string;
    periodId: string;
    entryDate: PeriodDate;
    hours: number;
    projectId: string | null;
    taskLabel: string;
    note: string | null;
  }) {
    const conflict = this.entries.find(
      (entry) =>
        entry.companyId === input.companyId &&
        entry.periodId === input.periodId &&
        entry.entryDate === input.entryDate &&
        entry.taskLabel === input.taskLabel,
    );

    if (conflict) {
      throw new TimesheetEntryConflictError();
    }

    const created = buildEntry({
      id: `entry-${++this.entryCounter}`,
      companyId: input.companyId,
      periodId: input.periodId,
      entryDate: input.entryDate,
      hours: input.hours,
      projectId: input.projectId,
      taskLabel: input.taskLabel,
      note: input.note,
    });

    this.entries.push(created);
    return await Promise.resolve(created);
  }

  async getEntry(companyId: string, entryId: string) {
    return await Promise.resolve(
      this.entries.find(
        (entry) => entry.companyId === companyId && entry.id === entryId,
      ) ?? null,
    );
  }

  async updateEntry(input: {
    companyId: string;
    entryId: string;
    entryDate: PeriodDate;
    hours: number;
    projectId: string | null;
    taskLabel: string;
    note: string | null;
  }) {
    const entry = this.entries.find(
      (candidate) =>
        candidate.companyId === input.companyId && candidate.id === input.entryId,
    );

    if (!entry) {
      return await Promise.resolve(null);
    }

    const conflict = this.entries.find(
      (candidate) =>
        candidate.companyId === input.companyId &&
        candidate.id !== input.entryId &&
        candidate.periodId === entry.periodId &&
        candidate.entryDate === input.entryDate &&
        candidate.taskLabel === input.taskLabel,
    );

    if (conflict) {
      throw new TimesheetEntryConflictError();
    }

    entry.entryDate = input.entryDate;
    entry.hours = input.hours;
    entry.projectId = input.projectId;
    entry.taskLabel = input.taskLabel;
    entry.note = input.note;
    entry.updatedAt = new Date('2026-08-11T09:30:00.000Z');
    return await Promise.resolve(entry);
  }

  async listEntries(companyId: string, periodId: string) {
    return await Promise.resolve(
      this.entries.filter(
        (entry) => entry.companyId === companyId && entry.periodId === periodId,
      ),
    );
  }

  async deleteEntry(companyId: string, entryId: string) {
    const index = this.entries.findIndex(
      (entry) => entry.companyId === companyId && entry.id === entryId,
    );

    if (index === -1) {
      return await Promise.resolve(false);
    }

    this.entries.splice(index, 1);
    return await Promise.resolve(true);
  }

  async submitPeriod(input: {
    companyId: string;
    periodId: string;
    submittedByUserId: string;
    at: Date;
    resolveApprovalPolicyId: (scopeNodeId: string) => Promise<string | null>;
  }) {
    const period = await this.getPeriod(input.companyId, input.periodId);

    if (!period) {
      return await Promise.resolve(null);
    }

    assertCanSubmitPeriod(period);

    const assignment = await this.findActiveAssignment(
      input.companyId,
      period.employeeAssignmentId,
    );

    if (!assignment) {
      throw new TimesheetAssignmentNotFoundError();
    }

    const approvalPolicyId = await input.resolveApprovalPolicyId(assignment.scopeNodeId);

    period.status = 'submitted';
    period.submittedAt = input.at;
    period.submittedByUserId = input.submittedByUserId;
    period.approvalPolicyId = approvalPolicyId;
    period.updatedAt = input.at;
    return await Promise.resolve(period);
  }

  async approvePeriod(input: {
    companyId: string;
    periodId: string;
    approvedByUserId: string;
    at: Date;
  }) {
    const period = await this.getPeriod(input.companyId, input.periodId);

    if (!period) {
      return await Promise.resolve(null);
    }

    period.status = 'approved';
    period.approvedAt = input.at;
    period.approvedByUserId = input.approvedByUserId;
    period.updatedAt = input.at;
    return await Promise.resolve(period);
  }

  async rejectPeriod(input: {
    companyId: string;
    periodId: string;
    rejectionReason: string;
  }) {
    const period = await this.getPeriod(input.companyId, input.periodId);

    if (!period) {
      return await Promise.resolve(null);
    }

    period.status = 'rejected';
    period.rejectionReason = input.rejectionReason;
    period.approvedAt = null;
    period.approvedByUserId = null;
    period.updatedAt = new Date('2026-08-12T08:00:00.000Z');
    return await Promise.resolve(period);
  }

  async reopenPeriod(input: { companyId: string; periodId: string }) {
    const period = await this.getPeriod(input.companyId, input.periodId);

    if (!period) {
      return await Promise.resolve(null);
    }

    period.status = 'draft';
    period.rejectionReason = null;
    period.approvedAt = null;
    period.approvedByUserId = null;
    period.updatedAt = new Date('2026-08-13T08:00:00.000Z');
    return await Promise.resolve(period);
  }

  async findActiveAssignment(companyId: string, assignmentId: string) {
    return await Promise.resolve(
      this.assignments.find(
        (assignment) =>
          assignment.companyId === companyId && assignment.id === assignmentId,
      ) ?? null,
    );
  }
}

export class InMemoryApprovalPolicyGateway {
  activePolicies: ApprovalPolicyRecord[] = [];
  calls: { companyId: string; scopeNodeId: string }[] = [];

  setActivePolicy(scopeNodeId: string, id: string, companyId = 'company-1') {
    this.activePolicies.push({ id, companyId, scopeNodeId });
  }

  async findActivePolicyForScope(companyId: string, scopeNodeId: string) {
    this.calls.push({ companyId, scopeNodeId });

    return await Promise.resolve(
      this.activePolicies.find(
        (policy) =>
          policy.companyId === companyId && policy.scopeNodeId === scopeNodeId,
      ) ?? null,
    );
  }
}
