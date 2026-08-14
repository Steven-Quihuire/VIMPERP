import { scopeTypeValues, type ScopeType } from '../../../shared/infrastructure/scope-hierarchy/scope-hierarchy.port';

export type ApprovalPolicy = {
  id: string;
  companyId: string;
  scopeType: ScopeType;
  scopeNodeId: string | null;
  name: string;
  definition: unknown;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type ApprovalPolicyScopeNode = {
  id: string;
  companyId: string;
};

export type ApprovalPolicyGateway = {
  createApprovalPolicy: (input: {
    companyId: string;
    scopeType: ScopeType;
    scopeNodeId: string | null;
    name: string;
    definition: unknown;
    isActive: boolean;
  }) => Promise<ApprovalPolicy>;
  listApprovalPolicies: (companyId: string) => Promise<ApprovalPolicy[]>;
  getApprovalPolicyById: (
    companyId: string,
    policyId: string,
  ) => Promise<ApprovalPolicy | null>;
  updateApprovalPolicy: (input: {
    companyId: string;
    policyId: string;
    scopeType: ScopeType;
    scopeNodeId: string | null;
    name: string;
    definition: unknown;
    isActive: boolean;
  }) => Promise<ApprovalPolicy | null>;
  deactivateApprovalPolicy: (
    companyId: string,
    policyId: string,
  ) => Promise<ApprovalPolicy | null>;
  findScopeNode: (
    companyId: string,
    scopeNodeId: string,
  ) => Promise<ApprovalPolicyScopeNode | null>;
};

export const assertValidApprovalPolicyScope = (input: {
  scopeType: ScopeType;
  scopeNodeId: string | null;
}) => {
  if (!scopeTypeValues.includes(input.scopeType)) {
    throw new ApprovalPolicyValidationError('Unsupported approval policy scope type.');
  }

  if (input.scopeType === 'company' && input.scopeNodeId !== null) {
    throw new ApprovalPolicyValidationError(
      'Company approval policies must not reference a scope node.',
    );
  }

  if (input.scopeType !== 'company' && input.scopeNodeId === null) {
    throw new ApprovalPolicyValidationError(
      'Node-scoped approval policies must reference a scope node.',
    );
  }
};

export class ApprovalPolicyValidationError extends Error {
  readonly code = 'APPROVAL_POLICY_VALIDATION';

  constructor(message = 'Approval policy input is invalid.') {
    super(message);
    this.name = 'ApprovalPolicyValidationError';
  }
}

export class ApprovalPolicyNotFoundError extends Error {
  readonly code = 'APPROVAL_POLICY_NOT_FOUND';

  constructor(message = 'Approval policy not found.') {
    super(message);
    this.name = 'ApprovalPolicyNotFoundError';
  }
}

export class ApprovalPolicyScopeNotFoundError extends Error {
  readonly code = 'APPROVAL_POLICY_SCOPE_NOT_FOUND';

  constructor(message = 'Approval policy scope node was not found for this company.') {
    super(message);
    this.name = 'ApprovalPolicyScopeNotFoundError';
  }
}
