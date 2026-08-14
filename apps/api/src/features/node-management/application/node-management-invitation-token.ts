import {
  createInvitationToken,
  hashInvitationToken,
} from '../../../shared/application/invitation-token';

export const hashNodeManagementInvitationToken = hashInvitationToken;
export const createNodeManagementInvitationToken = createInvitationToken;
