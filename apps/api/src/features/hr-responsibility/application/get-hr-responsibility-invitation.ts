import type { HrResponsibilityGateway } from '../domain/hr-responsibility';
import {
  HrResponsibilityInvitationAlreadyAcceptedError,
  HrResponsibilityInvitationExpiredError,
  HrResponsibilityInvitationNotFoundError,
} from '../domain/hr-responsibility';
import { hashInvitationToken } from '../../../shared/application/invitation-token';

export const createGetHrResponsibilityInvitation = ({
  gateway,
  now = () => new Date(),
}: {
  gateway: HrResponsibilityGateway;
  now?: () => Date;
}) => {
  return async (token: string) => {
    const invitation = await gateway.getInvitationDetailsByTokenHash(
      hashInvitationToken(token),
      now(),
    );
    if (!invitation) throw new HrResponsibilityInvitationNotFoundError();
    if (invitation.status === 'expired')
      throw new HrResponsibilityInvitationExpiredError();
    if (invitation.status === 'accepted')
      throw new HrResponsibilityInvitationAlreadyAcceptedError();
    return {
      ...invitation,
      userExists:
        (await gateway.findUserByEmail(invitation.inviteeEmail)) !== null,
    };
  };
};
