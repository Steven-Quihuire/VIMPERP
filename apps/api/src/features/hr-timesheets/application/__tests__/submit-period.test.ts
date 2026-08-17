import { describe, expect, it } from 'vitest';

import { TimesheetInvalidStatusTransitionError } from '../../domain/timesheets';
import { createSubmitPeriodUseCase } from '../submit-period';
import { InMemoryApprovalPolicyGateway, InMemoryTimesheetsGateway, buildAssignment, buildPeriod } from './support';

describe('createSubmitPeriodUseCase', () => {
  it('auto-resolves the active approval policy from the assignment scope', async () => {
    const gateway = new InMemoryTimesheetsGateway();
    gateway.assignments = [buildAssignment({ id: 'assignment-1', scopeNodeId: 'area:scope-9' })];
    gateway.periods = [buildPeriod({ id: 'period-1', employeeAssignmentId: 'assignment-1' })];
    const approvalPolicyGateway = new InMemoryApprovalPolicyGateway();
    approvalPolicyGateway.setActivePolicy('area:scope-9', 'policy-9');
    const submitPeriod = createSubmitPeriodUseCase({
      gateway,
      approvalPolicyGateway,
      now: () => new Date('2026-08-17T09:00:00.000Z'),
    });

    const submitted = await submitPeriod({
      companyId: 'company-1',
      periodId: 'period-1',
      submittedByUserId: 'employee-user',
    });

    if (!submitted) {
      throw new Error('expected submitted period');
    }
    expect(submitted.status).toBe('submitted');
    expect(submitted.approvalPolicyId).toBe('policy-9');
    expect(approvalPolicyGateway.calls).toEqual([
      { companyId: 'company-1', scopeNodeId: 'area:scope-9' },
    ]);
  });

  it('stores a null approval policy snapshot when nothing active matches the scope', async () => {
    const gateway = new InMemoryTimesheetsGateway();
    gateway.assignments = [buildAssignment({ id: 'assignment-1', scopeNodeId: 'area:scope-10' })];
    gateway.periods = [buildPeriod({ id: 'period-1', employeeAssignmentId: 'assignment-1' })];
    const approvalPolicyGateway = new InMemoryApprovalPolicyGateway();
    const submitPeriod = createSubmitPeriodUseCase({ gateway, approvalPolicyGateway });

    const submitted = await submitPeriod({
      companyId: 'company-1',
      periodId: 'period-1',
      submittedByUserId: 'employee-user',
    });

    if (!submitted) {
      throw new Error('expected submitted period');
    }
    expect(submitted.approvalPolicyId).toBeNull();
  });

  it('rejects submit when the persisted period is no longer draft at atomic submit time', async () => {
    const gateway = new InMemoryTimesheetsGateway();
    gateway.assignments = [buildAssignment({ id: 'assignment-1', scopeNodeId: 'area:scope-9' })];
    gateway.periods = [buildPeriod({ id: 'period-1', employeeAssignmentId: 'assignment-1' })];

    const originalGetPeriod = gateway.getPeriod.bind(gateway);
    gateway.getPeriod = async (companyId, periodId) => {
      const period = await originalGetPeriod(companyId, periodId);

      return period ? { ...period } : null;
    };

    const originalSubmitPeriod = gateway.submitPeriod.bind(gateway);
    gateway.submitPeriod = async (input) => {
      gateway.periods[0] = {
        ...gateway.periods[0]!,
        status: 'approved',
        approvedAt: new Date('2026-08-17T08:59:59.000Z'),
        approvedByUserId: 'manager-user',
      };

      return await originalSubmitPeriod(input);
    };

    const submitPeriod = createSubmitPeriodUseCase({
      gateway,
      approvalPolicyGateway: new InMemoryApprovalPolicyGateway(),
      now: () => new Date('2026-08-17T09:00:00.000Z'),
    });

    await expect(
      submitPeriod({
        companyId: 'company-1',
        periodId: 'period-1',
        submittedByUserId: 'employee-user',
      }),
    ).rejects.toBeInstanceOf(TimesheetInvalidStatusTransitionError);
  });

  it('rejects submit requests once the period has already left draft', async () => {
    const gateway = new InMemoryTimesheetsGateway();
    gateway.assignments = [buildAssignment({ id: 'assignment-1' })];
    gateway.periods = [
      buildPeriod({
        id: 'period-1',
        employeeAssignmentId: 'assignment-1',
        status: 'submitted',
        submittedAt: new Date('2026-08-17T09:00:00.000Z'),
        submittedByUserId: 'employee-user',
      }),
    ];
    const submitPeriod = createSubmitPeriodUseCase({
      gateway,
      approvalPolicyGateway: new InMemoryApprovalPolicyGateway(),
    });

    await expect(
      submitPeriod({
        companyId: 'company-1',
        periodId: 'period-1',
        submittedByUserId: 'employee-user',
      }),
    ).rejects.toBeInstanceOf(TimesheetInvalidStatusTransitionError);
  });
});
