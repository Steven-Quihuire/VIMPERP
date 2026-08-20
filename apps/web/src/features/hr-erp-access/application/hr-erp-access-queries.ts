import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { authQueryKey } from '@/features/auth/presentation/use-auth';

import type {
  AcceptErpAccessInvitationInput,
  CreateErpAccessInvitationInput,
} from '../domain/erp-access';
import {
  createErpAccessApi,
  type ErpAccessInvitationPage,
  type RevokeErpAccessInput,
} from '../infrastructure/create-erp-access-api';

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

export const useInvitationsPage = (
  input: {
    companyId: string | undefined;
    page: number;
    pageSize: number;
    search: string;
  },
  apiBaseUrl?: string,
) => {
  const api = createErpAccessApi(apiBaseUrl);
  const { createInvitationMutation, revokeAccessMutation } = useInvitations(
    input.companyId,
    apiBaseUrl,
  );

  const invitationsQuery = useQuery({
    queryKey: [
      'hr-erp-access',
      'pending-invitations-page',
      input.companyId ?? '',
      input.page,
      input.pageSize,
      input.search,
    ],
    queryFn: () =>
      api.listInvitationsPage({
        companyId: input.companyId as string,
        page: input.page,
        pageSize: input.pageSize,
        ...(input.search ? { search: input.search } : {}),
      }),
    placeholderData: keepPreviousData,
    enabled: Boolean(input.companyId),
  });

  return {
    invitationsQuery: invitationsQuery as typeof invitationsQuery & {
      data: ErpAccessInvitationPage | undefined;
    },
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
