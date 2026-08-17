import { describe, expect, it } from 'vitest';

import { TimesheetRejectionReasonRequiredError } from '../../domain/timesheets';
import { createRejectPeriodUseCase } from '../reject-period';
import { InMemoryTimesheetsGateway, buildPeriod } from './support';

describe('createRejectPeriodUseCase', () => {
  it('rejects a submitted period when a reason is present', async () => {
    const gateway = new InMemoryTimesheetsGateway();
    gateway.periods = [
      buildPeriod({
        id: 'period-1',
        status: 'submitted',
        submittedAt: new Date('2026-08-17T09:00:00.000Z'),
        submittedByUserId: 'employee-user',
      }),
    ];
    const rejectPeriod = createRejectPeriodUseCase({ gateway });

    const rejected = await rejectPeriod({
      companyId: 'company-1',
      periodId: 'period-1',
      rejectionReason: 'Missing supporting details',
    });

    if (!rejected) {
      throw new Error('expected rejected period');
    }
    expect(rejected.status).toBe('rejected');
    expect(rejected.rejectionReason).toBe('Missing supporting details');
  });

  it('requires a non-blank rejection reason', async () => {
    const gateway = new InMemoryTimesheetsGateway();
    gateway.periods = [
      buildPeriod({
        id: 'period-1',
        status: 'submitted',
        submittedAt: new Date('2026-08-17T09:00:00.000Z'),
        submittedByUserId: 'employee-user',
      }),
    ];
    const rejectPeriod = createRejectPeriodUseCase({ gateway });

    await expect(
      rejectPeriod({
        companyId: 'company-1',
        periodId: 'period-1',
        rejectionReason: '   ',
      }),
    ).rejects.toBeInstanceOf(TimesheetRejectionReasonRequiredError);
  });
});
