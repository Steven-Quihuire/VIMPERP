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

export type ApprovalPolicyPage = {
  items: ApprovalPolicy[];
  total: number;
  page: number;
  pageSize: number;
};

export type ApprovalPolicyApi = {
  listApprovalPolicies: (companyId: string) => Promise<ApprovalPolicy[]>;
  listApprovalPoliciesPage: (input: {
    companyId: string;
    page: number;
    pageSize: number;
    search?: string;
  }) => Promise<ApprovalPolicyPage>;
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
    listApprovalPoliciesPage: async ({
      companyId,
      page,
      pageSize,
      search,
    }) => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (search) params.set('search', search);
      return httpClient.get<ApprovalPolicyPage>(
        `/companies/${companyId}/approval-policies?${params.toString()}`,
      );
    },
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
