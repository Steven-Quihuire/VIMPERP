import { getApiBaseUrl } from '@/shared/lib/http/api-base-url';
import { createHttpClient } from '@/shared/lib/http/http-client';

import type {
  AcceptErpAccessInvitationInput,
  CreateErpAccessInvitationInput,
  PendingErpAccessInvitation,
} from '../domain/erp-access';

export type CreatedErpAccessInvitation = {
  invitationId: string;
  invitationToken: string;
  companyId: string;
  employeeId: string;
  inviteeEmail: string;
  expiresAt: string;
};

export type RevokeErpAccessInput = {
  companyId: string;
  employeeId: string;
};

export type ErpAccessInvitationPage = {
  items: PendingErpAccessInvitation[];
  total: number;
  page: number;
  pageSize: number;
};

export type HrErpAccessApi = {
  listInvitations: (companyId: string) => Promise<PendingErpAccessInvitation[]>;
  listInvitationsPage: (input: {
    companyId: string;
    page: number;
    pageSize: number;
    search?: string;
  }) => Promise<ErpAccessInvitationPage>;
  createInvitation: (
    input: CreateErpAccessInvitationInput,
  ) => Promise<CreatedErpAccessInvitation>;
  revokeAccess: (input: RevokeErpAccessInput) => Promise<void>;
  acceptInvitation: (input: AcceptErpAccessInvitationInput) => Promise<void>;
};

export const createErpAccessApi = (
  apiBaseUrl = getApiBaseUrl(),
): HrErpAccessApi => {
  const httpClient = createHttpClient(apiBaseUrl);

  return {
    listInvitations: (companyId) =>
      httpClient.get<PendingErpAccessInvitation[]>(
        `/companies/${companyId}/hr-erp-access/invitations`,
      ),
    listInvitationsPage: async ({
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
      return httpClient.get<ErpAccessInvitationPage>(
        `/companies/${companyId}/hr-erp-access/invitations?${params.toString()}`,
      );
    },
    createInvitation: async (input) => {
      const response = await httpClient.post(
        `/companies/${input.companyId}/hr-erp-access/invitations`,
        {
          employeeId: input.employeeId,
          inviteeEmail: input.inviteeEmail,
        },
      );

      return (await response.json()) as CreatedErpAccessInvitation;
    },
    revokeAccess: async (input) => {
      await httpClient.post(
        `/companies/${input.companyId}/hr-erp-access/employees/${input.employeeId}/revoke`,
        {},
      );
    },
    acceptInvitation: async (input) => {
      await httpClient.post(
        `/hr-erp-access/invitations/${input.token}/accept`,
        input.password ? { password: input.password } : {},
      );
    },
  };
};
