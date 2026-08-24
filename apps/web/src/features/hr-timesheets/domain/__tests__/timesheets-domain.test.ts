import { describe, expect, it } from 'vitest';

import {
  canApproveTimesheetPeriod,
  canEditTimesheetEntries,
  canRejectTimesheetPeriod,
  canReopenTimesheetPeriod,
  canSubmitTimesheetPeriod,
  timesheetEntrySchema,
  timesheetPeriodSchema,
} from '../timesheets';

describe('timesheets domain helpers', () => {
  it('parses typed timesheet DTOs from the API', () => {
    expect(
      timesheetPeriodSchema.parse({
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
        createdAt: '2026-08-10T10:00:00.000Z',
        updatedAt: '2026-08-10T10:00:00.000Z',
      }),
    ).toMatchObject({
      id: 'period-1',
      status: 'draft',
    });

    expect(
      timesheetEntrySchema.parse({
        id: 'entry-1',
        companyId: 'company-1',
        periodId: 'period-1',
        entryDate: '2026-08-11',
        hours: 8,
        projectId: null,
        taskLabel: 'Payroll review',
        note: 'Updated payroll incidents',
        createdAt: '2026-08-11T10:00:00.000Z',
        updatedAt: '2026-08-11T10:00:00.000Z',
      }),
    ).toMatchObject({
      id: 'entry-1',
      hours: 8,
    });
  });

  it('derives edit and workflow visibility from status plus current user', () => {
    const draftPeriod = timesheetPeriodSchema.parse({
      id: 'period-draft',
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
      createdAt: '2026-08-10T10:00:00.000Z',
      updatedAt: '2026-08-10T10:00:00.000Z',
    });
    const submittedByOther = {
      ...draftPeriod,
      status: 'submitted' as const,
      submittedAt: '2026-08-17T10:00:00.000Z',
      submittedByUserId: 'user-2',
    };
    const rejectedPeriod = {
      ...draftPeriod,
      status: 'rejected' as const,
      rejectionReason: 'Missing evidence',
    };

    expect(canEditTimesheetEntries(draftPeriod)).toBe(true);
    expect(canSubmitTimesheetPeriod(draftPeriod)).toBe(true);
    expect(canApproveTimesheetPeriod(submittedByOther, 'user-1')).toBe(true);
    expect(canRejectTimesheetPeriod(submittedByOther, 'user-1')).toBe(true);
    expect(canApproveTimesheetPeriod(submittedByOther, 'user-2')).toBe(false);
    expect(canRejectTimesheetPeriod(submittedByOther, 'user-2')).toBe(false);
    expect(canReopenTimesheetPeriod(rejectedPeriod)).toBe(true);
  });
});
