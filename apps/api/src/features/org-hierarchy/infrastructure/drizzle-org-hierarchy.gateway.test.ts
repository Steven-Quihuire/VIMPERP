import { describe, expect, it } from 'vitest';

import type { AppDb } from '../../../shared/infrastructure/db/client';
import {
  auditEventsTable,
  areasTable,
  divisionsTable,
  employeesTable,
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
  AreaNotFoundError,
  DivisionConflictError,
  DivisionNameConflictError,
  DivisionNotFoundError,
  LocalConflictError,
  LocalNameConflictError,
  LocalNotFoundError,
  PointOfSaleNotFoundError,
  WarehouseNotFoundError,
} from '../domain/org-hierarchy';
import { createDrizzleOrgHierarchyGateway } from './drizzle-org-hierarchy.gateway';

type DivisionRow = {
  id: string;
  companyId: string;
  name: string;
  createdAt: Date;
};

type LocalRow = {
  id: string;
  companyId: string;
  divisionId: string | null;
  name: string;
  locale: string | null;
};

type ItemRow = {
  id: string;
  companyId: string;
  localId: string | null;
  deletedAt: Date | null;
};

type AreaRow = {
  id: string;
  companyId: string;
  divisionId: string | null;
  localId: string | null;
  name: string;
  kind: 'area';
  createdAt: Date;
};

type WarehouseRow = {
  id: string;
  companyId: string;
  areaId: string | null;
  localId: string | null;
  name: string;
  createdAt: Date;
};

type PointOfSaleRow = {
  id: string;
  companyId: string;
  areaId: string | null;
  localId: string | null;
  name: string;
  createdAt: Date;
};

type EmployeeRow = {
  id: string;
  companyId: string;
  userId: string | null;
  position: string;
  areaId: string | null;
  createdAt: Date;
};

type MembershipRow = {
  userId: string;
  companyId: string | null;
  divisionId: string | null;
  localId: string | null;
  role: 'platform-admin' | 'company-owner' | 'company-user';
};

type WriteRecord = {
  kind: 'insert' | 'update' | 'delete';
  table: unknown;
  values: unknown;
};

const clone = <T>(value: T): T => structuredClone(value);

const createSelectBuilder = <T>(rows: T[]) => {
  const builder = {
    where: () => builder,
    orderBy: () => builder,
    limit: () => builder,
    then: <TResult1 = T[], TResult2 = never>(
      onfulfilled?: ((value: T[]) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?:
        ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ) =>
      Promise.resolve(rows.map((row) => clone(row))).then(
        onfulfilled,
        onrejected,
      ),
  };
  return builder;
};

const applyReturningWhere = (
  apply: () => unknown,
  returning: () => unknown[],
) => {
  const thenable = {
    returning: () => Promise.resolve(returning()),
    then: <TResult1 = unknown[], TResult2 = never>(
      onfulfilled?:
        ((value: unknown[]) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?:
        ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ) =>
      Promise.resolve<unknown[]>([]).then(
        onfulfilled as never,
        onrejected as never,
      ),
  };
  apply();
  return thenable;
};

const createFakeDb = ({
  divisions = [],
  locals = [],
  areas = [],
  warehouses = [],
  pointsOfSale = [],
  employees = [],
  items = [],
  memberships = [],
  roleAssignments = [],
  responsibilities = [],
  managementInvitations = [],
  activeScopePreferences = [],
  divisionCreateError,
  divisionDeleteError,
  localDeleteError,
}: {
  divisions?: DivisionRow[];
  locals?: LocalRow[];
  areas?: AreaRow[];
  warehouses?: WarehouseRow[];
  pointsOfSale?: PointOfSaleRow[];
  employees?: EmployeeRow[];
  items?: ItemRow[];
  memberships?: MembershipRow[];
  roleAssignments?: { scopeNodeId: string }[];
  responsibilities?: { scopeNodeId: string }[];
  managementInvitations?: { scopeNodeId: string; acceptedAt?: Date | null }[];
  activeScopePreferences?: { activeScopeNodeId: string | null }[];
  divisionCreateError?: unknown;
  divisionDeleteError?: unknown;
  localDeleteError?: unknown;
} = {}) => {
  const state = {
    divisions: divisions.map((d) => clone(d)),
    locals: locals.map((local) => clone(local)),
    areas: areas.map((area) => clone(area)),
    warehouses: warehouses.map((warehouse) => clone(warehouse)),
    pointsOfSale: pointsOfSale.map((point) => clone(point)),
    employees: employees.map((employee) => clone(employee)),
    items: items.map((i) => clone(i)),
    memberships: memberships.map((m) => clone(m)),
    roleAssignments: roleAssignments.map((row) => clone(row)),
    responsibilities: responsibilities.map((row) => clone(row)),
    managementInvitations: managementInvitations.map((row) => clone(row)),
    activeScopePreferences: activeScopePreferences.map((row) => clone(row)),
  };
  const writes: WriteRecord[] = [];

  const select = () => ({
    from: (table: unknown) => {
      if (table === divisionsTable) {
        return createSelectBuilder(state.divisions);
      }
      if (table === localsTable) {
        return createSelectBuilder(state.locals);
      }
      if (table === areasTable) {
        return createSelectBuilder(state.areas);
      }
      if (table === warehousesTable) {
        return createSelectBuilder(state.warehouses);
      }
      if (table === pointsOfSaleTable) {
        return createSelectBuilder(state.pointsOfSale);
      }
      if (table === employeesTable) {
        return createSelectBuilder(state.employees);
      }
      if (table === itemsTable) {
        return createSelectBuilder(state.items);
      }
      if (table === membershipsTable) {
        return createSelectBuilder(state.memberships);
      }
      if (table === roleAssignmentsTable) {
        return createSelectBuilder(state.roleAssignments);
      }
      if (table === nodeResponsibilitiesTable) {
        return createSelectBuilder(state.responsibilities);
      }
      if (table === nodeManagementInvitationsTable) {
        return createSelectBuilder(state.managementInvitations);
      }
      if (table === userPreferencesTable) {
        return createSelectBuilder(state.activeScopePreferences);
      }
      return createSelectBuilder([]);
    },
  });

  const db = {
    select,
    transaction: async <T>(callback: (client: typeof db) => Promise<T>) =>
      await callback(db as typeof db),
    insert: (table: unknown) => ({
      values: (values: unknown) => {
        if (table === divisionsTable) {
          if (divisionCreateError) {
            return Promise.reject(divisionCreateError);
          }
          writes.push({ kind: 'insert', table, values: clone(values) });
          state.divisions.push(clone(values as DivisionRow));
          const { uniqueViolation }: { uniqueViolation: boolean } = {
            uniqueViolation: false,
          };
          void uniqueViolation;
          return Promise.resolve([]);
        }
        if (table === localsTable) {
          writes.push({ kind: 'insert', table, values: clone(values) });
          state.locals.push(clone(values as LocalRow));
          return Promise.resolve([]);
        }
        if (table === areasTable) {
          writes.push({ kind: 'insert', table, values: clone(values) });
          state.areas.push(clone(values as AreaRow));
          return Promise.resolve([]);
        }
        if (table === warehousesTable) {
          writes.push({ kind: 'insert', table, values: clone(values) });
          state.warehouses.push(clone(values as WarehouseRow));
          return Promise.resolve([]);
        }
        if (table === pointsOfSaleTable) {
          writes.push({ kind: 'insert', table, values: clone(values) });
          state.pointsOfSale.push(clone(values as PointOfSaleRow));
          return Promise.resolve([]);
        }
        if (table === auditEventsTable) {
          writes.push({ kind: 'insert', table, values: clone(values) });
          return Promise.resolve([]);
        }
        return Promise.resolve([]);
      },
    }),
    update: (table: unknown) => ({
      set: (values: Record<string, unknown>) => ({
        where: () => {
          void table;
          const apply = () => {
            writes.push({ kind: 'update', table, values: clone(values) });
            if (table === divisionsTable) {
              const first = state.divisions[0];
              if (first) {
                Object.assign(first, values);
              }
            }
            if (table === localsTable) {
              const first = state.locals[0];
              if (first) {
                Object.assign(first, values);
              }
            }
            if (table === areasTable) {
              const first = state.areas[0];
              if (first) {
                Object.assign(first, values);
              }
            }
            if (table === warehousesTable) {
              const first = state.warehouses[0];
              if (first) {
                Object.assign(first, values);
              }
            }
            if (table === pointsOfSaleTable) {
              const first = state.pointsOfSale[0];
              if (first) {
                Object.assign(first, values);
              }
            }
            if (table === userPreferencesTable) {
              for (const preference of state.activeScopePreferences) {
                Object.assign(preference, values);
              }
            }
          };
          const returning = () => {
            if (table === divisionsTable) {
              const first = state.divisions[0];
              return first ? [clone(first)] : [];
            }
            if (table === localsTable) {
              const first = state.locals[0];
              return first ? [clone(first)] : [];
            }
            if (table === areasTable) {
              const first = state.areas[0];
              return first ? [clone(first)] : [];
            }
            if (table === warehousesTable) {
              const first = state.warehouses[0];
              return first ? [clone(first)] : [];
            }
            if (table === pointsOfSaleTable) {
              const first = state.pointsOfSale[0];
              return first ? [clone(first)] : [];
            }
            return [];
          };
          return applyReturningWhere(apply, returning);
        },
      }),
    }),
    delete: (table: unknown) => ({
      where: () => {
        void table;
        const apply = () => {
          writes.push({ kind: 'delete', table, values: null });
          if (table === nodeManagementInvitationsTable) {
            state.managementInvitations = state.managementInvitations.filter(
              (invitation) => invitation.acceptedAt != null,
            );
          }
          // no-op; the actual mutation is reported when returning() is invoked
          // because drizzle's DELETE only materializes when consumed.
        };
        const returning = () => {
          if (table === divisionsTable) {
            if (divisionDeleteError) {
              throw divisionDeleteError;
            }
            const first = state.divisions.shift();
            return first ? [clone(first)] : [];
          }
          if (table === localsTable) {
            if (localDeleteError) {
              throw localDeleteError;
            }
            const first = state.locals.shift();
            return first ? [clone(first)] : [];
          }
          if (table === areasTable) {
            const first = state.areas.shift();
            return first ? [clone(first)] : [];
          }
          if (table === warehousesTable) {
            const first = state.warehouses.shift();
            return first ? [clone(first)] : [];
          }
          if (table === pointsOfSaleTable) {
            const first = state.pointsOfSale.shift();
            return first ? [clone(first)] : [];
          }
          if (table === nodeManagementInvitationsTable) {
            return [];
          }
          return [];
        };
        return applyReturningWhere(apply, returning);
      },
    }),
  } as unknown as AppDb;

  return { db, state, writes };
};

const baseDate = new Date('2026-07-30T18:00:00.000Z');

describe('createDrizzleOrgHierarchyGateway', () => {
  it('counts all restrictive scope-node dependencies', async () => {
    const { db } = createFakeDb({
      roleAssignments: [{ scopeNodeId: 'area-area-1' }],
      responsibilities: [{ scopeNodeId: 'area-area-1' }],
      managementInvitations: [
        { scopeNodeId: 'area-area-1', acceptedAt: new Date() },
      ],
      activeScopePreferences: [{ activeScopeNodeId: 'area-area-1' }],
    });
    const gateway = createDrizzleOrgHierarchyGateway(db);

    await expect(
      gateway.getScopeNodeDependencyCounts({
        nodeType: 'area',
        sourceId: 'area-1',
      }),
    ).resolves.toEqual({
      roleAssignments: 1,
      responsibilities: 1,
      managementInvitations: 1,
      activeScopePreferences: 1,
    });
  });

  it('cleans pending invitations and active preferences while preserving accepted invitations', async () => {
    const { db, state } = createFakeDb({
      divisions: [
        {
          id: 'division-1',
          companyId: 'company-a',
          name: 'Operations',
          createdAt: baseDate,
        },
      ],
      managementInvitations: [
        { scopeNodeId: 'division-1', acceptedAt: null },
        { scopeNodeId: 'division-1', acceptedAt: baseDate },
      ],
      activeScopePreferences: [{ activeScopeNodeId: 'division-1' }],
    });
    const gateway = createDrizzleOrgHierarchyGateway(db);

    await gateway.deleteDivision({
      divisionId: 'division-1',
      actorUserId: 'user-1',
      correlationId: 'corr-1',
    });

    expect(state.managementInvitations).toEqual([
      { scopeNodeId: 'division-1', acceptedAt: baseDate },
    ]);
    expect(state.activeScopePreferences).toEqual([{ activeScopeNodeId: null }]);
  });

  it('creates a division with generated id and createdAt', async () => {
    const { db, state, writes } = createFakeDb();
    const gateway = createDrizzleOrgHierarchyGateway(db, {
      createId: () => 'division-1',
      now: () => baseDate,
    });

    const division = await gateway.createDivision({
      companyId: 'company-a',
      name: 'Retail',
      actorUserId: 'user-1',
      correlationId: 'corr-1',
    });

    expect(division).toEqual({
      id: 'division-1',
      companyId: 'company-a',
      name: 'Retail',
      createdAt: baseDate,
    });
    expect(state.divisions).toHaveLength(1);
    expect(state.divisions[0]).toEqual({
      id: 'division-1',
      companyId: 'company-a',
      name: 'Retail',
      createdAt: baseDate,
    });
    expect(
      writes.some(
        (entry) =>
          entry.kind === 'insert' &&
          entry.table === auditEventsTable &&
          (entry.values as { type?: string }).type ===
            'org_hierarchy.division.created',
      ),
    ).toBe(true);
  });

  it('lists divisions for a company', async () => {
    const { db } = createFakeDb({
      divisions: [
        {
          id: 'd-1',
          companyId: 'company-a',
          name: 'Retail',
          createdAt: baseDate,
        },
        {
          id: 'd-2',
          companyId: 'company-b',
          name: 'Other',
          createdAt: baseDate,
        },
      ],
    });
    const gateway = createDrizzleOrgHierarchyGateway(db);

    const divisions = await gateway.listDivisions('company-a');

    expect(divisions).toEqual([
      {
        id: 'd-1',
        companyId: 'company-a',
        name: 'Retail',
        createdAt: baseDate,
      },
    ]);
  });

  it('updates a division name', async () => {
    const { db, state } = createFakeDb({
      divisions: [
        {
          id: 'd-1',
          companyId: 'company-a',
          name: 'Retail',
          createdAt: baseDate,
        },
      ],
    });
    const gateway = createDrizzleOrgHierarchyGateway(db);

    const updated = await gateway.updateDivision({
      divisionId: 'd-1',
      name: 'Retail Updated',
      actorUserId: 'user-1',
      correlationId: 'corr-2',
    });

    expect(updated.name).toBe('Retail Updated');
    expect(state.divisions[0]?.name).toBe('Retail Updated');
  });

  it('throws DivisionNotFoundError when updating a missing division', async () => {
    const { db } = createFakeDb();
    const gateway = createDrizzleOrgHierarchyGateway(db);

    await expect(
      gateway.updateDivision({ divisionId: 'missing', name: 'X' }),
    ).rejects.toBeInstanceOf(DivisionNotFoundError);
  });

  it('deletes a division', async () => {
    const { db, state } = createFakeDb({
      divisions: [
        {
          id: 'd-1',
          companyId: 'company-a',
          name: 'Retail',
          createdAt: baseDate,
        },
      ],
    });
    const gateway = createDrizzleOrgHierarchyGateway(db);

    await gateway.deleteDivision({
      divisionId: 'd-1',
      actorUserId: 'user-1',
      correlationId: 'corr-3',
    });

    expect(state.divisions).toHaveLength(0);
  });

  it('maps wrapped division delete foreign key violations to DivisionConflictError', async () => {
    const { db } = createFakeDb({
      divisions: [
        {
          id: 'd-1',
          companyId: 'company-a',
          name: 'Retail',
          createdAt: baseDate,
        },
      ],
      divisionDeleteError: { cause: { code: '23503' } },
    });
    const gateway = createDrizzleOrgHierarchyGateway(db);

    await expect(
      gateway.deleteDivision({ divisionId: 'd-1' }),
    ).rejects.toBeInstanceOf(DivisionConflictError);
  });

  it('maps wrapped unique violations to DivisionNameConflictError', async () => {
    const { db } = createFakeDb({
      divisionCreateError: { cause: { code: '23505' } },
    });
    const gateway = createDrizzleOrgHierarchyGateway(db, {
      createId: () => 'division-1',
      now: () => baseDate,
    });

    await expect(
      gateway.createDivision({
        companyId: 'company-a',
        name: 'Retail',
        actorUserId: 'user-1',
        correlationId: 'corr-1',
      }),
    ).rejects.toBeInstanceOf(DivisionNameConflictError);
  });

  it('countLocalsInDivision returns the number of locals with divisionId', async () => {
    const { db } = createFakeDb({
      locals: [
        {
          id: 'b-1',
          companyId: 'company-a',
          divisionId: 'd-1',
          name: 'A',
          locale: null,
        },
        {
          id: 'b-2',
          companyId: 'company-a',
          divisionId: 'd-1',
          name: 'B',
          locale: null,
        },
      ],
    });
    const gateway = createDrizzleOrgHierarchyGateway(db);

    await expect(gateway.countLocalsInDivision('d-1')).resolves.toBe(2);
  });

  it('creates a local at company level with divisionId null', async () => {
    const { db, state, writes } = createFakeDb();
    const gateway = createDrizzleOrgHierarchyGateway(db, {
      createId: () => 'local-1',
    });

    const local = await gateway.createLocal({
      companyId: 'company-a',
      name: 'Main Store',
      actorUserId: 'user-1',
      correlationId: 'corr-local-create',
    });

    expect(local).toEqual({
      id: 'local-1',
      companyId: 'company-a',
      divisionId: null,
      name: 'Main Store',
      locale: null,
    });
    expect(state.locals[0]).toEqual({
      id: 'local-1',
      companyId: 'company-a',
      divisionId: null,
      name: 'Main Store',
      locale: null,
    });
    expect(
      writes.some(
        (entry) =>
          entry.kind === 'insert' &&
          entry.table === auditEventsTable &&
          (entry.values as { type?: string }).type ===
            'org_hierarchy.local.created',
      ),
    ).toBe(true);
  });

  it('creates a local under a division', async () => {
    const { db, state } = createFakeDb();
    const gateway = createDrizzleOrgHierarchyGateway(db, {
      createId: () => 'local-1',
    });

    await gateway.createLocal({
      companyId: 'company-a',
      name: 'Store A',
      divisionId: 'retail-1',
    });

    expect(state.locals[0]?.divisionId).toBe('retail-1');
  });

  it('throws LocalNameConflictError when creating a local with an existing name', async () => {
    const { db } = createFakeDb({
      locals: [
        {
          id: 'local-1',
          companyId: 'company-a',
          divisionId: null,
          name: 'Main',
          locale: null,
        },
      ],
    });
    const gateway = createDrizzleOrgHierarchyGateway(db, {
      createId: () => 'local-2',
    });

    await expect(
      gateway.createLocal({ companyId: 'company-a', name: 'Main' }),
    ).rejects.toBeInstanceOf(LocalNameConflictError);
  });

  it('allows duplicate local names when they belong to different parent scopes', async () => {
    const { db } = createFakeDb({
      locals: [
        {
          id: 'local-1',
          companyId: 'company-a',
          divisionId: null,
          name: 'Main',
          locale: null,
        },
      ],
    });
    const gateway = createDrizzleOrgHierarchyGateway(db, {
      createId: () => 'local-2',
    });

    await expect(
      gateway.createLocal({
        companyId: 'company-a',
        name: 'Main',
        divisionId: 'division-1',
      }),
    ).resolves.toMatchObject({ id: 'local-2', divisionId: 'division-1' });
  });

  it('lists locals', async () => {
    const { db } = createFakeDb({
      locals: [
        {
          id: 'l-1',
          companyId: 'company-a',
          divisionId: null,
          name: 'A',
          locale: null,
        },
        {
          id: 'l-2',
          companyId: 'company-b',
          divisionId: null,
          name: 'B',
          locale: null,
        },
      ],
    });
    const gateway = createDrizzleOrgHierarchyGateway(db);

    const locals = await gateway.listLocals('company-a');

    expect(locals).toEqual([
      {
        id: 'l-1',
        companyId: 'company-a',
        divisionId: null,
        name: 'A',
        locale: null,
      },
    ]);
  });

  it('updates a local name and re-parents to another division', async () => {
    const { db, state } = createFakeDb({
      locals: [
        {
          id: 'l-1',
          companyId: 'company-a',
          divisionId: 'retail-1',
          name: 'A',
          locale: null,
        },
      ],
    });
    const gateway = createDrizzleOrgHierarchyGateway(db);

    const updated = await gateway.updateLocal({
      localId: 'l-1',
      name: 'A Updated',
      divisionId: 'wholesale-1',
    });

    expect(updated.name).toBe('A Updated');
    expect(updated.divisionId).toBe('wholesale-1');
    expect(state.locals[0]?.divisionId).toBe('wholesale-1');
  });

  it('re-parents a local to company level via divisionId null', async () => {
    const { db, state } = createFakeDb({
      locals: [
        {
          id: 'l-1',
          companyId: 'company-a',
          divisionId: 'retail-1',
          name: 'A',
          locale: null,
        },
      ],
    });
    const gateway = createDrizzleOrgHierarchyGateway(db);

    const updated = await gateway.updateLocal({
      localId: 'l-1',
      divisionId: null,
    });

    expect(updated.divisionId).toBeNull();
    expect(state.locals[0]?.divisionId).toBeNull();
  });

  it('throws LocalNameConflictError when renaming a local to an existing name', async () => {
    const { db } = createFakeDb({
      locals: [
        {
          id: 'l-1',
          companyId: 'company-a',
          divisionId: null,
          name: 'A',
          locale: null,
        },
        {
          id: 'l-2',
          companyId: 'company-a',
          divisionId: null,
          name: 'B',
          locale: null,
        },
      ],
    });
    const gateway = createDrizzleOrgHierarchyGateway(db);

    await expect(
      gateway.updateLocal({ localId: 'l-1', name: 'B' }),
    ).rejects.toBeInstanceOf(LocalNameConflictError);
  });

  it('allows renaming a root local to match a division-scoped local name', async () => {
    const { db } = createFakeDb({
      locals: [
        {
          id: 'l-1',
          companyId: 'company-a',
          divisionId: null,
          name: 'A',
          locale: null,
        },
        {
          id: 'l-2',
          companyId: 'company-a',
          divisionId: 'division-1',
          name: 'B',
          locale: null,
        },
      ],
    });
    const gateway = createDrizzleOrgHierarchyGateway(db);

    await expect(
      gateway.updateLocal({ localId: 'l-1', name: 'B' }),
    ).resolves.toMatchObject({ id: 'l-1', name: 'B' });
  });

  it('throws LocalNotFoundError when updating a missing local', async () => {
    const { db } = createFakeDb();
    const gateway = createDrizzleOrgHierarchyGateway(db);

    await expect(
      gateway.updateLocal({ localId: 'missing', name: 'X' }),
    ).rejects.toBeInstanceOf(LocalNotFoundError);
  });

  it('deletes a local', async () => {
    const { db, state } = createFakeDb({
      locals: [
        {
          id: 'l-1',
          companyId: 'company-a',
          divisionId: null,
          name: 'A',
          locale: null,
        },
      ],
    });
    const gateway = createDrizzleOrgHierarchyGateway(db);

    await gateway.deleteLocal('l-1');

    expect(state.locals).toHaveLength(0);
  });

  it('maps local delete foreign key violations to LocalConflictError', async () => {
    const { db } = createFakeDb({
      locals: [
        {
          id: 'l-1',
          companyId: 'company-a',
          divisionId: null,
          name: 'A',
          locale: null,
        },
      ],
      localDeleteError: { code: '23503' },
    });
    const gateway = createDrizzleOrgHierarchyGateway(db);

    await expect(gateway.deleteLocal('l-1')).rejects.toBeInstanceOf(
      LocalConflictError,
    );
  });

  it('maps wrapped local delete foreign key violations to LocalConflictError', async () => {
    const { db } = createFakeDb({
      locals: [
        {
          id: 'l-1',
          companyId: 'company-a',
          divisionId: null,
          name: 'A',
          locale: null,
        },
      ],
      localDeleteError: { cause: { code: '23503' } },
    });
    const gateway = createDrizzleOrgHierarchyGateway(db);

    await expect(gateway.deleteLocal('l-1')).rejects.toBeInstanceOf(
      LocalConflictError,
    );
  });

  it('countItemsInLocal returns count of items with matching localId', async () => {
    const { db } = createFakeDb({
      items: [
        { id: 'i-1', companyId: 'c', localId: 'l-1', deletedAt: null },
        { id: 'i-2', companyId: 'c', localId: 'l-1', deletedAt: null },
      ],
    });
    const gateway = createDrizzleOrgHierarchyGateway(db);

    await expect(gateway.countItemsInLocal('l-1')).resolves.toBe(2);
  });

  it('countMembershipsInLocal returns count of memberships with matching localId', async () => {
    const { db } = createFakeDb({
      memberships: [
        {
          userId: 'u1',
          companyId: 'c',
          divisionId: null,
          localId: 'l-1',
          role: 'company-user' as const,
        },
        {
          userId: 'u2',
          companyId: 'c',
          divisionId: null,
          localId: 'l-1',
          role: 'company-owner' as const,
        },
      ],
    });
    const gateway = createDrizzleOrgHierarchyGateway(db);

    await expect(gateway.countMembershipsInLocal('l-1')).resolves.toBe(2);
  });

  it('findLocalById returns the local when present, otherwise null', async () => {
    const { db } = createFakeDb({
      locals: [
        {
          id: 'l-1',
          companyId: 'company-a',
          divisionId: null,
          name: 'A',
          locale: null,
        },
      ],
    });
    const gateway = createDrizzleOrgHierarchyGateway(db);

    await expect(gateway.findLocalById('l-1')).resolves.toEqual({
      id: 'l-1',
      companyId: 'company-a',
      divisionId: null,
      name: 'A',
      locale: null,
    });
  });

  it('findLocalById returns null when no row matches', async () => {
    const { db } = createFakeDb();
    const gateway = createDrizzleOrgHierarchyGateway(db);

    await expect(gateway.findLocalById('missing')).resolves.toBeNull();
  });

  it('creates and lists areas', async () => {
    const { db, state } = createFakeDb();
    const gateway = createDrizzleOrgHierarchyGateway(db, {
      createId: () => 'area-1',
      now: () => baseDate,
    });

    const area = await gateway.createArea({
      companyId: 'company-a',
      name: 'Operations',
      localId: 'local-1',
    });

    expect(area).toEqual({
      id: 'area-1',
      companyId: 'company-a',
      divisionId: null,
      localId: 'local-1',
      name: 'Operations',
      kind: 'area',
      createdAt: baseDate,
    });

    await expect(gateway.listAreas('company-a')).resolves.toEqual([
      expect.objectContaining({ id: 'area-1', name: 'Operations' }),
    ]);
    expect(state.areas).toHaveLength(1);
  });

  it('updates and deletes areas', async () => {
    const { db, state } = createFakeDb({
      areas: [
        {
          id: 'area-1',
          companyId: 'company-a',
          divisionId: 'division-1',
          localId: null,
          name: 'Operations',
          kind: 'area',
          createdAt: baseDate,
        },
      ],
    });
    const gateway = createDrizzleOrgHierarchyGateway(db);

    const updated = await gateway.updateArea({
      areaId: 'area-1',
      name: 'Ops',
      localId: 'local-1',
    });

    expect(updated).toMatchObject({
      id: 'area-1',
      divisionId: null,
      localId: 'local-1',
      name: 'Ops',
    });

    await gateway.deleteArea('area-1');
    expect(state.areas).toHaveLength(0);
  });

  it('throws AreaNotFoundError when updating a missing area', async () => {
    const { db } = createFakeDb();
    const gateway = createDrizzleOrgHierarchyGateway(db);

    await expect(
      gateway.updateArea({ areaId: 'missing', name: 'Ops' }),
    ).rejects.toBeInstanceOf(AreaNotFoundError);
  });

  it('counts area dependencies', async () => {
    const { db } = createFakeDb({
      areas: [
        {
          id: 'area-1',
          companyId: 'company-a',
          divisionId: 'division-1',
          localId: null,
          name: 'Operations',
          kind: 'area',
          createdAt: baseDate,
        },
      ],
      warehouses: [
        {
          id: 'warehouse-1',
          companyId: 'company-a',
          areaId: 'area-1',
          localId: null,
          name: 'Main Warehouse',
          createdAt: baseDate,
        },
      ],
      pointsOfSale: [
        {
          id: 'pos-1',
          companyId: 'company-a',
          areaId: 'area-1',
          localId: null,
          name: 'POS 01',
          createdAt: baseDate,
        },
      ],
      employees: [
        {
          id: 'employee-1',
          companyId: 'company-a',
          userId: 'user-1',
          position: 'Manager',
          areaId: 'area-1',
          createdAt: baseDate,
        },
      ],
    });
    const gateway = createDrizzleOrgHierarchyGateway(db);

    await expect(gateway.countAreasInDivision('division-1')).resolves.toBe(1);
    await expect(gateway.countWarehousesInArea('area-1')).resolves.toBe(1);
    await expect(gateway.countPointsOfSaleInArea('area-1')).resolves.toBe(1);
    await expect(gateway.countEmployeesInArea('area-1')).resolves.toBe(1);
  });

  it('creates, lists, updates and deletes warehouses', async () => {
    const { db, state } = createFakeDb();
    const gateway = createDrizzleOrgHierarchyGateway(db, {
      createId: () => 'warehouse-1',
      now: () => baseDate,
    });

    const warehouse = await gateway.createWarehouse({
      companyId: 'company-a',
      name: 'Main Warehouse',
      localId: 'local-1',
    });

    expect(warehouse).toEqual({
      id: 'warehouse-1',
      companyId: 'company-a',
      areaId: null,
      localId: 'local-1',
      name: 'Main Warehouse',
      createdAt: baseDate,
    });

    await expect(gateway.listWarehouses('company-a')).resolves.toHaveLength(1);

    const updated = await gateway.updateWarehouse({
      warehouseId: 'warehouse-1',
      name: 'Warehouse A',
      areaId: 'area-1',
    });

    expect(updated).toMatchObject({
      id: 'warehouse-1',
      localId: null,
      areaId: 'area-1',
      name: 'Warehouse A',
    });

    await gateway.deleteWarehouse('warehouse-1');
    expect(state.warehouses).toHaveLength(0);
  });

  it('throws WarehouseNotFoundError when updating a missing warehouse', async () => {
    const { db } = createFakeDb();
    const gateway = createDrizzleOrgHierarchyGateway(db);

    await expect(
      gateway.updateWarehouse({ warehouseId: 'missing', name: 'Warehouse A' }),
    ).rejects.toBeInstanceOf(WarehouseNotFoundError);
  });

  it('creates, lists, updates and deletes points of sale', async () => {
    const { db, state } = createFakeDb();
    const gateway = createDrizzleOrgHierarchyGateway(db, {
      createId: () => 'pos-1',
      now: () => baseDate,
    });

    const pointOfSale = await gateway.createPointOfSale({
      companyId: 'company-a',
      name: 'POS 01',
      localId: 'local-1',
    });

    expect(pointOfSale).toEqual({
      id: 'pos-1',
      companyId: 'company-a',
      areaId: null,
      localId: 'local-1',
      name: 'POS 01',
      createdAt: baseDate,
    });

    await expect(gateway.listPointsOfSale('company-a')).resolves.toHaveLength(
      1,
    );

    const updated = await gateway.updatePointOfSale({
      pointOfSaleId: 'pos-1',
      name: 'POS A',
      areaId: 'area-1',
    });

    expect(updated).toMatchObject({
      id: 'pos-1',
      localId: null,
      areaId: 'area-1',
      name: 'POS A',
    });

    await gateway.deletePointOfSale('pos-1');
    expect(state.pointsOfSale).toHaveLength(0);
  });

  it('throws PointOfSaleNotFoundError when updating a missing point of sale', async () => {
    const { db } = createFakeDb();
    const gateway = createDrizzleOrgHierarchyGateway(db);

    await expect(
      gateway.updatePointOfSale({ pointOfSaleId: 'missing', name: 'POS A' }),
    ).rejects.toBeInstanceOf(PointOfSaleNotFoundError);
  });
});
