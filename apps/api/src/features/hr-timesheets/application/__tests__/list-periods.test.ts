import { describe, expect, it } from 'vitest';

import { createListPeriodsUseCase } from '../list-periods';
import { InMemoryTimesheetsGateway, buildAssignment, buildPeriod } from './support';

describe('createListPeriodsUseCase', () => {
  it('returns only periods for the actor and their direct reports', async () => {
    const gateway = new InMemoryTimesheetsGateway();
    gateway.assignments = [
      buildAssignment({ id: 'assignment-self', employeeId: 'employee-self' }),
      buildAssignment({ id: 'assignment-report', employeeId: 'employee-report' }),
      buildAssignment({ id: 'assignment-hidden', employeeId: 'employee-hidden' }),
    ];
    gateway.periods = [
      buildPeriod({ id: 'period-self', employeeAssignmentId: 'assignment-self' }),
      buildPeriod({ id: 'period-report', employeeAssignmentId: 'assignment-report' }),
      buildPeriod({ id: 'period-hidden', employeeAssignmentId: 'assignment-hidden' }),
    ];
    const listPeriods = createListPeriodsUseCase({ gateway });

    const periods = await listPeriods({
      companyId: 'company-1',
      visibleEmployeeIds: ['employee-self', 'employee-report'],
    });

    expect(periods.map((period) => period.id)).toEqual(['period-self', 'period-report']);
  });

  it('supports status filters inside the actor visibility boundary', async () => {
    const gateway = new InMemoryTimesheetsGateway();
    gateway.assignments = [buildAssignment({ id: 'assignment-self', employeeId: 'employee-self' })];
    gateway.periods = [
      buildPeriod({ id: 'period-draft', employeeAssignmentId: 'assignment-self', status: 'draft' }),
      buildPeriod({
        id: 'period-submitted',
        employeeAssignmentId: 'assignment-self',
        status: 'submitted',
        submittedAt: new Date('2026-08-17T09:00:00.000Z'),
        submittedByUserId: 'employee-self',
      }),
    ];
    const listPeriods = createListPeriodsUseCase({ gateway });

    const periods = await listPeriods({
      companyId: 'company-1',
      visibleEmployeeIds: ['employee-self'],
      status: 'submitted',
    });

    expect(periods).toHaveLength(1);
    expect(periods[0]?.id).toBe('period-submitted');
  });
});
