import {
  ApprovalPolicyNotFoundError,
  ApprovalPolicyScopeNotFoundError,
  ApprovalPolicyValidationError,
  assertValidApprovalPolicyScope,
  type ApprovalPolicy,
  type ApprovalPolicyGateway,
} from '../domain/approval-policy';

export const createUpdateApprovalPolicyUseCase = ({
  gateway,
}: {
  gateway: ApprovalPolicyGateway;
}) => {
  return async (input: {
    companyId: string;
    policyId: string;
    scopeType: ApprovalPolicy['scopeType'];
    scopeNodeId: string | null;
    name: string;
    definition: unknown;
    isActive: boolean;
  }) => {
    const name = input.name.trim();

    if (name.length === 0) {
      throw new ApprovalPolicyValidationError('Approval policy name is required.');
    }

    assertValidApprovalPolicyScope(input);

    if (input.scopeNodeId) {
      const scopeNode = await gateway.findScopeNode(input.companyId, input.scopeNodeId);

      if (!scopeNode) {
        throw new ApprovalPolicyScopeNotFoundError();
      }
    }

    const policy = await gateway.updateApprovalPolicy({
      companyId: input.companyId,
      policyId: input.policyId,
      scopeType: input.scopeType,
      scopeNodeId: input.scopeNodeId,
      name,
      definition: input.definition,
      isActive: input.isActive,
    });

    if (!policy) {
      throw new ApprovalPolicyNotFoundError();
    }

    return policy;
  };
};
