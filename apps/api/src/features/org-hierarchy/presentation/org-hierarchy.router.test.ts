import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../../../app/create-app';
import type { ApplicationErrorRecorder } from '../../../shared/presentation/error.middleware';
import type {
  AuthIdentityGateway,
  AuthMembership,
  AuthSessionRecord,
  AuthUser,
  PasswordHasher,
  SessionTokenService,
} from '../../identity/domain/auth';
import type { OrgHierarchyGateway } from '../domain/org-hierarchy';

class InMemoryAuthGateway implements AuthIdentityGateway {
  private usersById = new Map<string, AuthUser>();
  private usersByIdentifier = new Map<string, AuthUser>();
  private sessions = new Map<string, AuthSessionRecord>();
  private membershipsByUserId = new Map<string, AuthMembership[]>();
  private activeCompanyByUserId = new Map<string, string | null>();
  private activeLocalByUserId = new Map<string, string | null>();
  private companyStatusByCompanyId = new Map<
    string,
    'active' | 'suspended' | 'provisioning_failed'
  >();
  private localCompanyByLocalId = new Map<string, string>();

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

  setActiveLocal(userId: string, localId: string | null) {
    this.activeLocalByUserId.set(userId, localId);
  }

  setCompanyStatus(
    companyId: string,
    status: 'active' | 'suspended' | 'provisioning_failed',
  ) {
    this.companyStatusByCompanyId.set(companyId, status);
  }

  registerLocalCompany(localId: string, companyId: string) {
    this.localCompanyByLocalId.set(localId, companyId);
  }

  async findUserByIdentifier(identifier: string) {
    return Promise.resolve(this.usersByIdentifier.get(identifier.toLowerCase()) ?? null);
  }
  async findUserById(userId: string) {
    return Promise.resolve(this.usersById.get(userId) ?? null);
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
    return Promise.resolve(this.sessions.get(token) ?? null);
  }
  async deleteSession(token: string) {
    this.sessions.delete(token);
  }
  async listMemberships(userId: string) {
    return Promise.resolve(this.membershipsByUserId.get(userId) ?? []);
  }
  async findActiveCompanyId(userId: string) {
    return Promise.resolve(this.activeCompanyByUserId.get(userId) ?? null);
  }
  async findCompanyStatus(companyId: string) {
    return Promise.resolve(this.companyStatusByCompanyId.get(companyId) ?? 'active');
  }
  async setActiveCompanyId(userId: string, companyId: string) {
    this.activeCompanyByUserId.set(userId, companyId);
  }
  async findActiveLocalId(userId: string) {
    return Promise.resolve(this.activeLocalByUserId.get(userId) ?? null);
  }
  async setActiveLocalId(userId: string, localId: string | null) {
    this.activeLocalByUserId.set(userId, localId);
  }
  async findLocalCompanyById(localId: string) {
    return Promise.resolve(this.localCompanyByLocalId.get(localId) ?? null);
  }
  async countRecentActiveCompanySwitches() {
    return Promise.resolve(0);
  }
  async recordActiveCompanySwitch() {}
}

class InMemoryOrgHierarchyGateway implements OrgHierarchyGateway {
  divisions: Array<{
    id: string;
    companyId: string;
    name: string;
    createdAt: Date;
  }> = [];
  locals: Array<{
    id: string;
    companyId: string;
    divisionId: string | null;
    name: string;
    locale: string | null;
  }> = [];
  itemCountsByLocalId = new Map<string, number>();
  membershipCountsByLocalId = new Map<string, number>();

  async createDivision(input: { companyId: string; name: string }) {
    const existing = this.divisions.find(
      (d) => d.companyId === input.companyId && d.name === input.name,
    );
    if (existing) {
      throw new (class extends Error {
        readonly code = 'DIVISION_NAME_CONFLICT';
        constructor() {
          super('A division with this name already exists.');
          this.name = 'DivisionNameConflictError';
        }
      })();
    }
    const division = {
      id: `division-${this.divisions.length + 1}`,
      companyId: input.companyId,
      name: input.name,
      createdAt: new Date(),
    };
    this.divisions.push(division);
    return division;
  }
  async listDivisions(companyId: string) {
    return this.divisions.filter((d) => d.companyId === companyId);
  }
  async updateDivision(input: { divisionId: string; name: string }) {
    const division = this.divisions.find((d) => d.id === input.divisionId);
    if (!division) {
      throw new (class extends Error {
        readonly code = 'DIVISION_NOT_FOUND';
        constructor() {
          super('Division not found');
          this.name = 'DivisionNotFoundError';
        }
      })();
    }
    division.name = input.name;
    return division;
  }
  async deleteDivision(divisionId: string) {
    const idx = this.divisions.findIndex((d) => d.id === divisionId);
    if (idx === -1) {
      throw new (class extends Error {
        readonly code = 'DIVISION_NOT_FOUND';
        constructor() {
          super('Division not found');
          this.name = 'DivisionNotFoundError';
        }
      })();
    }
    this.divisions.splice(idx, 1);
  }
  async countLocalsInDivision(divisionId: string) {
    return this.locals.filter((l) => l.divisionId === divisionId).length;
  }
  async createLocal(input: {
    companyId: string;
    name: string;
    divisionId?: string | null;
  }) {
    const exists = this.locals.some(
      (l) => l.companyId === input.companyId && l.name === input.name,
    );
    if (exists) {
      throw new (class extends Error {
        readonly code = 'LOCAL_NAME_CONFLICT';
        constructor() {
          super('A local with this name already exists.');
          this.name = 'LocalNameConflictError';
        }
      })();
    }
    const local = {
      id: `local-${this.locals.length + 1}`,
      companyId: input.companyId,
      divisionId: input.divisionId ?? null,
      name: input.name,
      locale: null,
    };
    this.locals.push(local);
    return local;
  }
  async listLocals(companyId: string) {
    return this.locals.filter((l) => l.companyId === companyId);
  }
  async updateLocal(input: {
    localId: string;
    name?: string;
    divisionId?: string | null;
  }) {
    const local = this.locals.find((l) => l.id === input.localId);
    if (!local) {
      throw new (class extends Error {
        readonly code = 'LOCAL_NOT_FOUND';
        constructor() {
          super('Local not found');
          this.name = 'LocalNotFoundError';
        }
      })();
    }
    if (input.name !== undefined) local.name = input.name;
    if (input.divisionId !== undefined) local.divisionId = input.divisionId;
    return local;
  }
  async deleteLocal(localId: string) {
    const idx = this.locals.findIndex((l) => l.id === localId);
    if (idx === -1) {
      throw new (class extends Error {
        readonly code = 'LOCAL_NOT_FOUND';
        constructor() {
          super('Local not found');
          this.name = 'LocalNotFoundError';
        }
      })();
    }
    this.locals.splice(idx, 1);
  }
  async countItemsInLocal(localId: string) {
    return this.itemCountsByLocalId.get(localId) ?? 0;
  }
  async countMembershipsInLocal(localId: string) {
    return this.membershipCountsByLocalId.get(localId) ?? 0;
  }
  async findLocalById(localId: string) {
    return this.locals.find((l) => l.id === localId) ?? null;
  }
}

const passwordHasher: PasswordHasher = {
  hash: async (value) => `hashed:${value}`,
  verify: async (hash, value) => hash === `hashed:${value}`,
};

const createSessionTokenService = (): SessionTokenService => {
  let counter = 0;
  return { create: () => `session-token-${++counter}` };
};

const applicationErrorRecorder: ApplicationErrorRecorder = {
  record: async () => {},
};

const getSessionCookie = (headers: string | string[] | undefined): string => {
  const cookieHeaders = Array.isArray(headers)
    ? headers
    : headers
      ? [headers]
      : [];
  const [cookie] = cookieHeaders;
  if (!cookie) throw new Error('missing session cookie');
  return cookie.split(';')[0]!;
};

const setupAuthenticatedApp = ({
  orgGateway = new InMemoryOrgHierarchyGateway(),
}: {
  orgGateway?: InMemoryOrgHierarchyGateway;
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
      role: 'company-owner',
      divisionId: null,
      localId: null,
    },
  ]);
  authGateway.setActiveCompany('owner-user', 'company-a');
  authGateway.setCompanyStatus('company-a', 'active');

  authGateway.addUser({
    id: 'member-user',
    email: 'member@vimcore.test',
    username: 'member',
    passwordHash: 'hashed:secret123',
  });
  authGateway.setMemberships('member-user', [
    {
      companyId: 'company-a',
      role: 'company-user',
      divisionId: null,
      localId: null,
    },
  ]);
  authGateway.setActiveCompany('member-user', 'company-a');

  authGateway.addUser({
    id: 'other-owner-user',
    email: 'other@vimcore.test',
    username: 'other',
    passwordHash: 'hashed:secret123',
  });
  authGateway.setMemberships('other-owner-user', [
    {
      companyId: 'company-b',
      role: 'company-owner',
      divisionId: null,
      localId: null,
    },
  ]);
  authGateway.setActiveCompany('other-owner-user', 'company-b');

  const app = createApp({
    authIdentityGateway: authGateway,
    passwordHasher,
    provisioningRecorder: applicationErrorRecorder as never,
    sessionTokenService,
    seedAdminEnabled: false,
    nodeEnv: 'test',
    orgHierarchyGateway: orgGateway,
  } as never);

  return { app, authGateway, orgGateway };
};

const loginAs = async (
  app: ReturnType<typeof createApp>,
  username: string,
): Promise<string> => {
  const res = await request(app).post('/auth/login').send({
    identifier: username,
    password: 'secret123',
  });
  return getSessionCookie(res.headers['set-cookie']);
};

describe('org-hierarchy routes', () => {
  it('creates and lists divisions as company-owner', async () => {
    const { app } = setupAuthenticatedApp();
    const cookie = await loginAs(app, 'owner');

    const createResponse = await request(app)
      .post('/companies/company-a/divisions')
      .set('Cookie', cookie)
      .send({ name: 'Retail' });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body).toEqual({
      id: expect.any(String) as string,
      companyId: 'company-a',
      name: 'Retail',
      createdAt: expect.any(String) as string,
    });

    const listResponse = await request(app)
      .get('/companies/company-a/divisions')
      .set('Cookie', cookie);

    expect(listResponse.status).toBe(200);
    expect(listResponse.body).toHaveLength(1);
    expect(listResponse.body[0]).toMatchObject({
      companyId: 'company-a',
      name: 'Retail',
    });
  });

  it('allows company-user to list divisions but 403 on create', async () => {
    const { app } = setupAuthenticatedApp();
    const ownerCookie = await loginAs(app, 'owner');
    const memberCookie = await loginAs(app, 'member');

    await request(app)
      .post('/companies/company-a/divisions')
      .set('Cookie', ownerCookie)
      .send({ name: 'Retail' });

    const listResponse = await request(app)
      .get('/companies/company-a/divisions')
      .set('Cookie', memberCookie);

    expect(listResponse.status).toBe(200);
    expect(listResponse.body).toHaveLength(1);

    const createResponse = await request(app)
      .post('/companies/company-a/divisions')
      .set('Cookie', memberCookie)
      .send({ name: 'Wholesale' });

    expect(createResponse.status).toBe(403);
  });

  it('rejects cross-company access via 403 when membership is missing', async () => {
    const { app } = setupAuthenticatedApp();
    const otherCookie = await loginAs(app, 'other');

    const createResponse = await request(app)
      .post('/companies/company-a/divisions')
      .set('Cookie', otherCookie)
      .send({ name: 'Retail' });

    expect(createResponse.status).toBe(403);

    const listResponse = await request(app)
      .get('/companies/company-a/divisions')
      .set('Cookie', otherCookie);

    expect(listResponse.status).toBe(403);
  });

  it('updates a division via PATCH /divisions/:divisionId', async () => {
    const { app } = setupAuthenticatedApp();
    const cookie = await loginAs(app, 'owner');

    const createResponse = await request(app)
      .post('/companies/company-a/divisions')
      .set('Cookie', cookie)
      .send({ name: 'Retail' });

    const divisionId = createResponse.body.id;
    const updateResponse = await request(app)
      .patch(`/divisions/${divisionId}`)
      .set('Cookie', cookie)
      .send({ name: 'Retail Updated' });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body).toMatchObject({
      id: divisionId,
      name: 'Retail Updated',
    });
  });

  it('returns 409 when deleting a division that has locals', async () => {
    const { app } = setupAuthenticatedApp();
    const cookie = await loginAs(app, 'owner');

    const divRes = await request(app)
      .post('/companies/company-a/divisions')
      .set('Cookie', cookie)
      .send({ name: 'Retail' });
    const divisionId = divRes.body.id;

    await request(app)
      .post('/companies/company-a/locals')
      .set('Cookie', cookie)
      .send({ name: 'Store A', divisionId });

    const deleteResponse = await request(app)
      .delete(`/divisions/${divisionId}`)
      .set('Cookie', cookie);

    expect(deleteResponse.status).toBe(409);
  });

  it('creates a local at company level and under a division, then re-parents', async () => {
    const { app } = setupAuthenticatedApp();
    const cookie = await loginAs(app, 'owner');

    const companyLocalRes = await request(app)
      .post('/companies/company-a/locals')
      .set('Cookie', cookie)
      .send({ name: 'Main Store' });

    expect(companyLocalRes.status).toBe(201);
    expect(companyLocalRes.body).toMatchObject({
      companyId: 'company-a',
      divisionId: null,
      name: 'Main Store',
    });

    const divRes = await request(app)
      .post('/companies/company-a/divisions')
      .set('Cookie', cookie)
      .send({ name: 'Retail' });
    const divisionId = divRes.body.id;

    const localRes = await request(app)
      .post('/companies/company-a/locals')
      .set('Cookie', cookie)
      .send({ name: 'Store A', divisionId });

    expect(localRes.status).toBe(201);
    expect(localRes.body).toMatchObject({
      companyId: 'company-a',
      divisionId,
      name: 'Store A',
    });

    const reparentRes = await request(app)
      .patch(`/locals/${localRes.body.id}`)
      .set('Cookie', cookie)
      .send({ divisionId: null });

    expect(reparentRes.status).toBe(200);
    expect(reparentRes.body).toMatchObject({
      id: localRes.body.id,
      divisionId: null,
    });
  });

  it('returns 409 when deleting a local that has items', async () => {
    const orgGateway = new InMemoryOrgHierarchyGateway();
    const { app } = setupAuthenticatedApp({ orgGateway });
    const cookie = await loginAs(app, 'owner');

    const localRes = await request(app)
      .post('/companies/company-a/locals')
      .set('Cookie', cookie)
      .send({ name: 'Store A' });

    orgGateway.itemCountsByLocalId.set(localRes.body.id, 1);

    const deleteRes = await request(app)
      .delete(`/locals/${localRes.body.id}`)
      .set('Cookie', cookie);

    expect(deleteRes.status).toBe(409);
  });

  it('returns 409 when deleting a local that has memberships', async () => {
    const orgGateway = new InMemoryOrgHierarchyGateway();
    const { app } = setupAuthenticatedApp({ orgGateway });
    const cookie = await loginAs(app, 'owner');

    const localRes = await request(app)
      .post('/companies/company-a/locals')
      .set('Cookie', cookie)
      .send({ name: 'Store A' });

    orgGateway.membershipCountsByLocalId.set(localRes.body.id, 1);

    const deleteRes = await request(app)
      .delete(`/locals/${localRes.body.id}`)
      .set('Cookie', cookie);

    expect(deleteRes.status).toBe(409);
  });

  it('returns an empty list for a company with no hierarchy', async () => {
    const { app } = setupAuthenticatedApp();
    const cookie = await loginAs(app, 'owner');

    const divisionsResponse = await request(app)
      .get('/companies/company-a/divisions')
      .set('Cookie', cookie);

    expect(divisionsResponse.status).toBe(200);
    expect(divisionsResponse.body).toEqual([]);

    const localsResponse = await request(app)
      .get('/companies/company-a/locals')
      .set('Cookie', cookie);

    expect(localsResponse.status).toBe(200);
    expect(localsResponse.body).toEqual([]);
  });

  it('returns 403 for company-user on POST /companies/:companyId/locals', async () => {
    const { app } = setupAuthenticatedApp();
    const memberCookie = await loginAs(app, 'member');

    const response = await request(app)
      .post('/companies/company-a/locals')
      .set('Cookie', memberCookie)
      .send({ name: 'Store A' });

    expect(response.status).toBe(403);
  });
});