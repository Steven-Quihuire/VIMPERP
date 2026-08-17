import {
  TimesheetPeriodNotFoundError,
  type TimesheetGateway,
} from '../domain/timesheets';
import type { ApprovalPolicyGateway } from './approval-policy.gateway';

export const createSubmitPeriodUseCase = ({
  gateway,
  approvalPolicyGateway,
  now = () => new Date(),
}: {
  gateway: TimesheetGateway;
  approvalPolicyGateway: ApprovalPolicyGateway;
  now?: () => Date;
}) => {
  return async (input: {
    companyId: string;
    periodId: string;
    submittedByUserId: string;
  }) => {
    const submitted = await gateway.submitPeriod({
      companyId: input.companyId,
      periodId: input.periodId,
      submittedByUserId: input.submittedByUserId,
      at: now(),
      resolveApprovalPolicyId: async (scopeNodeId) => {
        const activePolicy = await approvalPolicyGateway.findActivePolicyForScope(
          input.companyId,
          scopeNodeId,
        );

        return activePolicy?.id ?? null;
      },
    });

    if (!submitted) {
      throw new TimesheetPeriodNotFoundError();
    }

    return submitted;
  };
};
