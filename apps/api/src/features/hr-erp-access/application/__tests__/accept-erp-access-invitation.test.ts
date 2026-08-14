import { describe, expect, it } from 'vitest';

import type { PasswordHasher, SessionTokenService } from '../../../identity/domain/auth';
import type { Employee } from '../../../hr-employees/domain/employees';
import type { ErpAccessLink } from '../../domain/erp-access-links';
import type {
  ErpAccessGateway,
  ErpAccessInvitation,
  ErpAccessMembership,
  ErpAccessUserAccount,
  PendingErpAccessInvitation,
} from '../../domain/erp-access-invitations';
import {
  ErpAccessInvitationExpiredError,
  ErpAccessInvitationPasswordRequiredError,
} from '../../domain/erp-access-invitations';
import { ErpAccessLinkConflictError } from '../../domain/erp-access-links';
import { createAcceptErpAccessInvitationUseCase } from '../accept-erp-access-invitation';
import { createCreateErpAccessInvitationUseCase } from '../create-erp-access-invitation';
import { createListErpAccessInvitationsUseCase } from '../list-erp-access-invitations';
import { createRevokeErpAccessInvitationUseCase } from '../revoke-erp-access-invitation';
import { hashErpAccessInvitationToken } from '../erp-access-invitation-token';

class InMemoryErpAccessGateway implements ErpAccessGateway {
  employees: Employee[] = [];
  invitations: ErpAccessInvitation[] = [];
  userByEmail: ErpAccessUserAccount | null = null;
  memberships: ErpAccessMembership[] = [];
  activeLinkByEmployeeId: ErpAccessLink | null = null;
  activeLinkByUserId: ErpAccessLink | null = null;
  acceptedInput: Parameters<ErpAccessGateway['acceptInvitation']>[0] | null = null;
  revokedInput: Parameters<ErpAccessGateway['revokeAccess']>[0] | null = null;

  async getEmployeeById(companyId: string, employeeId: string) {
    return await Promise.resolve(
      this.employees.find(
        (employee) => employee.companyId === companyId && employee.id === employeeId,
      ) ?? null,
    );
  }

  async createInvitation(input: Parameters<ErpAccessGateway['createInvitation']>[0]) {
    const invitation: ErpAccessInvitation = {
      ...input,
      createdAt: new Date('2026-08-13T12:00:00.000Z'),
      acceptedAt: null,
      acceptedByUserId: null,
    };
    this.invitations.push(invitation);
    return await Promise.resolve(invitation);
  }

  async listPendingInvitationsByCompany(companyId: string, now: Date) {
    return await Promise.resolve(
      this.invitations
        .filter(
          (invitation) =>
            invitation.companyId === companyId &&
            invitation.acceptedAt === null &&
            invitation.expiresAt > now,
        )
        .map<PendingErpAccessInvitation>((invitation) => ({
          id: invitation.id,
          companyId: invitation.companyId,
          employeeId: invitation.employeeId,
          inviteeEmail: invitation.inviteeEmail,
          createdAt: invitation.createdAt,
          expiresAt: invitation.expiresAt,
        })),
    );
  }

  async findInvitationByTokenHash(tokenHash: string) {
    return await Promise.resolve(
      this.invitations.find((invitation) => invitation.tokenHash === tokenHash) ?? null,
    );
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

  async getActiveLinkByEmployeeId() {
    return await Promise.resolve(this.activeLinkByEmployeeId);
  }

  async getActiveLinkByUserId() {
    return await Promise.resolve(this.activeLinkByUserId);
  }

  async acceptInvitation(input: Parameters<ErpAccessGateway['acceptInvitation']>[0]) {
    this.acceptedInput = input;
    const invitation = this.invitations.find((candidate) => candidate.id === input.invitationId);
    if (invitation) {
      invitation.acceptedAt = input.acceptedAt;
      invitation.acceptedByUserId = input.acceptedByUserId;
    }
    this.activeLinkByEmployeeId = {
      id: 'link-1',
      companyId: input.companyId,
      employeeId: input.employeeId,
      userId: input.acceptedByUserId,
      isActive: true,
      createdAt: input.acceptedAt,
      revokedAt: null,
    };
    this.activeLinkByUserId = this.activeLinkByEmployeeId;
    await Promise.resolve();
  }

  async revokeAccess(input: Parameters<ErpAccessGateway['revokeAccess']>[0]) {
    this.revokedInput = input;
    if (this.activeLinkByEmployeeId?.employeeId === input.employeeId) {
      this.activeLinkByEmployeeId = {
        ...this.activeLinkByEmployeeId,
        isActive: false,
        revokedAt: input.revokedAt,
      };
    }
    if (this.activeLinkByUserId?.employeeId === input.employeeId) {
      this.activeLinkByUserId = {
        ...this.activeLinkByUserId,
        isActive: false,
        revokedAt: input.revokedAt,
      };
    }
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

describe('hr-erp-access application', () => {
  it('creates an invitation for an existing employee and lists the pending invitation', async () => {
    const gateway = new InMemoryErpAccessGateway();
    gateway.employees = [
      {
        id: 'employee-1',
        companyId: 'company-1',
        createdAt: new Date('2026-08-13T10:00:00.000Z'),
      },
    ];

    const createInvitation = createCreateErpAccessInvitationUseCase({
      gateway,
      now: () => new Date('2026-08-13T12:00:00.000Z'),
      createId: () => 'inv-1',
      createToken: () => 'token-1',
    });
    const listInvitations = createListErpAccessInvitationsUseCase({
      gateway,
      now: () => new Date('2026-08-13T12:00:00.000Z'),
    });

    const createdInvitation = await createInvitation({
      companyId: 'company-1',
      employeeId: 'employee-1',
      inviteeEmail: 'New.User@Vimcore.Test',
      createdByUserId: 'owner-1',
    });

    expect(createdInvitation).toMatchObject({
      invitationId: 'inv-1',
      invitationToken: 'token-1',
      companyId: 'company-1',
      employeeId: 'employee-1',
      inviteeEmail: 'new.user@vimcore.test',
    });
    expect(gateway.invitations[0]).toMatchObject({
      tokenHash: hashErpAccessInvitationToken('token-1'),
    });

    await expect(listInvitations({ companyId: 'company-1' })).resolves.toEqual([
      expect.objectContaining({ id: 'inv-1', employeeId: 'employee-1' }),
    ]);
  });

  it('accepts a pending invitation with a new session and rejects expired invitations', async () => {
    const gateway = new InMemoryErpAccessGateway();
    gateway.employees = [
      {
        id: 'employee-1',
        companyId: 'company-1',
        createdAt: new Date('2026-08-13T10:00:00.000Z'),
      },
    ];
    gateway.invitations = [
      {
        id: 'inv-1',
        companyId: 'company-1',
        employeeId: 'employee-1',
        inviteeEmail: 'new.user@vimcore.test',
        tokenHash: hashErpAccessInvitationToken('valid-token'),
        createdByUserId: 'owner-1',
        createdAt: new Date('2026-08-13T10:00:00.000Z'),
        expiresAt: new Date('2026-08-20T10:00:00.000Z'),
        acceptedAt: null,
        acceptedByUserId: null,
      },
      {
        id: 'inv-2',
        companyId: 'company-1',
        employeeId: 'employee-1',
        inviteeEmail: 'expired.user@vimcore.test',
        tokenHash: hashErpAccessInvitationToken('expired-token'),
        createdByUserId: 'owner-1',
        createdAt: new Date('2026-08-13T10:00:00.000Z'),
        expiresAt: new Date('2026-08-13T11:59:59.000Z'),
        acceptedAt: null,
        acceptedByUserId: null,
      },
    ];

    const acceptInvitation = createAcceptErpAccessInvitationUseCase({
      gateway,
      passwordHasher,
      sessionTokenService,
      now: () => new Date('2026-08-13T12:00:00.000Z'),
      createUserId: () => 'user-1',
    });

    await expect(acceptInvitation({ token: 'valid-token', password: 'secret123' })).resolves.toEqual(
      { token: 'session-token' },
    );
    expect(gateway.acceptedInput).toMatchObject({
      invitationId: 'inv-1',
      acceptedByUserId: 'user-1',
      employeeId: 'employee-1',
      companyId: 'company-1',
      ensureCompanyUserMembership: true,
      session: { token: 'session-token', userId: 'user-1' },
      user: {
        id: 'user-1',
        email: 'new.user@vimcore.test',
        username: 'new.user@vimcore.test',
        passwordHash: 'hashed:secret123',
      },
    });

    await expect(
      acceptInvitation({ token: 'expired-token', password: 'secret123' }),
    ).rejects.toBeInstanceOf(ErpAccessInvitationExpiredError);
  });

  it('rejects accepting a new-user invitation without a password and rejects ambiguous active links', async () => {
    const gateway = new InMemoryErpAccessGateway();
    gateway.employees = [
      {
        id: 'employee-1',
        companyId: 'company-1',
        createdAt: new Date('2026-08-13T10:00:00.000Z'),
      },
    ];
    gateway.invitations = [
      {
        id: 'inv-1',
        companyId: 'company-1',
        employeeId: 'employee-1',
        inviteeEmail: 'new.user@vimcore.test',
        tokenHash: hashErpAccessInvitationToken('valid-token'),
        createdByUserId: 'owner-1',
        createdAt: new Date('2026-08-13T10:00:00.000Z'),
        expiresAt: new Date('2026-08-20T10:00:00.000Z'),
        acceptedAt: null,
        acceptedByUserId: null,
      },
    ];

    const acceptInvitation = createAcceptErpAccessInvitationUseCase({
      gateway,
      passwordHasher,
      sessionTokenService,
      now: () => new Date('2026-08-13T12:00:00.000Z'),
      createUserId: () => 'user-1',
    });

    await expect(acceptInvitation({ token: 'valid-token' })).rejects.toBeInstanceOf(
      ErpAccessInvitationPasswordRequiredError,
    );

    gateway.userByEmail = {
      id: 'user-9',
      email: 'new.user@vimcore.test',
      username: 'new.user',
      passwordHash: 'hashed:existing',
    };
    gateway.activeLinkByUserId = {
      id: 'link-9',
      companyId: 'company-1',
      employeeId: 'employee-2',
      userId: 'user-9',
      isActive: true,
      createdAt: new Date('2026-08-13T10:00:00.000Z'),
      revokedAt: null,
    };

    await expect(acceptInvitation({ token: 'valid-token' })).rejects.toBeInstanceOf(
      ErpAccessLinkConflictError,
    );
  });

  it('revokes active access without deleting the employee identity', async () => {
    const gateway = new InMemoryErpAccessGateway();
    gateway.activeLinkByEmployeeId = {
      id: 'link-1',
      companyId: 'company-1',
      employeeId: 'employee-1',
      userId: 'user-1',
      isActive: true,
      createdAt: new Date('2026-08-13T10:00:00.000Z'),
      revokedAt: null,
    };

    const revokeAccess = createRevokeErpAccessInvitationUseCase({
      gateway,
      now: () => new Date('2026-08-13T12:00:00.000Z'),
    });

    await expect(
      revokeAccess({ companyId: 'company-1', employeeId: 'employee-1' }),
    ).resolves.toBeUndefined();
    expect(gateway.revokedInput).toMatchObject({
      companyId: 'company-1',
      employeeId: 'employee-1',
    });
    expect(gateway.activeLinkByEmployeeId).toMatchObject({
      employeeId: 'employee-1',
      isActive: false,
      revokedAt: new Date('2026-08-13T12:00:00.000Z'),
    });
  });
});
