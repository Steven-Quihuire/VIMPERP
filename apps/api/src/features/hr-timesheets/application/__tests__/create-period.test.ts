import { describe, expect, it } from 'vitest';

import {
  TimesheetAssignmentNotFoundError,
  TimesheetPeriodOverlapError,
  TimesheetValidationError,
} from '../../domain/timesheets';
import { createCreatePeriodUseCase } from '../create-period';
import { InMemoryTimesheetsGateway, buildAssignment, buildPeriod } from './support';

describe('createCreatePeriodUseCase', () => {
  it('rejects inverted ranges before touching persistence', async () => {
    const gateway = new InMemoryTimesheetsGateway();
    const createPeriod = createCreatePeriodUseCase({ gateway });

    await expect(
      createPeriod({
        companyId: 'company-1',
        employeeAssignmentId: 'assignment-1',
        periodStart: '2026-08-16',
        periodEnd: '2026-08-10',
      }),
    ).rejects.toBeInstanceOf(TimesheetValidationError);

    expect(gateway.periods).toHaveLength(0);
  });

  it('rejects a period when the employee assignment is missing for the tenant', async () => {
    const gateway = new InMemoryTimesheetsGateway();
    const createPeriod = createCreatePeriodUseCase({ gateway });

    await expect(
      createPeriod({
        companyId: 'company-1',
        employeeAssignmentId: 'assignment-missing',
        periodStart: '2026-08-10',
        periodEnd: '2026-08-16',
      }),
    ).rejects.toBeInstanceOf(TimesheetAssignmentNotFoundError);
  });

  it('rejects overlapping periods for the same employee assignment', async () => {
    const gateway = new InMemoryTimesheetsGateway();
    gateway.assignments = [buildAssignment()];
    gateway.periods = [
      buildPeriod({
        id: 'period-existing',
        employeeAssignmentId: 'assignment-1',
        periodStart: '2026-08-10',
        periodEnd: '2026-08-16',
      }),
    ];
    const createPeriod = createCreatePeriodUseCase({ gateway });

    await expect(
      createPeriod({
        companyId: 'company-1',
        employeeAssignmentId: 'assignment-1',
        periodStart: '2026-08-15',
        periodEnd: '2026-08-20',
      }),
    ).rejects.toBeInstanceOf(TimesheetPeriodOverlapError);
  });

  it('creates a draft period for an active assignment', async () => {
    const gateway = new InMemoryTimesheetsGateway();
    gateway.assignments = [buildAssignment({ id: 'assignment-2', employeeId: 'employee-2' })];
    const createPeriod = createCreatePeriodUseCase({ gateway });

    const created = await createPeriod({
      companyId: 'company-1',
      employeeAssignmentId: 'assignment-2',
      periodStart: '2026-08-17',
      periodEnd: '2026-08-23',
    });

    expect(created.status).toBe('draft');
    expect(created.employeeAssignmentId).toBe('assignment-2');
    expect(gateway.periods).toHaveLength(1);
  });
});
