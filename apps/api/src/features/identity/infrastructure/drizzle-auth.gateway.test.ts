import { describe, expect, it } from 'vitest';

import type { AppDb } from '../../../shared/infrastructure/db/client';
import {
  localsTable,
  membershipsTable,
  userPreferencesTable,
} from '../../../shared/infrastructure/db/schema';
import { createDrizzleAuthIdentityGateway } from './drizzle-auth.gateway';

type MembershipRow = {
  userId: string;
  companyId: string | null;
  divisionId: string | null;
  localId: string | null;
  role: 'platform-admin' | 'company-owner' | 'company-user';
};

type PreferencesRow = {
  userId: string;
  activeCompanyId: string | null;
  activeLocalId: string | null;
  activeScopeNodeId?: string | null;
};

type LocalRow = {
  id: string;
  companyId: string;
  divisionId: string | null;
  name: string;
  locale: string | null;
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

const createFakeDb = ({
  memberships = [],
  preferences = [],
  locals = [],
}: {
  memberships?: MembershipRow[];
  preferences?: PreferencesRow[];
  locals?: LocalRow[];
} = {}) => {
  const state = {
    memberships: memberships.map((m) => clone(m)),
    preferences: preferences.map((p) => clone(p)),
    locals: locals.map((local) => clone(local)),
  };
  const writes: Array<{
    kind: 'insert' | 'update';
    table: unknown;
    values: unknown;
  }> = [];

  const select = () => ({
    from: (table: unknown) => {
      if (table === membershipsTable) {
        return createSelectBuilder(state.memberships);
      }
      if (table === userPreferencesTable) {
        return createSelectBuilder(state.preferences);
      }
      if (table === localsTable) {
        return createSelectBuilder(state.locals);
      }
      return createSelectBuilder([]);
    },
  });

  const tx = {
    select,
    insert: (table: unknown) => ({
      values: (values: unknown) => {
        writes.push({ kind: 'insert', table, values: clone(values) });
        if (table === userPreferencesTable) {
          state.preferences.push(clone(values as PreferencesRow));
        }
        return Promise.resolve([]);
      },
    }),
    update: (table: unknown) => ({
      set: (values: Record<string, unknown>) => ({
        where: () => {
          writes.push({ kind: 'update', table, values: clone(values) });
          const first = state.preferences[0];
          if (first) {
            Object.assign(first, values);
          }
          return Promise.resolve([]);
        },
      }),
    }),
  };

  const db = {
    select,
    insert: (table: unknown) => ({
      values: (values: unknown) => {
        writes.push({ kind: 'insert', table, values: clone(values) });
        if (table === userPreferencesTable) {
          state.preferences.push(clone(values as PreferencesRow));
        }
        return Promise.resolve([]);
      },
    }),
    update: (table: unknown) => ({
      set: (values: Record<string, unknown>) => ({
        where: () => {
          writes.push({ kind: 'update', table, values: clone(values) });
          const first = state.preferences[0];
          if (first) {
            Object.assign(first, values);
          }
          return Promise.resolve([]);
        },
      }),
    }),
    transaction: async <T>(callback: (client: typeof tx) => Promise<T>) =>
      await callback(tx),
  } as unknown as AppDb;

  return { db, state, writes };
};

describe('createDrizzleAuthIdentityGateway', () => {
  it('listMemberships returns divisionId and localId columns', async () => {
    const { db, state } = createFakeDb({
      memberships: [
        {
          userId: 'user-1',
          companyId: 'company-1',
          divisionId: 'division-1',
          localId: 'local-1',
          role: 'company-owner',
        },
        {
          userId: 'user-1',
          companyId: null,
          divisionId: null,
          localId: null,
          role: 'platform-admin',
        },
      ],
    });
    const gateway = createDrizzleAuthIdentityGateway(db);

    const memberships = await gateway.listMemberships('user-1');

    expect(memberships).toEqual(state.memberships);
    expect(memberships[0]).toMatchObject({
      divisionId: 'division-1',
      localId: 'local-1',
    });
    expect(memberships[1]).toMatchObject({
      divisionId: null,
      localId: null,
    });
  });

  it('findActiveLocalId reads activeLocalId from userPreferences', async () => {
    const { db } = createFakeDb({
      preferences: [
        {
          userId: 'user-1',
          activeCompanyId: 'company-1',
          activeLocalId: 'local-1',
        },
      ],
    });
    const gateway = createDrizzleAuthIdentityGateway(db);

    await expect(gateway.findActiveLocalId('user-1')).resolves.toBe('local-1');
  });

  it('findActiveLocalId returns null when no preference row exists', async () => {
    const { db } = createFakeDb();
    const gateway = createDrizzleAuthIdentityGateway(db);

    await expect(gateway.findActiveLocalId('user-2')).resolves.toBeNull();
  });

  it('findActiveScopeNodeId reads activeScopeNodeId from userPreferences', async () => {
    const { db } = createFakeDb({
      preferences: [
        {
          userId: 'user-1',
          activeCompanyId: 'company-1',
          activeLocalId: 'local-1',
          activeScopeNodeId: 'warehouse:warehouse-1',
        },
      ],
    });
    const gateway = createDrizzleAuthIdentityGateway(db);

    await expect(gateway.findActiveScopeNodeId('user-1')).resolves.toBe(
      'warehouse:warehouse-1',
    );
  });

  it('setActiveLocalId inserts a preference row when none exists', async () => {
    const { db, state } = createFakeDb();
    const gateway = createDrizzleAuthIdentityGateway(db);

    await gateway.setActiveLocalId('user-1', 'local-1');

    expect(state.preferences).toEqual([
      { userId: 'user-1', activeCompanyId: null, activeLocalId: 'local-1' },
    ]);
  });

  it('setActiveLocalId updates an existing preference row and clears when null', async () => {
    const { db, state } = createFakeDb({
      preferences: [
        {
          userId: 'user-1',
          activeCompanyId: 'company-1',
          activeLocalId: 'local-1',
        },
      ],
    });
    const gateway = createDrizzleAuthIdentityGateway(db);

    await gateway.setActiveLocalId('user-1', null);

    expect(state.preferences[0]?.activeLocalId).toBeNull();
    expect(state.preferences[0]?.activeCompanyId).toBe('company-1');
  });

  it('setActiveScopeNodeId inserts a preference row when none exists', async () => {
    const { db, state } = createFakeDb();
    const gateway = createDrizzleAuthIdentityGateway(db);

    await gateway.setActiveScopeNodeId('user-1', 'warehouse:warehouse-1');

    expect(state.preferences).toEqual([
      {
        userId: 'user-1',
        activeCompanyId: null,
        activeLocalId: null,
        activeScopeNodeId: 'warehouse:warehouse-1',
      },
    ]);
  });

  it('setActiveScopeNodeId updates an existing preference row and clears when null', async () => {
    const { db, state } = createFakeDb({
      preferences: [
        {
          userId: 'user-1',
          activeCompanyId: 'company-1',
          activeLocalId: 'local-1',
          activeScopeNodeId: 'local:local-1',
        },
      ],
    });
    const gateway = createDrizzleAuthIdentityGateway(db);

    await gateway.setActiveScopeNodeId('user-1', null);

    expect(state.preferences[0]?.activeScopeNodeId).toBeNull();
    expect(state.preferences[0]?.activeCompanyId).toBe('company-1');
    expect(state.preferences[0]?.activeLocalId).toBe('local-1');
  });

  it('setActiveCompanyId clears activeLocalId when switching company', async () => {
    const { db, state } = createFakeDb({
      preferences: [
        {
          userId: 'user-1',
          activeCompanyId: 'company-1',
          activeLocalId: 'local-1',
          activeScopeNodeId: 'warehouse:warehouse-1',
        },
      ],
    });
    const gateway = createDrizzleAuthIdentityGateway(db);

    await gateway.setActiveCompanyId('user-1', 'company-2');

    expect(state.preferences[0]?.activeCompanyId).toBe('company-2');
    expect(state.preferences[0]?.activeLocalId).toBeNull();
    expect(state.preferences[0]?.activeScopeNodeId).toBeNull();
  });

  it('findLocalCompanyById returns the companyId of a branch row', async () => {
    const { db } = createFakeDb({
      locals: [
        {
          id: 'local-1',
          companyId: 'company-1',
          divisionId: null,
          name: 'Main',
          locale: null,
        },
      ],
    });
    const gateway = createDrizzleAuthIdentityGateway(db);

    await expect(gateway.findLocalCompanyById('local-1')).resolves.toBe(
      'company-1',
    );
  });

  it('findLocalCompanyById returns null when no local row exists', async () => {
    const { db } = createFakeDb({ locals: [] });
    const gateway = createDrizzleAuthIdentityGateway(db);

    await expect(gateway.findLocalCompanyById('missing')).resolves.toBeNull();
  });
});
