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

const passwordHasher: PasswordHasher = {
  hash: async (value) => await Promise.resolve(`hashed:${value}`),
  verify: async (hash, value) => await Promise.resolve(hash === `hashed:${value}`),
};

const sessionTokenService: SessionTokenService = {
  create: () => 'session-token',
};

const adminGateway: AdminGateway = {
  getCompanySummary: async () =>
    await Promise.resolve({
      totalCompanies: 0,
      notificationCount: 0,
      auditEventCount: 0,
      companies: [],
    }),
  listNotifications: async () => await Promise.resolve([]),
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
  it('returns 204 and sets a cookie for valid credentials, then returns auth/me payload', async () => {
    const gateway = new InMemoryAuthGateway();

    gateway.addUser({
      id: 'user-1',
      email: 'owner@vimcore.test',
      username: 'owner',
      passwordHash: 'hashed:secret123',
    });
    gateway.setMemberships('user-1', [
      { companyId: 'company-1', role: 'company-owner' },
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
      identifier: 'owner@vimcore.test',
      password: 'secret123',
    });

    expect(loginResponse.status).toBe(204);
    expect(loginResponse.headers['set-cookie']).toBeTruthy();

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
      memberships: [{ companyId: 'company-1', role: 'company-owner' }],
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

    const meAfterLogout = await request(app).get('/auth/me').set('Cookie', sessionCookie);

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
      { companyId: 'company-1', role: 'company-user' },
    ]);
    gateway.setMemberships('platform-admin-1', [
      { companyId: null, role: 'platform-admin' },
    ]);

    const app = createApp({
      adminGateway,
      authIdentityGateway: gateway,
      passwordHasher,
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
      .set('Cookie', getSessionCookie(platformAdminLogin.headers['set-cookie']));

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
