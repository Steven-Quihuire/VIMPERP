import { randomUUID } from 'node:crypto';

import type { PasswordHasher, SessionTokenService } from '../../identity/domain/auth';
import type { NodeManagementGateway } from '../domain/node-management';
import {
  NodeManagementInvitationAlreadyAcceptedError,
  NodeManagementInvitationExpiredError,
  NodeManagementInvitationNotFoundError,
  NodeManagementInvitationPasswordRequiredError,
} from '../domain/node-management';
import { hashNodeManagementInvitationToken } from './node-management-invitation-token';
import { defaultSessionLifetimeMs } from '../../identity/application/login';

const createUsernameBase = (email: string) => {
  return email.trim().toLowerCase();
};

type AcceptNodeManagementInvitationInput = {
  token: string;
  password?: string;
};

export const createAcceptNodeManagementInvitationUseCase = ({
  gateway,
  passwordHasher,
  sessionTokenService,
  sessionLifetimeMs = defaultSessionLifetimeMs,
  now = () => new Date(),
  createUserId = randomUUID,
}: {
  gateway: NodeManagementGateway;
  passwordHasher: PasswordHasher;
  sessionTokenService: SessionTokenService;
  sessionLifetimeMs?: number;
  now?: () => Date;
  createUserId?: () => string;
}) => {
  return async (input: AcceptNodeManagementInvitationInput) => {
    const currentTime = now();
    const tokenHash = hashNodeManagementInvitationToken(input.token);
    const invitation = await gateway.findInvitationByTokenHash(tokenHash);

    if (!invitation) {
      throw new NodeManagementInvitationNotFoundError();
    }

    if (invitation.acceptedAt) {
      throw new NodeManagementInvitationAlreadyAcceptedError();
    }

    if (invitation.expiresAt <= currentTime) {
      throw new NodeManagementInvitationExpiredError();
    }

    const existingUser = await gateway.findUserByEmail(invitation.inviteeEmail);

    if (!existingUser && (!input.password || input.password.length < 8)) {
      throw new NodeManagementInvitationPasswordRequiredError();
    }

    const userId = existingUser?.id ?? createUserId();
    const usernameBase = createUsernameBase(invitation.inviteeEmail);
    const usernameTaken = existingUser
      ? false
      : (await gateway.findUserByIdentifier(usernameBase)) !== null;
    const username = usernameTaken ? `${usernameBase}-${userId.slice(0, 8)}` : usernameBase;
    const user = existingUser
      ? null
      : {
          id: userId,
          email: invitation.inviteeEmail,
          username,
          passwordHash: await passwordHasher.hash(input.password as string),
        };
    const token = sessionTokenService.create();

    const account = existingUser ?? user;

    if (!account) {
      throw new NodeManagementInvitationNotFoundError();
    }

    const currentMemberships = existingUser
      ? await gateway.findUserMemberships(existingUser.id)
      : [];
    const ensureCompanyUserMembership = !currentMemberships.some(
      (membership) =>
        membership.companyId === invitation.companyId &&
        membership.role === 'company-user' &&
        membership.divisionId === null &&
        membership.localId === null,
    );

    await gateway.acceptInvitation({
      invitationId: invitation.id,
      acceptedAt: currentTime,
      acceptedByUserId: account.id,
      user,
      session: {
        token,
        userId: account.id,
        expiresAt: new Date(currentTime.getTime() + sessionLifetimeMs),
      },
      ensureCompanyUserMembership,
      companyId: invitation.companyId,
    });

    return { token };
  };
};
