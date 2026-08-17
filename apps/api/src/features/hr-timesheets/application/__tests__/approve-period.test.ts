import { describe, expect, it } from 'vitest';

import { TimesheetSelfApprovalError } from '../../domain/timesheets';
import { createApprovePeriodUseCase } from '../approve-period';
import { InMemoryTimesheetsGateway, buildPeriod } from './support';

describe('createApprovePeriodUseCase', () => {
  it('approves a submitted period for a different manager', async () => {
    const gateway = new InMemoryTimesheetsGateway();
    gateway.periods = [
      buildPeriod({
        id: 'period-1',
        status: 'submitted',
        submittedAt: new Date('2026-08-17T09:00:00.000Z'),
        submittedByUserId: 'employee-user',
      }),
    ];
    const approvePeriod = createApprovePeriodUseCase({
      gateway,
      now: () => new Date('2026-08-18T10:00:00.000Z'),
    });

    const approved = await approvePeriod({
      companyId: 'company-1',
      periodId: 'period-1',
      approvedByUserId: 'manager-user',
    });

    if (!approved) {
      throw new Error('expected approved period');
    }
    expect(approved.status).toBe('approved');
    expect(approved.approvedByUserId).toBe('manager-user');
  });

  it('rejects self-approval attempts', async () => {
    const gateway = new InMemoryTimesheetsGateway();
    gateway.periods = [
      buildPeriod({
        id: 'period-1',
        status: 'submitted',
        submittedAt: new Date('2026-08-17T09:00:00.000Z'),
        submittedByUserId: 'employee-user',
      }),
    ];
    const approvePeriod = createApprovePeriodUseCase({ gateway });

    await expect(
      approvePeriod({
        companyId: 'company-1',
        periodId: 'period-1',
        approvedByUserId: 'employee-user',
      }),
    ).rejects.toBeInstanceOf(TimesheetSelfApprovalError);
  });
});
