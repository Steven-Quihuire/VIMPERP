import { describe, expect, it } from 'vitest';

import { TimesheetInvalidStatusTransitionError } from '../../domain/timesheets';
import { createReopenPeriodUseCase } from '../reopen-period';
import { InMemoryTimesheetsGateway, buildPeriod } from './support';

describe('createReopenPeriodUseCase', () => {
  it('reopens a rejected period back to draft for correction', async () => {
    const gateway = new InMemoryTimesheetsGateway();
    gateway.periods = [
      buildPeriod({
        id: 'period-1',
        status: 'rejected',
        submittedAt: new Date('2026-08-17T09:00:00.000Z'),
        submittedByUserId: 'employee-user',
        rejectionReason: 'Missing supporting details',
      }),
    ];
    const reopenPeriod = createReopenPeriodUseCase({ gateway });

    const reopened = await reopenPeriod({
      companyId: 'company-1',
      periodId: 'period-1',
    });

    if (!reopened) {
      throw new Error('expected reopened period');
    }
    expect(reopened.status).toBe('draft');
    expect(reopened.rejectionReason).toBeNull();
  });

  it('rejects reopen requests outside the rejected state', async () => {
    const gateway = new InMemoryTimesheetsGateway();
    gateway.periods = [
      buildPeriod({
        id: 'period-1',
        status: 'approved',
        submittedAt: new Date('2026-08-17T09:00:00.000Z'),
        submittedByUserId: 'employee-user',
        approvedAt: new Date('2026-08-18T10:00:00.000Z'),
        approvedByUserId: 'manager-user',
      }),
    ];
    const reopenPeriod = createReopenPeriodUseCase({ gateway });

    await expect(
      reopenPeriod({
        companyId: 'company-1',
        periodId: 'period-1',
      }),
    ).rejects.toBeInstanceOf(TimesheetInvalidStatusTransitionError);
  });
});
