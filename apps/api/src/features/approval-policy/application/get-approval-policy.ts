import {
  ApprovalPolicyNotFoundError,
  type ApprovalPolicyGateway,
} from '../domain/approval-policy';

export const createGetApprovalPolicyUseCase = ({
  gateway,
}: {
  gateway: ApprovalPolicyGateway;
}) => {
  return async (input: { companyId: string; policyId: string }) => {
    const policy = await gateway.getApprovalPolicyById(input.companyId, input.policyId);

    if (!policy) {
      throw new ApprovalPolicyNotFoundError();
    }

    return policy;
  };
};
