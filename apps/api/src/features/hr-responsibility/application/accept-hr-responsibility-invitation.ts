import { randomUUID } from 'node:crypto';

import type {
  PasswordHasher,
  SessionTokenService,
} from '../../identity/domain/auth';
import { defaultSessionLifetimeMs } from '../../identity/application/login';
import type { HrResponsibilityGateway } from '../domain/hr-responsibility';
import {
  HrResponsibilityInvitationAlreadyAcceptedError,
  HrResponsibilityInvitationExpiredError,
  HrResponsibilityInvitationNotFoundError,
  HrResponsibilityInvitationPasswordRequiredError,
} from '../domain/hr-responsibility';
import { hashInvitationToken } from '../../../shared/application/invitation-token';

export const createAcceptHrResponsibilityInvitation = ({
  gateway,
  passwordHasher,
  sessionTokenService,
  sessionLifetimeMs = defaultSessionLifetimeMs,
  now = () => new Date(),
  createUserId = randomUUID,
}: {
  gateway: HrResponsibilityGateway;
  passwordHasher: PasswordHasher;
  sessionTokenService: SessionTokenService;
  sessionLifetimeMs?: number;
  now?: () => Date;
  createUserId?: () => string;
}) => {
  return async ({ token, password }: { token: string; password?: string }) => {
    const currentTime = now();
    const invitation = await gateway.findInvitationByTokenHash(
      hashInvitationToken(token),
    );
    if (!invitation) throw new HrResponsibilityInvitationNotFoundError();
    if (invitation.acceptedAt)
      throw new HrResponsibilityInvitationAlreadyAcceptedError();
    if (invitation.expiresAt <= currentTime)
      throw new HrResponsibilityInvitationExpiredError();

    const existingUser = await gateway.findUserByEmail(invitation.inviteeEmail);
    if (!existingUser && (!password || password.length < 8)) {
      throw new HrResponsibilityInvitationPasswordRequiredError();
    }

    const userId = existingUser?.id ?? createUserId();
    const usernameBase = invitation.inviteeEmail.toLowerCase();
    const usernameTaken = existingUser
      ? false
      : (await gateway.findUserByIdentifier(usernameBase)) !== null;
    const username = usernameTaken
      ? `${usernameBase}-${userId.slice(0, 8)}`
      : usernameBase;
    const user = existingUser
      ? null
      : {
          id: userId,
          email: invitation.inviteeEmail,
          username,
          passwordHash: await passwordHasher.hash(password as string),
        };
    const account = existingUser ?? user;
    if (!account) throw new HrResponsibilityInvitationNotFoundError();

    const memberships = existingUser
      ? await gateway.findUserMemberships(existingUser.id)
      : [];
    const ensureCompanyUserMembership = !memberships.some(
      (membership) =>
        membership.companyId === invitation.companyId &&
        membership.role === 'company-user' &&
        membership.divisionId === null &&
        membership.localId === null,
    );
    const session = sessionTokenService.create();
    await gateway.acceptInvitation({
      invitationId: invitation.id,
      acceptedAt: currentTime,
      acceptedByUserId: account.id,
      user,
      session: {
        token: session,
        userId: account.id,
        expiresAt: new Date(currentTime.getTime() + sessionLifetimeMs),
      },
      ensureCompanyUserMembership,
      companyId: invitation.companyId,
    });
    return { token: session };
  };
};
