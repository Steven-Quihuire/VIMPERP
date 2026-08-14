import {
  ApprovalPolicyNotFoundError,
  type ApprovalPolicyGateway,
} from '../domain/approval-policy';

export const createDeactivateApprovalPolicyUseCase = ({
  gateway,
}: {
  gateway: ApprovalPolicyGateway;
}) => {
  return async (input: { companyId: string; policyId: string }) => {
    const policy = await gateway.deactivateApprovalPolicy(input.companyId, input.policyId);

    if (!policy) {
      throw new ApprovalPolicyNotFoundError();
    }

    return policy;
  };
};
