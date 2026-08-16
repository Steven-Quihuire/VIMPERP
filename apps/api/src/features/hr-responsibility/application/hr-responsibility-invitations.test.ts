import { describe, expect, it } from 'vitest';

import type {
  PasswordHasher,
  SessionTokenService,
} from '../../identity/domain/auth';
import type {
  HrResponsibilityGateway,
  HrResponsibleUser,
  HrResponsibilityInvitation,
} from '../domain/hr-responsibility';
import {
  HrResponsibleAlreadyAssignedError,
  HrResponsibilityInvitationDuplicateError,
} from '../domain/hr-responsibility';
import { createAcceptHrResponsibilityInvitation } from './accept-hr-responsibility-invitation';
import { createHrResponsibilityInvitation } from './create-hr-responsibility-invitation';

const invitation: HrResponsibilityInvitation = {
  id: 'inv-1',
  companyId: 'company-1',
  inviteeEmail: 'external@example.com',
  tokenHash: 'hash',
  purpose: 'hr-responsible',
  roleKey: 'hr-responsible',
  createdByUserId: 'owner-1',
  createdAt: new Date('2026-08-14T12:00:00Z'),
  expiresAt: new Date('2026-08-21T12:00:00Z'),
  acceptedAt: null,
  acceptedByUserId: null,
};

const user = (id = 'user-1'): HrResponsibleUser => ({
  userId: id,
  email: 'external@example.com',
  username: 'external@example.com',
});

const createGateway = (overrides: Partial<HrResponsibilityGateway> = {}) =>
  ({
    listCompanyUsers: () => [],
    listResponsibilities: () => [],
    assignResponsibility: () => user(),
    findCompany: () => ({ id: 'company-1', name: 'Acme' }),
    findActiveInvitation: () => null,
    createInvitation: () => invitation,
    listPendingInvitations: () => [],
    findInvitationByTokenHash: () => invitation,
    getInvitationDetailsByTokenHash: () => null,
    findUserByEmail: () => null,
    findUserByIdentifier: () => null,
    findUserMemberships: () => [],
    acceptInvitation: () => Promise.resolve(undefined),
    ...overrides,
  }) as HrResponsibilityGateway;

const passwordHasher: PasswordHasher = {
  hash: (value) => Promise.resolve(`hashed:${value}`),
  verify: () => Promise.resolve(true),
};

const sessionTokenService: SessionTokenService = { create: () => 'session-1' };

describe('HR responsibility invitations', () => {
  it('creates a company-bound HR invitation and sends its purpose', async () => {
    let createdInput: Record<string, unknown> | undefined;
    let emailInput: Record<string, unknown> | undefined;
    const gateway = createGateway({
      createInvitation: (input) => {
        createdInput = input;
        return Promise.resolve(invitation);
      },
    });
    const useCase = createHrResponsibilityInvitation({
      gateway,
      createToken: () => 'token-1',
      emailSender: {
        sendInvitationEmail: (input) => {
          emailInput = input;
          return Promise.resolve({ status: 'sent' });
        },
      },
      buildInvitationLink: (token) =>
        `https://app.test/hr-responsibility/accept/${token}`,
      now: () => new Date('2026-08-14T12:00:00Z'),
    });

    await expect(
      useCase({
        companyId: 'company-1',
        inviteeEmail: ' External@Example.com ',
        createdByUserId: 'owner-1',
      }),
    ).resolves.toMatchObject({
      companyId: 'company-1',
      inviteeEmail: 'external@example.com',
    });
    expect(createdInput).toMatchObject({
      companyId: 'company-1',
      inviteeEmail: 'external@example.com',
    });
    expect(emailInput).toMatchObject({
      inviteeEmail: 'external@example.com',
      subject: 'Invitación como responsable de RRHH en Acme',
    });
  });

  it('rejects an active duplicate invitation and an already responsible user', async () => {
    await expect(
      createHrResponsibilityInvitation({
        gateway: createGateway({
          findActiveInvitation: () => Promise.resolve(invitation),
        }),
        emailSender: { sendInvitationEmail: () => Promise.resolve({ status: 'sent' }) },
        buildInvitationLink: (token) => token,
      })({
        companyId: 'company-1',
        inviteeEmail: invitation.inviteeEmail,
        createdByUserId: 'owner-1',
      }),
    ).rejects.toBeInstanceOf(HrResponsibilityInvitationDuplicateError);

    await expect(
      createHrResponsibilityInvitation({
        gateway: createGateway({
          findUserByEmail: () => Promise.resolve({
            id: 'user-1',
            email: invitation.inviteeEmail,
            username: 'external',
            passwordHash: 'hash',
          }),
          listResponsibilities: () => Promise.resolve([user()]),
        }),
        emailSender: { sendInvitationEmail: () => Promise.resolve({ status: 'sent' }) },
        buildInvitationLink: (token) => token,
      })({
        companyId: 'company-1',
        inviteeEmail: invitation.inviteeEmail,
        createdByUserId: 'owner-1',
      }),
    ).rejects.toBeInstanceOf(HrResponsibleAlreadyAssignedError);
  });

  it('accepts an external user with the invitation company, membership, and session only then', async () => {
    let acceptedInput: Record<string, unknown> | undefined;
    const useCase = createAcceptHrResponsibilityInvitation({
      gateway: createGateway({
        acceptInvitation: (input) => {
          acceptedInput = input;
        
    return Promise.resolve();},
      }),
      passwordHasher,
      sessionTokenService,
      now: () => new Date('2026-08-14T12:00:00Z'),
      createUserId: () => 'new-user-1',
    });

    await expect(
      useCase({ token: 'token-1', password: 'secret123' }),
    ).resolves.toEqual({ token: 'session-1' });
    expect(acceptedInput).toMatchObject({
      invitationId: 'inv-1',
      companyId: 'company-1',
      acceptedByUserId: 'new-user-1',
      ensureCompanyUserMembership: true,
    });
  });
});
