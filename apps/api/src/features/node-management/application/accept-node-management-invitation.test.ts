import { describe, expect, it } from 'vitest';

import type { PasswordHasher, SessionTokenService } from '../../identity/domain/auth';
import type {
  NodeManagementGateway,
  NodeManagementInvitation,
  NodeManagementMembership,
  NodeResponsibilityRecord,
  NodeResponsibilityState,
  NodeManagementUserAccount,
} from '../domain/node-management';
import {
  NodeManagementInvitationAlreadyAcceptedError,
  NodeManagementInvitationExpiredError,
  NodeManagementInvitationNotFoundError,
  NodeManagementInvitationPasswordRequiredError,
  nodeManagementAssignmentMode,
  nodeManagementBaseMembershipRole,
  nodeManagementRoleKey,
} from '../domain/node-management';
import { createAcceptNodeManagementInvitationUseCase } from './accept-node-management-invitation';
import { hashNodeManagementInvitationToken } from './node-management-invitation-token';

class InMemoryNodeManagementGateway implements NodeManagementGateway {
  invitation: NodeManagementInvitation | null = null;
  userByEmail: NodeManagementUserAccount | null = null;
  memberships: NodeManagementMembership[] = [];
  accepted: {
    invitationId: string;
    acceptedByUserId: string;
    ensureCompanyUserMembership: boolean;
    companyId: string;
    user: {
      id: string;
      email: string;
      username: string;
      passwordHash: string;
    } | null;
    session: { token: string; userId: string; expiresAt: Date };
  } | null = null;

  async listResponsibilitiesByCompany(): Promise<NodeResponsibilityRecord[]> {
    return await Promise.resolve([]);
  }

  async listPendingInvitationsByCompany() {
    return await Promise.resolve([]);
  }

  async getResponsibilityState(): Promise<NodeResponsibilityState | null> {
    return await Promise.resolve(null);
  }

  async findScopeNode() {
    return await Promise.resolve(null);
  }

  async createInvitation(input: {
    id: string;
    companyId: string;
    scopeNodeId: string;
    scopeType: 'company' | 'division' | 'local' | 'area' | 'warehouse' | 'point-of-sale';
    scopeId: string;
    inviteeEmail: string;
    tokenHash: string;
    createdByUserId: string;
    expiresAt: Date;
  }) {
    throw new Error(`not used: ${input.id}`);
  }

  async findInvitationByTokenHash(tokenHash: string) {
    return await Promise.resolve(
      this.invitation?.tokenHash === tokenHash ? this.invitation : null,
    );
  }

  async getInvitationDetailsByTokenHash() {
    return await Promise.resolve(null);
  }

  async findUserByEmail(email: string) {
    return await Promise.resolve(
      this.userByEmail?.email === email.toLowerCase() ? this.userByEmail : null,
    );
  }

  async findUserByIdentifier(identifier: string) {
    return await Promise.resolve(
      this.userByEmail?.email === identifier.toLowerCase() ||
        this.userByEmail?.username === identifier.toLowerCase()
        ? this.userByEmail
        : null,
    );
  }

  async findUserMemberships() {
    return await Promise.resolve(this.memberships);
  }

  async acceptInvitation(input: {
    invitationId: string;
    acceptedAt: Date;
    acceptedByUserId: string;
    user: {
      id: string;
      email: string;
      username: string;
      passwordHash: string;
    } | null;
    session: { token: string; userId: string; expiresAt: Date };
    ensureCompanyUserMembership: boolean;
    companyId: string;
  }) {
    this.accepted = {
      invitationId: input.invitationId,
      acceptedByUserId: input.acceptedByUserId,
      ensureCompanyUserMembership: input.ensureCompanyUserMembership,
      companyId: input.companyId,
      user: input.user,
      session: input.session,
    };
    await Promise.resolve();
  }
}

const passwordHasher: PasswordHasher = {
  hash: async (value) => await Promise.resolve(`hashed:${value}`),
  verify: async () => await Promise.resolve(false),
};

const sessionTokenService: SessionTokenService = {
  create: () => 'session-token',
};

const createInvitation = (overrides: Partial<NodeManagementInvitation> = {}): NodeManagementInvitation => ({
  id: 'inv-1',
  companyId: 'company-1',
  scopeNodeId: 'local:local-1',
  scopeType: 'local',
  scopeId: 'local-1',
  inviteeEmail: 'manager@vimcore.test',
  tokenHash: hashNodeManagementInvitationToken('valid-token'),
  managedRoleKey: nodeManagementRoleKey,
  baseMembershipRole: nodeManagementBaseMembershipRole,
  createdByUserId: 'owner-1',
  createdAt: new Date('2026-08-13T10:00:00.000Z'),
  expiresAt: new Date('2026-08-20T10:00:00.000Z'),
  acceptedAt: null,
  acceptedByUserId: null,
  ...overrides,
});

describe('createAcceptNodeManagementInvitationUseCase', () => {
  it('creates a user, base membership, session, and accepts the invitation', async () => {
    const gateway = new InMemoryNodeManagementGateway();
    gateway.invitation = createInvitation();

    const acceptInvitation = createAcceptNodeManagementInvitationUseCase({
      gateway,
      passwordHasher,
      sessionTokenService,
      now: () => new Date('2026-08-13T12:00:00.000Z'),
      createUserId: () => 'user-1',
    });

    const result = await acceptInvitation({ token: 'valid-token', password: 'secret123' });

    expect(result).toEqual({ token: 'session-token' });
    expect(gateway.accepted).toEqual({
      invitationId: 'inv-1',
      acceptedByUserId: 'user-1',
      ensureCompanyUserMembership: true,
      companyId: 'company-1',
      user: {
        id: 'user-1',
        email: 'manager@vimcore.test',
        username: 'manager@vimcore.test',
        passwordHash: 'hashed:secret123',
      },
      session: {
        token: 'session-token',
        userId: 'user-1',
        expiresAt: new Date('2026-08-13T20:00:00.000Z'),
      },
    });
  });

  it('reuses an existing user and skips base membership creation when already present', async () => {
    const gateway = new InMemoryNodeManagementGateway();
    gateway.invitation = createInvitation();
    gateway.userByEmail = {
      id: 'user-9',
      email: 'manager@vimcore.test',
      username: 'manager',
      passwordHash: 'hashed:existing',
    };
    gateway.memberships = [
      { companyId: 'company-1', role: 'company-user', divisionId: null, localId: null },
    ];

    const acceptInvitation = createAcceptNodeManagementInvitationUseCase({
      gateway,
      passwordHasher,
      sessionTokenService,
      now: () => new Date('2026-08-13T12:00:00.000Z'),
    });

    await acceptInvitation({ token: 'valid-token' });

    expect(gateway.accepted).toMatchObject({
      acceptedByUserId: 'user-9',
      ensureCompanyUserMembership: false,
      user: null,
      session: {
        token: 'session-token',
        userId: 'user-9',
      },
    });
  });

  it('rejects missing invitations, expired invitations, accepted invitations, and missing password for new users', async () => {
    const gateway = new InMemoryNodeManagementGateway();
    const acceptInvitation = createAcceptNodeManagementInvitationUseCase({
      gateway,
      passwordHasher,
      sessionTokenService,
      now: () => new Date('2026-08-13T12:00:00.000Z'),
    });

    await expect(acceptInvitation({ token: 'missing', password: 'secret123' })).rejects.toBeInstanceOf(
      NodeManagementInvitationNotFoundError,
    );

    gateway.invitation = createInvitation({ expiresAt: new Date('2026-08-13T11:59:59.000Z') });
    await expect(acceptInvitation({ token: 'valid-token', password: 'secret123' })).rejects.toBeInstanceOf(
      NodeManagementInvitationExpiredError,
    );

    gateway.invitation = createInvitation({ acceptedAt: new Date('2026-08-13T11:00:00.000Z'), acceptedByUserId: 'user-1' });
    await expect(acceptInvitation({ token: 'valid-token', password: 'secret123' })).rejects.toBeInstanceOf(
      NodeManagementInvitationAlreadyAcceptedError,
    );

    gateway.invitation = createInvitation();
    await expect(acceptInvitation({ token: 'valid-token' })).rejects.toBeInstanceOf(
      NodeManagementInvitationPasswordRequiredError,
    );
  });
});
