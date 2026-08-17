import { describe, expect, it } from 'vitest';

import { TimesheetLockedError, TimesheetValidationError } from '../../../domain/timesheets';
import { createAddEntryUseCase } from '../../entries/add-entry';
import { InMemoryTimesheetsGateway, buildPeriod } from '../support';

describe('createAddEntryUseCase', () => {
  it('creates an entry when the period is draft and the values are valid', async () => {
    const gateway = new InMemoryTimesheetsGateway();
    gateway.periods = [buildPeriod({ id: 'period-1' })];
    const addEntry = createAddEntryUseCase({ gateway });

    const entry = await addEntry({
      companyId: 'company-1',
      periodId: 'period-1',
      entryDate: '2026-08-12',
      hours: 8,
      projectId: null,
      taskLabel: 'Inventory count',
      note: 'Cycle count',
    });

    expect(entry.hours).toBe(8);
    expect(gateway.entries).toHaveLength(1);
  });

  it('rejects hours outside the supported bounds', async () => {
    const gateway = new InMemoryTimesheetsGateway();
    gateway.periods = [buildPeriod({ id: 'period-1' })];
    const addEntry = createAddEntryUseCase({ gateway });

    await expect(
      addEntry({
        companyId: 'company-1',
        periodId: 'period-1',
        entryDate: '2026-08-12',
        hours: 24.5,
        projectId: null,
        taskLabel: 'Inventory count',
        note: null,
      }),
    ).rejects.toBeInstanceOf(TimesheetValidationError);
  });

  it('rejects entry dates outside the period range', async () => {
    const gateway = new InMemoryTimesheetsGateway();
    gateway.periods = [buildPeriod({ id: 'period-1', periodStart: '2026-08-10', periodEnd: '2026-08-16' })];
    const addEntry = createAddEntryUseCase({ gateway });

    await expect(
      addEntry({
        companyId: 'company-1',
        periodId: 'period-1',
        entryDate: '2026-08-18',
        hours: 8,
        projectId: null,
        taskLabel: 'Inventory count',
        note: null,
      }),
    ).rejects.toBeInstanceOf(TimesheetValidationError);
  });

  it('rejects entry creation when the period is locked', async () => {
    const gateway = new InMemoryTimesheetsGateway();
    gateway.periods = [
      buildPeriod({
        id: 'period-1',
        status: 'submitted',
        submittedAt: new Date('2026-08-17T09:00:00.000Z'),
        submittedByUserId: 'user-1',
      }),
    ];
    const addEntry = createAddEntryUseCase({ gateway });

    await expect(
      addEntry({
        companyId: 'company-1',
        periodId: 'period-1',
        entryDate: '2026-08-12',
        hours: 8,
        projectId: null,
        taskLabel: 'Inventory count',
        note: null,
      }),
    ).rejects.toBeInstanceOf(TimesheetLockedError);
  });
});
