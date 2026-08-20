import type {
  ErpAccessGateway,
  PendingErpAccessInvitation,
} from '../domain/erp-access-invitations';

export type ErpAccessInvitationPage = {
  items: PendingErpAccessInvitation[];
  total: number;
  page: number;
  pageSize: number;
};

export type ListErpAccessInvitationsFilters = {
  page: number;
  pageSize: number;
  search?: string | undefined;
};

export const createListErpAccessInvitationsPageUseCase = ({
  gateway,
  now = () => new Date(),
}: {
  gateway: ErpAccessGateway;
  now?: () => Date;
}) => {
  return async (input: {
    companyId: string;
    auth?: unknown;
    filters?: ListErpAccessInvitationsFilters;
  }): Promise<PendingErpAccessInvitation[] | ErpAccessInvitationPage> => {
    const all = await gateway.listPendingInvitationsByCompany(input.companyId, now());

    if (!input.filters) {
      return all;
    }

    const normalizedSearch = input.filters.search?.trim().toLowerCase();
    const filtered = normalizedSearch
      ? all.filter(
          (invitation) =>
            invitation.inviteeEmail.toLowerCase().includes(normalizedSearch) ||
            invitation.employeeId.toLowerCase().includes(normalizedSearch) ||
            invitation.id.toLowerCase().includes(normalizedSearch),
        )
      : all;
    const first = (input.filters.page - 1) * input.filters.pageSize;

    return {
      items: filtered.slice(first, first + input.filters.pageSize),
      total: filtered.length,
      page: input.filters.page,
      pageSize: input.filters.pageSize,
    };
  };
};
