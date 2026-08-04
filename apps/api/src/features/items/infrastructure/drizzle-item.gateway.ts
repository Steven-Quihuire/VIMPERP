import { randomUUID } from 'node:crypto';

import { and, desc, eq, isNull, sql } from 'drizzle-orm';

import type { AppDb } from '../../../shared/infrastructure/db/client';
import {
  auditEventsTable,
  itemCategoriesTable,
  itemsTable,
} from '../../../shared/infrastructure/db/schema';
import {
  CategoryCycleError,
  CategoryNotFoundError,
  ItemNotFoundError,
  ItemSkuConflictError,
  ItemTypeImmutableError,
  type CategoryGateway,
  type Item,
  type ItemCatalogGateway,
  type ItemCategory,
} from '../domain/item';

type ItemRow = typeof itemsTable.$inferSelect;
type CategoryRow = typeof itemCategoriesTable.$inferSelect;

const isUniqueViolation = (error: unknown) => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === '23505'
  );
};

const toItem = (row: ItemRow): Item => ({
  id: row.id,
  companyId: row.companyId,
  localId: row.localId,
  categoryId: row.categoryId,
  sku: row.sku,
  name: row.name,
  type: row.type,
  unit: row.unit,
  unitPrice: Number(row.unitPrice),
  tracksStock: row.tracksStock,
  trackBatchMode: row.trackBatchMode,
  deletedAt: row.deletedAt,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

const toItemCategory = (row: CategoryRow): ItemCategory => ({
  id: row.id,
  companyId: row.companyId,
  localId: row.localId,
  parentId: row.parentId,
  name: row.name,
  createdAt: row.createdAt,
});

const toItemAuditValues = (item: {
  categoryId: string | null;
  sku: string | null;
  name: string;
  type: Item['type'];
  unit: Item['unit'];
  unitPrice: number;
  tracksStock: boolean;
  trackBatchMode: Item['trackBatchMode'];
}) => ({
  categoryId: item.categoryId,
  name: item.name,
  sku: item.sku,
  trackBatchMode: item.trackBatchMode,
  tracksStock: item.tracksStock,
  type: item.type,
  unit: item.unit,
  unitPrice: item.unitPrice,
});

const normalizeItemRows = (
  rows: ItemRow[],
  companyId: string,
  localId: string | null,
) => {
  return rows.filter(
    (row) => row.companyId === companyId && (row.localId ?? null) === (localId ?? null),
  );
};

const normalizeCategoryRows = (
  rows: CategoryRow[],
  companyId: string,
  localId: string | null,
) => {
  return rows.filter(
    (row) => row.companyId === companyId && (row.localId ?? null) === (localId ?? null),
  );
};

const itemLocalFilter = (localId: string | null) =>
  sql`${itemsTable.localId} IS NOT DISTINCT FROM ${localId}`;

const categoryLocalFilter = (localId: string | null) =>
  sql`${itemCategoriesTable.localId} IS NOT DISTINCT FROM ${localId}`;

export const createDrizzleItemGateway = (
  db: AppDb,
  {
    createId,
    now = () => new Date(),
  }: {
    createId?: () => string;
    now?: () => Date;
  } = {},
): ItemCatalogGateway & CategoryGateway => {
  const generateId = createId ?? randomUUID;

  const gateway: ItemCatalogGateway & CategoryGateway = {
    createItem: async (input) => {
      const createdAt = now();
      const itemId = generateId();
      const itemRow = {
        id: itemId,
        companyId: input.companyId,
        localId: input.localId,
        categoryId: input.categoryId,
        sku: input.sku,
        name: input.name,
        type: input.type,
        unit: input.unit,
        unitPrice: String(input.unitPrice),
        tracksStock: input.tracksStock,
        trackBatchMode: input.trackBatchMode,
        deletedAt: null,
        createdAt,
        updatedAt: createdAt,
      } satisfies typeof itemsTable.$inferInsert;

      try {
        return await db.transaction(async (tx) => {
          await tx.insert(itemsTable).values(itemRow);
          await tx.insert(auditEventsTable).values({
            id: generateId(),
            actorUserId: input.actorUserId,
            companyId: input.companyId,
            divisionId: null,
            localId: input.localId,
            type: 'item.created',
            correlationId: input.correlationId,
            entityType: 'item',
            entityId: itemId,
            details: {},
            oldValues: null,
            newValues: toItemAuditValues({
              categoryId: input.categoryId,
              sku: input.sku,
              name: input.name,
              type: input.type,
              unit: input.unit,
              unitPrice: input.unitPrice,
              tracksStock: input.tracksStock,
              trackBatchMode: input.trackBatchMode,
            }),
            createdAt,
          });

          return { itemId };
        });
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new ItemSkuConflictError();
        }

        throw error;
      }
    },
    updateItem: async (input) => {
      const runtimeInput = input as Record<string, unknown>;

      if ('type' in runtimeInput) {
        throw new ItemTypeImmutableError();
      }

      const rows = await db
        .select()
        .from(itemsTable)
        .where(
          and(
            eq(itemsTable.companyId, input.companyId),
            itemLocalFilter(input.localId),
            eq(itemsTable.id, input.itemId),
            isNull(itemsTable.deletedAt),
          ),
        )
        .limit(1);
      const current = normalizeItemRows(rows, input.companyId, input.localId).find(
        (row) => row.id === input.itemId && row.deletedAt === null,
      );

      if (!current) {
        throw new ItemNotFoundError();
      }

      const updatedAt = now();
      const patch: Partial<typeof itemsTable.$inferInsert> = {
        updatedAt,
      };

      if (input.name !== undefined) {
        patch.name = input.name;
      }

      if (input.unit !== undefined) {
        patch.unit = input.unit;
      }

      if (input.sku !== undefined) {
        patch.sku = input.sku;
      }

      if (input.categoryId !== undefined) {
        patch.categoryId = input.categoryId;
      }

      if (input.unitPrice !== undefined) {
        patch.unitPrice = String(input.unitPrice);
      }

      if (input.tracksStock !== undefined) {
        patch.tracksStock = input.tracksStock;
      }

      if (input.trackBatchMode !== undefined) {
        patch.trackBatchMode = input.trackBatchMode;
      }

      const updatedItem = {
        ...toItem(current),
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.unit !== undefined ? { unit: input.unit } : {}),
        ...(input.sku !== undefined ? { sku: input.sku } : {}),
        ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
        ...(input.unitPrice !== undefined ? { unitPrice: input.unitPrice } : {}),
        ...(input.tracksStock !== undefined ? { tracksStock: input.tracksStock } : {}),
        ...(input.trackBatchMode !== undefined
          ? { trackBatchMode: input.trackBatchMode }
          : {}),
        updatedAt,
      } satisfies Item;

      try {
        return await db.transaction(async (tx) => {
          await tx
            .update(itemsTable)
            .set(patch)
            .where(
              and(
                eq(itemsTable.companyId, input.companyId),
                itemLocalFilter(input.localId),
                eq(itemsTable.id, input.itemId),
                isNull(itemsTable.deletedAt),
              ),
            );
          await tx.insert(auditEventsTable).values({
            id: generateId(),
            actorUserId: input.actorUserId,
            companyId: input.companyId,
            divisionId: null,
            localId: input.localId,
            type: 'item.updated',
            correlationId: input.correlationId,
            entityType: 'item',
            entityId: input.itemId,
            details: {},
            oldValues: toItemAuditValues(toItem(current)),
            newValues: toItemAuditValues(updatedItem),
            createdAt: updatedAt,
          });

          return { itemId: input.itemId };
        });
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new ItemSkuConflictError();
        }

        throw error;
      }
    },
    softDeleteItem: async (input) => {
      const rows = await db
        .select()
        .from(itemsTable)
        .where(
          and(
            eq(itemsTable.companyId, input.companyId),
            itemLocalFilter(input.localId),
            eq(itemsTable.id, input.itemId),
            isNull(itemsTable.deletedAt),
          ),
        )
        .limit(1);
      const current = normalizeItemRows(rows, input.companyId, input.localId).find(
        (row) => row.id === input.itemId && row.deletedAt === null,
      );

      if (!current) {
        throw new ItemNotFoundError();
      }

      const deletedAt = now();

      await db.transaction(async (tx) => {
        await tx
          .update(itemsTable)
          .set({ deletedAt, updatedAt: deletedAt })
          .where(
            and(
              eq(itemsTable.companyId, input.companyId),
              itemLocalFilter(input.localId),
              eq(itemsTable.id, input.itemId),
              isNull(itemsTable.deletedAt),
            ),
          );
        await tx.insert(auditEventsTable).values({
          id: generateId(),
          actorUserId: input.actorUserId,
          companyId: input.companyId,
          divisionId: null,
          localId: input.localId,
          type: 'item.deleted',
          correlationId: input.correlationId,
          entityType: 'item',
          entityId: input.itemId,
          details: {},
          oldValues: null,
          newValues: { deletedAt },
          createdAt: deletedAt,
        });
      });
    },
    getItemById: async ({ companyId, localId, itemId, includeDeleted = false }) => {
      const rows = await db
        .select()
        .from(itemsTable)
        .where(
          includeDeleted
            ? and(
                eq(itemsTable.companyId, companyId),
                itemLocalFilter(localId),
                eq(itemsTable.id, itemId),
              )
            : and(
                eq(itemsTable.companyId, companyId),
                itemLocalFilter(localId),
                eq(itemsTable.id, itemId),
                isNull(itemsTable.deletedAt),
              ),
        )
        .limit(1);
      const item = normalizeItemRows(rows, companyId, localId).find((row) => {
        if (row.id !== itemId) {
          return false;
        }

        if (!includeDeleted && row.deletedAt !== null) {
          return false;
        }

        return true;
      });

      return item ? toItem(item) : null;
    },
    listItems: async ({ companyId, localId, limit }) => {
      const rows = await db
        .select()
        .from(itemsTable)
        .where(
          and(
            eq(itemsTable.companyId, companyId),
            itemLocalFilter(localId),
            isNull(itemsTable.deletedAt),
          ),
        )
        .orderBy(desc(itemsTable.createdAt))
        .limit(limit);
      const items = normalizeItemRows(rows, companyId, localId)
        .filter((row) => row.deletedAt === null)
        .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
        .slice(0, limit)
        .map((row) => toItem(row));

      return {
        items,
        nextCursor: null,
      };
    },
    createCategory: async (input) => {
      if (input.parentId !== null) {
        const parent = await gateway.getCategoryById({
          companyId: input.companyId,
          localId: input.localId,
          categoryId: input.parentId,
        });

        if (!parent) {
          throw new CategoryNotFoundError();
        }
      }

      const categoryId = generateId();
      const createdAt = now();

      await db.insert(itemCategoriesTable).values({
        id: categoryId,
        companyId: input.companyId,
        localId: input.localId,
        parentId: input.parentId,
        name: input.name,
        createdAt,
      });

      return { categoryId };
    },
    getCategoryById: async ({ companyId, localId, categoryId }) => {
      const rows = await db
        .select()
        .from(itemCategoriesTable)
        .where(
          and(
            eq(itemCategoriesTable.companyId, companyId),
            categoryLocalFilter(localId),
            eq(itemCategoriesTable.id, categoryId),
          ),
        )
        .limit(1);
      const category = normalizeCategoryRows(rows, companyId, localId).find(
        (row) => row.id === categoryId,
      );

      return category ? toItemCategory(category) : null;
    },
    listCategories: async ({ companyId, localId }) => {
      const rows = await db
        .select()
        .from(itemCategoriesTable)
        .where(
          and(
            eq(itemCategoriesTable.companyId, companyId),
            categoryLocalFilter(localId),
          ),
        );

      return normalizeCategoryRows(rows, companyId, localId).map((row) => toItemCategory(row));
    },
    getDescendantIds: async ({ companyId, localId, categoryId }) => {
      const categories = await gateway.listCategories({ companyId, localId });
      const descendants: string[] = [];
      const queue = [categoryId];

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

      return descendants;
    },
    updateCategory: async (input) => {
      const current = await gateway.getCategoryById({
        companyId: input.companyId,
        localId: input.localId,
        categoryId: input.categoryId,
      });

      if (!current) {
        throw new CategoryNotFoundError();
      }

      if (input.parentId !== undefined) {
        if (input.parentId === input.categoryId) {
          throw new CategoryCycleError();
        }

        if (input.parentId !== null) {
          const parent = await gateway.getCategoryById({
            companyId: input.companyId,
            localId: input.localId,
            categoryId: input.parentId,
          });

          if (!parent) {
            throw new CategoryNotFoundError();
          }

          const descendantIds = await gateway.getDescendantIds({
            companyId: input.companyId,
            localId: input.localId,
            categoryId: input.categoryId,
          });

          if (descendantIds.includes(input.parentId)) {
            throw new CategoryCycleError();
          }
        }
      }

      const patch: Partial<typeof itemCategoriesTable.$inferInsert> = {};

      if (input.name !== undefined) {
        patch.name = input.name;
      }

      if (input.parentId !== undefined) {
        patch.parentId = input.parentId;
      }

      await db
        .update(itemCategoriesTable)
        .set(patch)
        .where(
          and(
            eq(itemCategoriesTable.companyId, input.companyId),
            categoryLocalFilter(input.localId),
            eq(itemCategoriesTable.id, input.categoryId),
          ),
        );

      return { categoryId: input.categoryId };
    },
  };

  return gateway;
};
