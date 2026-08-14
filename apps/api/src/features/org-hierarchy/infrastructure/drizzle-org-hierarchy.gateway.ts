import { randomUUID } from 'node:crypto';

import { and, eq, inArray, isNotNull, isNull } from 'drizzle-orm';
import type { Logger } from 'pino';

import type { AppDb } from '../../../shared/infrastructure/db/client';
import {
  auditEventsTable,
  areasTable,
  divisionsTable,
  employeeAssignmentsTable,
  itemsTable,
  localsTable,
  membershipsTable,
  nodeManagementInvitationsTable,
  nodeResponsibilitiesTable,
  pointsOfSaleTable,
  roleAssignmentsTable,
  userPreferencesTable,
  warehousesTable,
} from '../../../shared/infrastructure/db/schema';
import {
  DivisionConflictError,
  AreaConflictError,
  AreaNameConflictError,
  AreaNotFoundError,
  DivisionNameConflictError,
  DivisionNotFoundError,
  LocalConflictError,
  LocalNameConflictError,
  LocalNotFoundError,
  PointOfSaleConflictError,
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
  WarehouseConflictError,
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

const normalizeLocals = (rows: LocalRow[], companyId: string): LocalRow[] =>
  rows.filter((row) => row.companyId === companyId);

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

const normalizeAreasByDivision = (
  rows: AreaRow[],
  divisionId: string,
): AreaRow[] => rows.filter((row) => row.divisionId === divisionId);

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
  rows: { scopeNodeId: string; employeeId: string; endedAt: Date | null }[],
  scopeNodeId: string,
) =>
  new Set(
    rows
      .filter(
        (row) =>
          row.scopeNodeId === scopeNodeId &&
          row.endedAt === null,
      )
      .map((row) => row.employeeId),
  ).size;

const countActiveEmployeesByScopeNode = async (
  db: AppDb,
  companyId: string,
  scopeNodeIds: string[],
) => {
  const requested = new Set(scopeNodeIds);
  const rows =
    scopeNodeIds.length === 0
      ? []
      : await db
          .select()
          .from(employeeAssignmentsTable)
          .where(
            and(
              eq(employeeAssignmentsTable.companyId, companyId),
              isNull(employeeAssignmentsTable.endedAt),
              inArray(employeeAssignmentsTable.scopeNodeId, scopeNodeIds),
            ),
          );
  const employeesByScopeNode = new Map<string, Set<string>>();

  for (const row of rows) {
    if (
      row.companyId !== companyId ||
      row.endedAt !== null ||
      !requested.has(row.scopeNodeId)
    ) {
      continue;
    }

    const employees = employeesByScopeNode.get(row.scopeNodeId) ?? new Set<string>();
    employees.add(row.employeeId);
    employeesByScopeNode.set(row.scopeNodeId, employees);
  }

  return new Map(
    scopeNodeIds.map((scopeNodeId) => [
      scopeNodeId,
      employeesByScopeNode.get(scopeNodeId)?.size ?? 0,
    ]),
  );
};

const hasErrorCode = (
  error: unknown,
  code: string,
  seen = new Set<unknown>(),
): boolean => {
  if (typeof error !== 'object' || error === null || seen.has(error)) {
    return false;
  }

  seen.add(error);

  if ('code' in error && (error as { code?: unknown }).code === code) {
    return true;
  }

  if (!('cause' in error)) {
    return false;
  }

  return hasErrorCode((error as { cause?: unknown }).cause, code, seen);
};

const isUniqueViolation = (error: unknown) => hasErrorCode(error, '23505');

const isForeignKeyViolation = (error: unknown) => hasErrorCode(error, '23503');

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

const createAuditDetail = (entityType: string) => ({
  source: 'org-hierarchy',
  entityType,
});

const clearScopeNodeReferences = async (
  tx: Parameters<Parameters<AppDb['transaction']>[0]>[0],
  scopeNodeId: string,
) => {
  await tx
    .delete(nodeManagementInvitationsTable)
    .where(
      and(
        eq(nodeManagementInvitationsTable.scopeNodeId, scopeNodeId),
        isNull(nodeManagementInvitationsTable.acceptedAt),
      ),
    );

  await tx
    .update(userPreferencesTable)
    .set({ activeScopeNodeId: null })
    .where(eq(userPreferencesTable.activeScopeNodeId, scopeNodeId));
};

export const createDrizzleOrgHierarchyGateway = (
  db: AppDb,
  {
    createId,
    logger,
    now = () => new Date(),
  }: {
    createId?: () => string;
    logger?: Pick<Logger, 'info' | 'warn' | 'error'>;
    now?: () => Date;
  } = {},
): OrgHierarchyGateway => {
  const generateId = createId ?? randomUUID;

  const gateway: OrgHierarchyGateway = {
    getScopeNodeDependencyCounts: async ({ nodeType, sourceId }) => {
      const scopeNodeId = `${nodeType}:${sourceId}`;
      const [
        roleAssignments,
        responsibilities,
        managementInvitations,
        activeScopePreferences,
        employeeAssignments,
      ] = await Promise.all([
        db
          .select()
          .from(roleAssignmentsTable)
          .where(eq(roleAssignmentsTable.scopeNodeId, scopeNodeId)),
        db
          .select()
          .from(nodeResponsibilitiesTable)
          .where(eq(nodeResponsibilitiesTable.scopeNodeId, scopeNodeId)),
        db
          .select()
          .from(nodeManagementInvitationsTable)
          .where(
            and(
              eq(nodeManagementInvitationsTable.scopeNodeId, scopeNodeId),
              isNotNull(nodeManagementInvitationsTable.acceptedAt),
            ),
          ),
        db
          .select()
          .from(userPreferencesTable)
          .where(eq(userPreferencesTable.activeScopeNodeId, scopeNodeId)),
        db
          .select()
          .from(employeeAssignmentsTable)
          .where(eq(employeeAssignmentsTable.scopeNodeId, scopeNodeId)),
      ]);

      return {
        roleAssignments: roleAssignments.length,
        responsibilities: responsibilities.length,
        managementInvitations: managementInvitations.length,
        activeScopePreferences: activeScopePreferences.length,
        employeeAssignments: employeeAssignments.length,
      };
    },
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

      const divisions = normalizeDivisions(rows, companyId);
      const employeeCounts = await countActiveEmployeesByScopeNode(
        db,
        companyId,
        divisions.map((row) => `division:${row.id}`),
      );
      return divisions.map((row) => ({
        ...toDivision(row),
        employeeCount: employeeCounts.get(`division:${row.id}`) ?? 0,
      }));
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

      const [updated] = await db.transaction(async (tx) => {
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

      if (!updated) {
        throw new DivisionNotFoundError();
      }

      return toDivision(updated);
    },
    deleteDivision: async (input) => {
      let deleted: DivisionRow | null = null;

      logger?.info(
        {
          actorUserId: input.actorUserId,
          correlationId: input.correlationId,
          divisionId: input.divisionId,
        },
        'Org hierarchy delete division attempt started',
      );

      try {
        const deletedRows = await db.transaction(async (tx) => {
          await clearScopeNodeReferences(tx, `division:${input.divisionId}`);
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

        deleted = deletedRows[0] ?? null;
      } catch (error) {
        if (isForeignKeyViolation(error)) {
          logger?.warn(
            {
              actorUserId: input.actorUserId,
              correlationId: input.correlationId,
              divisionId: input.divisionId,
              err: error,
            },
            'Org hierarchy delete division blocked by foreign key dependency',
          );
          throw new DivisionConflictError();
        }

        logger?.error(
          {
            actorUserId: input.actorUserId,
            correlationId: input.correlationId,
            divisionId: input.divisionId,
            err: error,
          },
          'Org hierarchy delete division failed',
        );

        throw error;
      }

      if (!deleted) {
        logger?.warn(
          {
            actorUserId: input.actorUserId,
            correlationId: input.correlationId,
            divisionId: input.divisionId,
          },
          'Org hierarchy delete division target not found',
        );
        throw new DivisionNotFoundError();
      }

      logger?.info(
        {
          actorUserId: input.actorUserId,
          correlationId: input.correlationId,
          divisionId: input.divisionId,
        },
        'Org hierarchy delete division finished',
      );
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
        ? existingLocals.some((local) =>
            isDivisionLocalConflict(local, divisionId, input.name),
          )
        : existingLocals.some((local) =>
            isRootLocalConflict(local, input.name),
          );

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

      const locals = normalizeLocals(rows, companyId);
      const employeeCounts = await countActiveEmployeesByScopeNode(
        db,
        companyId,
        locals.map((row) => `local:${row.id}`),
      );
      return locals.map((row) => ({
        ...toLocal(row),
        employeeCount: employeeCounts.get(`local:${row.id}`) ?? 0,
      }));
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
          input.divisionId !== undefined
            ? (input.divisionId ?? null)
            : current.divisionId;

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
          divisionId:
            input.divisionId !== undefined
              ? (input.divisionId ?? null)
              : current.divisionId,
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
      let deleted;

      logger?.info(
        {
          actorUserId: input.actorUserId,
          correlationId: input.correlationId,
          localId: input.localId,
        },
        'Org hierarchy delete local attempt started',
      );

      try {
        const deletedRows = await db.transaction(async (tx) => {
          await clearScopeNodeReferences(tx, `local:${input.localId}`);
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

        deleted = deletedRows[0] ?? null;
      } catch (error) {
        if (isForeignKeyViolation(error)) {
          logger?.warn(
            {
              actorUserId: input.actorUserId,
              correlationId: input.correlationId,
              localId: input.localId,
              err: error,
            },
            'Org hierarchy delete local blocked by foreign key dependency',
          );
          throw new LocalConflictError();
        }

        logger?.error(
          {
            actorUserId: input.actorUserId,
            correlationId: input.correlationId,
            localId: input.localId,
            err: error,
          },
          'Org hierarchy delete local failed',
        );

        throw error;
      }

      if (!deleted) {
        logger?.warn(
          {
            actorUserId: input.actorUserId,
            correlationId: input.correlationId,
            localId: input.localId,
          },
          'Org hierarchy delete local target not found',
        );
        throw new LocalNotFoundError();
      }

      logger?.info(
        {
          actorUserId: input.actorUserId,
          correlationId: input.correlationId,
          localId: input.localId,
        },
        'Org hierarchy delete local finished',
      );
    },
    countItemsInLocal: async (localId) => {
      const rows = await db
        .select({
          localId: itemsTable.localId,
          deletedAt: itemsTable.deletedAt,
        })
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

      const areas = normalizeAreas(rows, companyId);
      const employeeCounts = await countActiveEmployeesByScopeNode(
        db,
        companyId,
        areas.map((row) => `area:${row.id}`),
      );
      return areas.map((row) => ({
        ...toArea(row),
        employeeCount: employeeCounts.get(`area:${row.id}`) ?? 0,
      }));
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
          oldValues: {
            name: current.name,
            divisionId: current.divisionId,
            localId: current.localId,
          },
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
      let deleted: AreaRow | null = null;

      try {
        [deleted] = await db.transaction(async (tx) => {
          await clearScopeNodeReferences(tx, `area:${input.areaId}`);
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
              oldValues: {
                name: row.name,
                divisionId: row.divisionId,
                localId: row.localId,
              },
              newValues: null,
              createdAt: now(),
            });
          }

          return [row];
        });
      } catch (error) {
        if (isForeignKeyViolation(error)) {
          throw new AreaConflictError(
            'Cannot delete area with dependent organizational or HR records.',
          );
        }
        throw error;
      }

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
      const scopeNodeId = `area:${areaId}`;
      const rows = await db
        .select()
        .from(employeeAssignmentsTable)
        .where(
          and(
            eq(employeeAssignmentsTable.scopeNodeId, scopeNodeId),
            isNull(employeeAssignmentsTable.endedAt),
          ),
        );

      return normalizeEmployeesByArea(rows, scopeNodeId);
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

      const warehouses = normalizeWarehouses(rows, companyId);
      const employeeCounts = await countActiveEmployeesByScopeNode(
        db,
        companyId,
        warehouses.map((row) => `warehouse:${row.id}`),
      );
      return warehouses.map((row) => ({
        ...toWarehouse(row),
        employeeCount: employeeCounts.get(`warehouse:${row.id}`) ?? 0,
      }));
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
      const set: {
        name?: string;
        areaId?: string | null;
        localId?: string | null;
      } = {};

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
          oldValues: {
            name: current.name,
            areaId: current.areaId,
            localId: current.localId,
          },
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
      let deleted: WarehouseRow | null = null;

      try {
        [deleted] = await db.transaction(async (tx) => {
          await clearScopeNodeReferences(tx, `warehouse:${input.warehouseId}`);
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
              oldValues: {
                name: row.name,
                areaId: row.areaId,
                localId: row.localId,
              },
              newValues: null,
              createdAt: now(),
            });
          }

          return [row];
        });
      } catch (error) {
        if (isForeignKeyViolation(error)) {
          throw new WarehouseConflictError(
            'Cannot delete warehouse with dependent organizational or HR records.',
          );
        }
        throw error;
      }

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

      const pointsOfSale = normalizePointsOfSale(rows, companyId);
      const employeeCounts = await countActiveEmployeesByScopeNode(
        db,
        companyId,
        pointsOfSale.map((row) => `point-of-sale:${row.id}`),
      );
      return pointsOfSale.map((row) => ({
        ...toPointOfSale(row),
        employeeCount: employeeCounts.get(`point-of-sale:${row.id}`) ?? 0,
      }));
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
      const set: {
        name?: string;
        areaId?: string | null;
        localId?: string | null;
      } = {};

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
          oldValues: {
            name: current.name,
            areaId: current.areaId,
            localId: current.localId,
          },
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
      let deleted: PointOfSaleRow | null = null;

      try {
        [deleted] = await db.transaction(async (tx) => {
          await clearScopeNodeReferences(
            tx,
            `point-of-sale:${input.pointOfSaleId}`,
          );
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
              oldValues: {
                name: row.name,
                areaId: row.areaId,
                localId: row.localId,
              },
              newValues: null,
              createdAt: now(),
            });
          }

          return [row];
        });
      } catch (error) {
        if (isForeignKeyViolation(error)) {
          throw new PointOfSaleConflictError(
            'Cannot delete point of sale with dependent organizational or HR records.',
          );
        }
        throw error;
      }

      if (!deleted) {
        throw new PointOfSaleNotFoundError();
      }
    },
  };

  return gateway;
};
