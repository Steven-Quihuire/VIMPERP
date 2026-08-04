import { describe, expect, it } from 'vitest';

import type { AppDb } from '../../../shared/infrastructure/db/client';
import {
  auditEventsTable,
  itemCategoriesTable,
  itemsTable,
} from '../../../shared/infrastructure/db/schema';
import { CategoryCycleError } from '../domain/item';
import { createDrizzleItemGateway } from './drizzle-item.gateway';

type ItemRow = {
  id: string;
  companyId: string;
  localId: string | null;
  categoryId: string | null;
  sku: string | null;
  name: string;
  type: 'product' | 'service';
  unit: 'unit' | 'hour' | 'kg' | 'liter' | 'meter' | 'box' | 'service';
  unitPrice: string;
  tracksStock: boolean;
  trackBatchMode: 'none' | 'batch' | 'serial';
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type CategoryRow = {
  id: string;
  companyId: string;
  localId: string | null;
  parentId: string | null;
  name: string;
  createdAt: Date;
};

const cloneRow = <T>(value: T): T => structuredClone(value);

const createSelectBuilder = <T>(rows: T[]) => {
  const builder = {
    where: () => builder,
    orderBy: () => builder,
    limit: () => builder,
    then: <TResult1 = T[], TResult2 = never>(
      onfulfilled?: ((value: T[]) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ) => Promise.resolve(rows.map((row) => cloneRow(row))).then(onfulfilled, onrejected),
  };

  return builder;
};

const createFakeDb = ({
  items = [],
  categories = [],
}: {
  items?: ItemRow[];
  categories?: CategoryRow[];
} = {}) => {
  const state = {
    items: items.map((item) => cloneRow(item)),
    categories: categories.map((category) => cloneRow(category)),
  };
  const writes: Array<{ kind: 'insert' | 'update'; table: unknown; values: unknown }> = [];

  const select = () => ({
    from: (table: unknown) => {
      if (table === itemsTable) {
        return createSelectBuilder(state.items);
      }

      if (table === itemCategoriesTable) {
        return createSelectBuilder(state.categories);
      }

      return createSelectBuilder([]);
    },
  });

  const tx = {
    select,
    insert: (table: unknown) => ({
      values: (values: unknown) => {
        writes.push({ kind: 'insert', table, values: cloneRow(values) });

        if (table === itemsTable) {
          state.items.push(cloneRow(values as ItemRow));
        }

        if (table === itemCategoriesTable) {
          state.categories.push(cloneRow(values as CategoryRow));
        }

        return Promise.resolve([]);
      },
    }),
    update: (table: unknown) => ({
      set: (values: Record<string, unknown>) => ({
        where: () => {
          writes.push({ kind: 'update', table, values: cloneRow(values) });

          if (table === itemsTable) {
            const firstItem = state.items[0];

            if (firstItem) {
              Object.assign(firstItem, values);
            }
          }

          if (table === itemCategoriesTable) {
            const firstCategory = state.categories[0];

            if (firstCategory) {
              Object.assign(firstCategory, values);
            }
          }

          return Promise.resolve([]);
        },
      }),
    }),
  };

  const db = {
    select,
    transaction: async <T>(callback: (client: typeof tx) => Promise<T>) => await callback(tx),
  } as unknown as AppDb;

  return { db, state, writes };
};

describe('createDrizzleItemGateway', () => {
  it('creates an item and appends an item.created audit event', async () => {
    const { db, writes } = createFakeDb();
    const gateway = createDrizzleItemGateway(db, {
      createId: () => 'generated-id',
      now: () => new Date('2026-07-30T18:00:00.000Z'),
    });

    const result = await gateway.createItem({
      companyId: 'company-a',
      localId: null,
      actorUserId: 'user-1',
      correlationId: 'corr-1',
      name: 'Consulting Hour',
      type: 'service',
      unit: 'hour',
      sku: 'CONS-001',
      categoryId: 'category-1',
      unitPrice: 25,
      tracksStock: false,
      trackBatchMode: 'none',
    });

    expect(result).toEqual({ itemId: 'generated-id' });
    expect(writes).toEqual([
      {
        kind: 'insert',
        table: itemsTable,
        values: {
          categoryId: 'category-1',
          companyId: 'company-a',
          localId: null,
          createdAt: new Date('2026-07-30T18:00:00.000Z'),
          deletedAt: null,
          id: 'generated-id',
          name: 'Consulting Hour',
          sku: 'CONS-001',
          trackBatchMode: 'none',
          tracksStock: false,
          type: 'service',
          unit: 'hour',
          unitPrice: '25',
          updatedAt: new Date('2026-07-30T18:00:00.000Z'),
        },
      },
      {
        kind: 'insert',
        table: auditEventsTable,
        values: {
          actorUserId: 'user-1',
          companyId: 'company-a',
          correlationId: 'corr-1',
          createdAt: new Date('2026-07-30T18:00:00.000Z'),
          details: {},
          divisionId: null,
          entityId: 'generated-id',
          entityType: 'item',
          id: 'generated-id',
          localId: null,
          newValues: {
            categoryId: 'category-1',
            name: 'Consulting Hour',
            sku: 'CONS-001',
            trackBatchMode: 'none',
            tracksStock: false,
            type: 'service',
            unit: 'hour',
            unitPrice: 25,
          },
          oldValues: null,
          type: 'item.created',
        },
      },
    ]);
  });

  it('updates only mutable item fields and appends an item.updated audit event', async () => {
    const { db, state, writes } = createFakeDb({
      items: [
        {
          id: 'item-1',
          companyId: 'company-a',
          localId: null,
          categoryId: 'category-1',
          sku: 'SKU-1',
          name: 'Original Item',
          type: 'product',
          unit: 'unit',
          unitPrice: '10',
          tracksStock: true,
          trackBatchMode: 'none',
          deletedAt: null,
          createdAt: new Date('2026-07-01T00:00:00.000Z'),
          updatedAt: new Date('2026-07-01T00:00:00.000Z'),
        },
      ],
    });
    const gateway = createDrizzleItemGateway(db, {
      createId: () => 'audit-1',
      now: () => new Date('2026-07-30T19:00:00.000Z'),
    });

    const result = await gateway.updateItem({
      companyId: 'company-a',
      localId: null,
      actorUserId: 'user-1',
      correlationId: 'corr-2',
      itemId: 'item-1',
      name: 'Updated Item',
      sku: 'SKU-2',
      categoryId: null,
      unit: 'box',
      unitPrice: 50,
      tracksStock: false,
      trackBatchMode: 'serial',
    });

    expect(result).toEqual({ itemId: 'item-1' });
    expect(state.items[0]?.type).toBe('product');
    expect(writes).toEqual([
      {
        kind: 'update',
        table: itemsTable,
        values: {
          categoryId: null,
          name: 'Updated Item',
          sku: 'SKU-2',
          trackBatchMode: 'serial',
          tracksStock: false,
          unit: 'box',
          unitPrice: '50',
          updatedAt: new Date('2026-07-30T19:00:00.000Z'),
        },
      },
      {
        kind: 'insert',
        table: auditEventsTable,
        values: {
          actorUserId: 'user-1',
          companyId: 'company-a',
          correlationId: 'corr-2',
          createdAt: new Date('2026-07-30T19:00:00.000Z'),
          details: {},
          divisionId: null,
          entityId: 'item-1',
          entityType: 'item',
          id: 'audit-1',
          localId: null,
          newValues: {
            categoryId: null,
            name: 'Updated Item',
            sku: 'SKU-2',
            trackBatchMode: 'serial',
            tracksStock: false,
            type: 'product',
            unit: 'box',
            unitPrice: 50,
          },
          oldValues: {
            categoryId: 'category-1',
            name: 'Original Item',
            sku: 'SKU-1',
            trackBatchMode: 'none',
            tracksStock: true,
            type: 'product',
            unit: 'unit',
            unitPrice: 10,
          },
          type: 'item.updated',
        },
      },
    ]);
  });

  it('soft deletes an item and appends an item.deleted audit event', async () => {
    const { db, state, writes } = createFakeDb({
      items: [
        {
          id: 'item-1',
          companyId: 'company-a',
          localId: null,
          categoryId: null,
          sku: null,
          name: 'Disposable Item',
          type: 'product',
          unit: 'unit',
          unitPrice: '5',
          tracksStock: true,
          trackBatchMode: 'batch',
          deletedAt: null,
          createdAt: new Date('2026-07-01T00:00:00.000Z'),
          updatedAt: new Date('2026-07-01T00:00:00.000Z'),
        },
      ],
    });
    const gateway = createDrizzleItemGateway(db, {
      createId: () => 'audit-delete',
      now: () => new Date('2026-07-30T20:00:00.000Z'),
    });

    await gateway.softDeleteItem({
      companyId: 'company-a',
      localId: null,
      actorUserId: 'owner-1',
      correlationId: 'corr-3',
      itemId: 'item-1',
    });

    expect(state.items[0]?.deletedAt).toEqual(new Date('2026-07-30T20:00:00.000Z'));
    expect(writes).toEqual([
      {
        kind: 'update',
        table: itemsTable,
        values: {
          deletedAt: new Date('2026-07-30T20:00:00.000Z'),
          updatedAt: new Date('2026-07-30T20:00:00.000Z'),
        },
      },
      {
        kind: 'insert',
        table: auditEventsTable,
        values: {
          actorUserId: 'owner-1',
          companyId: 'company-a',
          correlationId: 'corr-3',
          createdAt: new Date('2026-07-30T20:00:00.000Z'),
          details: {},
          divisionId: null,
          entityId: 'item-1',
          entityType: 'item',
          id: 'audit-delete',
          localId: null,
          newValues: {
            deletedAt: new Date('2026-07-30T20:00:00.000Z'),
          },
          oldValues: null,
          type: 'item.deleted',
        },
      },
    ]);
  });

  it('respects includeDeleted when resolving item detail', async () => {
    const { db } = createFakeDb({
      items: [
        {
          id: 'item-1',
          companyId: 'company-a',
          localId: null,
          categoryId: null,
          sku: null,
          name: 'Deleted Item',
          type: 'service',
          unit: 'service',
          unitPrice: '100',
          tracksStock: false,
          trackBatchMode: 'none',
          deletedAt: new Date('2026-07-10T00:00:00.000Z'),
          createdAt: new Date('2026-07-01T00:00:00.000Z'),
          updatedAt: new Date('2026-07-10T00:00:00.000Z'),
        },
      ],
    });
    const gateway = createDrizzleItemGateway(db);

    await expect(
      gateway.getItemById({ companyId: 'company-a', localId: null, itemId: 'item-1' }),
    ).resolves.toBeNull();

    await expect(
      gateway.getItemById({ companyId: 'company-a', localId: null, itemId: 'item-1', includeDeleted: true }),
    ).resolves.toEqual({
      id: 'item-1',
      companyId: 'company-a',
      localId: null,
      categoryId: null,
      sku: null,
      name: 'Deleted Item',
      type: 'service',
      unit: 'service',
      unitPrice: 100,
      tracksStock: false,
      trackBatchMode: 'none',
      deletedAt: new Date('2026-07-10T00:00:00.000Z'),
      createdAt: new Date('2026-07-01T00:00:00.000Z'),
      updatedAt: new Date('2026-07-10T00:00:00.000Z'),
    });
  });

  it('lists only active items for the requested company ordered by newest first', async () => {
    const { db } = createFakeDb({
      items: [
        {
          id: 'item-old',
          companyId: 'company-a',
          localId: null,
          categoryId: null,
          sku: 'A-1',
          name: 'Older Item',
          type: 'product',
          unit: 'unit',
          unitPrice: '10',
          tracksStock: true,
          trackBatchMode: 'none',
          deletedAt: null,
          createdAt: new Date('2026-07-01T00:00:00.000Z'),
          updatedAt: new Date('2026-07-01T00:00:00.000Z'),
        },
        {
          id: 'item-deleted',
          companyId: 'company-a',
          localId: null,
          categoryId: null,
          sku: 'A-2',
          name: 'Deleted Item',
          type: 'product',
          unit: 'unit',
          unitPrice: '11',
          tracksStock: true,
          trackBatchMode: 'none',
          deletedAt: new Date('2026-07-02T00:00:00.000Z'),
          createdAt: new Date('2026-07-02T00:00:00.000Z'),
          updatedAt: new Date('2026-07-02T00:00:00.000Z'),
        },
        {
          id: 'item-other-company',
          companyId: 'company-b',
          localId: null,
          categoryId: null,
          sku: 'B-1',
          name: 'Foreign Item',
          type: 'service',
          unit: 'service',
          unitPrice: '12',
          tracksStock: false,
          trackBatchMode: 'none',
          deletedAt: null,
          createdAt: new Date('2026-07-03T00:00:00.000Z'),
          updatedAt: new Date('2026-07-03T00:00:00.000Z'),
        },
        {
          id: 'item-new',
          companyId: 'company-a',
          localId: null,
          categoryId: null,
          sku: 'A-3',
          name: 'Newest Item',
          type: 'product',
          unit: 'box',
          unitPrice: '15',
          tracksStock: true,
          trackBatchMode: 'batch',
          deletedAt: null,
          createdAt: new Date('2026-07-04T00:00:00.000Z'),
          updatedAt: new Date('2026-07-04T00:00:00.000Z'),
        },
      ],
    });
    const gateway = createDrizzleItemGateway(db);

    await expect(
      gateway.listItems({ companyId: 'company-a', localId: null, limit: 10 }),
    ).resolves.toEqual({
      items: [
        {
          id: 'item-new',
          companyId: 'company-a',
          localId: null,
          categoryId: null,
          sku: 'A-3',
          name: 'Newest Item',
          type: 'product',
          unit: 'box',
          unitPrice: 15,
          tracksStock: true,
          trackBatchMode: 'batch',
          deletedAt: null,
          createdAt: new Date('2026-07-04T00:00:00.000Z'),
          updatedAt: new Date('2026-07-04T00:00:00.000Z'),
        },
        {
          id: 'item-old',
          companyId: 'company-a',
          localId: null,
          categoryId: null,
          sku: 'A-1',
          name: 'Older Item',
          type: 'product',
          unit: 'unit',
          unitPrice: 10,
          tracksStock: true,
          trackBatchMode: 'none',
          deletedAt: null,
          createdAt: new Date('2026-07-01T00:00:00.000Z'),
          updatedAt: new Date('2026-07-01T00:00:00.000Z'),
        },
      ],
      nextCursor: null,
    });
  });

  it('returns null when a company tries to access another company item', async () => {
    const { db } = createFakeDb({
      items: [
        {
          id: 'item-foreign',
          companyId: 'company-b',
          localId: null,
          categoryId: null,
          sku: null,
          name: 'Foreign Item',
          type: 'product',
          unit: 'unit',
          unitPrice: '20',
          tracksStock: true,
          trackBatchMode: 'none',
          deletedAt: null,
          createdAt: new Date('2026-07-01T00:00:00.000Z'),
          updatedAt: new Date('2026-07-01T00:00:00.000Z'),
        },
      ],
    });
    const gateway = createDrizzleItemGateway(db);

    await expect(
      gateway.getItemById({ companyId: 'company-a', localId: null, itemId: 'item-foreign' }),
    ).resolves.toBeNull();
  });

  it('rejects category parent cycles for self and descendant assignments', async () => {
    const { db } = createFakeDb({
      categories: [
        {
          id: 'root',
          companyId: 'company-a',
          localId: null,
          parentId: null,
          name: 'Root',
          createdAt: new Date('2026-07-01T00:00:00.000Z'),
        },
        {
          id: 'child',
          companyId: 'company-a',
          localId: null,
          parentId: 'root',
          name: 'Child',
          createdAt: new Date('2026-07-02T00:00:00.000Z'),
        },
        {
          id: 'grandchild',
          companyId: 'company-a',
          localId: null,
          parentId: 'child',
          name: 'Grandchild',
          createdAt: new Date('2026-07-03T00:00:00.000Z'),
        },
      ],
    });
    const gateway = createDrizzleItemGateway(db);

    await expect(
      gateway.updateCategory({
        companyId: 'company-a',
        localId: null,
        actorUserId: 'user-1',
        correlationId: 'corr-4',
        categoryId: 'root',
        parentId: 'root',
      }),
    ).rejects.toBeInstanceOf(CategoryCycleError);

    await expect(
      gateway.updateCategory({
        companyId: 'company-a',
        localId: null,
        actorUserId: 'user-1',
        correlationId: 'corr-5',
        categoryId: 'root',
        parentId: 'grandchild',
      }),
    ).rejects.toBeInstanceOf(CategoryCycleError);
  });

  it('lists only company-wide items when localId is null', async () => {
    const { db } = createFakeDb({
      items: [
        {
          id: 'item-company',
          companyId: 'company-a',
          localId: null,
          categoryId: null,
          sku: 'A-1',
          name: 'Company-wide Item',
          type: 'product',
          unit: 'unit',
          unitPrice: '10',
          tracksStock: true,
          trackBatchMode: 'none',
          deletedAt: null,
          createdAt: new Date('2026-07-01T00:00:00.000Z'),
          updatedAt: new Date('2026-07-01T00:00:00.000Z'),
        },
        {
          id: 'item-local-1',
          companyId: 'company-a',
          localId: 'local-1',
          categoryId: null,
          sku: 'A-2',
          name: 'Local 1 Item',
          type: 'product',
          unit: 'unit',
          unitPrice: '11',
          tracksStock: true,
          trackBatchMode: 'none',
          deletedAt: null,
          createdAt: new Date('2026-07-02T00:00:00.000Z'),
          updatedAt: new Date('2026-07-02T00:00:00.000Z'),
        },
      ],
    });
    const gateway = createDrizzleItemGateway(db);

    const result = await gateway.listItems({
      companyId: 'company-a',
      localId: null,
      limit: 10,
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.id).toBe('item-company');
    expect(result.items[0]?.localId).toBeNull();
  });

  it('lists only local-scoped items when localId is set', async () => {
    const { db } = createFakeDb({
      items: [
        {
          id: 'item-company',
          companyId: 'company-a',
          localId: null,
          categoryId: null,
          sku: 'A-1',
          name: 'Company-wide Item',
          type: 'product',
          unit: 'unit',
          unitPrice: '10',
          tracksStock: true,
          trackBatchMode: 'none',
          deletedAt: null,
          createdAt: new Date('2026-07-01T00:00:00.000Z'),
          updatedAt: new Date('2026-07-01T00:00:00.000Z'),
        },
        {
          id: 'item-local-1',
          companyId: 'company-a',
          localId: 'local-1',
          categoryId: null,
          sku: 'A-2',
          name: 'Local 1 Item',
          type: 'product',
          unit: 'unit',
          unitPrice: '11',
          tracksStock: true,
          trackBatchMode: 'none',
          deletedAt: null,
          createdAt: new Date('2026-07-02T00:00:00.000Z'),
          updatedAt: new Date('2026-07-02T00:00:00.000Z'),
        },
        {
          id: 'item-local-2',
          companyId: 'company-a',
          localId: 'local-2',
          categoryId: null,
          sku: 'A-3',
          name: 'Local 2 Item',
          type: 'product',
          unit: 'unit',
          unitPrice: '12',
          tracksStock: true,
          trackBatchMode: 'none',
          deletedAt: null,
          createdAt: new Date('2026-07-03T00:00:00.000Z'),
          updatedAt: new Date('2026-07-03T00:00:00.000Z'),
        },
      ],
    });
    const gateway = createDrizzleItemGateway(db);

    const result = await gateway.listItems({
      companyId: 'company-a',
      localId: 'local-1',
      limit: 10,
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.id).toBe('item-local-1');
    expect(result.items[0]?.localId).toBe('local-1');
  });

  it('filters out wrong-localId rows via normalizeItemRows defensive double-filter', async () => {
    const { db } = createFakeDb({
      items: [
        {
          id: 'item-correct',
          companyId: 'company-a',
          localId: 'local-1',
          categoryId: null,
          sku: 'A-1',
          name: 'Correct Item',
          type: 'product',
          unit: 'unit',
          unitPrice: '10',
          tracksStock: true,
          trackBatchMode: 'none',
          deletedAt: null,
          createdAt: new Date('2026-07-01T00:00:00.000Z'),
          updatedAt: new Date('2026-07-01T00:00:00.000Z'),
        },
        {
          id: 'item-wrong-local',
          companyId: 'company-a',
          localId: 'local-2',
          categoryId: null,
          sku: 'A-2',
          name: 'Wrong Local Item',
          type: 'product',
          unit: 'unit',
          unitPrice: '11',
          tracksStock: true,
          trackBatchMode: 'none',
          deletedAt: null,
          createdAt: new Date('2026-07-02T00:00:00.000Z'),
          updatedAt: new Date('2026-07-02T00:00:00.000Z'),
        },
      ],
    });
    const gateway = createDrizzleItemGateway(db);

    const result = await gateway.listItems({
      companyId: 'company-a',
      localId: 'local-1',
      limit: 10,
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.id).toBe('item-correct');
  });

  it('writes localId into the item row on create', async () => {
    const { db, writes } = createFakeDb();
    const gateway = createDrizzleItemGateway(db, {
      createId: () => 'generated-id',
      now: () => new Date('2026-07-30T18:00:00.000Z'),
    });

    await gateway.createItem({
      companyId: 'company-a',
      localId: 'local-1',
      actorUserId: 'user-1',
      correlationId: 'corr-1',
      name: 'Local Widget',
      type: 'product',
      unit: 'unit',
      sku: 'W-1',
      categoryId: null,
      unitPrice: 25,
      tracksStock: false,
      trackBatchMode: 'none',
    });

    const itemInsert = writes.find(
      (w) => w.kind === 'insert' && w.table === itemsTable,
    );
    expect((itemInsert?.values as { localId: string | null }).localId).toBe(
      'local-1',
    );
  });

  it('writes null localId into the item row on create at company level', async () => {
    const { db, writes } = createFakeDb();
    const gateway = createDrizzleItemGateway(db, {
      createId: () => 'generated-id',
      now: () => new Date('2026-07-30T18:00:00.000Z'),
    });

    await gateway.createItem({
      companyId: 'company-a',
      localId: null,
      actorUserId: 'user-1',
      correlationId: 'corr-1',
      name: 'Company Widget',
      type: 'product',
      unit: 'unit',
      sku: 'W-2',
      categoryId: null,
      unitPrice: 25,
      tracksStock: false,
      trackBatchMode: 'none',
    });

    const itemInsert = writes.find(
      (w) => w.kind === 'insert' && w.table === itemsTable,
    );
    expect((itemInsert?.values as { localId: string | null }).localId).toBeNull();
  });

  it('populates localId in toItem output', async () => {
    const { db } = createFakeDb({
      items: [
        {
          id: 'item-1',
          companyId: 'company-a',
          localId: 'local-1',
          categoryId: null,
          sku: null,
          name: 'Test Item',
          type: 'product',
          unit: 'unit',
          unitPrice: '10',
          tracksStock: false,
          trackBatchMode: 'none',
          deletedAt: null,
          createdAt: new Date('2026-07-01T00:00:00.000Z'),
          updatedAt: new Date('2026-07-01T00:00:00.000Z'),
        },
      ],
    });
    const gateway = createDrizzleItemGateway(db);

    const item = await gateway.getItemById({
      companyId: 'company-a',
      localId: 'local-1',
      itemId: 'item-1',
    });

    expect(item?.localId).toBe('local-1');
  });

  it('includes localId in audit events on item creation', async () => {
    const { db, writes } = createFakeDb();
    const gateway = createDrizzleItemGateway(db, {
      createId: () => 'generated-id',
      now: () => new Date('2026-07-30T18:00:00.000Z'),
    });

    await gateway.createItem({
      companyId: 'company-a',
      localId: 'local-1',
      actorUserId: 'user-1',
      correlationId: 'corr-1',
      name: 'Local Widget',
      type: 'product',
      unit: 'unit',
      sku: 'W-1',
      categoryId: null,
      unitPrice: 25,
      tracksStock: false,
      trackBatchMode: 'none',
    });

    const auditInsert = writes.find(
      (w) => w.kind === 'insert' && w.table === auditEventsTable,
    );
    expect((auditInsert?.values as { localId: string | null }).localId).toBe(
      'local-1',
    );
    expect(
      (auditInsert?.values as { divisionId: string | null }).divisionId,
    ).toBeNull();
  });

  it('lists only categories for the requested localId', async () => {
    const { db } = createFakeDb({
      categories: [
        {
          id: 'cat-company',
          companyId: 'company-a',
          localId: null,
          parentId: null,
          name: 'Company Category',
          createdAt: new Date('2026-07-01T00:00:00.000Z'),
        },
        {
          id: 'cat-local-1',
          companyId: 'company-a',
          localId: 'local-1',
          parentId: null,
          name: 'Local 1 Category',
          createdAt: new Date('2026-07-02T00:00:00.000Z'),
        },
      ],
    });
    const gateway = createDrizzleItemGateway(db);

    const companyResult = await gateway.listCategories({
      companyId: 'company-a',
      localId: null,
    });
    expect(companyResult).toHaveLength(1);
    expect(companyResult[0]?.id).toBe('cat-company');
    expect(companyResult[0]?.localId).toBeNull();

    const localResult = await gateway.listCategories({
      companyId: 'company-a',
      localId: 'local-1',
    });
    expect(localResult).toHaveLength(1);
    expect(localResult[0]?.id).toBe('cat-local-1');
    expect(localResult[0]?.localId).toBe('local-1');
  });
});
