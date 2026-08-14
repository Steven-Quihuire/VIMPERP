import { getApiBaseUrl } from '@/shared/lib/http/api-base-url';
import { createHttpClient } from '@/shared/lib/http/http-client';

import type {
  CreatedHrResponsibilityInvitation,
  HrResponsibilityInvitationDetails,
  HrResponsibilityState,
  HrResponsibleUser,
} from '../domain/hr-responsibility';

export const createHrResponsibilityApi = (apiBaseUrl = getApiBaseUrl()) => {
  const httpClient = createHttpClient(apiBaseUrl);

  return {
    getState: (companyId: string) =>
      httpClient.get<HrResponsibilityState>(
        `/companies/${companyId}/hr-responsibility`,
      ),
    assign: async (companyId: string, userId: string) => {
      const response = await httpClient.post(
        `/companies/${companyId}/hr-responsibility`,
        {
          userId,
        },
      );
      return (await response.json()) as HrResponsibleUser;
    },
    createInvitation: async (companyId: string, inviteeEmail: string) => {
      const response = await httpClient.post(
        `/companies/${companyId}/hr-responsibility/invitations`,
        { inviteeEmail },
      );
      return (await response.json()) as CreatedHrResponsibilityInvitation;
    },
    getInvitation: (token: string) =>
      httpClient.get<HrResponsibilityInvitationDetails>(
        `/hr-responsibility/invitations/${token}`,
      ),
    acceptInvitation: async (token: string, password?: string) => {
      await httpClient.post(
        `/hr-responsibility/invitations/${token}/accept`,
        password ? { password } : {},
      );
    },
  };
};
