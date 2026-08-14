import { getApiBaseUrl } from '@/shared/lib/http/api-base-url';
import { createHttpClient } from '@/shared/lib/http/http-client';

import type {
  ApprovalPolicy,
  CreateApprovalPolicyInput,
  UpdateApprovalPolicyInput,
} from '../domain/approval-policy';

export type DeactivateApprovalPolicyInput = {
  companyId: string;
  policyId: string;
};

export type ApprovalPolicyApi = {
  listApprovalPolicies: (companyId: string) => Promise<ApprovalPolicy[]>;
  createApprovalPolicy: (input: CreateApprovalPolicyInput) => Promise<ApprovalPolicy>;
  updateApprovalPolicy: (input: UpdateApprovalPolicyInput) => Promise<ApprovalPolicy>;
  deactivateApprovalPolicy: (input: DeactivateApprovalPolicyInput) => Promise<ApprovalPolicy>;
};

export const createApprovalPolicyApi = (
  apiBaseUrl = getApiBaseUrl(),
): ApprovalPolicyApi => {
  const httpClient = createHttpClient(apiBaseUrl);

  return {
    listApprovalPolicies: (companyId) =>
      httpClient.get<ApprovalPolicy[]>(`/companies/${companyId}/approval-policies`),
    createApprovalPolicy: async (input) => {
      const response = await httpClient.post(
        `/companies/${input.companyId}/approval-policies`,
        {
          scopeType: input.scopeType,
          scopeNodeId: input.scopeNodeId,
          name: input.name,
          definition: input.definition,
          isActive: input.isActive,
        },
      );
      return (await response.json()) as ApprovalPolicy;
    },
    updateApprovalPolicy: async (input) => {
      const response = await httpClient.patch(
        `/companies/${input.companyId}/approval-policies/${input.policyId}`,
        {
          scopeType: input.scopeType,
          scopeNodeId: input.scopeNodeId,
          name: input.name,
          definition: input.definition,
          isActive: input.isActive,
        },
      );
      return (await response.json()) as ApprovalPolicy;
    },
    deactivateApprovalPolicy: async (input) => {
      const response = await httpClient.post(
        `/companies/${input.companyId}/approval-policies/${input.policyId}/deactivate`,
        {},
      );
      return (await response.json()) as ApprovalPolicy;
    },
  };
};
