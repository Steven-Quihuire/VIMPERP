import type {
  NodeManagementGateway,
  PendingNodeManagementInvitation,
} from '../domain/node-management';

export type ListNodeManagementPendingInvitations = (input: {
  companyId: string;
}) => Promise<PendingNodeManagementInvitation[]>;

export const createListNodeManagementPendingInvitationsUseCase = ({
  gateway,
  now = () => new Date(),
}: {
  gateway: NodeManagementGateway;
  now?: () => Date;
}): ListNodeManagementPendingInvitations => {
  return async ({ companyId }) => {
    return await gateway.listPendingInvitationsByCompany(companyId, now());
  };
};
