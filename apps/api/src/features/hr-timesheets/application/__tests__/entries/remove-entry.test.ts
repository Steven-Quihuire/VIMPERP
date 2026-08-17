import { describe, expect, it } from 'vitest';

import { TimesheetEntryNotFoundError, TimesheetLockedError } from '../../../domain/timesheets';
import { createRemoveEntryUseCase } from '../../entries/remove-entry';
import { InMemoryTimesheetsGateway, buildEntry, buildPeriod } from '../support';

describe('createRemoveEntryUseCase', () => {
  it('deletes a draft entry from the target period', async () => {
    const gateway = new InMemoryTimesheetsGateway();
    gateway.periods = [buildPeriod({ id: 'period-1' })];
    gateway.entries = [buildEntry({ id: 'entry-1', periodId: 'period-1' })];
    const removeEntry = createRemoveEntryUseCase({ gateway });

    await expect(
      removeEntry({
        companyId: 'company-1',
        periodId: 'period-1',
        entryId: 'entry-1',
      }),
    ).resolves.toBeUndefined();

    expect(gateway.entries).toHaveLength(0);
  });

  it('throws not found when the entry is missing', async () => {
    const gateway = new InMemoryTimesheetsGateway();
    gateway.periods = [buildPeriod({ id: 'period-1' })];
    const removeEntry = createRemoveEntryUseCase({ gateway });

    await expect(
      removeEntry({
        companyId: 'company-1',
        periodId: 'period-1',
        entryId: 'entry-missing',
      }),
    ).rejects.toBeInstanceOf(TimesheetEntryNotFoundError);
  });

  it('rejects deletion when the period is already submitted', async () => {
    const gateway = new InMemoryTimesheetsGateway();
    gateway.periods = [
      buildPeriod({
        id: 'period-1',
        status: 'submitted',
        submittedAt: new Date('2026-08-17T09:00:00.000Z'),
        submittedByUserId: 'user-1',
      }),
    ];
    gateway.entries = [buildEntry({ id: 'entry-1', periodId: 'period-1' })];
    const removeEntry = createRemoveEntryUseCase({ gateway });

    await expect(
      removeEntry({
        companyId: 'company-1',
        periodId: 'period-1',
        entryId: 'entry-1',
      }),
    ).rejects.toBeInstanceOf(TimesheetLockedError);
  });
});
