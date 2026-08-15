import { randomUUID } from 'node:crypto';

import { and, count, desc, eq, ilike, isNull, or } from 'drizzle-orm';

import type { AppDb } from '../../../shared/infrastructure/db/client';
import {
  employeeAssignmentsTable,
  employeesTable,
  positionsTable,
  scopeNodesTable,
} from '../../../shared/infrastructure/db/schema';
import type { EmployeeAssignment } from '../domain/employee-assignments';
import {
  EmployeeDocumentConflictError,
  type Employee,
  type EmployeeListFilters,
  type EmployeePage,
  type HrEmployeesGateway,
  type ScopeNodeRecord,
} from '../domain/employees';
import {
  PositionHeadcountExceededError,
  PositionNotFoundError,
  type Position,
} from '../domain/positions';

const toEmployee = (row: typeof employeesTable.$inferSelect): Employee =>
  ({
    id: row.id,
    companyId: row.companyId,
    fullName: row.fullName,
    documentType: row.documentType,
    documentNumber: row.documentNumber,
    email: row.email,
    employmentStatus: row.employmentStatus as Employee['employmentStatus'],
    hiredAt: row.hiredAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }) as Employee;

const isEmployeeDocumentConflict = (error: unknown) =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  error.code === '23505' &&
  'constraint' in error &&
  error.constraint === 'employees_company_document_idx';

const toPosition = (
  row: typeof positionsTable.$inferSelect,
  occupiedHeadcount: number,
): Position => ({
  id: row.id,
  companyId: row.companyId,
  name: row.name,
  reportsToPositionId: row.reportsToPositionId,
  headcount: row.headcount,
  occupiedHeadcount,
  remainingVacancies: row.headcount - occupiedHeadcount,
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

const toScopeNode = (
  row: typeof scopeNodesTable.$inferSelect,
): ScopeNodeRecord => ({
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
  createEmployee: async (input) => {
    try {
      const [row] = await db
        .insert(employeesTable)
        .values({
          id: createId(),
          companyId: input.companyId,
          fullName: input.fullName,
          documentType: input.documentType,
          documentNumber: input.documentNumber,
          email: input.email,
          employmentStatus: input.employmentStatus,
          hiredAt: input.hiredAt,
          createdAt: now(),
          updatedAt: now(),
        })
        .returning();

      return toEmployee(row!);
    } catch (error) {
      if (isEmployeeDocumentConflict(error)) {
        throw new EmployeeDocumentConflictError();
      }
      throw error;
    }
  },
  updateEmployee: async (companyId, employeeId, input) => {
    try {
      if (!input) {
        const [existing] = await db
          .select()
          .from(employeesTable)
          .where(
            and(
              eq(employeesTable.companyId, companyId),
              eq(employeesTable.id, employeeId),
            ),
          )
          .limit(1);
        return existing ? toEmployee(existing) : null;
      }

      const [row] = await db
        .update(employeesTable)
        .set({
          fullName: input.fullName,
          documentType: input.documentType,
          documentNumber: input.documentNumber,
          email: input.email,
          employmentStatus: input.employmentStatus,
          hiredAt: input.hiredAt,
          updatedAt: now(),
        })
        .where(
          and(
            eq(employeesTable.companyId, companyId),
            eq(employeesTable.id, employeeId),
          ),
        )
        .returning();

      return row ? toEmployee(row) : null;
    } catch (error) {
      if (isEmployeeDocumentConflict(error)) {
        throw new EmployeeDocumentConflictError();
      }
      throw error;
    }
  },
  getEmployeeById: async (companyId, employeeId) => {
    const [row] = await db
      .select()
      .from(employeesTable)
      .where(
        and(
          eq(employeesTable.companyId, companyId),
          eq(employeesTable.id, employeeId),
        ),
      )
      .limit(1);

    return row ? toEmployee(row) : null;
  },
  listEmployees: async (companyId) => {
    const rows = await db
      .select()
      .from(employeesTable)
      .where(eq(employeesTable.companyId, companyId));
    return rows.map(toEmployee);
  },
  listEmployeesPage: async (
    companyId,
    filters: EmployeeListFilters,
  ): Promise<EmployeePage> => {
    const search = filters.search?.trim();
    const conditions = [
      eq(employeesTable.companyId, companyId),
      ...(filters.status
        ? [eq(employeesTable.employmentStatus, filters.status)]
        : []),
      ...(search
        ? [
            or(
              ilike(employeesTable.fullName, `%${search}%`),
              ilike(employeesTable.email, `%${search}%`),
              ilike(employeesTable.documentNumber, `%${search}%`),
              ilike(employeesTable.id, `%${search}%`),
            ),
          ]
        : []),
    ];
    const where = and(...conditions);
    const [rows, countRows] = await Promise.all([
      db
        .select()
        .from(employeesTable)
        .where(where)
        .orderBy(desc(employeesTable.createdAt), desc(employeesTable.id))
        .limit(filters.pageSize)
        .offset((filters.page - 1) * filters.pageSize),
      db.select({ total: count() }).from(employeesTable).where(where),
    ]);

    return {
      items: rows.map(toEmployee),
      total: Number(countRows[0]?.total ?? 0),
      page: filters.page,
      pageSize: filters.pageSize,
    };
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

    return toPosition(row!, 0);
  },
  getPositionById: async (companyId, positionId) => {
    const [row] = await db
      .select()
      .from(positionsTable)
      .where(
        and(
          eq(positionsTable.companyId, companyId),
          eq(positionsTable.id, positionId),
        ),
      )
      .limit(1);

    return row
      ? toPosition(
          row,
          await (async () => {
            const assignments = await db
              .select()
              .from(employeeAssignmentsTable)
              .where(
                and(
                  eq(employeeAssignmentsTable.positionId, positionId),
                  eq(employeeAssignmentsTable.isPrimary, true),
                  isNull(employeeAssignmentsTable.endedAt),
                ),
              );
            return assignments.length;
          })(),
        )
      : null;
  },
  listPositions: async (companyId) => {
    const rows = await db
      .select()
      .from(positionsTable)
      .where(eq(positionsTable.companyId, companyId));
    return await Promise.all(
      rows.map(async (row) =>
        toPosition(
          row,
          await (async () => {
            const assignments = await db
              .select()
              .from(employeeAssignmentsTable)
              .where(
                and(
                  eq(employeeAssignmentsTable.positionId, row.id),
                  eq(employeeAssignmentsTable.isPrimary, true),
                  isNull(employeeAssignmentsTable.endedAt),
                ),
              );
            return assignments.length;
          })(),
        ),
      ),
    );
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
      .where(
        and(
          eq(scopeNodesTable.companyId, companyId),
          eq(scopeNodesTable.id, scopeNodeId),
        ),
      )
      .limit(1);

    return row ? toScopeNode(row) : null;
  },
  createAssignment: async (input) => {
    return await db.transaction(async (tx) => {
      const [position] = await tx
        .select()
        .from(positionsTable)
        .where(
          and(
            eq(positionsTable.companyId, input.companyId),
            eq(positionsTable.id, input.positionId),
          ),
        )
        .for('update')
        .limit(1);

      if (!position) {
        throw new PositionNotFoundError();
      }

      const [currentAssignment] = await tx
        .select()
        .from(employeeAssignmentsTable)
        .where(
          and(
            eq(employeeAssignmentsTable.companyId, input.companyId),
            eq(employeeAssignmentsTable.employeeId, input.employeeId),
            eq(employeeAssignmentsTable.isPrimary, true),
            isNull(employeeAssignmentsTable.endedAt),
          ),
        )
        .limit(1);
      const activeAssignments = await tx
        .select()
        .from(employeeAssignmentsTable)
        .where(
          and(
            eq(employeeAssignmentsTable.positionId, input.positionId),
            eq(employeeAssignmentsTable.isPrimary, true),
            isNull(employeeAssignmentsTable.endedAt),
          ),
        );

      if (
        currentAssignment?.positionId !== input.positionId &&
        activeAssignments.length >= position.headcount
      ) {
        throw new PositionHeadcountExceededError();
      }

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
  listAssignmentHistory: async (companyId, employeeId) => {
    const rows = await db
      .select({
        assignment: employeeAssignmentsTable,
        positionName: positionsTable.name,
        scopeNodeName: scopeNodesTable.name,
      })
      .from(employeeAssignmentsTable)
      .innerJoin(
        positionsTable,
        and(
          eq(positionsTable.id, employeeAssignmentsTable.positionId),
          eq(positionsTable.companyId, employeeAssignmentsTable.companyId),
        ),
      )
      .innerJoin(
        scopeNodesTable,
        and(
          eq(scopeNodesTable.id, employeeAssignmentsTable.scopeNodeId),
          eq(scopeNodesTable.companyId, employeeAssignmentsTable.companyId),
        ),
      )
      .where(
        and(
          eq(employeeAssignmentsTable.companyId, companyId),
          eq(employeeAssignmentsTable.employeeId, employeeId),
        ),
      )
      .orderBy(employeeAssignmentsTable.startedAt);

    return rows.map(({ assignment, positionName, scopeNodeName }) => ({
      ...toEmployeeAssignment(assignment),
      positionName,
      scopeNodeName,
    }));
  },
  getActivePrimaryAssignmentByEmployeeId: async (companyId, employeeId) => {
    const [row] = await db
      .select()
      .from(employeeAssignmentsTable)
      .innerJoin(
        employeesTable,
        and(
          eq(employeesTable.id, employeeAssignmentsTable.employeeId),
          eq(employeesTable.companyId, employeeAssignmentsTable.companyId),
        ),
      )
      .innerJoin(
        positionsTable,
        and(
          eq(positionsTable.id, employeeAssignmentsTable.positionId),
          eq(positionsTable.companyId, employeeAssignmentsTable.companyId),
        ),
      )
      .where(
        and(
          eq(employeeAssignmentsTable.companyId, companyId),
          eq(employeeAssignmentsTable.employeeId, employeeId),
          eq(employeeAssignmentsTable.isPrimary, true),
          isNull(employeeAssignmentsTable.endedAt),
        ),
      )
      .limit(1);

    return row ? toEmployeeAssignment(row.employee_assignments) : null;
  },
  getActivePrimaryAssignmentByPositionId: async (companyId, positionId) => {
    const [row] = await db
      .select()
      .from(employeeAssignmentsTable)
      .innerJoin(
        employeesTable,
        and(
          eq(employeesTable.id, employeeAssignmentsTable.employeeId),
          eq(employeesTable.companyId, employeeAssignmentsTable.companyId),
        ),
      )
      .innerJoin(
        positionsTable,
        and(
          eq(positionsTable.id, employeeAssignmentsTable.positionId),
          eq(positionsTable.companyId, employeeAssignmentsTable.companyId),
        ),
      )
      .where(
        and(
          eq(employeeAssignmentsTable.companyId, companyId),
          eq(employeeAssignmentsTable.positionId, positionId),
          eq(employeeAssignmentsTable.isPrimary, true),
          isNull(employeeAssignmentsTable.endedAt),
        ),
      )
      .limit(1);

    return row ? toEmployeeAssignment(row.employee_assignments) : null;
  },
  listDirectReportAssignments: async (companyId, managerPositionId) => {
    const rows = await db
      .select()
      .from(employeeAssignmentsTable)
      .innerJoin(
        employeesTable,
        and(
          eq(employeesTable.id, employeeAssignmentsTable.employeeId),
          eq(employeesTable.companyId, employeeAssignmentsTable.companyId),
        ),
      )
      .innerJoin(
        positionsTable,
        and(
          eq(positionsTable.id, employeeAssignmentsTable.positionId),
          eq(positionsTable.companyId, employeeAssignmentsTable.companyId),
          eq(positionsTable.reportsToPositionId, managerPositionId),
        ),
      )
      .where(
        and(
          eq(employeeAssignmentsTable.companyId, companyId),
          eq(employeeAssignmentsTable.isPrimary, true),
          isNull(employeeAssignmentsTable.endedAt),
        ),
      );

    return rows.map((row) => toEmployeeAssignment(row.employee_assignments));
  },
});
