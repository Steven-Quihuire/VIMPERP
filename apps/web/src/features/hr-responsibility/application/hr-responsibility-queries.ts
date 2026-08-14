import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createHrResponsibilityApi } from '../infrastructure/create-hr-responsibility-api';
import { authQueryKey } from '@/features/auth/presentation/use-auth';

export const hrResponsibilityQueryKeys = {
  state: (companyId: string) => ['hr-responsibility', companyId] as const,
};

export const useHrResponsibility = (
  companyId: string | undefined,
  apiBaseUrl?: string,
) => {
  const api = createHrResponsibilityApi(apiBaseUrl);
  const queryClient = useQueryClient();
  const stateQuery = useQuery({
    queryKey: hrResponsibilityQueryKeys.state(companyId ?? ''),
    queryFn: () => api.getState(companyId as string),
    enabled: Boolean(companyId),
    retry: false,
  });
  const assignMutation = useMutation({
    mutationFn: ({
      targetCompanyId,
      userId,
    }: {
      targetCompanyId: string;
      userId: string;
    }) => api.assign(targetCompanyId, userId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: hrResponsibilityQueryKeys.state(companyId ?? ''),
      });
    },
  });
  const inviteMutation = useMutation({
    mutationFn: ({
      targetCompanyId,
      inviteeEmail,
    }: {
      targetCompanyId: string;
      inviteeEmail: string;
    }) => api.createInvitation(targetCompanyId, inviteeEmail),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: hrResponsibilityQueryKeys.state(companyId ?? ''),
      });
    },
  });

  return { stateQuery, assignMutation, inviteMutation };
};

export const useHrResponsibilityInvitation = (
  token: string | undefined,
  apiBaseUrl?: string,
) => {
  const api = createHrResponsibilityApi(apiBaseUrl);
  const queryClient = useQueryClient();
  const invitationQuery = useQuery({
    queryKey: ['hr-responsibility-invitation', token ?? ''] as const,
    queryFn: () => api.getInvitation(token as string),
    enabled: Boolean(token),
    retry: false,
  });
  const acceptMutation = useMutation({
    mutationFn: ({
      invitationToken,
      password,
    }: {
      invitationToken: string;
      password?: string;
    }) => api.acceptInvitation(invitationToken, password),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: authQueryKey });
    },
  });
  return { invitationQuery, acceptMutation };
};
