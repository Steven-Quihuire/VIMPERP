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
import type {
  CategoryGateway,
  Item,
  ItemCatalogGateway,
  ItemCategory,
  ItemTrackBatchMode,
  ItemType,
  ItemUnit,
} from '../domain/item';

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
}

class InMemoryItemGateway implements ItemCatalogGateway, CategoryGateway {
  readonly items: Item[] = [];
  readonly categories: ItemCategory[] = [];
  readonly createItemCalls: Array<{
    companyId: string;
    actorUserId: string;
    correlationId: string;
    name: string;
    type: ItemType;
    unit: ItemUnit;
    sku: string | null;
    categoryId: string | null;
    unitPrice: number;
    tracksStock: boolean;
    trackBatchMode: ItemTrackBatchMode;
  }> = [];

  async createItem(input: {
    companyId: string;
    actorUserId: string;
    correlationId: string;
    name: string;
    type: ItemType;
    unit: ItemUnit;
    sku: string | null;
    categoryId: string | null;
    unitPrice: number;
    tracksStock: boolean;
    trackBatchMode: ItemTrackBatchMode;
  }) {
    const now = new Date();
    const itemId = `item-${this.items.length + 1}`;

    this.createItemCalls.push(input);
    this.items.push({
      id: itemId,
      companyId: input.companyId,
      categoryId: input.categoryId,
      sku: input.sku,
      name: input.name,
      type: input.type,
      unit: input.unit,
      unitPrice: input.unitPrice,
      tracksStock: input.tracksStock,
      trackBatchMode: input.trackBatchMode,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    });

    return await Promise.resolve({ itemId });
  }

  async updateItem(input: {
    companyId: string;
    actorUserId: string;
    correlationId: string;
    itemId: string;
    name?: string;
    unit?: ItemUnit;
    sku?: string | null;
    categoryId?: string | null;
    unitPrice?: number;
    tracksStock?: boolean;
    trackBatchMode?: ItemTrackBatchMode;
  }) {
    void input.actorUserId;
    void input.correlationId;

    const item = this.items.find(
      (candidate) => candidate.id === input.itemId && candidate.companyId === input.companyId,
    );

    if (!item || item.deletedAt !== null) {
      throw new Error('item not found in test gateway');
    }

    if (input.name !== undefined) {
      item.name = input.name;
    }

    if (input.unit !== undefined) {
      item.unit = input.unit;
    }

    if (input.sku !== undefined) {
      item.sku = input.sku;
    }

    if (input.categoryId !== undefined) {
      item.categoryId = input.categoryId;
    }

    if (input.unitPrice !== undefined) {
      item.unitPrice = input.unitPrice;
    }

    if (input.tracksStock !== undefined) {
      item.tracksStock = input.tracksStock;
    }

    if (input.trackBatchMode !== undefined) {
      item.trackBatchMode = input.trackBatchMode;
    }

    item.updatedAt = new Date();

    return await Promise.resolve({ itemId: item.id });
  }

  async softDeleteItem(input: {
    companyId: string;
    actorUserId: string;
    correlationId: string;
    itemId: string;
  }) {
    void input.actorUserId;
    void input.correlationId;

    const item = this.items.find(
      (candidate) => candidate.id === input.itemId && candidate.companyId === input.companyId,
    );

    if (!item || item.deletedAt !== null) {
      throw new Error('item not found in test gateway');
    }

    item.deletedAt = new Date();
    item.updatedAt = item.deletedAt;

    await Promise.resolve();
  }

  async getItemById(input: { companyId: string; itemId: string; includeDeleted?: boolean }) {
    const item = this.items.find(
      (candidate) => candidate.id === input.itemId && candidate.companyId === input.companyId,
    );

    if (!item) {
      return await Promise.resolve(null);
    }

    if (!input.includeDeleted && item.deletedAt !== null) {
      return await Promise.resolve(null);
    }

    return await Promise.resolve({ ...item });
  }

  async listItems(input: { companyId: string; limit: number; cursor?: string }) {
    void input.cursor;

    const items = this.items
      .filter((candidate) => candidate.companyId === input.companyId && candidate.deletedAt === null)
      .slice(0, input.limit)
      .map((item) => ({ ...item }));

    return await Promise.resolve({ items, nextCursor: null });
  }

  async createCategory(input: {
    companyId: string;
    actorUserId: string;
    correlationId: string;
    name: string;
    parentId: string | null;
  }) {
    void input.actorUserId;
    void input.correlationId;

    const categoryId = `category-${this.categories.length + 1}`;
    this.categories.push({
      id: categoryId,
      companyId: input.companyId,
      parentId: input.parentId,
      name: input.name,
      createdAt: new Date(),
    });

    return await Promise.resolve({ categoryId });
  }

  async getCategoryById(input: { companyId: string; categoryId: string }) {
    const category = this.categories.find(
      (candidate) =>
        candidate.id === input.categoryId && candidate.companyId === input.companyId,
    );

    return await Promise.resolve(category ? { ...category } : null);
  }

  async listCategories(input: { companyId: string }) {
    return await Promise.resolve(
      this.categories
        .filter((candidate) => candidate.companyId === input.companyId)
        .map((category) => ({ ...category })),
    );
  }

  async getDescendantIds(input: { companyId: string; categoryId: string }) {
    const categories = this.categories.filter((candidate) => candidate.companyId === input.companyId);
    const descendants: string[] = [];
    const queue = [input.categoryId];

    while (queue.length > 0) {
      const currentId = queue.shift();

      if (!currentId) {
        continue;
      }

      for (const category of categories) {
        if (category.parentId === currentId && !descendants.includes(category.id)) {
          descendants.push(category.id);
          queue.push(category.id);
        }
      }
    }

    return await Promise.resolve(descendants);
  }

  async updateCategory(input: {
    companyId: string;
    actorUserId: string;
    correlationId: string;
    categoryId: string;
    name?: string;
    parentId?: string | null;
  }) {
    void input.actorUserId;
    void input.correlationId;

    const category = this.categories.find(
      (candidate) =>
        candidate.id === input.categoryId && candidate.companyId === input.companyId,
    );

    if (!category) {
      throw new Error('category not found in test gateway');
    }

    if (input.name !== undefined) {
      category.name = input.name;
    }

    if (input.parentId !== undefined) {
      category.parentId = input.parentId;
    }

    return await Promise.resolve({ categoryId: category.id });
  }
}

const passwordHasher: PasswordHasher = {
  hash: async (value) => await Promise.resolve(`hashed:${value}`),
  verify: async (hash, value) => await Promise.resolve(hash === `hashed:${value}`),
};

const createSessionTokenService = (): SessionTokenService => {
  let sessionCounter = 0;

  return {
    create: () => {
      sessionCounter += 1;

      return `session-token-${sessionCounter}`;
    },
  };
};

const applicationErrorRecorder: ApplicationErrorRecorder = {
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

const createAuthenticatedApp = async ({
  itemGateway = new InMemoryItemGateway(),
}: {
  itemGateway?: InMemoryItemGateway;
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
    { companyId: 'company-a', role: 'company-owner' },
  ]);

  authGateway.addUser({
    id: 'member-user',
    email: 'member@vimcore.test',
    username: 'member',
    passwordHash: 'hashed:secret123',
  });
  authGateway.setMemberships('member-user', [
    { companyId: 'company-a', role: 'company-user' },
  ]);

  authGateway.addUser({
    id: 'other-owner-user',
    email: 'other@vimcore.test',
    username: 'other',
    passwordHash: 'hashed:secret123',
  });
  authGateway.setMemberships('other-owner-user', [
    { companyId: 'company-b', role: 'company-owner' },
  ]);

  const app = createApp({
    authIdentityGateway: authGateway,
    passwordHasher,
    provisioningRecorder: applicationErrorRecorder as never,
    sessionTokenService,
    seedAdminEnabled: false,
    nodeEnv: 'test',
    itemGateway,
  } as never);

  const ownerLoginResponse = await request(app).post('/auth/login').send({
    identifier: 'owner',
    password: 'secret123',
  });
  const memberLoginResponse = await request(app).post('/auth/login').send({
    identifier: 'member',
    password: 'secret123',
  });
  const otherOwnerLoginResponse = await request(app).post('/auth/login').send({
    identifier: 'other',
    password: 'secret123',
  });

  return {
    app,
    authGateway,
    itemGateway,
    ownerSessionCookie: getSessionCookie(ownerLoginResponse.headers['set-cookie']),
    memberSessionCookie: getSessionCookie(memberLoginResponse.headers['set-cookie']),
    otherOwnerSessionCookie: getSessionCookie(otherOwnerLoginResponse.headers['set-cookie']),
  };
};

describe('item routes', () => {
  it('lists only categories from the authenticated tenant and rejects anonymous access', async () => {
    const itemGateway = new InMemoryItemGateway();
    itemGateway.categories.push(
      {
        id: 'category-a1',
        companyId: 'company-a',
        parentId: null,
        name: 'Hardware',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      },
      {
        id: 'category-a2',
        companyId: 'company-a',
        parentId: 'category-a1',
        name: 'Peripherals',
        createdAt: new Date('2026-01-02T00:00:00.000Z'),
      },
      {
        id: 'category-b1',
        companyId: 'company-b',
        parentId: null,
        name: 'Foreign Category',
        createdAt: new Date('2026-01-03T00:00:00.000Z'),
      },
    );

    const { app, ownerSessionCookie } = await createAuthenticatedApp({ itemGateway });
    const response = await request(app)
      .get('/item-categories')
      .set('Cookie', ownerSessionCookie);
    const anonymousResponse = await request(app).get('/item-categories');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      categories: [
        expect.objectContaining({ id: 'category-a1', companyId: 'company-a', name: 'Hardware' }),
        expect.objectContaining({
          id: 'category-a2',
          companyId: 'company-a',
          parentId: 'category-a1',
          name: 'Peripherals',
        }),
      ],
    });
    expect(anonymousResponse.status).toBe(401);
    expect((anonymousResponse.body as { error: { code: string } }).error.code).toBe('UNAUTHORIZED');
  });

  it('creates product and service items and forces service tracksStock to false', async () => {
    const { app, itemGateway, ownerSessionCookie } = await createAuthenticatedApp();

    const productResponse = await request(app)
      .post('/items')
      .set('Cookie', ownerSessionCookie)
      .send({
        name: 'Keyboard',
        type: 'product',
        unit: 'unit',
        unitPrice: 25,
        tracksStock: true,
      });

    const serviceResponse = await request(app)
      .post('/items')
      .set('Cookie', ownerSessionCookie)
      .send({
        name: 'Installation',
        type: 'service',
        unit: 'service',
        unitPrice: 10,
        tracksStock: true,
      });

    expect(productResponse.status).toBe(201);
    expect(productResponse.body).toEqual({ itemId: 'item-1' });
    expect(serviceResponse.status).toBe(201);
    expect(serviceResponse.body).toEqual({ itemId: 'item-2' });
    expect(itemGateway.items[1]?.tracksStock).toBe(false);
  });

  it('rejects unknown item fields such as currency', async () => {
    const { app, ownerSessionCookie } = await createAuthenticatedApp();

    const response = await request(app)
      .post('/items')
      .set('Cookie', ownerSessionCookie)
      .send({
        name: 'Keyboard',
        type: 'product',
        unit: 'unit',
        currency: 'USD',
      });

    expect(response.status).toBe(400);
    expect((response.body as { error: { code: string } }).error.code).toBe('BAD_REQUEST');
  });

  it('lists only active items from the authenticated tenant', async () => {
    const itemGateway = new InMemoryItemGateway();
    itemGateway.items.push(
      {
        id: 'item-a1',
        companyId: 'company-a',
        categoryId: null,
        sku: null,
        name: 'Visible item',
        type: 'product',
        unit: 'unit',
        unitPrice: 12,
        tracksStock: true,
        trackBatchMode: 'none',
        deletedAt: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      },
      {
        id: 'item-a2',
        companyId: 'company-a',
        categoryId: null,
        sku: null,
        name: 'Deleted item',
        type: 'product',
        unit: 'unit',
        unitPrice: 12,
        tracksStock: true,
        trackBatchMode: 'none',
        deletedAt: new Date('2026-01-02T00:00:00.000Z'),
        createdAt: new Date('2026-01-02T00:00:00.000Z'),
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      },
      {
        id: 'item-b1',
        companyId: 'company-b',
        categoryId: null,
        sku: null,
        name: 'Other tenant item',
        type: 'product',
        unit: 'unit',
        unitPrice: 15,
        tracksStock: true,
        trackBatchMode: 'none',
        deletedAt: null,
        createdAt: new Date('2026-01-03T00:00:00.000Z'),
        updatedAt: new Date('2026-01-03T00:00:00.000Z'),
      },
    );

    const { app, ownerSessionCookie } = await createAuthenticatedApp({ itemGateway });
    const response = await request(app)
      .get('/items')
      .set('Cookie', ownerSessionCookie);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      items: [
        expect.objectContaining({ id: 'item-a1', name: 'Visible item', companyId: 'company-a' }),
      ],
      nextCursor: null,
    });
  });

  it('returns not-found for cross-tenant item reads', async () => {
    const itemGateway = new InMemoryItemGateway();
    itemGateway.items.push({
      id: 'item-b1',
      companyId: 'company-b',
      categoryId: null,
      sku: null,
      name: 'Foreign item',
      type: 'product',
      unit: 'unit',
      unitPrice: 15,
      tracksStock: true,
      trackBatchMode: 'none',
      deletedAt: null,
      createdAt: new Date('2026-01-03T00:00:00.000Z'),
      updatedAt: new Date('2026-01-03T00:00:00.000Z'),
    });

    const { app, ownerSessionCookie } = await createAuthenticatedApp({ itemGateway });
    const response = await request(app)
      .get('/items/item-b1')
      .set('Cookie', ownerSessionCookie);

    expect(response.status).toBe(404);
    expect((response.body as { error: { code: string } }).error.code).toBe('NOT_FOUND');
  });

  it('updates mutable item fields and rejects type changes in the request body', async () => {
    const itemGateway = new InMemoryItemGateway();
    itemGateway.items.push({
      id: 'item-a1',
      companyId: 'company-a',
      categoryId: null,
      sku: 'SKU-1',
      name: 'Keyboard',
      type: 'product',
      unit: 'unit',
      unitPrice: 20,
      tracksStock: true,
      trackBatchMode: 'none',
      deletedAt: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    const { app, ownerSessionCookie } = await createAuthenticatedApp({ itemGateway });

    const updateResponse = await request(app)
      .patch('/items/item-a1')
      .set('Cookie', ownerSessionCookie)
      .send({
        name: 'Keyboard Pro',
        unitPrice: 22,
      });

    const rejectTypeResponse = await request(app)
      .patch('/items/item-a1')
      .set('Cookie', ownerSessionCookie)
      .send({
        type: 'service',
      });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body).toEqual({ itemId: 'item-a1' });
    expect(itemGateway.items[0]).toEqual(expect.objectContaining({ name: 'Keyboard Pro', unitPrice: 22 }));
    expect(rejectTypeResponse.status).toBe(400);
    expect((rejectTypeResponse.body as { error: { code: string } }).error.code).toBe('BAD_REQUEST');
  });

  it('allows owners to soft-delete items and forbids company users', async () => {
    const itemGateway = new InMemoryItemGateway();
    itemGateway.items.push({
      id: 'item-a1',
      companyId: 'company-a',
      categoryId: null,
      sku: null,
      name: 'Keyboard',
      type: 'product',
      unit: 'unit',
      unitPrice: 20,
      tracksStock: true,
      trackBatchMode: 'none',
      deletedAt: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    const { app, ownerSessionCookie, memberSessionCookie } = await createAuthenticatedApp({ itemGateway });

    const forbiddenResponse = await request(app)
      .delete('/items/item-a1')
      .set('Cookie', memberSessionCookie);

    const deleteResponse = await request(app)
      .delete('/items/item-a1')
      .set('Cookie', ownerSessionCookie);

    expect(forbiddenResponse.status).toBe(403);
    expect((forbiddenResponse.body as { error: { code: string } }).error.code).toBe('FORBIDDEN');
    expect(deleteResponse.status).toBe(204);
    expect(itemGateway.items[0]?.deletedAt).toBeInstanceOf(Date);
  });

  it('creates categories and maps cycle violations to conflict responses', async () => {
    const itemGateway = new InMemoryItemGateway();
    itemGateway.categories.push(
      {
        id: 'category-parent',
        companyId: 'company-a',
        parentId: null,
        name: 'Parent',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      },
      {
        id: 'category-child',
        companyId: 'company-a',
        parentId: 'category-parent',
        name: 'Child',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    );

    const { app, ownerSessionCookie } = await createAuthenticatedApp({ itemGateway });

    const createResponse = await request(app)
      .post('/item-categories')
      .set('Cookie', ownerSessionCookie)
      .send({
        name: 'Hardware',
        parentId: null,
      });

    const cycleResponse = await request(app)
      .patch('/item-categories/category-parent')
      .set('Cookie', ownerSessionCookie)
      .send({
        parentId: 'category-child',
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body).toEqual({ categoryId: 'category-3' });
    expect(cycleResponse.status).toBe(409);
    expect((cycleResponse.body as { error: { code: string } }).error.code).toBe('CONFLICT');
  });

  it('uses the authenticated company context when creating items', async () => {
    const itemGateway = new InMemoryItemGateway();
    const { app, ownerSessionCookie } = await createAuthenticatedApp({ itemGateway });

    const response = await request(app)
      .post('/items')
      .set('Cookie', ownerSessionCookie)
      .send({
        name: 'Mouse',
        type: 'product',
        unit: 'unit',
      });

    expect(response.status).toBe(201);
    expect(itemGateway.createItemCalls[0]?.companyId).toBe('company-a');
    expect(itemGateway.createItemCalls[0]?.actorUserId).toBe('owner-user');
  });
});
