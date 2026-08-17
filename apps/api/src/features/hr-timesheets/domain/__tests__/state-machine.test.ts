import { describe, expect, it } from 'vitest';

import {
  TimesheetInvalidStatusTransitionError,
  TimesheetLockedError,
  TimesheetRejectionReasonRequiredError,
  TimesheetSelfApprovalError,
  TimesheetValidationError,
  assertCanApprovePeriod,
  assertCanRejectPeriod,
  assertCanReopenPeriod,
  assertCanSubmitPeriod,
  assertEntryInPeriod,
  assertTimesheetIsDraft,
  assertValidEntryHours,
  assertValidPeriodRange,
  type TimesheetPeriod,
} from '../timesheets';

const buildPeriod = (
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

describe('hr-timesheets domain guards', () => {
  it('accepts valid ranges and draft mutations but rejects inverted periods and locked statuses', () => {
    expect(() =>
      assertValidPeriodRange({
        periodStart: '2026-08-10',
        periodEnd: '2026-08-16',
      }),
    ).not.toThrow();

    expect(() => assertTimesheetIsDraft(buildPeriod())).not.toThrow();

    expect(() =>
      assertValidPeriodRange({
        periodStart: '2026-08-16',
        periodEnd: '2026-08-10',
      }),
    ).toThrow(TimesheetValidationError);

    expect(() =>
      assertTimesheetIsDraft(
        buildPeriod({
          status: 'submitted',
          submittedAt: new Date('2026-08-17T09:00:00.000Z'),
          submittedByUserId: 'user-1',
        }),
      ),
    ).toThrow(TimesheetLockedError);
  });

  it('enforces entry bounds and in-period dates', () => {
    expect(() => assertValidEntryHours(8)).not.toThrow();
    expect(() =>
      assertEntryInPeriod({
        periodStart: '2026-08-10',
        periodEnd: '2026-08-16',
        entryDate: '2026-08-12',
      }),
    ).not.toThrow();

    expect(() => assertValidEntryHours(0)).toThrow(TimesheetValidationError);
    expect(() => assertValidEntryHours(25)).toThrow(TimesheetValidationError);
    expect(() =>
      assertEntryInPeriod({
        periodStart: '2026-08-10',
        periodEnd: '2026-08-16',
        entryDate: '2026-08-18',
      }),
    ).toThrow(TimesheetValidationError);
  });

  it('allows submit, approve, reject, and reopen only through the supported lifecycle', () => {
    const submittedPeriod = buildPeriod({
      status: 'submitted',
      submittedAt: new Date('2026-08-17T09:00:00.000Z'),
      submittedByUserId: 'employee-user',
    });

    const rejectedPeriod = buildPeriod({
      status: 'rejected',
      submittedAt: new Date('2026-08-17T09:00:00.000Z'),
      submittedByUserId: 'employee-user',
      rejectionReason: 'Needs fixes',
    });

    expect(() => assertCanSubmitPeriod(buildPeriod())).not.toThrow();
    expect(() => assertCanApprovePeriod(submittedPeriod, 'manager-user')).not.toThrow();
    expect(() => assertCanRejectPeriod(submittedPeriod, 'Missing note')).not.toThrow();
    expect(() => assertCanReopenPeriod(rejectedPeriod)).not.toThrow();

    expect(() => assertCanSubmitPeriod(submittedPeriod)).toThrow(
      TimesheetInvalidStatusTransitionError,
    );
    expect(() => assertCanApprovePeriod(submittedPeriod, 'employee-user')).toThrow(
      TimesheetSelfApprovalError,
    );
    expect(() => assertCanRejectPeriod(submittedPeriod, '   ')).toThrow(
      TimesheetRejectionReasonRequiredError,
    );
    expect(() =>
      assertCanReopenPeriod(
        buildPeriod({
          status: 'approved',
          submittedAt: new Date('2026-08-17T09:00:00.000Z'),
          submittedByUserId: 'employee-user',
          approvedAt: new Date('2026-08-18T10:00:00.000Z'),
          approvedByUserId: 'manager-user',
        }),
      ),
    ).toThrow(TimesheetInvalidStatusTransitionError);
  });
});
