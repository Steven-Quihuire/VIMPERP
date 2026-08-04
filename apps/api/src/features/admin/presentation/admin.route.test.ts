import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../../../app/create-app';
import type {
  AuthIdentityGateway,
  AuthMembership,
  AuthSessionRecord,
  AuthUser,
  PasswordHasher,
  SessionTokenService,
} from '../../identity/domain/auth';
import type {
  AdminGateway,
  AdminApplicationErrorDetail,
  AdminApplicationErrorListFilters,
  AdminApplicationErrorSummary,
  AdminAuditEventDetail,
  AdminAuditEventListFilters,
  AdminAuditEventSummary,
  AdminNotification,
  AdminProvisioningRunDetail,
  AdminProvisioningRunListFilters,
  AdminProvisioningRunSummary,
} from '../domain/admin';

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
    return await Promise.resolve(
      this.usersByIdentifier.get(identifier.toLowerCase()) ?? null,
    );
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

class InMemoryAdminGateway implements AdminGateway {
  readonly provisioningRunListCalls: AdminProvisioningRunListFilters[] = [];
  readonly applicationErrorListCalls: AdminApplicationErrorListFilters[] = [];
  readonly auditEventListCalls: AdminAuditEventListFilters[] = [];

  async getCompanySummary() {
    return await Promise.resolve({
      totalCompanies: 2,
      notificationCount: 1,
      auditEventCount: 3,
      companies: [
        {
          id: 'company-2',
          name: 'Northwind',
          createdAt: '2026-07-27T10:00:00.000Z',
        },
        {
          id: 'company-1',
          name: 'Vimcore Labs',
          createdAt: '2026-07-27T09:00:00.000Z',
        },
      ],
    });
  }

  async listNotifications(): Promise<AdminNotification[]> {
    return await Promise.resolve([
      {
        id: 'notification-1',
        companyId: 'company-2',
        targetRole: 'platform-admin',
        type: 'company.registered',
        message: 'Northwind registered',
        createdAt: '2026-07-27T10:01:00.000Z',
      },
    ]);
  }

  async listProvisioningRuns(filters: AdminProvisioningRunListFilters) {
    this.provisioningRunListCalls.push(filters);

    return await Promise.resolve({
      items: [
        {
          id: 'run-1',
          correlationId: 'corr-run',
          requestId: 'req-run',
          actorUserId: 'platform-admin-1',
          companyName: 'Vimcore Labs',
          process: 'company-onboarding',
          status: 'failed',
          attempt: 1,
          idempotencyKey: null,
          errorSummary: 'duplicate legal identifier',
          createdAt: '2026-07-28T10:00:00.000Z',
          updatedAt: '2026-07-28T10:01:00.000Z',
        } satisfies AdminProvisioningRunSummary,
      ],
      nextCursor: 'next-run-cursor',
    });
  }

  async getProvisioningRun(runId: string) {
    return await Promise.resolve({
      id: runId,
      correlationId: 'corr-run',
      requestId: 'req-run',
      actorUserId: 'platform-admin-1',
      companyName: 'Vimcore Labs',
      process: 'company-onboarding',
      status: 'failed',
      attempt: 1,
      idempotencyKey: null,
      errorSummary: 'duplicate legal identifier',
      createdAt: '2026-07-28T10:00:00.000Z',
      updatedAt: '2026-07-28T10:01:00.000Z',
      steps: [
        {
          id: 'step-1',
          name: 'company-creation',
          status: 'failed',
          attempt: 1,
          detail: { message: 'duplicate legal identifier' },
          createdAt: '2026-07-28T10:00:30.000Z',
        },
      ],
    } satisfies AdminProvisioningRunDetail);
  }

  async listApplicationErrors(filters: AdminApplicationErrorListFilters) {
    this.applicationErrorListCalls.push(filters);

    return await Promise.resolve({
      items: [
        {
          id: 'error-1',
          correlationId: 'corr-err',
          requestId: 'req-err',
          fingerprint: 'fingerprint-1',
          status: '500',
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Unexpected server error',
          createdAt: '2026-07-28T11:00:00.000Z',
        } satisfies AdminApplicationErrorSummary,
      ],
      nextCursor: 'next-error-cursor',
    });
  }

  async getApplicationError(errorId: string) {
    return await Promise.resolve({
      id: errorId,
      correlationId: 'corr-err',
      requestId: 'req-err',
      fingerprint: 'fingerprint-1',
      status: '500',
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Unexpected server error',
      stack: 'Error: boom',
      context: {
        method: 'GET',
        process: 'http-request',
        route: '/admin/application-errors/error-1',
        statusCode: 500,
      },
      createdAt: '2026-07-28T11:00:00.000Z',
    } satisfies AdminApplicationErrorDetail);
  }

  async listAuditEvents(filters: AdminAuditEventListFilters) {
    this.auditEventListCalls.push(filters);

    return await Promise.resolve({
      items: [
        {
          id: 'audit-1',
          actorUserId: 'platform-admin-1',
          companyId: 'company-1',
          type: 'company.created',
          correlationId: 'corr-audit',
          entityType: 'company',
          entityId: 'company-1',
          createdAt: '2026-07-28T12:00:00.000Z',
        } satisfies AdminAuditEventSummary,
      ],
      nextCursor: 'next-audit-cursor',
    });
  }

  async getAuditEvent(eventId: string) {
    return await Promise.resolve({
      id: eventId,
      actorUserId: 'platform-admin-1',
      companyId: 'company-1',
      type: 'company.created',
      correlationId: 'corr-audit',
      entityType: 'company',
      entityId: 'company-1',
      details: { source: 'onboarding' },
      oldValues: null,
      newValues: { companyId: 'company-1' },
      createdAt: '2026-07-28T12:00:00.000Z',
    } satisfies AdminAuditEventDetail);
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

const createAuthenticatedApp = async (role: AuthMembership['role']) => {
  const gateway = new InMemoryAuthGateway();
  const adminGateway = new InMemoryAdminGateway();
  const username =
    role === 'platform-admin' ? 'platform-admin' : 'company-owner';
  const userId =
    role === 'platform-admin' ? 'platform-admin-1' : 'company-owner-1';

  gateway.addUser({
    id: userId,
    email: `${username}@vimcore.test`,
    username,
    passwordHash: 'hashed:secret123',
  });
  gateway.setMemberships(userId, [
    { companyId: role === 'platform-admin' ? null : 'company-1', role, divisionId: null, localId: null },
  ]);

  const app = createApp({
    adminGateway,
    authIdentityGateway: gateway,
    passwordHasher,
    sessionTokenService,
    seedAdminEnabled: false,
    nodeEnv: 'test',
  });

  const loginResponse = await request(app).post('/auth/login').send({
    identifier: username,
    password: 'secret123',
  });

  return {
    adminGateway,
    app,
    sessionCookie: getSessionCookie(loginResponse.headers['set-cookie']),
  };
};

const createPlatformAdminApp = async () =>
  await createAuthenticatedApp('platform-admin');

const createCompanyOwnerApp = async () =>
  await createAuthenticatedApp('company-owner');

describe('admin routes', () => {
  it('returns company summary signals for platform admins', async () => {
    const { app, sessionCookie } = await createPlatformAdminApp();

    const response = await request(app)
      .get('/admin/companies/summary')
      .set('Cookie', sessionCookie);

    expect(response.status).toBe(200);
    expect(response.headers['x-request-id']).toEqual(expect.any(String));
    expect(response.body).toEqual({
      totalCompanies: 2,
      notificationCount: 1,
      auditEventCount: 3,
      companies: [
        {
          id: 'company-2',
          name: 'Northwind',
          createdAt: '2026-07-27T10:00:00.000Z',
        },
        {
          id: 'company-1',
          name: 'Vimcore Labs',
          createdAt: '2026-07-27T09:00:00.000Z',
        },
      ],
    });
  });

  it('returns admin notifications for platform admins', async () => {
    const { app, sessionCookie } = await createPlatformAdminApp();

    const response = await request(app)
      .get('/admin/notifications')
      .set('Cookie', sessionCookie);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      notifications: [
        {
          id: 'notification-1',
          companyId: 'company-2',
          targetRole: 'platform-admin',
          type: 'company.registered',
          message: 'Northwind registered',
          createdAt: '2026-07-27T10:01:00.000Z',
        },
      ],
    });
  });

  it('returns provisioning runs for platform admins and forwards validated filters', async () => {
    const { adminGateway, app, sessionCookie } = await createPlatformAdminApp();

    const response = await request(app)
      .get('/admin/provisioning-runs')
      .query({
        status: 'failed',
        correlationId: 'corr-run',
        limit: '5',
        cursor: 'cursor-run',
      })
      .set('Cookie', sessionCookie);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      nextCursor: 'next-run-cursor',
      provisioningRuns: [
        {
          id: 'run-1',
          correlationId: 'corr-run',
          requestId: 'req-run',
          actorUserId: 'platform-admin-1',
          companyName: 'Vimcore Labs',
          process: 'company-onboarding',
          status: 'failed',
          attempt: 1,
          idempotencyKey: null,
          errorSummary: 'duplicate legal identifier',
          createdAt: '2026-07-28T10:00:00.000Z',
          updatedAt: '2026-07-28T10:01:00.000Z',
        },
      ],
    });
    expect(adminGateway.provisioningRunListCalls).toEqual([
      {
        status: 'failed',
        correlationId: 'corr-run',
        limit: 5,
        cursor: 'cursor-run',
      },
    ]);
  });

  it('returns a provisioning run detail for platform admins', async () => {
    const { app, sessionCookie } = await createPlatformAdminApp();

    const response = await request(app)
      .get('/admin/provisioning-runs/run-1')
      .set('Cookie', sessionCookie);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: 'run-1',
      correlationId: 'corr-run',
      requestId: 'req-run',
      actorUserId: 'platform-admin-1',
      companyName: 'Vimcore Labs',
      process: 'company-onboarding',
      status: 'failed',
      attempt: 1,
      idempotencyKey: null,
      errorSummary: 'duplicate legal identifier',
      createdAt: '2026-07-28T10:00:00.000Z',
      updatedAt: '2026-07-28T10:01:00.000Z',
      steps: [
        {
          id: 'step-1',
          name: 'company-creation',
          status: 'failed',
          attempt: 1,
          detail: { message: 'duplicate legal identifier' },
          createdAt: '2026-07-28T10:00:30.000Z',
        },
      ],
    });
  });

  it('returns application errors for platform admins and forwards validated filters', async () => {
    const { adminGateway, app, sessionCookie } = await createPlatformAdminApp();

    const response = await request(app)
      .get('/admin/application-errors')
      .query({
        fingerprint: 'fingerprint-1',
        correlationId: 'corr-err',
        limit: '5',
        cursor: 'cursor-err',
      })
      .set('Cookie', sessionCookie);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      nextCursor: 'next-error-cursor',
      applicationErrors: [
        {
          id: 'error-1',
          correlationId: 'corr-err',
          requestId: 'req-err',
          fingerprint: 'fingerprint-1',
          status: '500',
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Unexpected server error',
          createdAt: '2026-07-28T11:00:00.000Z',
        },
      ],
    });
    expect(adminGateway.applicationErrorListCalls).toEqual([
      {
        fingerprint: 'fingerprint-1',
        correlationId: 'corr-err',
        limit: 5,
        cursor: 'cursor-err',
      },
    ]);
  });

  it('returns an application error detail for platform admins', async () => {
    const { app, sessionCookie } = await createPlatformAdminApp();

    const response = await request(app)
      .get('/admin/application-errors/error-1')
      .set('Cookie', sessionCookie);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: 'error-1',
      correlationId: 'corr-err',
      requestId: 'req-err',
      fingerprint: 'fingerprint-1',
      status: '500',
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Unexpected server error',
      stack: 'Error: boom',
      context: {
        method: 'GET',
        process: 'http-request',
        route: '/admin/application-errors/error-1',
        statusCode: 500,
      },
      createdAt: '2026-07-28T11:00:00.000Z',
    });
  });

  it('returns audit events for platform admins and forwards validated filters', async () => {
    const { adminGateway, app, sessionCookie } = await createPlatformAdminApp();

    const response = await request(app)
      .get('/admin/audit-events')
      .query({
        type: 'company.created',
        companyId: 'company-1',
        correlationId: 'corr-audit',
        limit: '5',
        cursor: 'cursor-audit',
      })
      .set('Cookie', sessionCookie);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      nextCursor: 'next-audit-cursor',
      auditEvents: [
        {
          id: 'audit-1',
          actorUserId: 'platform-admin-1',
          companyId: 'company-1',
          type: 'company.created',
          correlationId: 'corr-audit',
          entityType: 'company',
          entityId: 'company-1',
          createdAt: '2026-07-28T12:00:00.000Z',
        },
      ],
    });
    expect(adminGateway.auditEventListCalls).toEqual([
      {
        type: 'company.created',
        companyId: 'company-1',
        correlationId: 'corr-audit',
        limit: 5,
        cursor: 'cursor-audit',
      },
    ]);
  });

  it('returns an audit event detail for platform admins', async () => {
    const { app, sessionCookie } = await createPlatformAdminApp();

    const response = await request(app)
      .get('/admin/audit-events/audit-1')
      .set('Cookie', sessionCookie);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: 'audit-1',
      actorUserId: 'platform-admin-1',
      companyId: 'company-1',
      type: 'company.created',
      correlationId: 'corr-audit',
      entityType: 'company',
      entityId: 'company-1',
      details: { source: 'onboarding' },
      oldValues: null,
      newValues: { companyId: 'company-1' },
      createdAt: '2026-07-28T12:00:00.000Z',
    });
  });

  it.each([
    '/admin/provisioning-runs',
    '/admin/provisioning-runs/run-1',
    '/admin/application-errors',
    '/admin/application-errors/error-1',
    '/admin/audit-events',
    '/admin/audit-events/audit-1',
  ])('returns 401 for anonymous access to %s', async (path) => {
    const { app } = await createPlatformAdminApp();

    const response = await request(app).get(path);

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid session',
      },
    });
  });

  it.each([
    '/admin/provisioning-runs',
    '/admin/provisioning-runs/run-1',
    '/admin/application-errors',
    '/admin/application-errors/error-1',
    '/admin/audit-events',
    '/admin/audit-events/audit-1',
  ])('returns 403 for company users hitting %s', async (path) => {
    const { app, sessionCookie } = await createCompanyOwnerApp();

    const response = await request(app).get(path).set('Cookie', sessionCookie);

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      error: {
        code: 'FORBIDDEN',
        message: 'Forbidden',
      },
    });
  });

  it('returns 400 when provisioning run filters are invalid', async () => {
    const { app, sessionCookie } = await createPlatformAdminApp();

    const response = await request(app)
      .get('/admin/provisioning-runs')
      .query({ limit: '0' })
      .set('Cookie', sessionCookie);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: 'BAD_REQUEST',
        message: 'Too small: expected number to be >=1',
      },
    });
  });

  it('exposes request metrics and health signals', async () => {
    const { app, sessionCookie } = await createPlatformAdminApp();

    await request(app).get('/health');
    await request(app)
      .get('/admin/companies/summary')
      .set('Cookie', sessionCookie);

    const response = await request(app).get('/metrics');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/plain');
    expect(response.text).toContain('http_requests_total 4');
    expect(response.text).toContain('http_requests_in_flight 0');
  });
});
