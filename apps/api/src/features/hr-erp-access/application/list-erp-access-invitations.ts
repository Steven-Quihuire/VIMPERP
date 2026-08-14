import type { ErpAccessGateway } from '../domain/erp-access-invitations';

export const createListErpAccessInvitationsUseCase = ({
  gateway,
  now = () => new Date(),
}: {
  gateway: ErpAccessGateway;
  now?: () => Date;
}) => {
  return async (input: { companyId: string }) => {
    return await gateway.listPendingInvitationsByCompany(input.companyId, now());
  };
};
