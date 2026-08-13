import type { NodeManagementGateway } from '../domain/node-management';
import {
  NodeManagementInvitationAlreadyAcceptedError,
  NodeManagementInvitationExpiredError,
  NodeManagementInvitationNotFoundError,
} from '../domain/node-management';
import { hashNodeManagementInvitationToken } from './node-management-invitation-token';

export const createGetNodeManagementInvitationUseCase = ({
  gateway,
  now = () => new Date(),
}: {
  gateway: NodeManagementGateway;
  now?: () => Date;
}) => {
  return async (token: string) => {
    const tokenHash = hashNodeManagementInvitationToken(token);
    const invitation = await gateway.getInvitationDetailsByTokenHash(tokenHash, now());

    if (!invitation) {
      throw new NodeManagementInvitationNotFoundError();
    }

    if (invitation.status === 'accepted') {
      throw new NodeManagementInvitationAlreadyAcceptedError();
    }

    if (invitation.status === 'expired') {
      throw new NodeManagementInvitationExpiredError();
    }

    const existingUser = await gateway.findUserByEmail(invitation.inviteeEmail);

    return {
      ...invitation,
      userExists: existingUser !== null,
    };
  };
};
