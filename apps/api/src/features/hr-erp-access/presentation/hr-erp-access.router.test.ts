import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../../../app/create-app';
import type { AdminGateway } from '../../admin/domain/admin';
import type {
  AuthIdentityGateway,
  AuthMembership,
  AuthSessionRecord,
  AuthUser,
  PasswordHasher,
  SessionTokenService,
} from '../../identity/domain/auth';
import { createInMemoryScopeResolver } from '../../../shared/infrastructure/scope-hierarchy/scope-hierarchy.port';
import type { Employee } from '../../hr-employees/domain/employees';
import type { ErpAccessLink } from '../domain/erp-access-links';
import type {
  ErpAccessGateway,
  ErpAccessInvitation,
  ErpAccessMembership,
  ErpAccessUserAccount,
  PendingErpAccessInvitation,
} from '../domain/erp-access-invitations';
import { hashErpAccessInvitationToken } from '../application/erp-access-invitation-token';

class InMemoryAuthGateway implements AuthIdentityGateway {
  private usersById = new Map<string, AuthUser>();
  private usersByIdentifier = new Map<string, AuthUser>();
  private sessions = new Map<string, AuthSessionRecord>();
  private membershipsByUserId = new Map<string, AuthMembership[]>();
  private activeCompanyByUserId = new Map<string, string | null>();

  addUser(user: AuthUser) {
    this.usersById.set(user.id, user);
    this.usersByIdentifier.set(user.email.toLowerCase(), user);
    this.usersByIdentifier.set(user.username.toLowerCase(), user);
  }

  setMemberships(userId: string, memberships: AuthMembership[]) {
    this.membershipsByUserId.set(userId, memberships);
  }

  async findUserByIdentifier(identifier: string) {
    return await Promise.resolve(this.usersByIdentifier.get(identifier.toLowerCase()) ?? null);
  }
  async findUserById(userId: string) {
    return await Promise.resolve(this.usersById.get(userId) ?? null);
  }
  async createUser(user: AuthUser) {
    this.addUser(user);
    await Promise.resolve();
  }
  async createUserWithSession(user: AuthUser, session: AuthSessionRecord) {
    this.addUser(user);
    this.sessions.set(session.token, session);
    await Promise.resolve();
  }
  async createSession(session: AuthSessionRecord) {
    this.sessions.set(session.token, session);
    await Promise.resolve();
  }
  async findSession(token: string) {
    return await Promise.resolve(this.sessions.get(token) ?? null);
  }
  async deleteSession(token: string) {
    this.sessions.delete(token);
    await Promise.resolve();
  }
  async listMemberships(userId: string) {
    return await Promise.resolve(this.membershipsByUserId.get(userId) ?? []);
  }
  async findActiveCompanyId(userId: string) {
    return await Promise.resolve(this.activeCompanyByUserId.get(userId) ?? null);
  }
  async findCompanyStatus() {
    return await Promise.resolve('active' as const);
  }
  async setActiveCompanyId(userId: string, companyId: string) {
    this.activeCompanyByUserId.set(userId, companyId);
    await Promise.resolve();
  }
  async findActiveScopeNodeId() {
    return await Promise.resolve('company:company-1');
  }
  async setActiveScopeNodeId() {
    await Promise.resolve();
  }
  async findActiveLocalId() {
    return await Promise.resolve(null);
  }
  async setActiveLocalId() {
    await Promise.resolve();
  }
  async findLocalCompanyById() {
    return await Promise.resolve('company-1');
  }
  async countRecentActiveCompanySwitches() {
    return await Promise.resolve(0);
  }
  async recordActiveCompanySwitch() {
    await Promise.resolve();
  }
}

class InMemoryErpAccessGateway implements ErpAccessGateway {
  employees: Employee[] = [];
  invitations: ErpAccessInvitation[] = [];
  users: ErpAccessUserAccount[] = [];
  memberships: ErpAccessMembership[] = [];
  activeLinks: ErpAccessLink[] = [];

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
      this.users.find((user) => user.email === email.toLowerCase()) ?? null,
    );
  }

  async findUserByIdentifier(identifier: string) {
    const normalizedIdentifier = identifier.toLowerCase();
    return await Promise.resolve(
      this.users.find(
        (user) =>
          user.email === normalizedIdentifier || user.username === normalizedIdentifier,
      ) ?? null,
    );
  }

  async findUserMemberships(userId: string) {
    return await Promise.resolve(
      this.memberships.filter((membership) => membership.userId === userId),
    );
  }

  async getActiveLinkByEmployeeId(companyId: string, employeeId: string) {
    return await Promise.resolve(
      this.activeLinks.find(
        (link) =>
          link.companyId === companyId && link.employeeId === employeeId && link.isActive,
      ) ?? null,
    );
  }

  async getActiveLinkByUserId(companyId: string, userId: string) {
    return await Promise.resolve(
      this.activeLinks.find(
        (link) => link.companyId === companyId && link.userId === userId && link.isActive,
      ) ?? null,
    );
  }

  async acceptInvitation(input: Parameters<ErpAccessGateway['acceptInvitation']>[0]) {
    const invitation = this.invitations.find((candidate) => candidate.id === input.invitationId);
    if (input.user) {
      this.users.push(input.user);
    }
    if (
      input.ensureCompanyUserMembership &&
      !this.memberships.some(
        (membership) =>
          membership.userId === input.acceptedByUserId &&
          membership.companyId === input.companyId &&
          membership.role === 'company-user',
      )
    ) {
      this.memberships.push({
        userId: input.acceptedByUserId,
        companyId: input.companyId,
        role: 'company-user',
        divisionId: null,
        localId: null,
      });
    }
    if (invitation) {
      invitation.acceptedAt = input.acceptedAt;
      invitation.acceptedByUserId = input.acceptedByUserId;
    }

    const existingLinkIndex = this.activeLinks.findIndex(
      (link) =>
        link.companyId === input.companyId &&
        link.employeeId === input.employeeId &&
        link.userId === input.acceptedByUserId &&
        link.isActive,
    );

    if (existingLinkIndex === -1) {
      this.activeLinks.push({
        id: `link-${this.activeLinks.length + 1}`,
        companyId: input.companyId,
        employeeId: input.employeeId,
        userId: input.acceptedByUserId,
        isActive: true,
        createdAt: input.acceptedAt,
        revokedAt: null,
      });
    }

    await Promise.resolve();
  }

  async revokeAccess(input: Parameters<ErpAccessGateway['revokeAccess']>[0]) {
    const link = this.activeLinks.find(
      (candidate) =>
        candidate.companyId === input.companyId &&
        candidate.employeeId === input.employeeId &&
        candidate.isActive,
    );
    if (link) {
      link.isActive = false;
      link.revokedAt = input.revokedAt;
    }
    await Promise.resolve();
  }
}

const adminGateway: AdminGateway = {
  getCompanySummary: async () => await Promise.resolve({ totalCompanies: 0, notificationCount: 0, auditEventCount: 0, companies: [] }),
  listNotifications: async () => await Promise.resolve([]),
  listNotificationsForCompanyRole: async () => await Promise.resolve([]),
  listProvisioningRuns: async () => await Promise.resolve({ items: [], nextCursor: null }),
  getProvisioningRun: async () => await Promise.resolve({ id: 'run-1', correlationId: 'corr-1', requestId: 'req-1', actorUserId: 'user-1', companyName: 'Vimcore Labs', process: 'company-onboarding', status: 'succeeded', attempt: 1, idempotencyKey: null, errorSummary: null, createdAt: '2026-07-28T10:00:00.000Z', updatedAt: '2026-07-28T10:01:00.000Z', steps: [] }),
  listApplicationErrors: async () => await Promise.resolve({ items: [], nextCursor: null }),
  getApplicationError: async () => await Promise.resolve({ id: 'error-1', correlationId: 'corr-1', requestId: 'req-1', fingerprint: 'fingerprint-1', status: '500', code: 'INTERNAL_SERVER_ERROR', message: 'Unexpected server error', stack: null, context: null, createdAt: '2026-07-28T10:00:00.000Z' }),
  listAuditEvents: async () => await Promise.resolve({ items: [], nextCursor: null }),
  getAuditEvent: async () => await Promise.resolve({ id: 'audit-1', actorUserId: 'user-1', companyId: 'company-1', type: 'company.created', correlationId: 'corr-1', entityType: 'company', entityId: 'company-1', details: {}, oldValues: null, newValues: null, createdAt: '2026-07-28T10:00:00.000Z' }),
};

const passwordHasher: PasswordHasher = {
  hash: async (value) => await Promise.resolve(`hashed:${value}`),
  verify: async (hash, value) => await Promise.resolve(hash === `hashed:${value}`),
};

const sessionTokenService: SessionTokenService = {
  create: () => 'session-token',
};

const getSessionCookie = (headers: string | string[] | undefined): string => {
  const cookieHeaders = Array.isArray(headers) ? headers : headers ? [headers] : [];
  const [sessionCookie] = cookieHeaders;
  if (!sessionCookie) throw new Error('missing session cookie');
  const [cookieValue] = sessionCookie.split(';');
  if (!cookieValue) throw new Error('missing session cookie');
  return cookieValue;
};

describe('hr erp access routes', () => {
  it('creates, lists, accepts, and revokes ERP access invitations', async () => {
    const authGateway = new InMemoryAuthGateway();
    authGateway.addUser({
      id: 'owner-1',
      email: 'owner@vimcore.test',
      username: 'owner',
      passwordHash: 'hashed:secret123',
    });
    authGateway.setMemberships('owner-1', [
      { companyId: 'company-1', role: 'company-owner', divisionId: null, localId: null },
    ]);
    await authGateway.setActiveCompanyId('owner-1', 'company-1');

    const hrErpAccessGateway = new InMemoryErpAccessGateway();
    hrErpAccessGateway.employees = [
      {
        id: 'employee-1',
        companyId: 'company-1',
        createdAt: new Date('2026-08-13T10:00:00.000Z'),
      },
    ];

    const app = createApp({
      adminGateway,
      authIdentityGateway: authGateway,
      computeEffectivePermissions: () => Promise.resolve([
        'hr.erp_access.invite',
        'hr.erp_access.revoke',
      ]),
      hrErpAccessGateway,
      passwordHasher,
      sessionTokenService,
      scopeResolver: createInMemoryScopeResolver({
        nodes: [
          {
            ref: { scopeType: 'company', scopeId: 'company-1' },
            parentRef: null,
            companyId: 'company-1',
            name: 'Vimcore',
          },
        ],
        assignments: [
          {
            companyId: 'company-1',
            userId: 'owner-1',
            scope: { scopeType: 'company', scopeId: 'company-1' },
            mode: 'subtree_inclusive',
          },
        ],
      }),
      seedAdminEnabled: false,
      nodeEnv: 'test',
    });

    const loginResponse = await request(app).post('/auth/login').send({
      identifier: 'owner',
      password: 'secret123',
    });
    const sessionCookie = getSessionCookie(loginResponse.headers['set-cookie']);

    const createResponse = await request(app)
      .post('/companies/company-1/hr-erp-access/invitations')
      .set('Cookie', sessionCookie)
      .send({ employeeId: 'employee-1', inviteeEmail: 'New.User@Vimcore.Test' });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body).toEqual({
      invitationId: expect.any(String),
      invitationToken: expect.any(String),
      companyId: 'company-1',
      employeeId: 'employee-1',
      inviteeEmail: 'new.user@vimcore.test',
      expiresAt: expect.any(String),
    });

    const token = createResponse.body.invitationToken as string;
    expect(hrErpAccessGateway.invitations[0]).toMatchObject({
      employeeId: 'employee-1',
      tokenHash: hashErpAccessInvitationToken(token),
    });

    const listResponse = await request(app)
      .get('/companies/company-1/hr-erp-access/invitations')
      .set('Cookie', sessionCookie);

    expect(listResponse.status).toBe(200);
    expect(listResponse.body).toEqual([
      {
        id: createResponse.body.invitationId,
        companyId: 'company-1',
        employeeId: 'employee-1',
        inviteeEmail: 'new.user@vimcore.test',
        createdAt: '2026-08-13T12:00:00.000Z',
        expiresAt: expect.any(String),
      },
    ]);

    const acceptResponse = await request(app)
      .post(`/hr-erp-access/invitations/${token}/accept`)
      .send({ password: 'secret123' });

    expect(acceptResponse.status).toBe(204);
    expect(acceptResponse.headers['set-cookie']).toBeTruthy();

    const revokeResponse = await request(app)
      .post('/companies/company-1/hr-erp-access/employees/employee-1/revoke')
      .set('Cookie', sessionCookie)
      .send({});

    expect(revokeResponse.status).toBe(204);
    expect(hrErpAccessGateway.activeLinks).toEqual([
      expect.objectContaining({
        employeeId: 'employee-1',
        userId: expect.any(String),
        isActive: false,
      }),
    ]);
  });

  it('returns 403 when the session lacks HR ERP-access permissions', async () => {
    const authGateway = new InMemoryAuthGateway();
    authGateway.addUser({
      id: 'owner-1',
      email: 'owner@vimcore.test',
      username: 'owner',
      passwordHash: 'hashed:secret123',
    });
    authGateway.setMemberships('owner-1', [
      { companyId: 'company-1', role: 'company-owner', divisionId: null, localId: null },
    ]);
    await authGateway.setActiveCompanyId('owner-1', 'company-1');

    const hrErpAccessGateway = new InMemoryErpAccessGateway();
    hrErpAccessGateway.employees = [
      {
        id: 'employee-1',
        companyId: 'company-1',
        createdAt: new Date('2026-08-13T10:00:00.000Z'),
      },
    ];

    const app = createApp({
      adminGateway,
      authIdentityGateway: authGateway,
      computeEffectivePermissions: () => Promise.resolve([]),
      hrErpAccessGateway,
      passwordHasher,
      sessionTokenService,
      scopeResolver: createInMemoryScopeResolver({
        nodes: [
          {
            ref: { scopeType: 'company', scopeId: 'company-1' },
            parentRef: null,
            companyId: 'company-1',
            name: 'Vimcore',
          },
        ],
        assignments: [
          {
            companyId: 'company-1',
            userId: 'owner-1',
            scope: { scopeType: 'company', scopeId: 'company-1' },
            mode: 'subtree_inclusive',
          },
        ],
      }),
      seedAdminEnabled: false,
      nodeEnv: 'test',
    });

    const loginResponse = await request(app).post('/auth/login').send({
      identifier: 'owner',
      password: 'secret123',
    });
    const sessionCookie = getSessionCookie(loginResponse.headers['set-cookie']);

    const response = await request(app)
      .post('/companies/company-1/hr-erp-access/invitations')
      .set('Cookie', sessionCookie)
      .send({ employeeId: 'employee-1', inviteeEmail: 'new.user@vimcore.test' });

    expect(response.status).toBe(403);
  });
});
