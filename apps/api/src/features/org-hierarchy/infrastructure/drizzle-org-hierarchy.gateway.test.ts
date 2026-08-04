import { describe, expect, it } from 'vitest';

import type { AppDb } from '../../../shared/infrastructure/db/client';
import {
  branchesTable,
  divisionsTable,
  itemsTable,
  membershipsTable,
} from '../../../shared/infrastructure/db/schema';
import {
  DivisionConflictError,
  DivisionNameConflictError,
  DivisionNotFoundError,
  LocalConflictError,
  LocalNameConflictError,
  LocalNotFoundError,
} from '../domain/org-hierarchy';
import { createDrizzleOrgHierarchyGateway } from './drizzle-org-hierarchy.gateway';

type DivisionRow = {
  id: string;
  companyId: string;
  name: string;
  createdAt: Date;
};

type BranchRow = {
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

type MembershipRow = {
  userId: string;
  companyId: string | null;
  divisionId: string | null;
  localId: string | null;
  role: 'platform-admin' | 'company-owner' | 'company-user';
};

const clone = <T>(value: T): T => structuredClone(value);

const createSelectBuilder = <T>(rows: T[]) => {
  const builder = {
    where: () => builder,
    orderBy: () => builder,
    limit: () => builder,
    then: <TResult1 = T[], TResult2 = never>(
      onfulfilled?: ((value: T[]) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ) =>
      Promise.resolve(rows.map((row) => clone(row))).then(onfulfilled, onrejected),
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
        | ((value: unknown[]) => TResult1 | PromiseLike<TResult1>)
        | null,
      onrejected?:
        | ((reason: unknown) => TResult2 | PromiseLike<TResult2>)
        | null,
    ) =>
      Promise.resolve<unknown[]>([])
        .then(onfulfilled as never, onrejected as never),
  };
  apply();
  return thenable;
};

const createFakeDb = ({
  divisions = [],
  branches = [],
  items = [],
  memberships = [],
}: {
  divisions?: DivisionRow[];
  branches?: BranchRow[];
  items?: ItemRow[];
  memberships?: MembershipRow[];
} = {}) => {
  const state = {
    divisions: divisions.map((d) => clone(d)),
    branches: branches.map((b) => clone(b)),
    items: items.map((i) => clone(i)),
    memberships: memberships.map((m) => clone(m)),
  };

  const select = () => ({
    from: (table: unknown) => {
      if (table === divisionsTable) {
        return createSelectBuilder(state.divisions);
      }
      if (table === branchesTable) {
        return createSelectBuilder(state.branches);
      }
      if (table === itemsTable) {
        return createSelectBuilder(state.items);
      }
      if (table === membershipsTable) {
        return createSelectBuilder(state.memberships);
      }
      return createSelectBuilder([]);
    },
  });

  const db = {
    select,
    insert: (table: unknown) => ({
      values: (values: unknown) => {
        if (table === divisionsTable) {
          state.divisions.push(clone(values as DivisionRow));
          const { uniqueViolation }: { uniqueViolation: boolean } = {
            uniqueViolation: false,
          };
          void uniqueViolation;
          return Promise.resolve([]);
        }
        if (table === branchesTable) {
          state.branches.push(clone(values as BranchRow));
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
            if (table === divisionsTable) {
              const first = state.divisions[0];
              if (first) {
                Object.assign(first, values);
              }
            }
            if (table === branchesTable) {
              const first = state.branches[0];
              if (first) {
                Object.assign(first, values);
              }
            }
          };
          const returning = () => {
            if (table === divisionsTable) {
              const first = state.divisions[0];
              return first ? [clone(first)] : [];
            }
            if (table === branchesTable) {
              const first = state.branches[0];
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
          // no-op; the actual mutation is reported when returning() is invoked
          // because drizzle's DELETE only materializes when consumed.
        };
        const returning = () => {
          if (table === divisionsTable) {
            const first = state.divisions.shift();
            return first ? [clone(first)] : [];
          }
          if (table === branchesTable) {
            const first = state.branches.shift();
            return first ? [clone(first)] : [];
          }
          return [];
        };
        return applyReturningWhere(apply, returning);
      },
    }),
  } as unknown as AppDb;

  return { db, state };
};

const baseDate = new Date('2026-07-30T18:00:00.000Z');

describe('createDrizzleOrgHierarchyGateway', () => {
  it('creates a division with generated id and createdAt', async () => {
    const { db, state } = createFakeDb();
    const gateway = createDrizzleOrgHierarchyGateway(db, {
      createId: () => 'division-1',
      now: () => baseDate,
    });

    const division = await gateway.createDivision({
      companyId: 'company-a',
      name: 'Retail',
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
  });

  it('lists divisions for a company', async () => {
    const { db } = createFakeDb({
      divisions: [
        { id: 'd-1', companyId: 'company-a', name: 'Retail', createdAt: baseDate },
        { id: 'd-2', companyId: 'company-b', name: 'Other', createdAt: baseDate },
      ],
    });
    const gateway = createDrizzleOrgHierarchyGateway(db);

    const divisions = await gateway.listDivisions('company-a');

    expect(divisions).toEqual([
      { id: 'd-1', companyId: 'company-a', name: 'Retail', createdAt: baseDate },
    ]);
  });

  it('updates a division name', async () => {
    const { db, state } = createFakeDb({
      divisions: [
        { id: 'd-1', companyId: 'company-a', name: 'Retail', createdAt: baseDate },
      ],
    });
    const gateway = createDrizzleOrgHierarchyGateway(db);

    const updated = await gateway.updateDivision({
      divisionId: 'd-1',
      name: 'Retail Updated',
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
        { id: 'd-1', companyId: 'company-a', name: 'Retail', createdAt: baseDate },
      ],
    });
    const gateway = createDrizzleOrgHierarchyGateway(db);

    await gateway.deleteDivision('d-1');

    expect(state.divisions).toHaveLength(0);
  });

  it('countLocalsInDivision returns the number of locals with divisionId', async () => {
    const { db } = createFakeDb({
      branches: [
        { id: 'b-1', companyId: 'company-a', divisionId: 'd-1', name: 'A', locale: null },
        { id: 'b-2', companyId: 'company-a', divisionId: 'd-1', name: 'B', locale: null },
      ],
    });
    const gateway = createDrizzleOrgHierarchyGateway(db);

    await expect(gateway.countLocalsInDivision('d-1')).resolves.toBe(2);
  });

  it('creates a local at company level with divisionId null', async () => {
    const { db, state } = createFakeDb();
    const gateway = createDrizzleOrgHierarchyGateway(db, {
      createId: () => 'local-1',
    });

    const local = await gateway.createLocal({
      companyId: 'company-a',
      name: 'Main Store',
    });

    expect(local).toEqual({
      id: 'local-1',
      companyId: 'company-a',
      divisionId: null,
      name: 'Main Store',
      locale: null,
    });
    expect(state.branches[0]).toEqual({
      id: 'local-1',
      companyId: 'company-a',
      divisionId: null,
      name: 'Main Store',
      locale: null,
    });
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

    expect(state.branches[0]?.divisionId).toBe('retail-1');
  });

  it('throws LocalNameConflictError when creating a local with an existing name', async () => {
    const { db } = createFakeDb({
      branches: [
        { id: 'local-1', companyId: 'company-a', divisionId: null, name: 'Main', locale: null },
      ],
    });
    const gateway = createDrizzleOrgHierarchyGateway(db, {
      createId: () => 'local-2',
    });

    await expect(
      gateway.createLocal({ companyId: 'company-a', name: 'Main' }),
    ).rejects.toBeInstanceOf(LocalNameConflictError);
  });

  it('lists locals', async () => {
    const { db } = createFakeDb({
      branches: [
        { id: 'l-1', companyId: 'company-a', divisionId: null, name: 'A', locale: null },
        { id: 'l-2', companyId: 'company-b', divisionId: null, name: 'B', locale: null },
      ],
    });
    const gateway = createDrizzleOrgHierarchyGateway(db);

    const locals = await gateway.listLocals('company-a');

    expect(locals).toEqual([
      { id: 'l-1', companyId: 'company-a', divisionId: null, name: 'A', locale: null },
    ]);
  });

  it('updates a local name and re-parents to another division', async () => {
    const { db, state } = createFakeDb({
      branches: [
        { id: 'l-1', companyId: 'company-a', divisionId: 'retail-1', name: 'A', locale: null },
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
    expect(state.branches[0]?.divisionId).toBe('wholesale-1');
  });

  it('re-parents a local to company level via divisionId null', async () => {
    const { db, state } = createFakeDb({
      branches: [
        { id: 'l-1', companyId: 'company-a', divisionId: 'retail-1', name: 'A', locale: null },
      ],
    });
    const gateway = createDrizzleOrgHierarchyGateway(db);

    const updated = await gateway.updateLocal({
      localId: 'l-1',
      divisionId: null,
    });

    expect(updated.divisionId).toBeNull();
    expect(state.branches[0]?.divisionId).toBeNull();
  });

  it('throws LocalNameConflictError when renaming a local to an existing name', async () => {
    const { db } = createFakeDb({
      branches: [
        { id: 'l-1', companyId: 'company-a', divisionId: null, name: 'A', locale: null },
        { id: 'l-2', companyId: 'company-a', divisionId: null, name: 'B', locale: null },
      ],
    });
    const gateway = createDrizzleOrgHierarchyGateway(db);

    await expect(
      gateway.updateLocal({ localId: 'l-1', name: 'B' }),
    ).rejects.toBeInstanceOf(LocalNameConflictError);
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
      branches: [
        { id: 'l-1', companyId: 'company-a', divisionId: null, name: 'A', locale: null },
      ],
    });
    const gateway = createDrizzleOrgHierarchyGateway(db);

    await gateway.deleteLocal('l-1');

    expect(state.branches).toHaveLength(0);
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
        { userId: 'u1', companyId: 'c', divisionId: null, localId: 'l-1', role: 'company-user' as const },
        { userId: 'u2', companyId: 'c', divisionId: null, localId: 'l-1', role: 'company-owner' as const },
      ],
    });
    const gateway = createDrizzleOrgHierarchyGateway(db);

    await expect(gateway.countMembershipsInLocal('l-1')).resolves.toBe(2);
  });

  it('findLocalById returns the local when present, otherwise null', async () => {
    const { db } = createFakeDb({
      branches: [
        { id: 'l-1', companyId: 'company-a', divisionId: null, name: 'A', locale: null },
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
});