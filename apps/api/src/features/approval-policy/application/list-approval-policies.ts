import type { ApprovalPolicyGateway } from '../domain/approval-policy';

export const createListApprovalPoliciesUseCase = ({
  gateway,
}: {
  gateway: ApprovalPolicyGateway;
}) => {
  return async (companyId: string) => {
    return await gateway.listApprovalPolicies(companyId);
  };
};
