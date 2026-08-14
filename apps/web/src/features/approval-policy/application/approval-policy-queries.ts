import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  CreateApprovalPolicyInput,
  UpdateApprovalPolicyInput,
} from '../domain/approval-policy';
import {
  createApprovalPolicyApi,
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
