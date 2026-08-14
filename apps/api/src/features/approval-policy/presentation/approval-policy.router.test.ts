import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../../../app/create-app';
import type { ApplicationErrorRecorder } from '../../../shared/presentation/error.middleware';
import {
  createInMemoryScopeResolver,
  type ScopeAssignmentRecord,
} from '../../../shared/infrastructure/scope-hierarchy/scope-hierarchy.port';
import type {
  AuthIdentityGateway,
  AuthMembership,
  AuthSessionRecord,
  AuthUser,
  PasswordHasher,
  SessionTokenService,
} from '../../identity/domain/auth';
import type {
  ApprovalPolicy,
  ApprovalPolicyGateway,
  ApprovalPolicyScopeNode,
} from '../domain/approval-policy';

class InMemoryAuthGateway implements AuthIdentityGateway {
  private usersById = new Map<string, AuthUser>();
  private usersByIdentifier = new Map<string, AuthUser>();
  private sessions = new Map<string, AuthSessionRecord>();
  private membershipsByUserId = new Map<string, AuthMembership[]>();
  private activeCompanyByUserId = new Map<string, string | null>();
  private activeScopeNodeIdByUserId = new Map<string, string | null>();

  addUser(user: AuthUser) {
    this.usersById.set(user.id, user);
    this.usersByIdentifier.set(user.email.toLowerCase(), user);
    this.usersByIdentifier.set(user.username.toLowerCase(), user);
  }

  setMemberships(userId: string, memberships: AuthMembership[]) {
    this.membershipsByUserId.set(userId, memberships);
  }

  setActiveCompany(userId: string, companyId: string | null) {
    this.activeCompanyByUserId.set(userId, companyId);
  }

  seedActiveScopeNodeId(userId: string, scopeNodeId: string | null) {
    this.activeScopeNodeIdByUserId.set(userId, scopeNodeId);
  }

  async findUserByIdentifier(identifier: string) {
    return await Promise.resolve(this.usersByIdentifier.get(identifier.toLowerCase()) ?? null);
  }
  async findUserById(userId: string) {
    return await Promise.resolve(this.usersById.get(userId) ?? null);
  }
  async createUser(user: AuthUser) {
    this.addUser(user);
  }
  async createUserWithSession(user: AuthUser, session: AuthSessionRecord) {
    this.addUser(user);
    this.sessions.set(session.token, session);
  }
  async createSession(session: AuthSessionRecord) {
    this.sessions.set(session.token, session);
  }
  async findSession(token: string) {
    return await Promise.resolve(this.sessions.get(token) ?? null);
  }
  async deleteSession(token: string) {
    this.sessions.delete(token);
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
  }
  async findActiveScopeNodeId(userId: string) {
    return await Promise.resolve(this.activeScopeNodeIdByUserId.get(userId) ?? null);
  }
  async setActiveScopeNodeId(userId: string, scopeNodeId: string | null) {
    this.activeScopeNodeIdByUserId.set(userId, scopeNodeId);
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

class InMemoryApprovalPolicyGateway implements ApprovalPolicyGateway {
  policies: ApprovalPolicy[] = [];
  scopeNodes: ApprovalPolicyScopeNode[] = [
    { id: 'company:company-a', companyId: 'company-a', scopeType: 'company', sourceId: 'company-a' },
    { id: 'area:area-1', companyId: 'company-a', scopeType: 'area', sourceId: 'area-1' },
  ];

  async createApprovalPolicy(input: {
    companyId: string;
    scopeType: ApprovalPolicy['scopeType'];
    scopeNodeId: string | null;
    name: string;
    definition: unknown;
    isActive: boolean;
  }) {
    const policy: ApprovalPolicy = {
      id: `policy-${this.policies.length + 1}`,
      companyId: input.companyId,
      scopeType: input.scopeType,
      scopeNodeId: input.scopeNodeId,
      name: input.name,
      definition: input.definition,
      isActive: input.isActive,
      createdAt: new Date('2026-08-13T12:00:00.000Z'),
      updatedAt: new Date('2026-08-13T12:00:00.000Z'),
    };
    this.policies.push(policy);
    return await Promise.resolve(policy);
  }

  async listApprovalPolicies(companyId: string) {
    return await Promise.resolve(this.policies.filter((policy) => policy.companyId === companyId));
  }

  async getApprovalPolicyById(companyId: string, policyId: string) {
    return await Promise.resolve(
      this.policies.find(
        (policy) => policy.companyId === companyId && policy.id === policyId,
      ) ?? null,
    );
  }

  async updateApprovalPolicy(input: {
    companyId: string;
    policyId: string;
    scopeType: ApprovalPolicy['scopeType'];
    scopeNodeId: string | null;
    name: string;
    definition: unknown;
    isActive: boolean;
  }) {
    const policy = this.policies.find(
      (candidate) =>
        candidate.companyId === input.companyId && candidate.id === input.policyId,
    );

    if (!policy) {
      return await Promise.resolve(null);
    }

    policy.scopeType = input.scopeType;
    policy.scopeNodeId = input.scopeNodeId;
    policy.name = input.name;
    policy.definition = input.definition;
    policy.isActive = input.isActive;
    policy.updatedAt = new Date('2026-08-13T13:00:00.000Z');
    return await Promise.resolve(policy);
  }

  async deactivateApprovalPolicy(companyId: string, policyId: string) {
    const policy = this.policies.find(
      (candidate) => candidate.companyId === companyId && candidate.id === policyId,
    );

    if (!policy) {
      return await Promise.resolve(null);
    }

    policy.isActive = false;
    policy.updatedAt = new Date('2026-08-13T13:30:00.000Z');
    return await Promise.resolve(policy);
  }

  async findScopeNode(companyId: string, scopeNodeId: string) {
    return await Promise.resolve(
      this.scopeNodes.find(
        (scopeNode) => scopeNode.companyId === companyId && scopeNode.id === scopeNodeId,
      ) ?? null,
    );
  }
}

const passwordHasher: PasswordHasher = {
  hash: async (value) => `hashed:${value}`,
  verify: async (hash, value) => hash === `hashed:${value}`,
};

const createSessionTokenService = (): SessionTokenService => {
  let counter = 0;
  return {
    create: () => `session-token-${++counter}`,
  };
};

const applicationErrorRecorder: ApplicationErrorRecorder = {
  record: async () => {},
};

const getSessionCookie = (headers: string | string[] | undefined) => {
  const cookieHeaders = Array.isArray(headers)
    ? headers
    : headers
      ? [headers]
      : [];
  const [cookie] = cookieHeaders;
  if (!cookie) {
    throw new Error('missing session cookie');
  }

  return cookie.split(';')[0]!;
};

const createAuthenticatedApp = async ({
  approvalPolicyGateway = new InMemoryApprovalPolicyGateway(),
  computeEffectivePermissions = async () => [
    'hr.approval_policy.read',
    'hr.approval_policy.write',
  ],
}: {
  approvalPolicyGateway?: InMemoryApprovalPolicyGateway;
  computeEffectivePermissions?: (input: {
    companyId: string;
    userId: string;
    currentContext: { scopeType: string; scopeId: string };
  }) => Promise<string[]>;
} = {}) => {
  const authGateway = new InMemoryAuthGateway();
  const sessionTokenService = createSessionTokenService();
  authGateway.addUser({
    id: 'owner-user',
    email: 'owner@vimcore.test',
    username: 'owner',
    passwordHash: 'hashed:secret123',
  });
  authGateway.setMemberships('owner-user', [
    {
      companyId: 'company-a',
      role: 'company-user',
      divisionId: null,
      localId: null,
    },
  ]);
  authGateway.setActiveCompany('owner-user', 'company-a');
  authGateway.seedActiveScopeNodeId('owner-user', 'company:company-a');

  const scopeAssignments: ScopeAssignmentRecord[] = [
    {
      companyId: 'company-a',
      userId: 'owner-user',
      scope: { scopeType: 'company', scopeId: 'company-a' },
      mode: 'subtree_inclusive',
    },
  ];

  const app = createApp({
    authIdentityGateway: authGateway,
    passwordHasher,
    provisioningRecorder: applicationErrorRecorder as never,
    sessionTokenService,
    approvalPolicyGateway,
    scopeResolver: createInMemoryScopeResolver({
      nodes: [
        {
          ref: { scopeType: 'company', scopeId: 'company-a' },
          parentRef: null,
          companyId: 'company-a',
          name: 'Vimcore',
        },
        {
          ref: { scopeType: 'area', scopeId: 'area-1' },
          parentRef: { scopeType: 'company', scopeId: 'company-a' },
          companyId: 'company-a',
          name: 'Area 1',
        },
      ],
      assignments: scopeAssignments,
    }),
    computeEffectivePermissions: computeEffectivePermissions as never,
    seedAdminEnabled: false,
    nodeEnv: 'test',
  } as never);

  const loginResponse = await request(app).post('/auth/login').send({
    identifier: 'owner',
    password: 'secret123',
  });

  return {
    app,
    approvalPolicyGateway,
    ownerSessionCookie: getSessionCookie(loginResponse.headers['set-cookie']),
  };
};

describe('approval policy router', () => {
  it('creates, lists, updates, and deactivates approval policies through createApp', async () => {
    const { app, ownerSessionCookie } = await createAuthenticatedApp();

    const createResponse = await request(app)
      .post('/companies/company-a/approval-policies')
      .set('Cookie', ownerSessionCookie)
      .send({
        scopeType: 'company',
        scopeNodeId: null,
        name: 'Company Policy',
        definition: { steps: ['manager'] },
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body).toMatchObject({
      id: 'policy-1',
      companyId: 'company-a',
      scopeType: 'company',
      scopeNodeId: null,
      name: 'Company Policy',
      isActive: true,
    });

    const listResponse = await request(app)
      .get('/companies/company-a/approval-policies')
      .set('Cookie', ownerSessionCookie);

    expect(listResponse.status).toBe(200);
    expect(listResponse.body).toHaveLength(1);

    const updateResponse = await request(app)
      .patch('/companies/company-a/approval-policies/policy-1')
      .set('Cookie', ownerSessionCookie)
      .send({
        scopeType: 'area',
        scopeNodeId: 'area:area-1',
        name: 'Area Policy',
        definition: { steps: ['director'] },
        isActive: true,
      });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body).toMatchObject({
      id: 'policy-1',
      scopeType: 'area',
      scopeNodeId: 'area:area-1',
      name: 'Area Policy',
    });

    const deactivateResponse = await request(app)
      .post('/companies/company-a/approval-policies/policy-1/deactivate')
      .set('Cookie', ownerSessionCookie);

    expect(deactivateResponse.status).toBe(200);
    expect(deactivateResponse.body).toMatchObject({
      id: 'policy-1',
      isActive: false,
    });
  });

  it('returns 403 when the session lacks hr approval-policy permissions', async () => {
    const { app, ownerSessionCookie } = await createAuthenticatedApp({
      computeEffectivePermissions: async () => [],
    });

    const response = await request(app)
      .get('/companies/company-a/approval-policies')
      .set('Cookie', ownerSessionCookie);

    expect(response.status).toBe(403);
  });

  it('rejects approval-policy access outside the active company', async () => {
    const { app, ownerSessionCookie } = await createAuthenticatedApp();

    const response = await request(app)
      .get('/companies/company-b/approval-policies')
      .set('Cookie', ownerSessionCookie);

    expect(response.status).toBe(403);
  });

  it('treats approval policies as configuration groundwork even when no workflow engine exists', async () => {
    const { app, ownerSessionCookie } = await createAuthenticatedApp();

    const createResponse = await request(app)
      .post('/companies/company-a/approval-policies')
      .set('Cookie', ownerSessionCookie)
      .send({
        scopeType: 'company',
        scopeNodeId: null,
        name: 'Groundwork Only',
        definition: { steps: [] },
      });

    expect(createResponse.status).toBe(201);

    const getResponse = await request(app)
      .get(`/companies/company-a/approval-policies/${createResponse.body.id}`)
      .set('Cookie', ownerSessionCookie);

    expect(getResponse.status).toBe(200);
    expect(getResponse.body).toMatchObject({
      id: createResponse.body.id,
      name: 'Groundwork Only',
      definition: { steps: [] },
      isActive: true,
    });
  });
});
