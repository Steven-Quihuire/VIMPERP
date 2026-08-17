import { describe, expect, it } from 'vitest';

import { TimesheetPeriodNotFoundError } from '../../domain/timesheets';
import { createGetPeriodUseCase } from '../get-period';
import { InMemoryTimesheetsGateway, buildAssignment, buildPeriod } from './support';

describe('createGetPeriodUseCase', () => {
  it('returns a timesheet period when the actor can see their own assignment', async () => {
    const gateway = new InMemoryTimesheetsGateway();
    gateway.assignments = [buildAssignment({ id: 'assignment-self', employeeId: 'employee-self' })];
    gateway.periods = [buildPeriod({ id: 'period-self', employeeAssignmentId: 'assignment-self' })];
    const getPeriod = createGetPeriodUseCase({ gateway });

    await expect(
      getPeriod({
        companyId: 'company-1',
        periodId: 'period-self',
        visibleEmployeeIds: ['employee-self'],
      }),
    ).resolves.toMatchObject({ id: 'period-self' });
  });

  it('returns direct-report periods when the actor visibility includes that employee', async () => {
    const gateway = new InMemoryTimesheetsGateway();
    gateway.assignments = [buildAssignment({ id: 'assignment-report', employeeId: 'employee-report' })];
    gateway.periods = [buildPeriod({ id: 'period-report', employeeAssignmentId: 'assignment-report' })];
    const getPeriod = createGetPeriodUseCase({ gateway });

    await expect(
      getPeriod({
        companyId: 'company-1',
        periodId: 'period-report',
        visibleEmployeeIds: ['employee-self', 'employee-report'],
      }),
    ).resolves.toMatchObject({ id: 'period-report' });
  });

  it('hides out-of-scope periods as not found', async () => {
    const gateway = new InMemoryTimesheetsGateway();
    gateway.assignments = [buildAssignment({ id: 'assignment-hidden', employeeId: 'employee-hidden' })];
    gateway.periods = [buildPeriod({ id: 'period-hidden', employeeAssignmentId: 'assignment-hidden' })];
    const getPeriod = createGetPeriodUseCase({ gateway });

    await expect(
      getPeriod({
        companyId: 'company-1',
        periodId: 'period-hidden',
        visibleEmployeeIds: ['employee-self'],
      }),
    ).rejects.toBeInstanceOf(TimesheetPeriodNotFoundError);
  });
});
