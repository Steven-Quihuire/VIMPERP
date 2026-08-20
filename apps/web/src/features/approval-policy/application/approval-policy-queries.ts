import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  CreateApprovalPolicyInput,
  UpdateApprovalPolicyInput,
} from '../domain/approval-policy';
import {
  createApprovalPolicyApi,
  type ApprovalPolicyPage,
  type DeactivateApprovalPolicyInput,
} from '../infrastructure/create-approval-policy-api';

export const approvalPolicyQueryKeys = {
  policies: (companyId: string) => ['approval-policy', 'policies', companyId] as const,
};

export const useApprovalPolicies = (
  companyId: string | undefined,
  apiBaseUrl?: string,
) => {
  const api = createApprovalPolicyApi(apiBaseUrl);
  const queryClient = useQueryClient();

  const policiesQuery = useQuery({
    queryKey: approvalPolicyQueryKeys.policies(companyId ?? ''),
    queryFn: () => api.listApprovalPolicies(companyId as string),
    enabled: Boolean(companyId),
  });

  const invalidatePolicies = async (targetCompanyId: string) => {
    await queryClient.invalidateQueries({
      queryKey: approvalPolicyQueryKeys.policies(targetCompanyId),
    });
  };

  const createPolicyMutation = useMutation({
    mutationFn: (input: CreateApprovalPolicyInput) => api.createApprovalPolicy(input),
    onSuccess: async (policy) => {
      await invalidatePolicies(policy.companyId);
    },
  });

  const updatePolicyMutation = useMutation({
    mutationFn: (input: UpdateApprovalPolicyInput) => api.updateApprovalPolicy(input),
    onSuccess: async (policy) => {
      await invalidatePolicies(policy.companyId);
    },
  });

  const deactivatePolicyMutation = useMutation({
    mutationFn: (input: DeactivateApprovalPolicyInput) => api.deactivateApprovalPolicy(input),
    onSuccess: async (policy) => {
      await invalidatePolicies(policy.companyId);
    },
  });

  return {
    policiesQuery,
    createPolicyMutation,
    updatePolicyMutation,
    deactivatePolicyMutation,
  };
};

export const useApprovalPoliciesPage = (
  input: {
    companyId: string | undefined;
    page: number;
    pageSize: number;
    search: string;
  },
  apiBaseUrl?: string,
) => {
  const api = createApprovalPolicyApi(apiBaseUrl);
  const { createPolicyMutation, updatePolicyMutation, deactivatePolicyMutation } =
    useApprovalPolicies(input.companyId, apiBaseUrl);

  const policiesQuery = useQuery({
    queryKey: [
      'approval-policy',
      'policies-page',
      input.companyId ?? '',
      input.page,
      input.pageSize,
      input.search,
    ],
    queryFn: () =>
      api.listApprovalPoliciesPage({
        companyId: input.companyId as string,
        page: input.page,
        pageSize: input.pageSize,
        ...(input.search ? { search: input.search } : {}),
      }),
    placeholderData: keepPreviousData,
    enabled: Boolean(input.companyId),
  });

  return {
    policiesQuery: policiesQuery as typeof policiesQuery & {
      data: ApprovalPolicyPage | undefined;
    },
    createPolicyMutation,
    updatePolicyMutation,
    deactivatePolicyMutation,
  };
};
