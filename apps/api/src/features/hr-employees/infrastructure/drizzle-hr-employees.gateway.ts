import { randomUUID } from 'node:crypto';

import { and, eq, isNull } from 'drizzle-orm';

import type { AppDb } from '../../../shared/infrastructure/db/client';
import {
  employeeAssignmentsTable,
  employeesTable,
  positionsTable,
  scopeNodesTable,
} from '../../../shared/infrastructure/db/schema';
import type { EmployeeAssignment } from '../domain/employee-assignments';
import type { Employee, HrEmployeesGateway, ScopeNodeRecord } from '../domain/employees';
import type { Position } from '../domain/positions';

const toEmployee = (row: typeof employeesTable.$inferSelect): Employee => ({
  id: row.id,
  companyId: row.companyId,
  createdAt: row.createdAt,
});

const toPosition = (row: typeof positionsTable.$inferSelect): Position => ({
  id: row.id,
  companyId: row.companyId,
  name: row.name,
  reportsToPositionId: row.reportsToPositionId,
  headcount: row.headcount,
  isActive: row.isActive,
  createdAt: row.createdAt,
});

const toEmployeeAssignment = (
  row: typeof employeeAssignmentsTable.$inferSelect,
): EmployeeAssignment => ({
  id: row.id,
  companyId: row.companyId,
  employeeId: row.employeeId,
  scopeNodeId: row.scopeNodeId,
  positionId: row.positionId,
  startedAt: row.startedAt,
  endedAt: row.endedAt,
  isPrimary: row.isPrimary,
  createdAt: row.createdAt,
});

const toScopeNode = (row: typeof scopeNodesTable.$inferSelect): ScopeNodeRecord => ({
  id: row.id,
  companyId: row.companyId,
  nodeType: row.nodeType,
  sourceId: row.sourceId,
  parentScopeNodeId: row.parentScopeNodeId,
  name: row.name,
});

export const createDrizzleHrEmployeesGateway = (
  db: AppDb,
  {
    createId = randomUUID,
    now = () => new Date(),
  }: {
    createId?: () => string;
    now?: () => Date;
  } = {},
): HrEmployeesGateway => ({
  createEmployee: async ({ companyId }) => {
    const [row] = await db
      .insert(employeesTable)
      .values({ id: createId(), companyId, createdAt: now() })
      .returning();

    return toEmployee(row!);
  },
  updateEmployee: async (companyId, employeeId) => {
    const [row] = await db
      .select()
      .from(employeesTable)
      .where(and(eq(employeesTable.companyId, companyId), eq(employeesTable.id, employeeId)))
      .limit(1);

    return row ? toEmployee(row) : null;
  },
  getEmployeeById: async (companyId, employeeId) => {
    const [row] = await db
      .select()
      .from(employeesTable)
      .where(and(eq(employeesTable.companyId, companyId), eq(employeesTable.id, employeeId)))
      .limit(1);

    return row ? toEmployee(row) : null;
  },
  listEmployees: async (companyId) => {
    const rows = await db.select().from(employeesTable).where(eq(employeesTable.companyId, companyId));
    return rows.map(toEmployee);
  },
  createPosition: async (input) => {
    const [row] = await db
      .insert(positionsTable)
      .values({
        id: createId(),
        companyId: input.companyId,
        name: input.name,
        reportsToPositionId: input.reportsToPositionId,
        headcount: input.headcount,
        isActive: input.isActive,
        createdAt: now(),
      })
      .returning();

    return toPosition(row!);
  },
  getPositionById: async (companyId, positionId) => {
    const [row] = await db
      .select()
      .from(positionsTable)
      .where(and(eq(positionsTable.companyId, companyId), eq(positionsTable.id, positionId)))
      .limit(1);

    return row ? toPosition(row) : null;
  },
  listPositions: async (companyId) => {
    const rows = await db.select().from(positionsTable).where(eq(positionsTable.companyId, companyId));
    return rows.map(toPosition);
  },
  countActivePrimaryAssignmentsForPosition: async (positionId) => {
    const rows = await db
      .select()
      .from(employeeAssignmentsTable)
      .where(
        and(
          eq(employeeAssignmentsTable.positionId, positionId),
          eq(employeeAssignmentsTable.isPrimary, true),
          isNull(employeeAssignmentsTable.endedAt),
        ),
      );

    return rows.length;
  },
  findScopeNode: async (companyId, scopeNodeId) => {
    const [row] = await db
      .select()
      .from(scopeNodesTable)
      .where(and(eq(scopeNodesTable.companyId, companyId), eq(scopeNodesTable.id, scopeNodeId)))
      .limit(1);

    return row ? toScopeNode(row) : null;
  },
  createAssignment: async (input) => {
    return await db.transaction(async (tx) => {
      await tx
        .update(employeeAssignmentsTable)
        .set({ endedAt: input.startedAt })
        .where(
          and(
            eq(employeeAssignmentsTable.companyId, input.companyId),
            eq(employeeAssignmentsTable.employeeId, input.employeeId),
            eq(employeeAssignmentsTable.isPrimary, true),
            isNull(employeeAssignmentsTable.endedAt),
          ),
        );

      const [row] = await tx
        .insert(employeeAssignmentsTable)
        .values({
          id: input.id ?? createId(),
          companyId: input.companyId,
          employeeId: input.employeeId,
          scopeNodeId: input.scopeNodeId,
          positionId: input.positionId,
          startedAt: input.startedAt,
          endedAt: null,
          isPrimary: input.isPrimary,
          createdAt: input.createdAt,
        })
        .returning();

      return toEmployeeAssignment(row!);
    });
  },
  getActivePrimaryAssignmentByEmployeeId: async (companyId, employeeId) => {
    const [row] = await db
      .select()
      .from(employeeAssignmentsTable)
      .where(
        and(
          eq(employeeAssignmentsTable.companyId, companyId),
          eq(employeeAssignmentsTable.employeeId, employeeId),
          eq(employeeAssignmentsTable.isPrimary, true),
          isNull(employeeAssignmentsTable.endedAt),
        ),
      )
      .limit(1);

    return row ? toEmployeeAssignment(row) : null;
  },
  getActivePrimaryAssignmentByPositionId: async (companyId, positionId) => {
    const [row] = await db
      .select()
      .from(employeeAssignmentsTable)
      .where(
        and(
          eq(employeeAssignmentsTable.companyId, companyId),
          eq(employeeAssignmentsTable.positionId, positionId),
          eq(employeeAssignmentsTable.isPrimary, true),
          isNull(employeeAssignmentsTable.endedAt),
        ),
      )
      .limit(1);

    return row ? toEmployeeAssignment(row) : null;
  },
  listDirectReportAssignments: async (companyId, managerPositionId) => {
    const directReportPositions = await db
      .select({ id: positionsTable.id })
      .from(positionsTable)
      .where(
        and(
          eq(positionsTable.companyId, companyId),
          eq(positionsTable.reportsToPositionId, managerPositionId),
        ),
      );

    const directReportPositionIds = new Set(directReportPositions.map((row) => row.id));

    const rows = await db
      .select()
      .from(employeeAssignmentsTable)
      .where(
        and(
          eq(employeeAssignmentsTable.companyId, companyId),
          eq(employeeAssignmentsTable.isPrimary, true),
          isNull(employeeAssignmentsTable.endedAt),
        ),
      );

    return rows
      .filter((row) => directReportPositionIds.has(row.positionId))
      .map(toEmployeeAssignment);
  },
});
