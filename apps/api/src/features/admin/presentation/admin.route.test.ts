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
  AdminNotification,
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
}

class InMemoryAdminGateway implements AdminGateway {
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
}

const passwordHasher: PasswordHasher = {
  hash: async (value) => await Promise.resolve(`hashed:${value}`),
  verify: async (hash, value) => await Promise.resolve(hash === `hashed:${value}`),
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

const createPlatformAdminApp = async () => {
  const gateway = new InMemoryAuthGateway();

  gateway.addUser({
    id: 'platform-admin-1',
    email: 'admin@vimcore.test',
    username: 'platform-admin',
    passwordHash: 'hashed:secret123',
  });
  gateway.setMemberships('platform-admin-1', [
    { companyId: null, role: 'platform-admin' },
  ]);

  const app = createApp({
    adminGateway: new InMemoryAdminGateway(),
    authIdentityGateway: gateway,
    passwordHasher,
    sessionTokenService,
    seedAdminEnabled: false,
    nodeEnv: 'test',
  });

  const loginResponse = await request(app).post('/auth/login').send({
    identifier: 'platform-admin',
    password: 'secret123',
  });

  return {
    app,
    sessionCookie: getSessionCookie(loginResponse.headers['set-cookie']),
  };
};

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
