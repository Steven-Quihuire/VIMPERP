import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { authQueryKey } from '@/features/auth/presentation/use-auth';

import type {
  AcceptErpAccessInvitationInput,
  CreateErpAccessInvitationInput,
} from '../domain/erp-access';
import { createErpAccessApi, type RevokeErpAccessInput } from '../infrastructure/create-erp-access-api';

export const hrErpAccessQueryKeys = {
  pendingInvitations: (companyId: string) =>
    ['hr-erp-access', 'pending-invitations', companyId] as const,
};

export const useInvitations = (
  companyId: string | undefined,
  apiBaseUrl?: string,
) => {
  const api = createErpAccessApi(apiBaseUrl);
  const queryClient = useQueryClient();

  const invitationsQuery = useQuery({
    queryKey: hrErpAccessQueryKeys.pendingInvitations(companyId ?? ''),
    queryFn: () => api.listInvitations(companyId as string),
    enabled: Boolean(companyId),
  });

  const createInvitationMutation = useMutation({
    mutationFn: (input: CreateErpAccessInvitationInput) => api.createInvitation(input),
    onSuccess: async (invitation) => {
      await queryClient.invalidateQueries({
        queryKey: hrErpAccessQueryKeys.pendingInvitations(invitation.companyId),
      });
    },
  });

  const revokeAccessMutation = useMutation({
    mutationFn: (input: RevokeErpAccessInput) => api.revokeAccess(input),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: hrErpAccessQueryKeys.pendingInvitations(variables.companyId),
      });
    },
  });

  return {
    invitationsQuery,
    createInvitationMutation,
    revokeAccessMutation,
  };
};

export const useAcceptInvitation = (apiBaseUrl?: string) => {
  const api = createErpAccessApi(apiBaseUrl);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AcceptErpAccessInvitationInput) =>
      api.acceptInvitation(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: authQueryKey });
    },
  });
};
