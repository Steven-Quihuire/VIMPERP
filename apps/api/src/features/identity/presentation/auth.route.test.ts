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
} from '../domain/auth';
import { createInMemoryScopeResolver, type ScopeAssignmentRecord } from '../../../shared/infrastructure/scope-hierarchy/scope-hierarchy.port';

class InMemoryAuthGateway implements AuthIdentityGateway {
  private usersById = new Map<string, AuthUser>();
  private usersByIdentifier = new Map<string, AuthUser>();
  private sessions = new Map<string, AuthSessionRecord>();
  private membershipsByUserId = new Map<string, AuthMembership[]>();
  private activeCompanyByUserId = new Map<string, string | null>();
  private activeScopeNodeIdByUserId = new Map<string, string | null>();
  private companyStatusByCompanyId = new Map<
    string,
    'active' | 'suspended' | 'provisioning_failed'
  >();

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

  setCompanyStatus(
    companyId: string,
    status: 'active' | 'suspended' | 'provisioning_failed',
  ) {
    this.companyStatusByCompanyId.set(companyId, status);
  }

  async findUserByIdentifier(identifier: string) {
    return await Promise.resolve(
      this.usersByIdentifier.get(identifier.toLowerCase()) ?? null,
    );
  }

  async findUserById(userId: string) {
    return await Promise.resolve(this.usersById.get(userId) ?? null);
  }

  async createUser(user: AuthUser) {
    if (
      this.usersByIdentifier.has(user.email.toLowerCase()) ||
      this.usersByIdentifier.has(user.username.toLowerCase())
    ) {
      throw new Error('duplicate user');
    }

    this.addUser(user);
    await Promise.resolve();
  }

  async createUserWithSession(user: AuthUser, session: AuthSessionRecord) {
    if (
      this.usersByIdentifier.has(user.email.toLowerCase()) ||
      this.usersByIdentifier.has(user.username.toLowerCase())
    ) {
      throw new Error('duplicate user');
    }

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
    return await Promise.resolve(
      this.activeCompanyByUserId.get(userId) ?? null,
    );
  }

  async findCompanyStatus(companyId: string) {
    return await Promise.resolve(
      this.companyStatusByCompanyId.get(companyId) ?? 'active',
    );
  }

  async setActiveCompanyId(userId: string, companyId: string) {
    this.activeCompanyByUserId.set(userId, companyId);
    await Promise.resolve();
  }

  async findActiveScopeNodeId(userId: string) {
    return await Promise.resolve(this.activeScopeNodeIdByUserId.get(userId) ?? null);
  }

  async setActiveScopeNodeId(userId: string, scopeNodeId: string | null) {
    this.activeScopeNodeIdByUserId.set(userId, scopeNodeId);
    await Promise.resolve();
  }

  async countRecentActiveCompanySwitches() {
    return await Promise.resolve(0);
  }

  async recordActiveCompanySwitch() {
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
}

const passwordHasher: PasswordHasher = {
  hash: async (value) => await Promise.resolve(`hashed:${value}`),
  verify: async (hash, value) =>
    await Promise.resolve(hash === `hashed:${value}`),
};

const sessionTokenService: SessionTokenService = {
  create: () => 'session-token',
};

const createScopeResolver = (assignments: ScopeAssignmentRecord[] = []) =>
  createInMemoryScopeResolver({
    nodes: [
      {
        ref: { scopeType: 'company', scopeId: 'company-1' },
        parentRef: null,
        companyId: 'company-1',
        name: 'Company 1',
      },
      {
        ref: { scopeType: 'local', scopeId: 'local-1' },
        parentRef: { scopeType: 'company', scopeId: 'company-1' },
        companyId: 'company-1',
        name: 'Local 1',
      },
      {
        ref: { scopeType: 'warehouse', scopeId: 'warehouse-1' },
        parentRef: { scopeType: 'local', scopeId: 'local-1' },
        companyId: 'company-1',
        name: 'Warehouse 1',
      },
      {
        ref: { scopeType: 'company', scopeId: 'company-2' },
        parentRef: null,
        companyId: 'company-2',
        name: 'Company 2',
      },
    ],
    assignments,
  });

const emptyScopeResolver = createScopeResolver();

const adminGateway: AdminGateway = {
  getCompanySummary: async () =>
    await Promise.resolve({
      totalCompanies: 0,
      notificationCount: 0,
      auditEventCount: 0,
      companies: [],
    }),
    listNotifications: async () => await Promise.resolve([]),
    listNotificationsForCompanyRole: async () => await Promise.resolve([]),
  listProvisioningRuns: async () =>
    await Promise.resolve({ items: [], nextCursor: null }),
  getProvisioningRun: async () =>
    await Promise.resolve({
      id: 'run-1',
      correlationId: 'corr-1',
      requestId: 'req-1',
      actorUserId: 'user-1',
      companyName: 'Vimcore Labs',
      process: 'company-onboarding',
      status: 'succeeded',
      attempt: 1,
      idempotencyKey: null,
      errorSummary: null,
      createdAt: '2026-07-28T10:00:00.000Z',
      updatedAt: '2026-07-28T10:01:00.000Z',
      steps: [],
    }),
  listApplicationErrors: async () =>
    await Promise.resolve({ items: [], nextCursor: null }),
  getApplicationError: async () =>
    await Promise.resolve({
      id: 'error-1',
      correlationId: 'corr-1',
      requestId: 'req-1',
      fingerprint: 'fingerprint-1',
      status: '500',
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Unexpected server error',
      stack: null,
      context: null,
      createdAt: '2026-07-28T10:00:00.000Z',
    }),
  listAuditEvents: async () =>
    await Promise.resolve({ items: [], nextCursor: null }),
  getAuditEvent: async () =>
    await Promise.resolve({
      id: 'audit-1',
      actorUserId: 'user-1',
      companyId: 'company-1',
      type: 'company.created',
      correlationId: 'corr-1',
      entityType: 'company',
      entityId: 'company-1',
      details: {},
      oldValues: null,
      newValues: null,
      createdAt: '2026-07-28T10:00:00.000Z',
    }),
};

const getSessionCookie = (headers: string | string[] | undefined): string => {
  const cookieHeaders = Array.isArray(headers)
    ? headers
    : headers
      ? [headers]
      : [];

  if (!cookieHeaders.length) {
    throw new Error('missing session cookie');
  }

  const [sessionCookie] = cookieHeaders;

  if (!sessionCookie) {
    throw new Error('missing session cookie');
  }

  const [cookieValue] = sessionCookie.split(';');

  if (!cookieValue) {
    throw new Error('missing session cookie');
  }

  return cookieValue;
};

describe('auth routes', () => {
  it('registers a public user, sets a cookie, and returns auth/me without memberships', async () => {
    const gateway = new InMemoryAuthGateway();

    const app = createApp({
      adminGateway,
      authIdentityGateway: gateway,
      passwordHasher,
      scopeResolver: emptyScopeResolver,
      sessionTokenService,
      seedAdminEnabled: false,
      nodeEnv: 'test',
    });

    const registerResponse = await request(app).post('/auth/register').send({
      email: ' Owner@Vimcore.Test ',
      username: ' Owner ',
      password: 'secret123',
    });

    expect(registerResponse.status).toBe(201);
    expect(registerResponse.headers['set-cookie']).toBeTruthy();

    const meResponse = await request(app)
      .get('/auth/me')
      .set('Cookie', getSessionCookie(registerResponse.headers['set-cookie']));

    expect(meResponse.status).toBe(200);
    expect(meResponse.headers['cache-control']).toBe('no-store');
    expect(meResponse.body).toEqual({
      user: {
        id: expect.any(String) as string,
        email: 'owner@vimcore.test',
        username: 'owner',
      },
      memberships: [],
      activeCompany: null,
      activeScope: null,
      activeLocalId: null,
      capabilities: [],
    });
  });

  it('returns 409 when registration email or username already exists', async () => {
    const gateway = new InMemoryAuthGateway();

    gateway.addUser({
      id: 'user-1',
      email: 'owner@vimcore.test',
      username: 'owner',
      passwordHash: 'hashed:secret123',
    });

    const app = createApp({
      adminGateway,
      authIdentityGateway: gateway,
      passwordHasher,
      scopeResolver: emptyScopeResolver,
      sessionTokenService,
      seedAdminEnabled: false,
      nodeEnv: 'test',
    });

    const response = await request(app).post('/auth/register').send({
      email: 'new-owner@vimcore.test',
      username: 'OWNER',
      password: 'secret123',
    });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: {
        code: 'AUTH_CONFLICT',
        message: 'El correo o empresa ingresada ya se encuentra registrada',
      },
    });
  });

  it('returns 400 for invalid registration payloads', async () => {
    const gateway = new InMemoryAuthGateway();

    const app = createApp({
      adminGateway,
      authIdentityGateway: gateway,
      passwordHasher,
      scopeResolver: emptyScopeResolver,
      sessionTokenService,
      seedAdminEnabled: false,
      nodeEnv: 'test',
    });

    const response = await request(app).post('/auth/register').send({
      email: 'not-an-email',
      username: 'x',
      password: 'short',
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: 'BAD_REQUEST',
        message: 'Ingresa un correo válido.',
      },
    });
  });

  it('returns 204 and sets a cookie for valid credentials, then returns auth/me payload', async () => {
    const gateway = new InMemoryAuthGateway();

    gateway.addUser({
      id: 'user-1',
      email: 'owner@vimcore.test',
      username: 'owner',
      passwordHash: 'hashed:secret123',
    });
    gateway.setMemberships('user-1', [
      { companyId: 'company-1', role: 'company-owner', divisionId: null, localId: null },
    ]);

    const app = createApp({
      adminGateway,
      authIdentityGateway: gateway,
      passwordHasher,
      scopeResolver: emptyScopeResolver,
      sessionTokenService,
      seedAdminEnabled: false,
      nodeEnv: 'test',
    });

    const loginResponse = await request(app).post('/auth/login').send({
      identifier: 'owner@vimcore.test',
      password: 'secret123',
    });

    expect(loginResponse.status).toBe(204);
    expect(loginResponse.headers['set-cookie']).toBeTruthy();

    const meResponse = await request(app)
      .get('/auth/me')
      .set('Cookie', getSessionCookie(loginResponse.headers['set-cookie']));

    expect(meResponse.status).toBe(200);
    expect(meResponse.headers['cache-control']).toBe('no-store');
    expect(meResponse.body).toEqual({
      user: {
        id: 'user-1',
        email: 'owner@vimcore.test',
        username: 'owner',
      },
      memberships: [{ companyId: 'company-1', role: 'company-owner', divisionId: null, localId: null }],
      activeCompany: {
        companyId: 'company-1',
        status: 'active',
      },
      activeScope: null,
      activeLocalId: null,
      capabilities: ['catalog.delete', 'catalog.read', 'catalog.write'],
    });
  });

  it('returns the persisted active company in auth/me', async () => {
    const gateway = new InMemoryAuthGateway();

    gateway.addUser({
      id: 'user-1',
      email: 'owner@vimcore.test',
      username: 'owner',
      passwordHash: 'hashed:secret123',
    });
    gateway.setMemberships('user-1', [
      { companyId: 'company-1', role: 'company-owner', divisionId: null, localId: null },
      { companyId: 'company-2', role: 'company-user', divisionId: null, localId: null },
    ]);
    gateway.setActiveCompany('user-1', 'company-2');
    gateway.setCompanyStatus('company-2', 'active');

    const app = createApp({
      adminGateway,
      authIdentityGateway: gateway,
      passwordHasher,
      scopeResolver: emptyScopeResolver,
      sessionTokenService,
      seedAdminEnabled: false,
      nodeEnv: 'test',
    });

    const loginResponse = await request(app).post('/auth/login').send({
      identifier: 'owner',
      password: 'secret123',
    });

    const meResponse = await request(app)
      .get('/auth/me')
      .set('Cookie', getSessionCookie(loginResponse.headers['set-cookie']));

    expect(meResponse.status).toBe(200);
    expect(meResponse.body).toEqual({
      user: {
        id: 'user-1',
        email: 'owner@vimcore.test',
        username: 'owner',
      },
      memberships: [
        { companyId: 'company-1', role: 'company-owner', divisionId: null, localId: null },
        { companyId: 'company-2', role: 'company-user', divisionId: null, localId: null },
      ],
      activeCompany: {
        companyId: 'company-2',
        status: 'active',
      },
      activeScope: null,
      activeLocalId: null,
      capabilities: ['catalog.read', 'catalog.write'],
    });
  });

  it('falls back to the single membership when the persisted active company is no longer valid', async () => {
    const gateway = new InMemoryAuthGateway();

    gateway.addUser({
      id: 'user-1',
      email: 'owner@vimcore.test',
      username: 'owner',
      passwordHash: 'hashed:secret123',
    });
    gateway.setMemberships('user-1', [
      { companyId: 'company-1', role: 'company-owner', divisionId: null, localId: null },
    ]);
    gateway.setActiveCompany('user-1', 'company-999');
    gateway.setCompanyStatus('company-1', 'active');

    const app = createApp({
      adminGateway,
      authIdentityGateway: gateway,
      passwordHasher,
      scopeResolver: emptyScopeResolver,
      sessionTokenService,
      seedAdminEnabled: false,
      nodeEnv: 'test',
    });

    const loginResponse = await request(app).post('/auth/login').send({
      identifier: 'owner',
      password: 'secret123',
    });

    const meResponse = await request(app)
      .get('/auth/me')
      .set('Cookie', getSessionCookie(loginResponse.headers['set-cookie']));

    expect(meResponse.status).toBe(200);
    expect(meResponse.body).toEqual({
      user: {
        id: 'user-1',
        email: 'owner@vimcore.test',
        username: 'owner',
      },
      memberships: [{ companyId: 'company-1', role: 'company-owner', divisionId: null, localId: null }],
      activeCompany: {
        companyId: 'company-1',
        status: 'active',
      },
      activeScope: null,
      activeLocalId: null,
      capabilities: ['catalog.delete', 'catalog.read', 'catalog.write'],
    });
  });

  it('returns activeScope in auth/me and rejects unauthorized active-scope switches', async () => {
    const gateway = new InMemoryAuthGateway();

    gateway.addUser({
      id: 'user-1',
      email: 'owner@vimcore.test',
      username: 'owner',
      passwordHash: 'hashed:secret123',
    });
    gateway.setMemberships('user-1', [
      { companyId: 'company-1', role: 'company-owner', divisionId: null, localId: null },
    ]);
    gateway.setActiveCompany('user-1', 'company-1');
    gateway.seedActiveScopeNodeId('user-1', 'local:local-1');

    const scopeResolver = createScopeResolver([
      {
        companyId: 'company-1',
        userId: 'user-1',
        scope: { scopeType: 'local', scopeId: 'local-1' },
        mode: 'exact_node',
      },
    ]);

    const app = createApp({
      adminGateway,
      authIdentityGateway: gateway,
      passwordHasher,
      scopeResolver,
      sessionTokenService,
      seedAdminEnabled: false,
      nodeEnv: 'test',
    });

    const loginResponse = await request(app).post('/auth/login').send({
      identifier: 'owner',
      password: 'secret123',
    });
    const sessionCookie = getSessionCookie(loginResponse.headers['set-cookie']);

    const meResponse = await request(app)
      .get('/auth/me')
      .set('Cookie', sessionCookie);
    const switchResponse = await request(app)
      .post('/auth/me/active-scope')
      .set('Cookie', sessionCookie)
      .send({
        scope: { scopeType: 'warehouse', scopeId: 'warehouse-1' },
      });

    expect(meResponse.status).toBe(200);
    expect(meResponse.body.activeScope).toEqual({
      scopeType: 'local',
      scopeId: 'local-1',
    });
    expect(meResponse.body.activeLocalId).toBe('local-1');
    expect(switchResponse.status).toBe(403);
    expect(switchResponse.body).toEqual({
      error: {
        code: 'FORBIDDEN',
        message: 'Forbidden',
      },
    });
  });

  it('returns a generic 401 for invalid credentials', async () => {
    const gateway = new InMemoryAuthGateway();

    gateway.addUser({
      id: 'user-1',
      email: 'owner@vimcore.test',
      username: 'owner',
      passwordHash: 'hashed:secret123',
    });

    const app = createApp({
      adminGateway,
      authIdentityGateway: gateway,
      passwordHasher,
      scopeResolver: emptyScopeResolver,
      sessionTokenService,
      seedAdminEnabled: false,
      nodeEnv: 'test',
    });

    const response = await request(app).post('/auth/login').send({
      identifier: 'owner@vimcore.test',
      password: 'wrong-password',
    });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid credentials',
      },
    });
  });

  it('returns 401 for unauthenticated auth/me and 204 on logout', async () => {
    const gateway = new InMemoryAuthGateway();

    gateway.addUser({
      id: 'user-1',
      email: 'owner@vimcore.test',
      username: 'owner',
      passwordHash: 'hashed:secret123',
    });

    const app = createApp({
      adminGateway,
      authIdentityGateway: gateway,
      passwordHasher,
      scopeResolver: emptyScopeResolver,
      sessionTokenService,
      seedAdminEnabled: false,
      nodeEnv: 'test',
    });

    const unauthenticatedMe = await request(app).get('/auth/me');

    expect(unauthenticatedMe.status).toBe(401);

    const loginResponse = await request(app).post('/auth/login').send({
      identifier: 'owner',
      password: 'secret123',
    });

    const sessionCookie = getSessionCookie(loginResponse.headers['set-cookie']);
    const logoutResponse = await request(app)
      .post('/auth/logout')
      .set('Cookie', sessionCookie);

    expect(logoutResponse.status).toBe(204);
    expect(logoutResponse.headers['set-cookie']).toBeTruthy();

    const meAfterLogout = await request(app)
      .get('/auth/me')
      .set('Cookie', sessionCookie);

    expect(meAfterLogout.status).toBe(401);
  });

  it('returns 403 for company users on admin routes and 200 for platform admins', async () => {
    const gateway = new InMemoryAuthGateway();

    gateway.addUser({
      id: 'company-user-1',
      email: 'staff@vimcore.test',
      username: 'staff',
      passwordHash: 'hashed:secret123',
    });
    gateway.addUser({
      id: 'platform-admin-1',
      email: 'admin@vimcore.test',
      username: 'platform-admin',
      passwordHash: 'hashed:secret123',
    });
    gateway.setMemberships('company-user-1', [
      { companyId: 'company-1', role: 'company-user', divisionId: null, localId: null },
    ]);
    gateway.setMemberships('platform-admin-1', [
      { companyId: null, role: 'platform-admin', divisionId: null, localId: null },
    ]);

    const app = createApp({
      adminGateway,
      authIdentityGateway: gateway,
      passwordHasher,
      scopeResolver: emptyScopeResolver,
      sessionTokenService,
      seedAdminEnabled: false,
      nodeEnv: 'test',
    });

    const companyUserLogin = await request(app).post('/auth/login').send({
      identifier: 'staff',
      password: 'secret123',
    });
    const companyUserResponse = await request(app)
      .get('/admin/companies/summary')
      .set('Cookie', getSessionCookie(companyUserLogin.headers['set-cookie']));

    expect(companyUserResponse.status).toBe(403);
    expect(companyUserResponse.body).toEqual({
      error: {
        code: 'FORBIDDEN',
        message: 'Forbidden',
      },
    });

    const platformAdminLogin = await request(app).post('/auth/login').send({
      identifier: 'platform-admin',
      password: 'secret123',
    });
    const platformAdminResponse = await request(app)
      .get('/admin/companies/summary')
      .set(
        'Cookie',
        getSessionCookie(platformAdminLogin.headers['set-cookie']),
      );

    expect(platformAdminResponse.status).toBe(200);
    expect(platformAdminResponse.body).toEqual({
      totalCompanies: 0,
      notificationCount: 0,
      auditEventCount: 0,
      companies: [],
    });
  });

  it('allows seeded admin credentials only outside production', async () => {
    const app = createApp({
      adminGateway,
      passwordHasher,
      scopeResolver: emptyScopeResolver,
      sessionTokenService,
      seedAdminEnabled: true,
      nodeEnv: 'development',
    });

    const response = await request(app).post('/auth/login').send({
      identifier: 'admin',
      password: 'admin',
    });

    expect(response.status).toBe(204);
  });

  it('rejects admin/admin in production even if seed admin is requested', async () => {
    const app = createApp({
      adminGateway,
      passwordHasher,
      scopeResolver: emptyScopeResolver,
      sessionTokenService,
      seedAdminEnabled: true,
      nodeEnv: 'production',
    });

    const response = await request(app).post('/auth/login').send({
      identifier: 'admin',
      password: 'admin',
    });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid credentials',
      },
    });
  });
});
