import { randomUUID } from 'node:crypto';

import { and, eq } from 'drizzle-orm';

import type { AppDb } from '../../../shared/infrastructure/db/client';
import {
  branchesTable,
  divisionsTable,
  itemsTable,
  membershipsTable,
} from '../../../shared/infrastructure/db/schema';
import {
  DivisionNameConflictError,
  DivisionNotFoundError,
  LocalNameConflictError,
  LocalNotFoundError,
  type Division,
  type Local,
  type OrgHierarchyGateway,
} from '../domain/org-hierarchy';

type DivisionRow = typeof divisionsTable.$inferSelect;
type BranchRow = typeof branchesTable.$inferSelect;

const normalizeDivisions = (
  rows: DivisionRow[],
  companyId: string,
): DivisionRow[] => rows.filter((row) => row.companyId === companyId);

const normalizeLocals = (
  rows: BranchRow[],
  companyId: string,
): BranchRow[] => rows.filter((row) => row.companyId === companyId);

const normalizeLocalsByDivision = (
  rows: BranchRow[],
  divisionId: string,
): BranchRow[] => rows.filter((row) => row.divisionId === divisionId);

const normalizeItemsByLocal = (
  rows: { localId: string | null; deletedAt: Date | null }[],
  localId: string,
) => rows.filter((row) => row.localId === localId && row.deletedAt === null);

const normalizeMembershipsByLocal = (
  rows: { localId: string | null }[],
  localId: string,
) => rows.filter((row) => row.localId === localId);

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

const toLocal = (row: BranchRow): Local => ({
  id: row.id,
  companyId: row.companyId,
  divisionId: row.divisionId,
  name: row.name,
  locale: row.locale,
});

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
        await db.insert(divisionsTable).values({
          id: divisionId,
          companyId: input.companyId,
          name: input.name,
          createdAt,
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
    updateDivision: async (input) => {
      const [updated] = await db
        .update(divisionsTable)
        .set({ name: input.name })
        .where(eq(divisionsTable.id, input.divisionId))
        .returning();

      if (!updated) {
        throw new DivisionNotFoundError();
      }

      return toDivision(updated);
    },
    deleteDivision: async (divisionId) => {
      const [deleted] = await db
        .delete(divisionsTable)
        .where(eq(divisionsTable.id, divisionId))
        .returning();

      if (!deleted) {
        throw new DivisionNotFoundError();
      }
    },
    countLocalsInDivision: async (divisionId) => {
      const rows = await db
        .select()
        .from(branchesTable)
        .where(eq(branchesTable.divisionId, divisionId));

      return normalizeLocalsByDivision(rows, divisionId).length;
    },
    createLocal: async (input) => {
      const localId = generateId();
      const divisionId = input.divisionId ?? null;

      const [existingLocal] = await db
        .select({ id: branchesTable.id })
        .from(branchesTable)
        .where(
          and(
            eq(branchesTable.companyId, input.companyId),
            eq(branchesTable.name, input.name),
          ),
        )
        .limit(1);

      if (existingLocal) {
        throw new LocalNameConflictError();
      }

      await db.insert(branchesTable).values({
        id: localId,
        companyId: input.companyId,
        divisionId,
        name: input.name,
        locale: null,
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
        .from(branchesTable)
        .where(eq(branchesTable.companyId, companyId));

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
        .from(branchesTable)
        .where(eq(branchesTable.id, input.localId))
        .limit(1);

      if (!current) {
        throw new LocalNotFoundError();
      }

      if (input.name !== undefined && input.name !== current.name) {
        const conflictRows = await db
          .select({ id: branchesTable.id, companyId: branchesTable.companyId, name: branchesTable.name })
          .from(branchesTable)
          .where(
            and(
              eq(branchesTable.companyId, current.companyId),
              eq(branchesTable.name, input.name),
            ),
          )
          .limit(1);

        const conflict = conflictRows.find(
          (row) =>
            row.companyId === current.companyId &&
            row.name === input.name &&
            row.id !== current.id,
        );

        if (conflict) {
          throw new LocalNameConflictError();
        }
      }

      const [updated] = await db
        .update(branchesTable)
        .set(set)
        .where(eq(branchesTable.id, input.localId))
        .returning();

      if (!updated) {
        throw new LocalNotFoundError();
      }

      return toLocal(updated);
    },
    deleteLocal: async (localId) => {
      const [deleted] = await db
        .delete(branchesTable)
        .where(eq(branchesTable.id, localId))
        .returning();

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
        .from(branchesTable)
        .where(eq(branchesTable.id, localId))
        .limit(1);

      return row && row.id === localId ? toLocal(row) : null;
    },
  };

  return gateway;
};