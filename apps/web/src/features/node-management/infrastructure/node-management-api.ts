import { getApiBaseUrl } from '@/shared/lib/http/api-base-url';
import { createHttpClient } from '@/shared/lib/http/http-client';

import type {
  AcceptNodeManagementInvitationInput,
  CreatedNodeManagementInvitation,
  CreateNodeManagementInvitationInput,
  NodeManagementGateway,
  NodeManagementInvitationDetails,
  NodeResponsibilityRecord,
  PendingNodeManagementInvitation,
} from '../domain/node-management';

export const createNodeManagementApi = (
  apiBaseUrl = getApiBaseUrl(),
): NodeManagementGateway => {
  const httpClient = createHttpClient(apiBaseUrl);

  return {
    listResponsibilities: (companyId: string) =>
      httpClient.get<NodeResponsibilityRecord[]>(
        `/companies/${companyId}/node-management/responsibilities`,
      ),
    listPendingInvitations: (companyId: string) =>
      httpClient.get<PendingNodeManagementInvitation[]>(
        `/companies/${companyId}/node-management/pending-invitations`,
      ),
    createInvitation: async (input: CreateNodeManagementInvitationInput) => {
      const response = await httpClient.post(
        `/companies/${input.companyId}/node-management/invitations`,
        {
          scopeType: input.scopeType,
          scopeId: input.scopeId,
          inviteeEmail: input.inviteeEmail,
        },
      );

      return (await response.json()) as CreatedNodeManagementInvitation;
    },
    getInvitation: (token: string) =>
      httpClient.get<NodeManagementInvitationDetails>(
        `/node-management/invitations/${token}`,
      ),
    acceptInvitation: async (input: AcceptNodeManagementInvitationInput) => {
      await httpClient.post(
        `/node-management/invitations/${input.token}/accept`,
        input.password ? { password: input.password } : {},
      );
    },
  };
};
