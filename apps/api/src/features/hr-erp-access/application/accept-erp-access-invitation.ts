import { randomUUID } from 'node:crypto';

import type { PasswordHasher, SessionTokenService } from '../../identity/domain/auth';
import { defaultSessionLifetimeMs } from '../../identity/application/login';
import { EmployeeNotFoundError } from '../../hr-employees/domain/employees';
import type { ErpAccessGateway } from '../domain/erp-access-invitations';
import {
  ErpAccessInvitationAlreadyAcceptedError,
  ErpAccessInvitationExpiredError,
  ErpAccessInvitationNotFoundError,
  ErpAccessInvitationPasswordRequiredError,
} from '../domain/erp-access-invitations';
import {
  assertNoAmbiguousActiveErpAccessLink,
} from '../domain/erp-access-links';
import { hashErpAccessInvitationToken } from './erp-access-invitation-token';

const createUsernameBase = (email: string) => {
  return email.trim().toLowerCase();
};

export const createAcceptErpAccessInvitationUseCase = ({
  gateway,
  passwordHasher,
  sessionTokenService,
  sessionLifetimeMs = defaultSessionLifetimeMs,
  now = () => new Date(),
  createUserId = randomUUID,
}: {
  gateway: ErpAccessGateway;
  passwordHasher: PasswordHasher;
  sessionTokenService: SessionTokenService;
  sessionLifetimeMs?: number;
  now?: () => Date;
  createUserId?: () => string;
}) => {
  return async (input: { token: string; password?: string }) => {
    const currentTime = now();
    const tokenHash = hashErpAccessInvitationToken(input.token);
    const invitation = await gateway.findInvitationByTokenHash(tokenHash);

    if (!invitation) {
      throw new ErpAccessInvitationNotFoundError();
    }

    if (invitation.acceptedAt) {
      throw new ErpAccessInvitationAlreadyAcceptedError();
    }

    if (invitation.expiresAt <= currentTime) {
      throw new ErpAccessInvitationExpiredError();
    }

    const employee = await gateway.getEmployeeById(invitation.companyId, invitation.employeeId);

    if (!employee) {
      throw new EmployeeNotFoundError();
    }

    const existingUser = await gateway.findUserByEmail(invitation.inviteeEmail);

    if (!existingUser && (!input.password || input.password.length < 8)) {
      throw new ErpAccessInvitationPasswordRequiredError();
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
    const account = existingUser ?? user;

    if (!account) {
      throw new ErpAccessInvitationNotFoundError();
    }

    const [activeEmployeeLink, activeUserLink] = await Promise.all([
      gateway.getActiveLinkByEmployeeId(invitation.companyId, invitation.employeeId),
      gateway.getActiveLinkByUserId(invitation.companyId, account.id),
    ]);

    assertNoAmbiguousActiveErpAccessLink({
      employeeId: invitation.employeeId,
      userId: account.id,
      activeEmployeeLink,
      activeUserLink,
    });

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

    const token = sessionTokenService.create();

    await gateway.acceptInvitation({
      invitationId: invitation.id,
      acceptedAt: currentTime,
      acceptedByUserId: account.id,
      employeeId: invitation.employeeId,
      companyId: invitation.companyId,
      user,
      session: {
        token,
        userId: account.id,
        expiresAt: new Date(currentTime.getTime() + sessionLifetimeMs),
      },
      ensureCompanyUserMembership,
    });

    return { token };
  };
};
