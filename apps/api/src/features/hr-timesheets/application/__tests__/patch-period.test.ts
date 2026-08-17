import { describe, expect, it } from 'vitest';

import { TimesheetLockedError, TimesheetPeriodNotFoundError } from '../../domain/timesheets';
import { createPatchPeriodUseCase } from '../patch-period';
import { InMemoryTimesheetsGateway, buildPeriod } from './support';

describe('createPatchPeriodUseCase', () => {
  it('updates the period range while the timesheet is still draft', async () => {
    const gateway = new InMemoryTimesheetsGateway();
    gateway.periods = [buildPeriod({ id: 'period-1' })];
    const patchPeriod = createPatchPeriodUseCase({ gateway });

    const updated = await patchPeriod({
      companyId: 'company-1',
      periodId: 'period-1',
      periodStart: '2026-08-11',
      periodEnd: '2026-08-17',
    });

    if (!updated) {
      throw new Error('expected updated period');
    }
    expect(updated.periodStart).toBe('2026-08-11');
    expect(updated.periodEnd).toBe('2026-08-17');
  });

  it('rejects period updates once the period is no longer draft', async () => {
    const gateway = new InMemoryTimesheetsGateway();
    gateway.periods = [
      buildPeriod({
        id: 'period-submitted',
        status: 'submitted',
        submittedAt: new Date('2026-08-17T09:00:00.000Z'),
        submittedByUserId: 'user-1',
      }),
    ];
    const patchPeriod = createPatchPeriodUseCase({ gateway });

    await expect(
      patchPeriod({
        companyId: 'company-1',
        periodId: 'period-submitted',
        periodStart: '2026-08-11',
        periodEnd: '2026-08-17',
      }),
    ).rejects.toBeInstanceOf(TimesheetLockedError);
  });

  it('throws not found for missing periods', async () => {
    const gateway = new InMemoryTimesheetsGateway();
    const patchPeriod = createPatchPeriodUseCase({ gateway });

    await expect(
      patchPeriod({
        companyId: 'company-1',
        periodId: 'missing-period',
        periodStart: '2026-08-11',
        periodEnd: '2026-08-17',
      }),
    ).rejects.toBeInstanceOf(TimesheetPeriodNotFoundError);
  });
});
