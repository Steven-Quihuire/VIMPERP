export const timesheetPeriodStatusValues = [
  'draft',
  'submitted',
  'approved',
  'rejected',
] as const;

export type TimesheetPeriodStatus = (typeof timesheetPeriodStatusValues)[number];

export type PeriodDate = string;

export type TimesheetPeriod = {
  id: string;
  companyId: string;
  employeeAssignmentId: string;
  periodStart: PeriodDate;
  periodEnd: PeriodDate;
  status: TimesheetPeriodStatus;
  submittedAt: Date | null;
  submittedByUserId: string | null;
  approvedAt: Date | null;
  approvedByUserId: string | null;
  rejectionReason: string | null;
  approvalPolicyId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type TimeEntry = {
  id: string;
  companyId: string;
  periodId: string;
  entryDate: PeriodDate;
  hours: number;
  projectId: string | null;
  taskLabel: string;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type TimesheetAssignment = {
  id: string;
  companyId: string;
  employeeId: string;
  scopeNodeId: string;
};

export type TimesheetListFilters = {
  employeeIds?: string[];
  status?: TimesheetPeriodStatus;
};

export type TimesheetGateway = {
  createPeriod: (input: {
    companyId: string;
    employeeAssignmentId: string;
    periodStart: PeriodDate;
    periodEnd: PeriodDate;
  }) => Promise<TimesheetPeriod>;
  getPeriod: (companyId: string, periodId: string) => Promise<TimesheetPeriod | null>;
  listPeriods: (
    companyId: string,
    filters?: TimesheetListFilters,
  ) => Promise<TimesheetPeriod[]>;
  patchPeriod: (input: {
    companyId: string;
    periodId: string;
    periodStart: PeriodDate;
    periodEnd: PeriodDate;
  }) => Promise<TimesheetPeriod | null>;
  createEntry: (input: {
    companyId: string;
    periodId: string;
    entryDate: PeriodDate;
    hours: number;
    projectId: string | null;
    taskLabel: string;
    note: string | null;
  }) => Promise<TimeEntry>;
  getEntry: (companyId: string, entryId: string) => Promise<TimeEntry | null>;
  updateEntry: (input: {
    companyId: string;
    entryId: string;
    entryDate: PeriodDate;
    hours: number;
    projectId: string | null;
    taskLabel: string;
    note: string | null;
  }) => Promise<TimeEntry | null>;
  listEntries: (companyId: string, periodId: string) => Promise<TimeEntry[]>;
  deleteEntry: (companyId: string, entryId: string) => Promise<boolean>;
  submitPeriod: (input: {
    companyId: string;
    periodId: string;
    submittedByUserId: string;
    at: Date;
    resolveApprovalPolicyId: (scopeNodeId: string) => Promise<string | null>;
  }) => Promise<TimesheetPeriod | null>;
  approvePeriod: (input: {
    companyId: string;
    periodId: string;
    approvedByUserId: string;
    at: Date;
  }) => Promise<TimesheetPeriod | null>;
  rejectPeriod: (input: {
    companyId: string;
    periodId: string;
    rejectionReason: string;
  }) => Promise<TimesheetPeriod | null>;
  reopenPeriod: (input: {
    companyId: string;
    periodId: string;
  }) => Promise<TimesheetPeriod | null>;
  findActiveAssignment: (
    companyId: string,
    assignmentId: string,
  ) => Promise<TimesheetAssignment | null>;
};

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

const isIsoDate = (value: PeriodDate) => isoDatePattern.test(value);

const comparePeriodDates = (left: PeriodDate, right: PeriodDate) =>
  left.localeCompare(right);

const assertKnownPeriodDate = (value: PeriodDate, label: string) => {
  if (!isIsoDate(value)) {
    throw new TimesheetValidationError(`${label} must use YYYY-MM-DD format.`);
  }
};

const assertTransitionFrom = (
  period: TimesheetPeriod,
  allowedStatus: TimesheetPeriodStatus,
  nextAction: string,
) => {
  if (period.status !== allowedStatus) {
    throw new TimesheetInvalidStatusTransitionError(
      `Cannot ${nextAction} a ${period.status} timesheet period.`,
    );
  }
};

export const assertValidPeriodRange = (input: {
  periodStart: PeriodDate;
  periodEnd: PeriodDate;
}) => {
  assertKnownPeriodDate(input.periodStart, 'periodStart');
  assertKnownPeriodDate(input.periodEnd, 'periodEnd');

  if (comparePeriodDates(input.periodStart, input.periodEnd) > 0) {
    throw new TimesheetValidationError('Timesheet periods must end on or after their start date.');
  }
};

export const assertEntryInPeriod = (input: {
  periodStart: PeriodDate;
  periodEnd: PeriodDate;
  entryDate: PeriodDate;
}) => {
  assertKnownPeriodDate(input.entryDate, 'entryDate');

  if (
    comparePeriodDates(input.entryDate, input.periodStart) < 0 ||
    comparePeriodDates(input.entryDate, input.periodEnd) > 0
  ) {
    throw new TimesheetValidationError('Entry dates must stay inside the timesheet period range.');
  }
};

export const assertValidEntryHours = (hours: number) => {
  if (hours <= 0 || hours > 24) {
    throw new TimesheetValidationError('Entry hours must be greater than zero and at most twenty-four.');
  }
};

export const assertTimesheetIsDraft = (period: TimesheetPeriod) => {
  if (period.status !== 'draft') {
    throw new TimesheetLockedError();
  }
};

export const assertCanSubmitPeriod = (period: TimesheetPeriod) => {
  assertTransitionFrom(period, 'draft', 'submit');
};

export const assertCanApprovePeriod = (
  period: TimesheetPeriod,
  approverUserId: string,
) => {
  assertTransitionFrom(period, 'submitted', 'approve');

  if (period.submittedByUserId === approverUserId) {
    throw new TimesheetSelfApprovalError();
  }
};

export const assertCanRejectPeriod = (
  period: TimesheetPeriod,
  rejectionReason: string,
) => {
  assertTransitionFrom(period, 'submitted', 'reject');

  if (rejectionReason.trim().length === 0) {
    throw new TimesheetRejectionReasonRequiredError();
  }
};

export const assertCanReopenPeriod = (period: TimesheetPeriod) => {
  assertTransitionFrom(period, 'rejected', 'reopen');
};

export class TimesheetValidationError extends Error {
  readonly code = 'TIMESHEET_VALIDATION';

  constructor(message = 'Timesheet input is invalid.') {
    super(message);
    this.name = 'TimesheetValidationError';
  }
}

export class TimesheetAssignmentNotFoundError extends Error {
  readonly code = 'TIMESHEET_ASSIGNMENT_NOT_FOUND';

  constructor(message = 'Timesheet employee assignment was not found for this company.') {
    super(message);
    this.name = 'TimesheetAssignmentNotFoundError';
  }
}

export class TimesheetPeriodNotFoundError extends Error {
  readonly code = 'TIMESHEET_PERIOD_NOT_FOUND';

  constructor(message = 'Timesheet period not found.') {
    super(message);
    this.name = 'TimesheetPeriodNotFoundError';
  }
}

export class TimesheetEntryNotFoundError extends Error {
  readonly code = 'TIMESHEET_ENTRY_NOT_FOUND';

  constructor(message = 'Timesheet entry not found.') {
    super(message);
    this.name = 'TimesheetEntryNotFoundError';
  }
}

export class TimesheetPeriodOverlapError extends Error {
  readonly code = 'TIMESHEET_PERIOD_OVERLAP';

  constructor(message = 'The employee assignment already has an overlapping timesheet period.') {
    super(message);
    this.name = 'TimesheetPeriodOverlapError';
  }
}

export class TimesheetLockedError extends Error {
  readonly code = 'TIMESHEET_LOCKED';

  constructor(message = 'Only draft timesheet periods can be changed.') {
    super(message);
    this.name = 'TimesheetLockedError';
  }
}

export class TimesheetEntryConflictError extends Error {
  readonly code = 'TIMESHEET_ENTRY_CONFLICT';

  constructor(message = 'Another entry already exists for the same date and task label.') {
    super(message);
    this.name = 'TimesheetEntryConflictError';
  }
}

export class TimesheetInvalidStatusTransitionError extends Error {
  readonly code = 'TIMESHEET_INVALID_STATUS_TRANSITION';

  constructor(message = 'The requested status transition is invalid for this timesheet period.') {
    super(message);
    this.name = 'TimesheetInvalidStatusTransitionError';
  }
}

export class TimesheetSelfApprovalError extends Error {
  readonly code = 'TIMESHEET_SELF_APPROVAL';

  constructor(message = 'Users cannot approve timesheets they submitted themselves.') {
    super(message);
    this.name = 'TimesheetSelfApprovalError';
  }
}

export class TimesheetRejectionReasonRequiredError extends Error {
  readonly code = 'TIMESHEET_REJECTION_REASON_REQUIRED';

  constructor(message = 'Rejected timesheet periods require a rejection reason.') {
    super(message);
    this.name = 'TimesheetRejectionReasonRequiredError';
  }
}
