import { describe, expect, it } from 'vitest';

import { TimesheetEntryNotFoundError, TimesheetLockedError } from '../../../domain/timesheets';
import { createUpdateEntryUseCase } from '../../entries/update-entry';
import { InMemoryTimesheetsGateway, buildEntry, buildPeriod } from '../support';

describe('createUpdateEntryUseCase', () => {
  it('updates an entry while the period is still draft', async () => {
    const gateway = new InMemoryTimesheetsGateway();
    gateway.periods = [buildPeriod({ id: 'period-1' })];
    gateway.entries = [buildEntry({ id: 'entry-1', periodId: 'period-1' })];
    const updateEntry = createUpdateEntryUseCase({ gateway });

    const updated = await updateEntry({
      companyId: 'company-1',
      periodId: 'period-1',
      entryId: 'entry-1',
      entryDate: '2026-08-13',
      hours: 6.5,
      projectId: null,
      taskLabel: 'Inventory count',
      note: 'Updated note',
    });

    if (!updated) {
      throw new Error('expected updated entry');
    }
    expect(updated.entryDate).toBe('2026-08-13');
    expect(updated.hours).toBe(6.5);
  });

  it('throws not found when the entry does not belong to the target period', async () => {
    const gateway = new InMemoryTimesheetsGateway();
    gateway.periods = [buildPeriod({ id: 'period-1' })];
    gateway.entries = [buildEntry({ id: 'entry-1', periodId: 'period-other' })];
    const updateEntry = createUpdateEntryUseCase({ gateway });

    await expect(
      updateEntry({
        companyId: 'company-1',
        periodId: 'period-1',
        entryId: 'entry-1',
        entryDate: '2026-08-13',
        hours: 6.5,
        projectId: null,
        taskLabel: 'Inventory count',
        note: 'Updated note',
      }),
    ).rejects.toBeInstanceOf(TimesheetEntryNotFoundError);
  });

  it('rejects entry updates when the period is not draft', async () => {
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
    const updateEntry = createUpdateEntryUseCase({ gateway });

    await expect(
      updateEntry({
        companyId: 'company-1',
        periodId: 'period-1',
        entryId: 'entry-1',
        entryDate: '2026-08-13',
        hours: 6.5,
        projectId: null,
        taskLabel: 'Inventory count',
        note: 'Updated note',
      }),
    ).rejects.toBeInstanceOf(TimesheetLockedError);
  });
});
