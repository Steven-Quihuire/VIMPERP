import { randomUUID } from 'node:crypto';

import { eq } from 'drizzle-orm';

import type { AppDb } from '../../../shared/infrastructure/db/client';
import {
  auditEventsTable,
  areasTable,
  divisionsTable,
  employeesTable,
  itemsTable,
  localsTable,
  membershipsTable,
  pointsOfSaleTable,
  warehousesTable,
} from '../../../shared/infrastructure/db/schema';
import {
  AreaNameConflictError,
  AreaNotFoundError,
  DivisionNameConflictError,
  DivisionNotFoundError,
  LocalNameConflictError,
  LocalNotFoundError,
  PointOfSaleNameConflictError,
  PointOfSaleNotFoundError,
  type Area,
  type Division,
  type Local,
  orgHierarchyAuditEventTypes,
  type OrgHierarchyGateway,
  type PointOfSale,
  type Warehouse,
  WarehouseNameConflictError,
  WarehouseNotFoundError,
} from '../domain/org-hierarchy';

type AreaRow = typeof areasTable.$inferSelect;
type DivisionRow = typeof divisionsTable.$inferSelect;
type LocalRow = typeof localsTable.$inferSelect;
type PointOfSaleRow = typeof pointsOfSaleTable.$inferSelect;
type WarehouseRow = typeof warehousesTable.$inferSelect;

const normalizeDivisions = (
  rows: DivisionRow[],
  companyId: string,
): DivisionRow[] => rows.filter((row) => row.companyId === companyId);

const normalizeLocals = (
  rows: LocalRow[],
  companyId: string,
): LocalRow[] => rows.filter((row) => row.companyId === companyId);

const normalizeLocalsByDivision = (
  rows: LocalRow[],
  divisionId: string,
): LocalRow[] => rows.filter((row) => row.divisionId === divisionId);

const normalizeItemsByLocal = (
  rows: { localId: string | null; deletedAt: Date | null }[],
  localId: string,
) => rows.filter((row) => row.localId === localId && row.deletedAt === null);

const normalizeMembershipsByLocal = (
  rows: { localId: string | null }[],
  localId: string,
) => rows.filter((row) => row.localId === localId);

const normalizeAreas = (rows: AreaRow[], companyId: string): AreaRow[] =>
  rows.filter((row) => row.companyId === companyId);

const normalizeAreasByDivision = (rows: AreaRow[], divisionId: string): AreaRow[] =>
  rows.filter((row) => row.divisionId === divisionId);

const normalizeAreasByLocal = (rows: AreaRow[], localId: string): AreaRow[] =>
  rows.filter((row) => row.localId === localId);

const normalizeWarehouses = (
  rows: WarehouseRow[],
  companyId: string,
): WarehouseRow[] => rows.filter((row) => row.companyId === companyId);

const normalizeWarehousesByArea = (
  rows: WarehouseRow[],
  areaId: string,
): WarehouseRow[] => rows.filter((row) => row.areaId === areaId);

const normalizeWarehousesByLocal = (
  rows: WarehouseRow[],
  localId: string,
): WarehouseRow[] => rows.filter((row) => row.localId === localId);

const normalizePointsOfSale = (
  rows: PointOfSaleRow[],
  companyId: string,
): PointOfSaleRow[] => rows.filter((row) => row.companyId === companyId);

const normalizePointsOfSaleByArea = (
  rows: PointOfSaleRow[],
  areaId: string,
): PointOfSaleRow[] => rows.filter((row) => row.areaId === areaId);

const normalizePointsOfSaleByLocal = (
  rows: PointOfSaleRow[],
  localId: string,
): PointOfSaleRow[] => rows.filter((row) => row.localId === localId);

const normalizeEmployeesByArea = (
  rows: { areaId: string | null }[],
  areaId: string,
) => rows.filter((row) => row.areaId === areaId);

const isUniqueViolation = (error: unknown) => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === '23505'
  );
};

const toDivision = (row: DivisionRow): Division => ({
  id: row.id,
  companyId: row.companyId,
  name: row.name,
  createdAt: row.createdAt,
});

const toLocal = (row: LocalRow): Local => ({
  id: row.id,
  companyId: row.companyId,
  divisionId: row.divisionId,
  name: row.name,
  locale: row.locale,
});

const toArea = (row: AreaRow): Area => ({
  id: row.id,
  companyId: row.companyId,
  divisionId: row.divisionId,
  localId: row.localId,
  name: row.name,
  kind: 'area',
  createdAt: row.createdAt,
});

const toWarehouse = (row: WarehouseRow): Warehouse => ({
  id: row.id,
  companyId: row.companyId,
  areaId: row.areaId,
  localId: row.localId,
  name: row.name,
  createdAt: row.createdAt,
});

const toPointOfSale = (row: PointOfSaleRow): PointOfSale => ({
  id: row.id,
  companyId: row.companyId,
  areaId: row.areaId,
  localId: row.localId,
  name: row.name,
  createdAt: row.createdAt,
});

const isRootLocalConflict = (local: LocalRow, name: string) =>
  local.divisionId === null && local.name === name;

const isDivisionLocalConflict = (
  local: LocalRow,
  divisionId: string,
  name: string,
) => local.divisionId === divisionId && local.name === name;

const createAuditDetail = (entityType: string) => ({ source: 'org-hierarchy', entityType });

export const createDrizzleOrgHierarchyGateway = (
  db: AppDb,
  {
    createId,
    now = () => new Date(),
  }: {
    createId?: () => string;
    now?: () => Date;
  } = {},
): OrgHierarchyGateway => {
  const generateId = createId ?? randomUUID;

  const gateway: OrgHierarchyGateway = {
    createDivision: async (input) => {
      const divisionId = generateId();
      const createdAt = now();

      try {
        await db.transaction(async (tx) => {
          await tx.insert(divisionsTable).values({
            id: divisionId,
            companyId: input.companyId,
            name: input.name,
            createdAt,
          });
          await tx.insert(auditEventsTable).values({
            id: generateId(),
            actorUserId: input.actorUserId,
            companyId: input.companyId,
            divisionId,
            localId: null,
            type: orgHierarchyAuditEventTypes.divisionCreated,
            correlationId: input.correlationId,
            entityType: 'division',
            entityId: divisionId,
            details: createAuditDetail('division'),
            oldValues: null,
            newValues: { name: input.name },
            createdAt,
          });
        });
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new DivisionNameConflictError();
        }
        throw error;
      }

      return {
        id: divisionId,
        companyId: input.companyId,
        name: input.name,
        createdAt,
      };
    },
    listDivisions: async (companyId) => {
      const rows = await db
        .select()
        .from(divisionsTable)
        .where(eq(divisionsTable.companyId, companyId));

      return normalizeDivisions(rows, companyId).map(toDivision);
    },
    findDivisionById: async (divisionId) => {
      const [row] = await db
        .select()
        .from(divisionsTable)
        .where(eq(divisionsTable.id, divisionId))
        .limit(1);

      return row ? toDivision(row) : null;
    },
    updateDivision: async (input) => {
      const [current] = await db
        .select()
        .from(divisionsTable)
        .where(eq(divisionsTable.id, input.divisionId))
        .limit(1);

      if (!current) {
        throw new DivisionNotFoundError();
      }

      const [updated] = await db
        .transaction(async (tx) => {
          const [next] = await tx
            .update(divisionsTable)
            .set({ name: input.name })
            .where(eq(divisionsTable.id, input.divisionId))
            .returning();

          await tx.insert(auditEventsTable).values({
            id: generateId(),
            actorUserId: input.actorUserId,
            companyId: current.companyId,
            divisionId: current.id,
            localId: null,
            type: orgHierarchyAuditEventTypes.divisionUpdated,
            correlationId: input.correlationId,
            entityType: 'division',
            entityId: current.id,
            details: createAuditDetail('division'),
            oldValues: { name: current.name },
            newValues: { name: input.name },
            createdAt: now(),
          });

          return [next];
        });

      return toDivision(updated);
    },
    deleteDivision: async (input) => {
      const [deleted] = await db.transaction(async (tx) => {
        const [row] = await tx
          .delete(divisionsTable)
          .where(eq(divisionsTable.id, input.divisionId))
          .returning();

        if (row) {
          await tx.insert(auditEventsTable).values({
            id: generateId(),
            actorUserId: input.actorUserId,
            companyId: row.companyId,
            divisionId: row.id,
            localId: null,
            type: orgHierarchyAuditEventTypes.divisionDeleted,
            correlationId: input.correlationId,
            entityType: 'division',
            entityId: row.id,
            details: createAuditDetail('division'),
            oldValues: { name: row.name },
            newValues: null,
            createdAt: now(),
          });
        }

        return [row];
      });

      if (!deleted) {
        throw new DivisionNotFoundError();
      }
    },
    countLocalsInDivision: async (divisionId) => {
        const rows = await db
          .select()
          .from(localsTable)
          .where(eq(localsTable.divisionId, divisionId));

      return normalizeLocalsByDivision(rows, divisionId).length;
    },
    createLocal: async (input) => {
      const localId = generateId();
      const divisionId = input.divisionId ?? null;

      const existingLocals = await db
        .select()
        .from(localsTable)
        .where(eq(localsTable.companyId, input.companyId));

      const hasConflict = divisionId
        ? existingLocals.some((local) => isDivisionLocalConflict(local, divisionId, input.name))
        : existingLocals.some((local) => isRootLocalConflict(local, input.name));

      if (hasConflict) {
        throw new LocalNameConflictError();
      }

      await db.transaction(async (tx) => {
        await tx.insert(localsTable).values({
          id: localId,
          companyId: input.companyId,
          divisionId,
          name: input.name,
          locale: null,
        });
        await tx.insert(auditEventsTable).values({
          id: generateId(),
          actorUserId: input.actorUserId,
          companyId: input.companyId,
          divisionId,
          localId,
          type: orgHierarchyAuditEventTypes.localCreated,
          correlationId: input.correlationId,
          entityType: 'local',
          entityId: localId,
          details: createAuditDetail('local'),
          oldValues: null,
          newValues: { name: input.name, divisionId },
          createdAt: now(),
        });
      });

      return {
        id: localId,
        companyId: input.companyId,
        divisionId,
        name: input.name,
        locale: null,
      };
    },
    listLocals: async (companyId) => {
      const rows = await db
        .select()
        .from(localsTable)
        .where(eq(localsTable.companyId, companyId));

      return normalizeLocals(rows, companyId).map(toLocal);
    },
    updateLocal: async (input) => {
      const set: { name?: string; divisionId?: string | null } = {};

      if (input.name !== undefined) {
        set.name = input.name;
      }

      if (input.divisionId !== undefined) {
        set.divisionId = input.divisionId;
      }

      const [current] = await db
        .select()
        .from(localsTable)
        .where(eq(localsTable.id, input.localId))
        .limit(1);

      if (!current) {
        throw new LocalNotFoundError();
      }

      if (input.name !== undefined && input.name !== current.name) {
        const nextName = input.name;
        const conflictRows = await db
          .select()
          .from(localsTable)
          .where(eq(localsTable.companyId, current.companyId));

        const nextDivisionId: string | null =
          input.divisionId !== undefined ? (input.divisionId ?? null) : current.divisionId;

        const conflict = conflictRows.find((row) => {
          if (row.id === current.id) {
            return false;
          }

          return nextDivisionId === null
            ? isRootLocalConflict(row, nextName)
            : isDivisionLocalConflict(row, nextDivisionId, nextName);
        });

        if (conflict) {
          throw new LocalNameConflictError();
        }
      }

      const [updated] = await db.transaction(async (tx) => {
        const [next] = await tx
          .update(localsTable)
          .set(set)
          .where(eq(localsTable.id, input.localId))
          .returning();

        await tx.insert(auditEventsTable).values({
          id: generateId(),
          actorUserId: input.actorUserId,
          companyId: current.companyId,
          divisionId: input.divisionId !== undefined ? (input.divisionId ?? null) : current.divisionId,
          localId: current.id,
          type: orgHierarchyAuditEventTypes.localUpdated,
          correlationId: input.correlationId,
          entityType: 'local',
          entityId: current.id,
          details: createAuditDetail('local'),
          oldValues: { name: current.name, divisionId: current.divisionId },
          newValues: {
            name: next?.name ?? current.name,
            divisionId: next?.divisionId ?? current.divisionId,
          },
          createdAt: now(),
        });

        return [next];
      });

      if (!updated) {
        throw new LocalNotFoundError();
      }

      return toLocal(updated);
    },
    deleteLocal: async (input) => {
      const [deleted] = await db.transaction(async (tx) => {
        const [row] = await tx
          .delete(localsTable)
          .where(eq(localsTable.id, input.localId))
          .returning();

        if (row) {
          await tx.insert(auditEventsTable).values({
            id: generateId(),
            actorUserId: input.actorUserId,
            companyId: row.companyId,
            divisionId: row.divisionId,
            localId: row.id,
            type: orgHierarchyAuditEventTypes.localDeleted,
            correlationId: input.correlationId,
            entityType: 'local',
            entityId: row.id,
            details: createAuditDetail('local'),
            oldValues: { name: row.name, divisionId: row.divisionId },
            newValues: null,
            createdAt: now(),
          });
        }

        return [row];
      });

      if (!deleted) {
        throw new LocalNotFoundError();
      }
    },
    countItemsInLocal: async (localId) => {
      const rows = await db
        .select({ localId: itemsTable.localId, deletedAt: itemsTable.deletedAt })
        .from(itemsTable)
        .where(eq(itemsTable.localId, localId));

      return normalizeItemsByLocal(rows, localId).length;
    },
    countMembershipsInLocal: async (localId) => {
      const rows = await db
        .select({ localId: membershipsTable.localId })
        .from(membershipsTable)
        .where(eq(membershipsTable.localId, localId));

      return normalizeMembershipsByLocal(rows, localId).length;
    },
    findLocalById: async (localId) => {
      const [row] = await db
        .select()
        .from(localsTable)
        .where(eq(localsTable.id, localId))
        .limit(1);

      return row && row.id === localId ? toLocal(row) : null;
    },
    countAreasInDivision: async (divisionId) => {
      const rows = await db
        .select()
        .from(areasTable)
        .where(eq(areasTable.divisionId, divisionId));

      return normalizeAreasByDivision(rows, divisionId).length;
    },
    findAreaById: async (areaId) => {
      const [row] = await db
        .select()
        .from(areasTable)
        .where(eq(areasTable.id, areaId))
        .limit(1);

      return row ? toArea(row) : null;
    },
    countAreasInLocal: async (localId) => {
      const rows = await db
        .select()
        .from(areasTable)
        .where(eq(areasTable.localId, localId));

      return normalizeAreasByLocal(rows, localId).length;
    },
    countWarehousesInLocal: async (localId) => {
      const rows = await db
        .select()
        .from(warehousesTable)
        .where(eq(warehousesTable.localId, localId));

      return normalizeWarehousesByLocal(rows, localId).length;
    },
    countPointsOfSaleInLocal: async (localId) => {
      const rows = await db
        .select()
        .from(pointsOfSaleTable)
        .where(eq(pointsOfSaleTable.localId, localId));

      return normalizePointsOfSaleByLocal(rows, localId).length;
    },
    createArea: async (input) => {
      const areaId = generateId();
      const createdAt = now();
      const divisionId = 'divisionId' in input ? input.divisionId : null;
      const localId = 'localId' in input ? input.localId : null;

      try {
        await db.transaction(async (tx) => {
          await tx.insert(areasTable).values({
            id: areaId,
            companyId: input.companyId,
            divisionId,
            localId,
            name: input.name,
            kind: 'area',
            createdAt,
          });
          await tx.insert(auditEventsTable).values({
            id: generateId(),
            actorUserId: input.actorUserId,
            companyId: input.companyId,
            divisionId,
            localId,
            type: orgHierarchyAuditEventTypes.areaCreated,
            correlationId: input.correlationId,
            entityType: 'area',
            entityId: areaId,
            details: createAuditDetail('area'),
            oldValues: null,
            newValues: { name: input.name, divisionId, localId },
            createdAt,
          });
        });
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new AreaNameConflictError();
        }

        throw error;
      }

      return {
        id: areaId,
        companyId: input.companyId,
        divisionId: 'divisionId' in input ? input.divisionId : null,
        localId: 'localId' in input ? input.localId : null,
        name: input.name,
        kind: 'area',
        createdAt,
      };
    },
    listAreas: async (companyId) => {
      const rows = await db
        .select()
        .from(areasTable)
        .where(eq(areasTable.companyId, companyId));

      return normalizeAreas(rows, companyId).map(toArea);
    },
    updateArea: async (input) => {
      const set: {
        name?: string;
        divisionId?: string | null;
        localId?: string | null;
      } = {};

      const [current] = await db
        .select()
        .from(areasTable)
        .where(eq(areasTable.id, input.areaId))
        .limit(1);

      if (!current) {
        throw new AreaNotFoundError();
      }

      if (input.name !== undefined) {
        set.name = input.name;
      }

      if ('divisionId' in input) {
        set.divisionId = input.divisionId;
        set.localId = null;
      }

      if ('localId' in input) {
        set.localId = input.localId;
        set.divisionId = null;
      }

      const [updated] = await db.transaction(async (tx) => {
        const [next] = await tx
          .update(areasTable)
          .set(set)
          .where(eq(areasTable.id, input.areaId))
          .returning();

        await tx.insert(auditEventsTable).values({
          id: generateId(),
          actorUserId: input.actorUserId,
          companyId: current.companyId,
          divisionId: next?.divisionId ?? current.divisionId,
          localId: next?.localId ?? current.localId,
          type: orgHierarchyAuditEventTypes.areaUpdated,
          correlationId: input.correlationId,
          entityType: 'area',
          entityId: current.id,
          details: createAuditDetail('area'),
          oldValues: { name: current.name, divisionId: current.divisionId, localId: current.localId },
          newValues: {
            name: next?.name ?? current.name,
            divisionId: next?.divisionId ?? current.divisionId,
            localId: next?.localId ?? current.localId,
          },
          createdAt: now(),
        });

        return [next];
      });

      if (!updated) {
        throw new AreaNotFoundError();
      }

      return toArea(updated);
    },
    deleteArea: async (input) => {
      const [deleted] = await db.transaction(async (tx) => {
        const [row] = await tx
          .delete(areasTable)
          .where(eq(areasTable.id, input.areaId))
          .returning();

        if (row) {
          await tx.insert(auditEventsTable).values({
            id: generateId(),
            actorUserId: input.actorUserId,
            companyId: row.companyId,
            divisionId: row.divisionId,
            localId: row.localId,
            type: orgHierarchyAuditEventTypes.areaDeleted,
            correlationId: input.correlationId,
            entityType: 'area',
            entityId: row.id,
            details: createAuditDetail('area'),
            oldValues: { name: row.name, divisionId: row.divisionId, localId: row.localId },
            newValues: null,
            createdAt: now(),
          });
        }

        return [row];
      });

      if (!deleted) {
        throw new AreaNotFoundError();
      }
    },
    countWarehousesInArea: async (areaId) => {
      const rows = await db
        .select()
        .from(warehousesTable)
        .where(eq(warehousesTable.areaId, areaId));

      return normalizeWarehousesByArea(rows, areaId).length;
    },
    countPointsOfSaleInArea: async (areaId) => {
      const rows = await db
        .select()
        .from(pointsOfSaleTable)
        .where(eq(pointsOfSaleTable.areaId, areaId));

      return normalizePointsOfSaleByArea(rows, areaId).length;
    },
    countEmployeesInArea: async (areaId) => {
      const rows = await db
        .select({ areaId: employeesTable.areaId })
        .from(employeesTable)
        .where(eq(employeesTable.areaId, areaId));

      return normalizeEmployeesByArea(rows, areaId).length;
    },
    createWarehouse: async (input) => {
      const warehouseId = generateId();
      const createdAt = now();
      const areaId = 'areaId' in input ? input.areaId : null;
      const localId = 'localId' in input ? input.localId : null;

      try {
        await db.transaction(async (tx) => {
          await tx.insert(warehousesTable).values({
            id: warehouseId,
            companyId: input.companyId,
            areaId,
            localId,
            name: input.name,
            createdAt,
          });
          await tx.insert(auditEventsTable).values({
            id: generateId(),
            actorUserId: input.actorUserId,
            companyId: input.companyId,
            divisionId: null,
            localId,
            type: orgHierarchyAuditEventTypes.warehouseCreated,
            correlationId: input.correlationId,
            entityType: 'warehouse',
            entityId: warehouseId,
            details: createAuditDetail('warehouse'),
            oldValues: null,
            newValues: { name: input.name, areaId, localId },
            createdAt,
          });
        });
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new WarehouseNameConflictError();
        }

        throw error;
      }

      return {
        id: warehouseId,
        companyId: input.companyId,
        areaId: 'areaId' in input ? input.areaId : null,
        localId: 'localId' in input ? input.localId : null,
        name: input.name,
        createdAt,
      };
    },
    listWarehouses: async (companyId) => {
      const rows = await db
        .select()
        .from(warehousesTable)
        .where(eq(warehousesTable.companyId, companyId));

      return normalizeWarehouses(rows, companyId).map(toWarehouse);
    },
    findWarehouseById: async (warehouseId) => {
      const [row] = await db
        .select()
        .from(warehousesTable)
        .where(eq(warehousesTable.id, warehouseId))
        .limit(1);

      return row ? toWarehouse(row) : null;
    },
    updateWarehouse: async (input) => {
      const set: { name?: string; areaId?: string | null; localId?: string | null } = {};

      const [current] = await db
        .select()
        .from(warehousesTable)
        .where(eq(warehousesTable.id, input.warehouseId))
        .limit(1);

      if (!current) {
        throw new WarehouseNotFoundError();
      }

      if (input.name !== undefined) {
        set.name = input.name;
      }

      if ('areaId' in input) {
        set.areaId = input.areaId;
        set.localId = null;
      }

      if ('localId' in input) {
        set.localId = input.localId;
        set.areaId = null;
      }

      const [updated] = await db.transaction(async (tx) => {
        const [next] = await tx
          .update(warehousesTable)
          .set(set)
          .where(eq(warehousesTable.id, input.warehouseId))
          .returning();

        await tx.insert(auditEventsTable).values({
          id: generateId(),
          actorUserId: input.actorUserId,
          companyId: current.companyId,
          divisionId: null,
          localId: next?.localId ?? current.localId,
          type: orgHierarchyAuditEventTypes.warehouseUpdated,
          correlationId: input.correlationId,
          entityType: 'warehouse',
          entityId: current.id,
          details: createAuditDetail('warehouse'),
          oldValues: { name: current.name, areaId: current.areaId, localId: current.localId },
          newValues: {
            name: next?.name ?? current.name,
            areaId: next?.areaId ?? current.areaId,
            localId: next?.localId ?? current.localId,
          },
          createdAt: now(),
        });

        return [next];
      });

      if (!updated) {
        throw new WarehouseNotFoundError();
      }

      return toWarehouse(updated);
    },
    deleteWarehouse: async (input) => {
      const [deleted] = await db.transaction(async (tx) => {
        const [row] = await tx
          .delete(warehousesTable)
          .where(eq(warehousesTable.id, input.warehouseId))
          .returning();

        if (row) {
          await tx.insert(auditEventsTable).values({
            id: generateId(),
            actorUserId: input.actorUserId,
            companyId: row.companyId,
            divisionId: null,
            localId: row.localId,
            type: orgHierarchyAuditEventTypes.warehouseDeleted,
            correlationId: input.correlationId,
            entityType: 'warehouse',
            entityId: row.id,
            details: createAuditDetail('warehouse'),
            oldValues: { name: row.name, areaId: row.areaId, localId: row.localId },
            newValues: null,
            createdAt: now(),
          });
        }

        return [row];
      });

      if (!deleted) {
        throw new WarehouseNotFoundError();
      }
    },
    createPointOfSale: async (input) => {
      const pointOfSaleId = generateId();
      const createdAt = now();
      const areaId = 'areaId' in input ? input.areaId : null;
      const localId = 'localId' in input ? input.localId : null;

      try {
        await db.transaction(async (tx) => {
          await tx.insert(pointsOfSaleTable).values({
            id: pointOfSaleId,
            companyId: input.companyId,
            areaId,
            localId,
            name: input.name,
            createdAt,
          });
          await tx.insert(auditEventsTable).values({
            id: generateId(),
            actorUserId: input.actorUserId,
            companyId: input.companyId,
            divisionId: null,
            localId,
            type: orgHierarchyAuditEventTypes.pointOfSaleCreated,
            correlationId: input.correlationId,
            entityType: 'point_of_sale',
            entityId: pointOfSaleId,
            details: createAuditDetail('point_of_sale'),
            oldValues: null,
            newValues: { name: input.name, areaId, localId },
            createdAt,
          });
        });
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new PointOfSaleNameConflictError();
        }

        throw error;
      }

      return {
        id: pointOfSaleId,
        companyId: input.companyId,
        areaId: 'areaId' in input ? input.areaId : null,
        localId: 'localId' in input ? input.localId : null,
        name: input.name,
        createdAt,
      };
    },
    listPointsOfSale: async (companyId) => {
      const rows = await db
        .select()
        .from(pointsOfSaleTable)
        .where(eq(pointsOfSaleTable.companyId, companyId));

      return normalizePointsOfSale(rows, companyId).map(toPointOfSale);
    },
    findPointOfSaleById: async (pointOfSaleId) => {
      const [row] = await db
        .select()
        .from(pointsOfSaleTable)
        .where(eq(pointsOfSaleTable.id, pointOfSaleId))
        .limit(1);

      return row ? toPointOfSale(row) : null;
    },
    updatePointOfSale: async (input) => {
      const set: { name?: string; areaId?: string | null; localId?: string | null } = {};

      const [current] = await db
        .select()
        .from(pointsOfSaleTable)
        .where(eq(pointsOfSaleTable.id, input.pointOfSaleId))
        .limit(1);

      if (!current) {
        throw new PointOfSaleNotFoundError();
      }

      if (input.name !== undefined) {
        set.name = input.name;
      }

      if ('areaId' in input) {
        set.areaId = input.areaId;
        set.localId = null;
      }

      if ('localId' in input) {
        set.localId = input.localId;
        set.areaId = null;
      }

      const [updated] = await db.transaction(async (tx) => {
        const [next] = await tx
          .update(pointsOfSaleTable)
          .set(set)
          .where(eq(pointsOfSaleTable.id, input.pointOfSaleId))
          .returning();

        await tx.insert(auditEventsTable).values({
          id: generateId(),
          actorUserId: input.actorUserId,
          companyId: current.companyId,
          divisionId: null,
          localId: next?.localId ?? current.localId,
          type: orgHierarchyAuditEventTypes.pointOfSaleUpdated,
          correlationId: input.correlationId,
          entityType: 'point_of_sale',
          entityId: current.id,
          details: createAuditDetail('point_of_sale'),
          oldValues: { name: current.name, areaId: current.areaId, localId: current.localId },
          newValues: {
            name: next?.name ?? current.name,
            areaId: next?.areaId ?? current.areaId,
            localId: next?.localId ?? current.localId,
          },
          createdAt: now(),
        });

        return [next];
      });

      if (!updated) {
        throw new PointOfSaleNotFoundError();
      }

      return toPointOfSale(updated);
    },
    deletePointOfSale: async (input) => {
      const [deleted] = await db.transaction(async (tx) => {
        const [row] = await tx
          .delete(pointsOfSaleTable)
          .where(eq(pointsOfSaleTable.id, input.pointOfSaleId))
          .returning();

        if (row) {
          await tx.insert(auditEventsTable).values({
            id: generateId(),
            actorUserId: input.actorUserId,
            companyId: row.companyId,
            divisionId: null,
            localId: row.localId,
            type: orgHierarchyAuditEventTypes.pointOfSaleDeleted,
            correlationId: input.correlationId,
            entityType: 'point_of_sale',
            entityId: row.id,
            details: createAuditDetail('point_of_sale'),
            oldValues: { name: row.name, areaId: row.areaId, localId: row.localId },
            newValues: null,
            createdAt: now(),
          });
        }

        return [row];
      });

      if (!deleted) {
        throw new PointOfSaleNotFoundError();
      }
    },
  };

  return gateway;
};
