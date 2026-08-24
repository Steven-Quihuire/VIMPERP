import { describe, expect, it } from 'vitest';

import { TimesheetPeriodNotFoundError } from '../../domain/timesheets';
import { createListEntriesUseCase } from '../list-entries';
import {
  InMemoryTimesheetsGateway,
  buildAssignment,
  buildEntry,
  buildPeriod,
} from './support';

describe('createListEntriesUseCase', () => {
  it('returns entries when the actor can see their own period', async () => {
    const gateway = new InMemoryTimesheetsGateway();
    gateway.assignments = [buildAssignment({ id: 'assignment-self', employeeId: 'employee-self' })];
    gateway.periods = [buildPeriod({ id: 'period-self', employeeAssignmentId: 'assignment-self' })];
    gateway.entries = [buildEntry({ id: 'entry-self', periodId: 'period-self' })];
    const listEntries = createListEntriesUseCase({ gateway });

    await expect(
      listEntries({
        companyId: 'company-1',
        periodId: 'period-self',
        visibleEmployeeIds: ['employee-self'],
      }),
    ).resolves.toEqual([expect.objectContaining({ id: 'entry-self', periodId: 'period-self' })]);
  });

  it('returns direct-report entries when the actor visibility includes that employee', async () => {
    const gateway = new InMemoryTimesheetsGateway();
    gateway.assignments = [buildAssignment({ id: 'assignment-report', employeeId: 'employee-report' })];
    gateway.periods = [buildPeriod({ id: 'period-report', employeeAssignmentId: 'assignment-report' })];
    gateway.entries = [buildEntry({ id: 'entry-report', periodId: 'period-report' })];
    const listEntries = createListEntriesUseCase({ gateway });

    await expect(
      listEntries({
        companyId: 'company-1',
        periodId: 'period-report',
        visibleEmployeeIds: ['employee-self', 'employee-report'],
      }),
    ).resolves.toEqual([
      expect.objectContaining({ id: 'entry-report', periodId: 'period-report' }),
    ]);
  });

  it('hides out-of-scope periods as not found', async () => {
    const gateway = new InMemoryTimesheetsGateway();
    gateway.assignments = [buildAssignment({ id: 'assignment-hidden', employeeId: 'employee-hidden' })];
    gateway.periods = [buildPeriod({ id: 'period-hidden', employeeAssignmentId: 'assignment-hidden' })];
    gateway.entries = [buildEntry({ id: 'entry-hidden', periodId: 'period-hidden' })];
    const listEntries = createListEntriesUseCase({ gateway });

    await expect(
      listEntries({
        companyId: 'company-1',
        periodId: 'period-hidden',
        visibleEmployeeIds: ['employee-self'],
      }),
    ).rejects.toBeInstanceOf(TimesheetPeriodNotFoundError);
  });

  it('returns an empty list when the visible period has no entries', async () => {
    const gateway = new InMemoryTimesheetsGateway();
    gateway.assignments = [buildAssignment({ id: 'assignment-empty', employeeId: 'employee-empty' })];
    gateway.periods = [buildPeriod({ id: 'period-empty', employeeAssignmentId: 'assignment-empty' })];
    const listEntries = createListEntriesUseCase({ gateway });

    await expect(
      listEntries({
        companyId: 'company-1',
        periodId: 'period-empty',
        visibleEmployeeIds: ['employee-empty'],
      }),
    ).resolves.toEqual([]);
  });
});
