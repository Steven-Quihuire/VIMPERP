import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../../../app/create-app';
import type { ApplicationErrorRecorder } from '../../../shared/presentation/error.middleware';
import type {
  CompanyOnboardingGateway,
  CurrentCompanySummary,
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
  private activeCompanyByUserId = new Map<string, string | null>();
  private companyStatusByCompanyId = new Map<
    string,
    'active' | 'suspended' | 'provisioning_failed'
  >();
  private recentSwitchCountByUserId = new Map<string, number>();
  readonly switchEvents: Array<{ userId: string; companyId: string }> = [];

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

  setCompanyStatus(
    companyId: string,
    status: 'active' | 'suspended' | 'provisioning_failed',
  ) {
    this.companyStatusByCompanyId.set(companyId, status);
  }

  setRecentSwitchCount(userId: string, count: number) {
    this.recentSwitchCountByUserId.set(userId, count);
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

  async findActiveCompanyId(userId: string) {
    return await Promise.resolve(this.activeCompanyByUserId.get(userId) ?? null);
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

  async countRecentActiveCompanySwitches(userId: string) {
    return await Promise.resolve(this.recentSwitchCountByUserId.get(userId) ?? 0);
  }

  async recordActiveCompanySwitch(input: {
    userId: string;
    companyId: string;
    correlationId: string;
  }) {
    this.switchEvents.push({ userId: input.userId, companyId: input.companyId });
    this.recentSwitchCountByUserId.set(
      input.userId,
      (this.recentSwitchCountByUserId.get(input.userId) ?? 0) + 1,
    );
    await Promise.resolve();
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

  async getCurrentCompanySummary(
    userId: string,
  ): Promise<CurrentCompanySummary | null> {
    const company = this.companies.find(
      (entry) => entry.ownerUserId === userId,
    );

    if (!company) {
      return await Promise.resolve(null);
    }

    return await Promise.resolve({
      companyId: company.companyId,
      name: company.name,
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
  verify: async (hash, value) =>
    await Promise.resolve(hash === `hashed:${value}`),
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
  authGateway.setCompanyStatus('company-1', 'active');
  authGateway.setCompanyStatus('company-2', 'active');

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
    const { app, companyGateway, sessionCookie } =
      await createAuthenticatedApp();

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
          phone: '0991234567',
          email: 'ops@vimcore.test',
        },
        paletteId: 'ocean',
      });

    expect(response.status).toBe(201);
    const createdCompany = response.body as {
      companyId: string;
      paletteId: string;
    };

    expect(createdCompany.companyId).toEqual(expect.any(String));
    expect(createdCompany.paletteId).toBe('ocean');

    const preferencesResponse = await request(app)
      .get('/me/preferences')
      .set('Cookie', sessionCookie);

    expect(preferencesResponse.status).toBe(200);
    expect(preferencesResponse.body).toEqual({ paletteId: 'ocean' });

    const currentCompanyResponse = await request(app)
      .get('/me/company')
      .set('Cookie', sessionCookie);

    expect(currentCompanyResponse.status).toBe(200);
    expect(currentCompanyResponse.body).toEqual({
      companyId: createdCompany.companyId,
      name: 'Vimcore Labs',
    });
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
    expect(response.status).toBe(400);
    expect((response.body as { error: { code: string } }).error.code).toBe(
      'BAD_REQUEST',
    );
  });

  it('rejects company onboarding payloads with more than five services', async () => {
    const { app, sessionCookie } = await createAuthenticatedApp();

    const response = await request(app)
      .post('/companies')
      .set('Cookie', sessionCookie)
      .send({
        name: 'Vimcore Labs',
        legalIdentifier: 'RFC-123456',
        services: ['One', 'Two', 'Three', 'Four', 'Five', 'Six'],
        address: {
          country: 'Mexico',
          city: 'Monterrey',
          exactLocation: 'San Pedro 123',
        },
        contact: {
          phone: '0991234567',
          email: 'ops@vimcore.test',
        },
        paletteId: 'ocean',
      });

    expect(response.status).toBe(400);
    expect((response.body as { error: { code: string } }).error.code).toBe(
      'BAD_REQUEST',
    );
  });

  it('rejects non-Ecuadorian mobile phone formats', async () => {
    const { app, sessionCookie } = await createAuthenticatedApp();

    const response = await request(app)
      .post('/companies')
      .set('Cookie', sessionCookie)
      .send({
        name: 'Vimcore Labs',
        legalIdentifier: 'RFC-123456',
        services: ['Implementation'],
        address: {
          country: 'Ecuador',
          city: 'Quito',
          exactLocation: 'Av. Amazonas 123',
        },
        contact: {
          phone: '+593991234567',
          email: 'ops@vimcore.test',
        },
        paletteId: 'ocean',
      });

    expect(response.status).toBe(400);
    expect((response.body as { error: { code: string } }).error.code).toBe(
      'BAD_REQUEST',
    );
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
          phone: '0991234567',
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

  it('returns null for authenticated users without a company membership yet', async () => {
    const { app, sessionCookie } = await createAuthenticatedApp();

    const response = await request(app)
      .get('/me/company')
      .set('Cookie', sessionCookie);

    expect(response.status).toBe(200);
    expect(response.body).toBeNull();
  });

  it('switches the active company for a valid membership and persists it for the next auth/me call', async () => {
    const { app, authGateway, sessionCookie } = await createAuthenticatedApp();

    authGateway.setMemberships('user-1', [
      { companyId: 'company-1', role: 'company-owner' },
      { companyId: 'company-2', role: 'company-user' },
    ]);
    authGateway.setActiveCompany('user-1', 'company-1');

    const switchResponse = await request(app)
      .patch('/me/active-company')
      .set('Cookie', sessionCookie)
      .send({ companyId: 'company-2' });

    expect(switchResponse.status).toBe(204);

    const meResponse = await request(app)
      .get('/auth/me')
      .set('Cookie', sessionCookie);

    expect(meResponse.status).toBe(200);
    expect(meResponse.body.activeCompany).toEqual({
      companyId: 'company-2',
      status: 'active',
    });
    expect(authGateway.switchEvents).toEqual([
      { userId: 'user-1', companyId: 'company-2' },
    ]);
  });

  it('rejects switching to a company outside the authenticated memberships', async () => {
    const { app, authGateway, sessionCookie } = await createAuthenticatedApp();

    authGateway.setMemberships('user-1', [
      { companyId: 'company-1', role: 'company-owner' },
    ]);
    authGateway.setActiveCompany('user-1', 'company-1');

    const response = await request(app)
      .patch('/me/active-company')
      .set('Cookie', sessionCookie)
      .send({ companyId: 'company-2' });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      error: {
        code: 'FORBIDDEN',
        message: 'Forbidden',
      },
    });
  });

  it('returns a generic 429 when the user exceeds the active-company switch throttle', async () => {
    const { app, authGateway, sessionCookie } = await createAuthenticatedApp();

    authGateway.setMemberships('user-1', [
      { companyId: 'company-1', role: 'company-owner' },
      { companyId: 'company-2', role: 'company-user' },
    ]);
    authGateway.setActiveCompany('user-1', 'company-1');
    authGateway.setRecentSwitchCount('user-1', 10);

    const response = await request(app)
      .patch('/me/active-company')
      .set('Cookie', sessionCookie)
      .send({ companyId: 'company-2' });

    expect(response.status).toBe(429);
    expect(response.body).toEqual({
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many requests',
      },
    });
    expect(authGateway.switchEvents).toEqual([]);
  });
});
