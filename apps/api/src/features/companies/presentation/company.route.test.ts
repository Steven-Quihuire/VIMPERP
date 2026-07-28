import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../../../app/create-app';
import type { ApplicationErrorRecorder } from '../../../shared/presentation/error.middleware';
import type {
  CompanyOnboardingGateway,
  CreateCompanyInput,
  PaletteId,
  ProvisioningRecorder,
} from '../domain/company';
import type {
  AuthIdentityGateway,
  AuthMembership,
  AuthSessionRecord,
  AuthUser,
  PasswordHasher,
  SessionTokenService,
} from '../../identity/domain/auth';

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

class InMemoryCompanyGateway implements CompanyOnboardingGateway {
  readonly companies: Array<CreateCompanyInput & { companyId: string }> = [];
  readonly notifications: Array<{ companyId: string; targetRole: string }> = [];
  readonly auditEvents: Array<{ companyId: string; actorUserId: string }> = [];
  private preferences = new Map<string, { paletteId: PaletteId }>();

  async createCompany(input: CreateCompanyInput) {
    const companyId = `company-${this.companies.length + 1}`;

    this.companies.push({ ...input, companyId });
    this.preferences.set(input.ownerUserId, { paletteId: input.paletteId });
    this.notifications.push({ companyId, targetRole: 'platform-admin' });
    this.auditEvents.push({ companyId, actorUserId: input.ownerUserId });

    return await Promise.resolve({
      companyId,
      paletteId: input.paletteId,
    });
  }

  async getThemePreference(userId: string) {
    return await Promise.resolve(this.preferences.get(userId) ?? null);
  }

  async saveThemePreference(input: { userId: string; paletteId: PaletteId }) {
    this.preferences.set(input.userId, { paletteId: input.paletteId });

    return await Promise.resolve({ paletteId: input.paletteId });
  }
}

const passwordHasher: PasswordHasher = {
  hash: async (value) => await Promise.resolve(`hashed:${value}`),
  verify: async (hash, value) => await Promise.resolve(hash === `hashed:${value}`),
};

const sessionTokenService: SessionTokenService = {
  create: () => 'session-token',
};

const provisioningRecorder: ProvisioningRecorder & ApplicationErrorRecorder = {
  startRun: async () => await Promise.resolve({ runId: 'run-1' }),
  succeedRun: async () => await Promise.resolve(),
  failRun: async () => await Promise.resolve(),
  sweepStaleRuns: async () => await Promise.resolve(0),
  record: async () => await Promise.resolve(),
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

const createAuthenticatedApp = async () => {
  const authGateway = new InMemoryAuthGateway();
  const companyGateway = new InMemoryCompanyGateway();

  authGateway.addUser({
    id: 'user-1',
    email: 'owner@vimcore.test',
    username: 'owner',
    passwordHash: 'hashed:secret123',
  });

  const app = createApp({
    authIdentityGateway: authGateway,
    companyOnboardingGateway: companyGateway,
    passwordHasher,
    provisioningRecorder,
    sessionTokenService,
    seedAdminEnabled: false,
    nodeEnv: 'test',
  });

  const loginResponse = await request(app).post('/auth/login').send({
    identifier: 'owner',
    password: 'secret123',
  });

  return {
    app,
    authGateway,
    companyGateway,
    sessionCookie: getSessionCookie(loginResponse.headers['set-cookie']),
  };
};

describe('company onboarding routes', () => {
  it('creates a company for the authenticated owner and stores the default palette preference', async () => {
    const { app, companyGateway, sessionCookie } = await createAuthenticatedApp();

    const response = await request(app)
      .post('/companies')
      .set('Cookie', sessionCookie)
      .send({
        name: 'Vimcore Labs',
        legalIdentifier: 'RFC-123456',
        services: ['Implementation', 'Support'],
        address: {
          country: 'Mexico',
          city: 'Monterrey',
          exactLocation: 'San Pedro 123',
        },
        contact: {
          phone: '+52 81 5555 0000',
          email: 'ops@vimcore.test',
        },
        paletteId: 'ocean',
      });

    expect(response.status).toBe(201);
    const createdCompany = response.body as { companyId: string; paletteId: string };

    expect(createdCompany.companyId).toEqual(expect.any(String));
    expect(createdCompany.paletteId).toBe('ocean');

    const preferencesResponse = await request(app)
      .get('/me/preferences')
      .set('Cookie', sessionCookie);

    expect(preferencesResponse.status).toBe(200);
    expect(preferencesResponse.body).toEqual({ paletteId: 'ocean' });
    expect(companyGateway.companies).toHaveLength(1);
    expect(companyGateway.notifications).toEqual([
      { companyId: createdCompany.companyId, targetRole: 'platform-admin' },
    ]);
    expect(companyGateway.auditEvents).toEqual([
      { companyId: createdCompany.companyId, actorUserId: 'user-1' },
    ]);
  });

  it('rejects incomplete company onboarding payloads', async () => {
    const { app, sessionCookie } = await createAuthenticatedApp();

    const response = await request(app)
      .post('/companies')
      .set('Cookie', sessionCookie)
      .send({
        name: 'Vimcore Labs',
        legalIdentifier: '',
        services: [],
        address: {
          country: 'Mexico',
          city: '',
          exactLocation: '',
        },
        contact: {
          phone: '',
          email: 'ops@vimcore.test',
        },
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: 'BAD_REQUEST',
        message: 'Invalid request',
      },
    });
  });

  it('updates palette preferences for authenticated users', async () => {
    const { app, sessionCookie } = await createAuthenticatedApp();

    await request(app)
      .post('/companies')
      .set('Cookie', sessionCookie)
      .send({
        name: 'Vimcore Labs',
        legalIdentifier: 'RFC-123456',
        services: ['Implementation'],
        address: {
          country: 'Mexico',
          city: 'Monterrey',
          exactLocation: 'San Pedro 123',
        },
        contact: {
          phone: '+52 81 5555 0000',
          email: 'ops@vimcore.test',
        },
        paletteId: 'ocean',
      });

    const patchResponse = await request(app)
      .patch('/me/preferences')
      .set('Cookie', sessionCookie)
      .send({ paletteId: 'forest' });

    expect(patchResponse.status).toBe(200);
    expect(patchResponse.body).toEqual({ paletteId: 'forest' });

    const preferencesResponse = await request(app)
      .get('/me/preferences')
      .set('Cookie', sessionCookie);

    expect(preferencesResponse.status).toBe(200);
    expect(preferencesResponse.body).toEqual({ paletteId: 'forest' });
  });
});
