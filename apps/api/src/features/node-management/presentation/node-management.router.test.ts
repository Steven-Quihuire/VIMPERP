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
import type {
  NodeManagementGateway,
  NodeManagementInvitation,
  NodeManagementInvitationDetails,
  NodeManagementMembership,
  NodeResponsibilityRecord,
  NodeResponsibilityState,
  NodeManagementUserAccount,
} from '../domain/node-management';
import {
  nodeManagementAssignmentMode,
  nodeManagementBaseMembershipRole,
  nodeManagementRoleKey,
} from '../domain/node-management';
import { createInMemoryScopeResolver } from '../../../shared/infrastructure/scope-hierarchy/scope-hierarchy.port';
import { hashNodeManagementInvitationToken } from '../application/node-management-invitation-token';

class InMemoryAuthGateway implements AuthIdentityGateway {
  private usersById = new Map<string, AuthUser>();
  private usersByIdentifier = new Map<string, AuthUser>();
  private sessions = new Map<string, AuthSessionRecord>();
  private membershipsByUserId = new Map<string, AuthMembership[]>();

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

  async findActiveCompanyId() {
    return await Promise.resolve(null);
  }

  async findCompanyStatus() {
    return await Promise.resolve('active' as const);
  }

  async setActiveCompanyId() {
    await Promise.resolve();
  }

  async findActiveScopeNodeId() {
    return await Promise.resolve(null);
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
    return await Promise.resolve(null);
  }

  async countRecentActiveCompanySwitches() {
    return await Promise.resolve(0);
  }

  async recordActiveCompanySwitch() {
    await Promise.resolve();
  }
}

class InMemoryNodeManagementGateway implements NodeManagementGateway {
  invitation: NodeManagementInvitation | null = null;
  invitationDetails: NodeManagementInvitationDetails | null = null;
  scopeNode: { scopeNodeId: string; scopeName: string; companyName: string } | null = {
    scopeNodeId: 'scope-node-1',
    scopeName: 'Main Local',
    companyName: 'Vimcore Labs',
  };
  existingUser: NodeManagementUserAccount | null = null;
  memberships: NodeManagementMembership[] = [];
  responsibilities: NodeResponsibilityRecord[] = [];
  responsibilityState: NodeResponsibilityState | null = null;
  createInvitationInput: Record<string, unknown> | null = null;
  acceptInvitationInput: Record<string, unknown> | null = null;

  async listResponsibilitiesByCompany(): Promise<NodeResponsibilityRecord[]> {
    return await Promise.resolve(this.responsibilities);
  }

  async listPendingInvitationsByCompany() {
    return await Promise.resolve([]);
  }

  async getResponsibilityState(): Promise<NodeResponsibilityState | null> {
    return await Promise.resolve(this.responsibilityState);
  }

  async findScopeNode() {
    return await Promise.resolve(this.scopeNode);
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
    this.createInvitationInput = input;
    const invitation: NodeManagementInvitation = {
      ...input,
      managedRoleKey: nodeManagementRoleKey,
      baseMembershipRole: nodeManagementBaseMembershipRole,
      createdAt: new Date('2026-08-13T12:00:00.000Z'),
      acceptedAt: null,
      acceptedByUserId: null,
    };
    this.invitation = invitation;
    return await Promise.resolve(invitation);
  }

  async findInvitationByTokenHash(tokenHash: string) {
    return await Promise.resolve(
      this.invitation?.tokenHash === tokenHash ? this.invitation : null,
    );
  }

  async getInvitationDetailsByTokenHash(tokenHash: string) {
    return await Promise.resolve(
      this.invitationDetails && this.invitation?.tokenHash === tokenHash
        ? this.invitationDetails
        : null,
    );
  }

  async findUserByEmail() {
    return await Promise.resolve(this.existingUser);
  }

  async findUserByIdentifier(identifier: string) {
    return await Promise.resolve(
      this.existingUser?.email === identifier.toLowerCase() ||
        this.existingUser?.username === identifier.toLowerCase()
        ? this.existingUser
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
    this.acceptInvitationInput = input;
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

describe('node management routes', () => {
  it('creates an invitation for a company owner, inspects it, and accepts it with a session cookie', async () => {
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

    const nodeManagementGateway = new InMemoryNodeManagementGateway();
    nodeManagementGateway.invitationDetails = {
      id: 'inv-1',
      companyId: 'company-1',
      companyName: 'Vimcore Labs',
      scopeNodeId: 'scope-node-1',
      scopeType: 'local',
      scopeId: 'local-1',
      scopeName: 'Main Local',
      inviteeEmail: 'manager@vimcore.test',
      managedRoleKey: nodeManagementRoleKey,
      baseMembershipRole: nodeManagementBaseMembershipRole,
      expiresAt: new Date('2026-08-20T12:00:00.000Z'),
      status: 'pending',
    };

    const app = createApp({
      adminGateway,
      authIdentityGateway: authGateway,
      nodeManagementGateway,
      passwordHasher,
      sessionTokenService,
      scopeResolver: createInMemoryScopeResolver({ nodes: [], assignments: [] }),
      seedAdminEnabled: false,
      nodeEnv: 'test',
    });

    const loginResponse = await request(app).post('/auth/login').send({
      identifier: 'owner',
      password: 'secret123',
    });
    const sessionCookie = getSessionCookie(loginResponse.headers['set-cookie']);

    const createResponse = await request(app)
      .post('/companies/company-1/node-management/invitations')
      .set('Cookie', sessionCookie)
      .send({
        scopeType: 'local',
        scopeId: 'local-1',
        inviteeEmail: 'Manager@Vimcore.Test',
      });

    expect(createResponse.status).toBe(201);
    const invitation = createResponse.body as {
      invitationId: string;
      invitationToken: string;
    };
    expect(createResponse.body).toEqual({
      invitationId: expect.any(String) as string,
      invitationToken: expect.any(String) as string,
      inviteeEmail: 'manager@vimcore.test',
      companyId: 'company-1',
      companyName: 'Vimcore Labs',
      scopeNodeId: 'scope-node-1',
      scopeType: 'local',
      scopeId: 'local-1',
      scopeName: 'Main Local',
      expiresAt: expect.any(String) as string,
      delivery: {
        status: 'skipped',
        message: 'Invitation email delivery is not configured.',
      },
    });

    const token = invitation.invitationToken;
    const tokenHash = hashNodeManagementInvitationToken(token);
    expect(nodeManagementGateway.createInvitationInput).toMatchObject({
      companyId: 'company-1',
      scopeNodeId: 'scope-node-1',
      scopeType: 'local',
      scopeId: 'local-1',
      inviteeEmail: 'manager@vimcore.test',
      createdByUserId: 'owner-1',
      tokenHash,
    });
    nodeManagementGateway.invitation = {
      id: invitation.invitationId,
      companyId: 'company-1',
      scopeNodeId: 'scope-node-1',
      scopeType: 'local',
      scopeId: 'local-1',
      inviteeEmail: 'manager@vimcore.test',
      tokenHash,
      managedRoleKey: nodeManagementRoleKey,
      baseMembershipRole: nodeManagementBaseMembershipRole,
      createdByUserId: 'owner-1',
      createdAt: new Date('2026-08-13T12:00:00.000Z'),
      expiresAt: new Date('2026-08-20T12:00:00.000Z'),
      acceptedAt: null,
      acceptedByUserId: null,
    };

    const inspectResponse = await request(app).get(`/node-management/invitations/${token}`);

    expect(inspectResponse.status).toBe(200);
    expect(inspectResponse.body).toEqual({
      id: 'inv-1',
      companyId: 'company-1',
      companyName: 'Vimcore Labs',
      scopeNodeId: 'scope-node-1',
      scopeType: 'local',
      scopeId: 'local-1',
      scopeName: 'Main Local',
      inviteeEmail: 'manager@vimcore.test',
      managedRoleKey: 'node-manager',
      baseMembershipRole: 'company-user',
      expiresAt: '2026-08-20T12:00:00.000Z',
      status: 'pending',
      userExists: false,
    });

    nodeManagementGateway.existingUser = null;

    const acceptResponse = await request(app)
      .post(`/node-management/invitations/${token}/accept`)
      .send({ password: 'secret123' });

    expect(acceptResponse.status).toBe(204);
    expect(acceptResponse.headers['set-cookie']).toBeTruthy();
    expect(nodeManagementGateway.acceptInvitationInput).toMatchObject({
      invitationId: invitation.invitationId,
      acceptedByUserId: expect.any(String) as string,
      ensureCompanyUserMembership: true,
      companyId: 'company-1',
      session: { token: 'session-token' },
    });
  });

  it('rejects invitation creation for non-owners and acceptance without password for a new user', async () => {
    const authGateway = new InMemoryAuthGateway();
    authGateway.addUser({
      id: 'user-1',
      email: 'member@vimcore.test',
      username: 'member',
      passwordHash: 'hashed:secret123',
    });
    authGateway.setMemberships('user-1', [
      { companyId: 'company-1', role: 'company-user', divisionId: null, localId: null },
    ]);

    const nodeManagementGateway = new InMemoryNodeManagementGateway();
    nodeManagementGateway.invitation = {
      id: 'inv-1',
      companyId: 'company-1',
      scopeNodeId: 'scope-node-1',
      scopeType: 'local',
      scopeId: 'local-1',
      inviteeEmail: 'manager@vimcore.test',
      tokenHash: hashNodeManagementInvitationToken('valid-token'),
      managedRoleKey: nodeManagementRoleKey,
      baseMembershipRole: nodeManagementBaseMembershipRole,
      createdByUserId: 'owner-1',
      createdAt: new Date('2026-08-13T12:00:00.000Z'),
      expiresAt: new Date('2026-08-20T12:00:00.000Z'),
      acceptedAt: null,
      acceptedByUserId: null,
    };

    const app = createApp({
      adminGateway,
      authIdentityGateway: authGateway,
      nodeManagementGateway,
      passwordHasher,
      sessionTokenService,
      scopeResolver: createInMemoryScopeResolver({ nodes: [], assignments: [] }),
      seedAdminEnabled: false,
      nodeEnv: 'test',
    });

    const loginResponse = await request(app).post('/auth/login').send({
      identifier: 'member',
      password: 'secret123',
    });
    const sessionCookie = getSessionCookie(loginResponse.headers['set-cookie']);

    const createResponse = await request(app)
      .post('/companies/company-1/node-management/invitations')
      .set('Cookie', sessionCookie)
      .send({ scopeType: 'local', scopeId: 'local-1', inviteeEmail: 'manager@vimcore.test' });

    expect(createResponse.status).toBe(403);
    expect(createResponse.body).toEqual({
      error: { code: 'FORBIDDEN', message: 'Forbidden' },
    });

    const acceptResponse = await request(app)
      .post('/node-management/invitations/valid-token/accept')
      .send({});

    expect(acceptResponse.status).toBe(400);
    expect(acceptResponse.body).toEqual({
      error: {
        code: 'NODE_MANAGEMENT_INVITATION_PASSWORD_REQUIRED',
        message: 'Password is required to activate this invitation.',
      },
    });
  });

  it('lists node responsibilities and returns scope state for a company owner', async () => {
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

    const nodeManagementGateway = new InMemoryNodeManagementGateway();
    nodeManagementGateway.responsibilities = [
      {
        id: 'resp-1',
        companyId: 'company-1',
        scopeNodeId: 'scope-node-1',
        scopeType: 'local',
        scopeId: 'local-1',
        scopeName: 'Main Local',
        responsibleUserId: 'user-1',
        responsibleUserEmail: 'manager@vimcore.test',
        responsibleUsername: 'manager',
        managedRoleKey: nodeManagementRoleKey,
        assignmentMode: nodeManagementAssignmentMode,
        baseMembershipRole: nodeManagementBaseMembershipRole,
        isActive: true,
        createdAt: new Date('2026-08-13T12:00:00.000Z'),
        updatedAt: new Date('2026-08-13T12:00:00.000Z'),
        endedAt: null,
      },
    ];
    nodeManagementGateway.responsibilityState = {
      companyId: 'company-1',
      scopeNodeId: 'scope-node-1',
      scopeType: 'local',
      scopeId: 'local-1',
      scopeName: 'Main Local',
      activeResponsibility: nodeManagementGateway.responsibilities[0] ?? null,
      responsibilities: nodeManagementGateway.responsibilities,
    };

    const app = createApp({
      adminGateway,
      authIdentityGateway: authGateway,
      nodeManagementGateway,
      passwordHasher,
      sessionTokenService,
      scopeResolver: createInMemoryScopeResolver({ nodes: [], assignments: [] }),
      seedAdminEnabled: false,
      nodeEnv: 'test',
    });

    const loginResponse = await request(app).post('/auth/login').send({
      identifier: 'owner',
      password: 'secret123',
    });
    const sessionCookie = getSessionCookie(loginResponse.headers['set-cookie']);

    const listResponse = await request(app)
      .get('/companies/company-1/node-management/responsibilities')
      .set('Cookie', sessionCookie);

    expect(listResponse.status).toBe(200);
    expect(listResponse.body).toEqual([
      {
        id: 'resp-1',
        companyId: 'company-1',
        scopeNodeId: 'scope-node-1',
        scopeType: 'local',
        scopeId: 'local-1',
        scopeName: 'Main Local',
        responsibleUserId: 'user-1',
        responsibleUserEmail: 'manager@vimcore.test',
        responsibleUsername: 'manager',
        managedRoleKey: 'node-manager',
        assignmentMode: 'subtree_inclusive',
        baseMembershipRole: 'company-user',
        isActive: true,
        createdAt: '2026-08-13T12:00:00.000Z',
        updatedAt: '2026-08-13T12:00:00.000Z',
        endedAt: null,
      },
    ]);

    const stateResponse = await request(app)
      .get('/companies/company-1/node-management/responsibilities/local/local-1')
      .set('Cookie', sessionCookie);

    expect(stateResponse.status).toBe(200);
    expect(stateResponse.body).toEqual({
      companyId: 'company-1',
      scopeNodeId: 'scope-node-1',
      scopeType: 'local',
      scopeId: 'local-1',
      scopeName: 'Main Local',
      activeResponsibility: {
        id: 'resp-1',
        companyId: 'company-1',
        scopeNodeId: 'scope-node-1',
        scopeType: 'local',
        scopeId: 'local-1',
        scopeName: 'Main Local',
        responsibleUserId: 'user-1',
        responsibleUserEmail: 'manager@vimcore.test',
        responsibleUsername: 'manager',
        managedRoleKey: 'node-manager',
        assignmentMode: 'subtree_inclusive',
        baseMembershipRole: 'company-user',
        isActive: true,
        createdAt: '2026-08-13T12:00:00.000Z',
        updatedAt: '2026-08-13T12:00:00.000Z',
        endedAt: null,
      },
      responsibilities: [
        {
          id: 'resp-1',
          companyId: 'company-1',
          scopeNodeId: 'scope-node-1',
          scopeType: 'local',
          scopeId: 'local-1',
          scopeName: 'Main Local',
          responsibleUserId: 'user-1',
          responsibleUserEmail: 'manager@vimcore.test',
          responsibleUsername: 'manager',
          managedRoleKey: 'node-manager',
          assignmentMode: 'subtree_inclusive',
          baseMembershipRole: 'company-user',
          isActive: true,
          createdAt: '2026-08-13T12:00:00.000Z',
          updatedAt: '2026-08-13T12:00:00.000Z',
          endedAt: null,
        },
      ],
    });
  });
});
