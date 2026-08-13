import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { authQueryKey } from '@/features/auth/presentation/use-auth';

import type {
  AcceptNodeManagementInvitationInput,
  CreateNodeManagementInvitationInput,
} from '../domain/node-management';
import { createNodeManagementApi } from '../infrastructure/node-management-api';

export const nodeManagementQueryKeys = {
  responsibilities: (companyId: string) =>
    ['node-management', 'responsibilities', companyId] as const,
  pendingInvitations: (companyId: string) =>
    ['node-management', 'pending-invitations', companyId] as const,
  invitation: (token: string) => ['node-management', 'invitation', token] as const,
};

export const useNodeManagementResponsibilities = (
  companyId: string | undefined,
  apiBaseUrl?: string,
) => {
  const api = createNodeManagementApi(apiBaseUrl);

  return useQuery({
    queryKey: nodeManagementQueryKeys.responsibilities(companyId ?? ''),
    queryFn: () => api.listResponsibilities(companyId as string),
    enabled: Boolean(companyId),
  });
};

export const useNodeManagementPendingInvitations = (
  companyId: string | undefined,
  apiBaseUrl?: string,
) => {
  const api = createNodeManagementApi(apiBaseUrl);

  return useQuery({
    queryKey: nodeManagementQueryKeys.pendingInvitations(companyId ?? ''),
    queryFn: () => api.listPendingInvitations(companyId as string),
    enabled: Boolean(companyId),
  });
};

export const useCreateNodeManagementInvitation = (apiBaseUrl?: string) => {
  const api = createNodeManagementApi(apiBaseUrl);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateNodeManagementInvitationInput) =>
      api.createInvitation(input),
    onSuccess: async (invitation) => {
      await queryClient.invalidateQueries({
        queryKey: nodeManagementQueryKeys.pendingInvitations(invitation.companyId),
      });
      await queryClient.invalidateQueries({
        queryKey: nodeManagementQueryKeys.responsibilities(invitation.companyId),
      });
    },
  });
};

export const useNodeManagementInvitation = (
  token: string | undefined,
  apiBaseUrl?: string,
) => {
  const api = createNodeManagementApi(apiBaseUrl);

  return useQuery({
    queryKey: nodeManagementQueryKeys.invitation(token ?? ''),
    queryFn: () => api.getInvitation(token as string),
    enabled: Boolean(token),
    retry: false,
  });
};

export const useAcceptNodeManagementInvitation = (apiBaseUrl?: string) => {
  const api = createNodeManagementApi(apiBaseUrl);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AcceptNodeManagementInvitationInput) =>
      api.acceptInvitation(input),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: authQueryKey });
      await queryClient.invalidateQueries({
        queryKey: nodeManagementQueryKeys.invitation(variables.token),
      });
    },
  });
};
