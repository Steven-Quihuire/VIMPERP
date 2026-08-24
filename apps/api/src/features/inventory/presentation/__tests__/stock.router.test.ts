import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../../../../app/create-app';
import type { ApplicationErrorRecorder } from '../../../../shared/presentation/error.middleware';
import {
  createInMemoryScopeResolver,
  type ScopeAssignmentRecord,
} from '../../../../shared/infrastructure/scope-hierarchy/scope-hierarchy.port';
import type {
  AuthIdentityGateway,
  AuthMembership,
  AuthSessionRecord,
  AuthUser,
  PasswordHasher,
  SessionTokenService,
} from '../../../identity/domain/auth';
import {
  InMemoryStockDocumentsGateway,
  buildItem,
  buildLot,
  fullCapabilitySet,
} from '../../application/__tests__/support';

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
    return await Promise.resolve(
      this.usersByIdentifier.get(identifier.toLowerCase()) ?? null,
    );
  }

  async findUserById(userId: string) {
    return await Promise.resolve(this.usersById.get(userId) ?? null);
  }

  createUser(user: AuthUser) {
    this.addUser(user);
    return Promise.resolve();
  }

  createUserWithSession(user: AuthUser, session: AuthSessionRecord) {
    this.addUser(user);
    this.sessions.set(session.token, session);
    return Promise.resolve();
  }

  createSession(session: AuthSessionRecord) {
    this.sessions.set(session.token, session);
    return Promise.resolve();
  }

  async findSession(token: string) {
    return await Promise.resolve(this.sessions.get(token) ?? null);
  }

  deleteSession(token: string) {
    this.sessions.delete(token);
    return Promise.resolve();
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

  setActiveCompanyId(userId: string, companyId: string) {
    this.activeCompanyByUserId.set(userId, companyId);
    return Promise.resolve();
  }

  async findActiveScopeNodeId(userId: string) {
    return await Promise.resolve(this.activeScopeNodeIdByUserId.get(userId) ?? null);
  }

  setActiveScopeNodeId(userId: string, scopeNodeId: string | null) {
    this.activeScopeNodeIdByUserId.set(userId, scopeNodeId);
    return Promise.resolve();
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

const passwordHasher: PasswordHasher = {
  hash: (value) => Promise.resolve(`hashed:${value}`),
  verify: (hash, value) => Promise.resolve(hash === `hashed:${value}`),
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
  const cookieHeaders = Array.isArray(headers) ? headers : headers ? [headers] : [];
  const [cookie] = cookieHeaders;

  if (!cookie) {
    throw new Error('missing session cookie');
  }

  return cookie.split(';')[0]!;
};

const createInventoryFixture = () => {
  const inventoryGateway = new InMemoryStockDocumentsGateway();

  inventoryGateway.companyCodes = { 'company-1': 'ACME', 'company-2': 'BETA' };
  inventoryGateway.items = [
    buildItem({ companyId: 'company-1', id: 'item-1', trackBatchMode: 'none' }),
    buildItem({ companyId: 'company-1', id: 'item-batch', trackBatchMode: 'batch' }),
    buildItem({ companyId: 'company-2', id: 'item-2', trackBatchMode: 'none' }),
  ];
  inventoryGateway.lots = [
    buildLot({
      companyId: 'company-1',
      id: 'lot-batch-1',
      itemId: 'item-batch',
      lotNumber: 'LOT-BATCH-1',
    }),
  ];

  return inventoryGateway;
};

const createAuthenticatedApp = async ({
  permissionKeys = [...fullCapabilitySet],
}: {
  permissionKeys?: string[];
} = {}) => {
  const authGateway = new InMemoryAuthGateway();
  const sessionTokenService = createSessionTokenService();
  const inventoryGateway = createInventoryFixture();

  authGateway.addUser({
    id: 'owner-user',
    email: 'owner@vimcore.test',
    username: 'owner',
    passwordHash: 'hashed:secret123',
  });
  authGateway.setMemberships('owner-user', [
    {
      companyId: 'company-1',
      role: 'company-owner',
      divisionId: null,
      localId: null,
    },
  ]);
  authGateway.setActiveCompany('owner-user', 'company-1');
  authGateway.seedActiveScopeNodeId('owner-user', 'company:company-1');

  const scopeAssignments: ScopeAssignmentRecord[] = [
    {
      companyId: 'company-1',
      userId: 'owner-user',
      scope: { scopeType: 'company', scopeId: 'company-1' },
      mode: 'subtree_inclusive',
    },
  ];

  const app = createApp({
    authIdentityGateway: authGateway,
    passwordHasher,
    provisioningRecorder: applicationErrorRecorder as never,
    sessionTokenService,
    inventoryGateway,
    scopeResolver: createInMemoryScopeResolver({
      nodes: [
        {
          ref: { scopeType: 'company', scopeId: 'company-1' },
          parentRef: null,
          companyId: 'company-1',
          name: 'Acme',
        },
        {
          ref: { scopeType: 'company', scopeId: 'company-2' },
          parentRef: null,
          companyId: 'company-2',
          name: 'Beta',
        },
      ],
      assignments: scopeAssignments,
    }),
    computeEffectivePermissions: async () => await Promise.resolve(permissionKeys),
    seedAdminEnabled: false,
    nodeEnv: 'test',
  } as never);

  const loginResponse = await request(app).post('/auth/login').send({
    identifier: 'owner',
    password: 'secret123',
  });

  return {
    app,
    inventoryGateway,
    ownerSessionCookie: getSessionCookie(loginResponse.headers['set-cookie']),
  };
};

describe('inventory stock router', () => {
  it('supports the 12 inventory presentation endpoints through createApp', async () => {
    const { app, ownerSessionCookie } = await createAuthenticatedApp();

    const createDocumentResponse = await request(app)
      .post('/companies/company-1/stock-documents')
      .set('Cookie', ownerSessionCookie)
      .send({
        type: 'receipt',
        originScopeNodeId: null,
        originScopeType: null,
        destinationScopeNodeId: 'wh-1',
        destinationScopeType: 'warehouse',
        occurredAt: '2026-08-21T10:00:00.000Z',
        note: 'Initial receipt',
      });

    expect(createDocumentResponse.status).toBe(201);

    const documentId = (createDocumentResponse.body as { id: string }).id;

    const listDocumentsResponse = await request(app)
      .get('/companies/company-1/stock-documents')
      .set('Cookie', ownerSessionCookie);

    expect(listDocumentsResponse.status).toBe(200);

    const getDocumentResponse = await request(app)
      .get(`/companies/company-1/stock-documents/${documentId}`)
      .set('Cookie', ownerSessionCookie);

    expect(getDocumentResponse.status).toBe(200);

    const addLineResponse = await request(app)
      .post(`/companies/company-1/stock-documents/${documentId}/lines`)
      .set('Cookie', ownerSessionCookie)
      .send({
        itemId: 'item-1',
        quantity: '2.000',
        unitCost: '5.5000',
        lotId: null,
      });

    expect(addLineResponse.status).toBe(201);

    const lineId = (addLineResponse.body as { id: string }).id;

    const updateLineResponse = await request(app)
      .patch(`/companies/company-1/stock-documents/${documentId}/lines/${lineId}`)
      .set('Cookie', ownerSessionCookie)
      .send({
        itemId: 'item-1',
        quantity: '3.000',
        unitCost: '6.0000',
        lotId: null,
      });

    expect(updateLineResponse.status).toBe(200);

    const deleteLineResponse = await request(app)
      .delete(`/companies/company-1/stock-documents/${documentId}/lines/${lineId}`)
      .set('Cookie', ownerSessionCookie);

    expect(deleteLineResponse.status).toBe(204);

    const recreateLineResponse = await request(app)
      .post(`/companies/company-1/stock-documents/${documentId}/lines`)
      .set('Cookie', ownerSessionCookie)
      .send({
        itemId: 'item-1',
        quantity: '2.000',
        unitCost: '5.5000',
        lotId: null,
      });

    expect(recreateLineResponse.status).toBe(201);

    const confirmResponse = await request(app)
      .post(`/companies/company-1/stock-documents/${documentId}/confirm`)
      .set('Cookie', ownerSessionCookie)
      .send({});

    expect(confirmResponse.status).toBe(200);

    const createLotResponse = await request(app)
      .post('/companies/company-1/stock-lots')
      .set('Cookie', ownerSessionCookie)
      .send({
        itemId: 'item-batch',
        lotNumber: 'LOT-BATCH-2',
        expiresAt: '2026-12-31T00:00:00.000Z',
      });

    expect(createLotResponse.status).toBe(201);

    const listLotsResponse = await request(app)
      .get('/companies/company-1/stock-lots')
      .set('Cookie', ownerSessionCookie);

    expect(listLotsResponse.status).toBe(200);

    const listQuantsResponse = await request(app)
      .get('/companies/company-1/stock')
      .set('Cookie', ownerSessionCookie);

    expect(listQuantsResponse.status).toBe(200);

    const createDraftToCancelResponse = await request(app)
      .post('/companies/company-1/stock-documents')
      .set('Cookie', ownerSessionCookie)
      .send({
        type: 'receipt',
        originScopeNodeId: null,
        originScopeType: null,
        destinationScopeNodeId: 'wh-1',
        destinationScopeType: 'warehouse',
        occurredAt: '2026-08-22T10:00:00.000Z',
        note: null,
      });

    expect(createDraftToCancelResponse.status).toBe(201);

    const cancelResponse = await request(app)
      .post(
        `/companies/company-1/stock-documents/${(createDraftToCancelResponse.body as { id: string }).id}/cancel`,
      )
      .set('Cookie', ownerSessionCookie)
      .send({});

    expect(cancelResponse.status).toBe(200);

    const reverseResponse = await request(app)
      .post(`/companies/company-1/stock-documents/${documentId}/reversal`)
      .set('Cookie', ownerSessionCookie)
      .send({});

    expect(reverseResponse.status).toBe(200);
  });

  it('returns 401 when the request is unauthenticated', async () => {
    const { app } = await createAuthenticatedApp();

    const response = await request(app).get('/companies/company-1/stock-documents');

    expect(response.status).toBe(401);
  });

  it('returns 403 when the session lacks inventory permissions', async () => {
    const { app, ownerSessionCookie } = await createAuthenticatedApp({
      permissionKeys: [],
    });

    const response = await request(app)
      .get('/companies/company-1/stock-documents')
      .set('Cookie', ownerSessionCookie);

    expect(response.status).toBe(403);
  });

  it('returns 403 for cross-company access', async () => {
    const { app, ownerSessionCookie } = await createAuthenticatedApp();

    const response = await request(app)
      .get('/companies/company-2/stock-documents')
      .set('Cookie', ownerSessionCookie);

    expect(response.status).toBe(403);
  });

  it('returns 404 for a missing stock document', async () => {
    const { app, ownerSessionCookie } = await createAuthenticatedApp();

    const response = await request(app)
      .get('/companies/company-1/stock-documents/missing-document')
      .set('Cookie', ownerSessionCookie);

    expect(response.status).toBe(404);
  });

  it('returns 409 when a lot conflicts with the line item', async () => {
    const { app, ownerSessionCookie } = await createAuthenticatedApp();

    const createDocumentResponse = await request(app)
      .post('/companies/company-1/stock-documents')
      .set('Cookie', ownerSessionCookie)
      .send({
        type: 'receipt',
        originScopeNodeId: null,
        originScopeType: null,
        destinationScopeNodeId: 'wh-1',
        destinationScopeType: 'warehouse',
        occurredAt: '2026-08-21T10:00:00.000Z',
        note: null,
      });

    const response = await request(app)
      .post(`/companies/company-1/stock-documents/${(createDocumentResponse.body as { id: string }).id}/lines`)
      .set('Cookie', ownerSessionCookie)
      .send({
        itemId: 'item-1',
        quantity: '1.000',
        unitCost: '5.0000',
        lotId: 'lot-batch-1',
      });

    expect(response.status).toBe(409);
  });

  it('enforces the adjustment double gate at confirm time', async () => {
    const { app, ownerSessionCookie } = await createAuthenticatedApp({
      permissionKeys: [
        'inventory.documents.read',
        'inventory.documents.write',
        'inventory.documents.confirm',
      ],
    });

    const createDocumentResponse = await request(app)
      .post('/companies/company-1/stock-documents')
      .set('Cookie', ownerSessionCookie)
      .send({
        type: 'adjustment',
        originScopeNodeId: 'wh-1',
        originScopeType: 'warehouse',
        destinationScopeNodeId: null,
        destinationScopeType: null,
        occurredAt: '2026-08-21T10:00:00.000Z',
        note: 'Adjustment',
      });

    const documentId = (createDocumentResponse.body as { id: string }).id;

    await request(app)
      .post(`/companies/company-1/stock-documents/${documentId}/lines`)
      .set('Cookie', ownerSessionCookie)
      .send({
        itemId: 'item-1',
        quantity: '1.000',
        unitCost: '5.0000',
        lotId: null,
      });

    const response = await request(app)
      .post(`/companies/company-1/stock-documents/${documentId}/confirm`)
      .set('Cookie', ownerSessionCookie)
      .send({});

    expect(response.status).toBe(400);
  });

  it('maps Zod validation failures to 400 responses', async () => {
    const { app, ownerSessionCookie } = await createAuthenticatedApp();

    const response = await request(app)
      .post('/companies/company-1/stock-documents')
      .set('Cookie', ownerSessionCookie)
      .send({
        type: 'receipt',
        destinationScopeNodeId: 'wh-1',
      });
    const body = response.body as { error?: { code?: string; message?: string } };

    expect(response.status).toBe(400);
    expect(body.error?.code).toBe('BAD_REQUEST');
    expect(typeof body.error?.message).toBe('string');
  });
});
