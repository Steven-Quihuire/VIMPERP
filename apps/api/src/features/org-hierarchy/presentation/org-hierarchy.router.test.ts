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
import { createInMemoryScopeResolver } from '../../../shared/infrastructure/scope-hierarchy/scope-hierarchy.port';

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
    return Promise.resolve(
      this.usersByIdentifier.get(identifier.toLowerCase()) ?? null,
    );
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
    return Promise.resolve(
      this.companyStatusByCompanyId.get(companyId) ?? 'active',
    );
  }
  async setActiveCompanyId(userId: string, companyId: string) {
    this.activeCompanyByUserId.set(userId, companyId);
  }
  async findActiveScopeNodeId() {
    return Promise.resolve(null);
  }
  async setActiveScopeNodeId() {
    return Promise.resolve();
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
  areas: Array<{
    id: string;
    companyId: string;
    divisionId: string | null;
    localId: string | null;
    name: string;
    kind: 'area';
    createdAt: Date;
  }> = [];
  warehouses: Array<{
    id: string;
    companyId: string;
    areaId: string | null;
    localId: string | null;
    name: string;
    createdAt: Date;
  }> = [];
  pointsOfSale: Array<{
    id: string;
    companyId: string;
    areaId: string | null;
    localId: string | null;
    name: string;
    createdAt: Date;
  }> = [];
  itemCountsByLocalId = new Map<string, number>();
  membershipCountsByLocalId = new Map<string, number>();

  async getScopeNodeDependencyCounts() {
    return {
      roleAssignments: 0,
      responsibilities: 0,
      managementInvitations: 0,
      activeScopePreferences: 0,
    };
  }

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
  async findDivisionById(divisionId: string) {
    return this.divisions.find((d) => d.id === divisionId) ?? null;
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
  async deleteDivision(input: string | { divisionId: string }) {
    const divisionId = typeof input === 'string' ? input : input.divisionId;
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
    const normalizedDivisionId = input.divisionId ?? null;
    const exists = this.locals.some((l) => {
      if (l.companyId !== input.companyId || l.name !== input.name) {
        return false;
      }

      return normalizedDivisionId === null
        ? l.divisionId === null
        : l.divisionId === normalizedDivisionId;
    });
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
  async deleteLocal(input: string | { localId: string }) {
    const localId = typeof input === 'string' ? input : input.localId;
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
  async countAreasInDivision(divisionId: string) {
    return this.areas.filter((area) => area.divisionId === divisionId).length;
  }
  async countAreasInLocal(localId: string) {
    return this.areas.filter((area) => area.localId === localId).length;
  }
  async countWarehousesInLocal(localId: string) {
    return this.warehouses.filter((warehouse) => warehouse.localId === localId)
      .length;
  }
  async countPointsOfSaleInLocal(localId: string) {
    return this.pointsOfSale.filter((point) => point.localId === localId)
      .length;
  }
  async createArea(input: {
    companyId: string;
    name: string;
    divisionId?: string | null;
    localId?: string | null;
  }) {
    const area = {
      id: `area-${this.areas.length + 1}`,
      companyId: input.companyId,
      divisionId: input.divisionId ?? null,
      localId: input.localId ?? null,
      name: input.name,
      kind: 'area' as const,
      createdAt: new Date(),
    };
    this.areas.push(area);
    return area;
  }
  async listAreas(companyId: string) {
    return this.areas.filter((area) => area.companyId === companyId);
  }
  async findAreaById(areaId: string) {
    return this.areas.find((area) => area.id === areaId) ?? null;
  }
  async updateArea(input: {
    areaId: string;
    name?: string | undefined;
    divisionId?: string | null;
    localId?: string | null;
  }) {
    const area = this.areas.find((candidate) => candidate.id === input.areaId);
    if (!area) {
      throw new (class extends Error {
        readonly code = 'AREA_NOT_FOUND';
        constructor() {
          super('Area not found');
          this.name = 'AreaNotFoundError';
        }
      })();
    }
    if (input.name !== undefined) area.name = input.name;
    if (input.divisionId !== undefined) {
      area.divisionId = input.divisionId;
      area.localId = null;
    }
    if (input.localId !== undefined) {
      area.localId = input.localId;
      area.divisionId = null;
    }
    return area;
  }
  async deleteArea(input: string | { areaId: string }) {
    const areaId = typeof input === 'string' ? input : input.areaId;
    const idx = this.areas.findIndex((area) => area.id === areaId);
    if (idx === -1) {
      throw new (class extends Error {
        readonly code = 'AREA_NOT_FOUND';
        constructor() {
          super('Area not found');
          this.name = 'AreaNotFoundError';
        }
      })();
    }
    this.areas.splice(idx, 1);
  }
  async countWarehousesInArea(areaId: string) {
    return this.warehouses.filter((warehouse) => warehouse.areaId === areaId)
      .length;
  }
  async countPointsOfSaleInArea(areaId: string) {
    return this.pointsOfSale.filter((point) => point.areaId === areaId).length;
  }
  async countEmployeesInArea() {
    return 0;
  }
  async createWarehouse(input: {
    companyId: string;
    name: string;
    areaId?: string | null;
    localId?: string | null;
  }) {
    const warehouse = {
      id: `warehouse-${this.warehouses.length + 1}`,
      companyId: input.companyId,
      areaId: input.areaId ?? null,
      localId: input.localId ?? null,
      name: input.name,
      createdAt: new Date(),
    };
    this.warehouses.push(warehouse);
    return warehouse;
  }
  async listWarehouses(companyId: string) {
    return this.warehouses.filter(
      (warehouse) => warehouse.companyId === companyId,
    );
  }
  async findWarehouseById(warehouseId: string) {
    return (
      this.warehouses.find((warehouse) => warehouse.id === warehouseId) ?? null
    );
  }
  async updateWarehouse(input: {
    warehouseId: string;
    name?: string | undefined;
    areaId?: string | null;
    localId?: string | null;
  }) {
    const warehouse = this.warehouses.find(
      (candidate) => candidate.id === input.warehouseId,
    );
    if (!warehouse) {
      throw new (class extends Error {
        readonly code = 'WAREHOUSE_NOT_FOUND';
        constructor() {
          super('Warehouse not found');
          this.name = 'WarehouseNotFoundError';
        }
      })();
    }
    if (input.name !== undefined) warehouse.name = input.name;
    if (input.areaId !== undefined) {
      warehouse.areaId = input.areaId;
      warehouse.localId = null;
    }
    if (input.localId !== undefined) {
      warehouse.localId = input.localId;
      warehouse.areaId = null;
    }
    return warehouse;
  }
  async deleteWarehouse(input: string | { warehouseId: string }) {
    const warehouseId = typeof input === 'string' ? input : input.warehouseId;
    const idx = this.warehouses.findIndex(
      (warehouse) => warehouse.id === warehouseId,
    );
    if (idx === -1) {
      throw new (class extends Error {
        readonly code = 'WAREHOUSE_NOT_FOUND';
        constructor() {
          super('Warehouse not found');
          this.name = 'WarehouseNotFoundError';
        }
      })();
    }
    this.warehouses.splice(idx, 1);
  }
  async createPointOfSale(input: {
    companyId: string;
    name: string;
    areaId?: string | null;
    localId?: string | null;
  }) {
    const pointOfSale = {
      id: `pos-${this.pointsOfSale.length + 1}`,
      companyId: input.companyId,
      areaId: input.areaId ?? null,
      localId: input.localId ?? null,
      name: input.name,
      createdAt: new Date(),
    };
    this.pointsOfSale.push(pointOfSale);
    return pointOfSale;
  }
  async listPointsOfSale(companyId: string) {
    return this.pointsOfSale.filter((point) => point.companyId === companyId);
  }
  async findPointOfSaleById(pointOfSaleId: string) {
    return (
      this.pointsOfSale.find((point) => point.id === pointOfSaleId) ?? null
    );
  }
  async updatePointOfSale(input: {
    pointOfSaleId: string;
    name?: string | undefined;
    areaId?: string | null;
    localId?: string | null;
  }) {
    const pointOfSale = this.pointsOfSale.find(
      (candidate) => candidate.id === input.pointOfSaleId,
    );
    if (!pointOfSale) {
      throw new (class extends Error {
        readonly code = 'POINT_OF_SALE_NOT_FOUND';
        constructor() {
          super('Point of sale not found');
          this.name = 'PointOfSaleNotFoundError';
        }
      })();
    }
    if (input.name !== undefined) pointOfSale.name = input.name;
    if (input.areaId !== undefined) {
      pointOfSale.areaId = input.areaId;
      pointOfSale.localId = null;
    }
    if (input.localId !== undefined) {
      pointOfSale.localId = input.localId;
      pointOfSale.areaId = null;
    }
    return pointOfSale;
  }
  async deletePointOfSale(input: string | { pointOfSaleId: string }) {
    const pointOfSaleId =
      typeof input === 'string' ? input : input.pointOfSaleId;
    const idx = this.pointsOfSale.findIndex(
      (point) => point.id === pointOfSaleId,
    );
    if (idx === -1) {
      throw new (class extends Error {
        readonly code = 'POINT_OF_SALE_NOT_FOUND';
        constructor() {
          super('Point of sale not found');
          this.name = 'PointOfSaleNotFoundError';
        }
      })();
    }
    this.pointsOfSale.splice(idx, 1);
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
    scopeResolver: createInMemoryScopeResolver({ nodes: [], assignments: [] }),
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

  it('blocks cross-company update and delete mutations resolved by entity id', async () => {
    const orgGateway = new InMemoryOrgHierarchyGateway();
    orgGateway.divisions.push({
      id: 'division-other',
      companyId: 'company-b',
      name: 'Other Division',
      createdAt: new Date(),
    });
    orgGateway.locals.push({
      id: 'local-other',
      companyId: 'company-b',
      divisionId: null,
      name: 'Other Local',
      locale: null,
    });
    orgGateway.areas.push({
      id: 'area-other',
      companyId: 'company-b',
      divisionId: null,
      localId: null,
      name: 'Other Area',
      kind: 'area',
      createdAt: new Date(),
    });
    orgGateway.warehouses.push({
      id: 'warehouse-other',
      companyId: 'company-b',
      areaId: null,
      localId: null,
      name: 'Other Warehouse',
      createdAt: new Date(),
    });
    orgGateway.pointsOfSale.push({
      id: 'pos-other',
      companyId: 'company-b',
      areaId: null,
      localId: null,
      name: 'Other POS',
      createdAt: new Date(),
    });
    const { app } = setupAuthenticatedApp({ orgGateway });
    const cookie = await loginAs(app, 'owner');

    await expect(
      request(app)
        .patch('/divisions/division-other')
        .set('Cookie', cookie)
        .send({ name: 'Blocked' }),
    ).resolves.toMatchObject({ status: 403 });

    await expect(
      request(app).delete('/locals/local-other').set('Cookie', cookie),
    ).resolves.toMatchObject({ status: 403 });

    await expect(
      request(app)
        .patch('/areas/area-other')
        .set('Cookie', cookie)
        .send({ name: 'Blocked' }),
    ).resolves.toMatchObject({ status: 403 });

    await expect(
      request(app).delete('/warehouses/warehouse-other').set('Cookie', cookie),
    ).resolves.toMatchObject({ status: 403 });

    await expect(
      request(app)
        .patch('/points-of-sale/pos-other')
        .set('Cookie', cookie)
        .send({ name: 'Blocked' }),
    ).resolves.toMatchObject({ status: 403 });
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

  it('returns 409 when deleting a division that has direct areas', async () => {
    const orgGateway = new InMemoryOrgHierarchyGateway();
    const { app } = setupAuthenticatedApp({ orgGateway });
    const cookie = await loginAs(app, 'owner');

    const divisionResponse = await request(app)
      .post('/companies/company-a/divisions')
      .set('Cookie', cookie)
      .send({ name: 'Retail' });

    orgGateway.areas.push({
      id: 'area-1',
      companyId: 'company-a',
      divisionId: divisionResponse.body.id,
      localId: null,
      name: 'Operations',
      kind: 'area',
      createdAt: new Date(),
    });

    const deleteResponse = await request(app)
      .delete(`/divisions/${divisionResponse.body.id}`)
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

  it('allows duplicate local names across different parents', async () => {
    const { app } = setupAuthenticatedApp();
    const cookie = await loginAs(app, 'owner');

    const divisionResponse = await request(app)
      .post('/companies/company-a/divisions')
      .set('Cookie', cookie)
      .send({ name: 'Retail' });

    const companyLocalResponse = await request(app)
      .post('/companies/company-a/locals')
      .set('Cookie', cookie)
      .send({ name: 'Store A' });

    const divisionLocalResponse = await request(app)
      .post('/companies/company-a/locals')
      .set('Cookie', cookie)
      .send({ name: 'Store A', divisionId: divisionResponse.body.id });

    expect(companyLocalResponse.status).toBe(201);
    expect(divisionLocalResponse.status).toBe(201);
  });

  it('returns 409 when creating a local with a division from another company', async () => {
    const orgGateway = new InMemoryOrgHierarchyGateway();
    orgGateway.divisions.push({
      id: 'division-other',
      companyId: 'company-b',
      name: 'Other',
      createdAt: new Date(),
    });
    const { app } = setupAuthenticatedApp({ orgGateway });
    const cookie = await loginAs(app, 'owner');

    const response = await request(app)
      .post('/companies/company-a/locals')
      .set('Cookie', cookie)
      .send({ name: 'Store A', divisionId: 'division-other' });

    expect(response.status).toBe(409);
  });

  it('returns 409 when deleting a local that has areas, warehouses, or points of sale', async () => {
    const orgGateway = new InMemoryOrgHierarchyGateway();
    const { app } = setupAuthenticatedApp({ orgGateway });
    const cookie = await loginAs(app, 'owner');

    const localResponse = await request(app)
      .post('/companies/company-a/locals')
      .set('Cookie', cookie)
      .send({ name: 'Store A' });

    orgGateway.areas.push({
      id: 'area-1',
      companyId: 'company-a',
      divisionId: null,
      localId: localResponse.body.id,
      name: 'Operations',
      kind: 'area',
      createdAt: new Date(),
    });

    const deleteResponse = await request(app)
      .delete(`/locals/${localResponse.body.id}`)
      .set('Cookie', cookie);

    expect(deleteResponse.status).toBe(409);
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

  it('creates, lists, updates and deletes areas as company-owner', async () => {
    const { app } = setupAuthenticatedApp();
    const cookie = await loginAs(app, 'owner');

    const divisionResponse = await request(app)
      .post('/companies/company-a/divisions')
      .set('Cookie', cookie)
      .send({ name: 'Retail' });

    const localResponse = await request(app)
      .post('/companies/company-a/locals')
      .set('Cookie', cookie)
      .send({ name: 'Store A' });

    const createResponse = await request(app)
      .post('/companies/company-a/areas')
      .set('Cookie', cookie)
      .send({ name: 'Operations', divisionId: divisionResponse.body.id });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body).toMatchObject({
      companyId: 'company-a',
      divisionId: 'division-1',
      localId: null,
      name: 'Operations',
    });

    const listResponse = await request(app)
      .get('/companies/company-a/areas')
      .set('Cookie', cookie);

    expect(listResponse.status).toBe(200);
    expect(listResponse.body).toHaveLength(1);

    const updateResponse = await request(app)
      .patch(`/areas/${createResponse.body.id}`)
      .set('Cookie', cookie)
      .send({ name: 'Ops', localId: localResponse.body.id });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body).toMatchObject({
      id: createResponse.body.id,
      divisionId: null,
      localId: 'local-1',
      name: 'Ops',
    });

    const deleteResponse = await request(app)
      .delete(`/areas/${createResponse.body.id}`)
      .set('Cookie', cookie);

    expect(deleteResponse.status).toBe(204);
  });

  it('rejects area payloads that provide both divisionId and localId', async () => {
    const { app } = setupAuthenticatedApp();
    const cookie = await loginAs(app, 'owner');

    const divisionResponse = await request(app)
      .post('/companies/company-a/divisions')
      .set('Cookie', cookie)
      .send({ name: 'Retail' });

    const localResponse = await request(app)
      .post('/companies/company-a/locals')
      .set('Cookie', cookie)
      .send({ name: 'Store A' });

    const response = await request(app)
      .post('/companies/company-a/areas')
      .set('Cookie', cookie)
      .send({
        name: 'Operations',
        divisionId: divisionResponse.body.id,
        localId: localResponse.body.id,
      });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      error: { code: 'BAD_REQUEST' },
    });
  });

  it('creates, lists, updates and deletes warehouses as company-owner', async () => {
    const { app } = setupAuthenticatedApp();
    const cookie = await loginAs(app, 'owner');

    const localResponse = await request(app)
      .post('/companies/company-a/locals')
      .set('Cookie', cookie)
      .send({ name: 'Store A' });

    const areaResponse = await request(app)
      .post('/companies/company-a/areas')
      .set('Cookie', cookie)
      .send({ name: 'Operations', localId: localResponse.body.id });

    const createResponse = await request(app)
      .post('/companies/company-a/warehouses')
      .set('Cookie', cookie)
      .send({ name: 'Main Warehouse', localId: localResponse.body.id });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body).toMatchObject({
      companyId: 'company-a',
      areaId: null,
      localId: 'local-1',
      name: 'Main Warehouse',
    });

    const listResponse = await request(app)
      .get('/companies/company-a/warehouses')
      .set('Cookie', cookie);

    expect(listResponse.status).toBe(200);
    expect(listResponse.body).toHaveLength(1);

    const updateResponse = await request(app)
      .patch(`/warehouses/${createResponse.body.id}`)
      .set('Cookie', cookie)
      .send({ name: 'Warehouse A', areaId: areaResponse.body.id });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body).toMatchObject({
      id: createResponse.body.id,
      localId: null,
      areaId: 'area-1',
      name: 'Warehouse A',
    });

    const deleteResponse = await request(app)
      .delete(`/warehouses/${createResponse.body.id}`)
      .set('Cookie', cookie);

    expect(deleteResponse.status).toBe(204);
  });

  it('rejects warehouse payloads that provide both areaId and localId', async () => {
    const { app } = setupAuthenticatedApp();
    const cookie = await loginAs(app, 'owner');

    const localResponse = await request(app)
      .post('/companies/company-a/locals')
      .set('Cookie', cookie)
      .send({ name: 'Store A' });

    const areaResponse = await request(app)
      .post('/companies/company-a/areas')
      .set('Cookie', cookie)
      .send({ name: 'Operations', localId: localResponse.body.id });

    const response = await request(app)
      .post('/companies/company-a/warehouses')
      .set('Cookie', cookie)
      .send({
        name: 'Main Warehouse',
        areaId: areaResponse.body.id,
        localId: localResponse.body.id,
      });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      error: { code: 'BAD_REQUEST' },
    });
  });

  it('rejects warehouse payloads that provide no parent', async () => {
    const { app } = setupAuthenticatedApp();
    const cookie = await loginAs(app, 'owner');

    const response = await request(app)
      .post('/companies/company-a/warehouses')
      .set('Cookie', cookie)
      .send({ name: 'Parentless Warehouse' });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      error: { code: 'BAD_REQUEST' },
    });
  });

  it('returns 409 when creating a warehouse with an area from another company', async () => {
    const orgGateway = new InMemoryOrgHierarchyGateway();
    orgGateway.areas.push({
      id: 'area-other',
      companyId: 'company-b',
      divisionId: null,
      localId: 'local-other',
      name: 'Foreign Area',
      kind: 'area',
      createdAt: new Date(),
    });
    const { app } = setupAuthenticatedApp({ orgGateway });
    const cookie = await loginAs(app, 'owner');

    const response = await request(app)
      .post('/companies/company-a/warehouses')
      .set('Cookie', cookie)
      .send({ name: 'Main Warehouse', areaId: 'area-other' });

    expect(response.status).toBe(409);
  });

  it('creates, lists, updates and deletes points of sale as company-owner', async () => {
    const { app } = setupAuthenticatedApp();
    const cookie = await loginAs(app, 'owner');

    const localResponse = await request(app)
      .post('/companies/company-a/locals')
      .set('Cookie', cookie)
      .send({ name: 'Store A' });

    const areaResponse = await request(app)
      .post('/companies/company-a/areas')
      .set('Cookie', cookie)
      .send({ name: 'Operations', localId: localResponse.body.id });

    const createResponse = await request(app)
      .post('/companies/company-a/points-of-sale')
      .set('Cookie', cookie)
      .send({ name: 'POS 01', localId: localResponse.body.id });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body).toMatchObject({
      companyId: 'company-a',
      areaId: null,
      localId: 'local-1',
      name: 'POS 01',
    });

    const listResponse = await request(app)
      .get('/companies/company-a/points-of-sale')
      .set('Cookie', cookie);

    expect(listResponse.status).toBe(200);
    expect(listResponse.body).toHaveLength(1);

    const updateResponse = await request(app)
      .patch(`/points-of-sale/${createResponse.body.id}`)
      .set('Cookie', cookie)
      .send({ name: 'POS A', areaId: areaResponse.body.id });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body).toMatchObject({
      id: createResponse.body.id,
      localId: null,
      areaId: 'area-1',
      name: 'POS A',
    });

    const deleteResponse = await request(app)
      .delete(`/points-of-sale/${createResponse.body.id}`)
      .set('Cookie', cookie);

    expect(deleteResponse.status).toBe(204);
  });

  it('rejects point of sale payloads that provide both areaId and localId', async () => {
    const { app } = setupAuthenticatedApp();
    const cookie = await loginAs(app, 'owner');

    const localResponse = await request(app)
      .post('/companies/company-a/locals')
      .set('Cookie', cookie)
      .send({ name: 'Store A' });

    const areaResponse = await request(app)
      .post('/companies/company-a/areas')
      .set('Cookie', cookie)
      .send({ name: 'Operations', localId: localResponse.body.id });

    const response = await request(app)
      .post('/companies/company-a/points-of-sale')
      .set('Cookie', cookie)
      .send({
        name: 'POS 01',
        areaId: areaResponse.body.id,
        localId: localResponse.body.id,
      });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      error: { code: 'BAD_REQUEST' },
    });
  });

  it('rejects point of sale payloads that provide no parent', async () => {
    const { app } = setupAuthenticatedApp();
    const cookie = await loginAs(app, 'owner');

    const response = await request(app)
      .post('/companies/company-a/points-of-sale')
      .set('Cookie', cookie)
      .send({ name: 'Parentless POS' });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      error: { code: 'BAD_REQUEST' },
    });
  });

  it('returns 409 when creating a point of sale with a local from another company', async () => {
    const orgGateway = new InMemoryOrgHierarchyGateway();
    orgGateway.locals.push({
      id: 'local-other',
      companyId: 'company-b',
      divisionId: null,
      name: 'Foreign Local',
      locale: null,
    });
    const { app } = setupAuthenticatedApp({ orgGateway });
    const cookie = await loginAs(app, 'owner');

    const response = await request(app)
      .post('/companies/company-a/points-of-sale')
      .set('Cookie', cookie)
      .send({ name: 'POS 01', localId: 'local-other' });

    expect(response.status).toBe(409);
  });

  it('allows company-user to list the new hierarchy levels but not create them', async () => {
    const { app } = setupAuthenticatedApp();
    const memberCookie = await loginAs(app, 'member');

    await expect(
      request(app)
        .get('/companies/company-a/areas')
        .set('Cookie', memberCookie),
    ).resolves.toMatchObject({ status: 200 });

    await expect(
      request(app)
        .get('/companies/company-a/warehouses')
        .set('Cookie', memberCookie),
    ).resolves.toMatchObject({ status: 200 });

    await expect(
      request(app)
        .get('/companies/company-a/points-of-sale')
        .set('Cookie', memberCookie),
    ).resolves.toMatchObject({ status: 200 });

    await expect(
      request(app)
        .post('/companies/company-a/areas')
        .set('Cookie', memberCookie)
        .send({ name: 'Restricted', localId: 'local-1' }),
    ).resolves.toMatchObject({ status: 403 });
  });
});
