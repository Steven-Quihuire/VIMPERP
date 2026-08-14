import { describe, expect, it } from 'vitest';

import {
  createInMemoryScopeResolver,
  type ResolvedScopeNode,
  type ScopeAssignmentRecord,
} from './scope-hierarchy.port';

const nodes: ResolvedScopeNode[] = [
  {
    ref: { scopeType: 'company', scopeId: 'company-a' },
    parentRef: null,
    companyId: 'company-a',
    name: 'Vimcore',
  },
  {
    ref: { scopeType: 'division', scopeId: 'division-1' },
    parentRef: { scopeType: 'company', scopeId: 'company-a' },
    companyId: 'company-a',
    name: 'North Division',
  },
  {
    ref: { scopeType: 'local', scopeId: 'local-1' },
    parentRef: { scopeType: 'division', scopeId: 'division-1' },
    companyId: 'company-a',
    name: 'HQ',
  },
  {
    ref: { scopeType: 'division', scopeId: 'division-2' },
    parentRef: { scopeType: 'company', scopeId: 'company-a' },
    companyId: 'company-a',
    name: 'South Division',
  },
  {
    ref: { scopeType: 'local', scopeId: 'local-2' },
    parentRef: { scopeType: 'division', scopeId: 'division-2' },
    companyId: 'company-a',
    name: 'South Store',
  },
  {
    ref: { scopeType: 'warehouse', scopeId: 'warehouse-1' },
    parentRef: { scopeType: 'local', scopeId: 'local-1' },
    companyId: 'company-a',
    name: 'Main Warehouse',
  },
  {
    ref: { scopeType: 'point-of-sale', scopeId: 'pos-1' },
    parentRef: { scopeType: 'warehouse', scopeId: 'warehouse-1' },
    companyId: 'company-a',
    name: 'Checkout',
  },
  {
    ref: { scopeType: 'local', scopeId: 'local-foreign' },
    parentRef: { scopeType: 'company', scopeId: 'company-b' },
    companyId: 'company-b',
    name: 'Foreign Local',
  },
];

const assignments: ScopeAssignmentRecord[] = [
  {
    companyId: 'company-a',
    userId: 'user-subtree',
    scope: { scopeType: 'division', scopeId: 'division-1' },
    mode: 'subtree_inclusive',
  },
  {
    companyId: 'company-a',
    userId: 'user-exact',
    scope: { scopeType: 'warehouse', scopeId: 'warehouse-1' },
    mode: 'exact_node',
  },
];

describe('createInMemoryScopeResolver', () => {
  it('returns ordered lineage from the requested node to the company root', async () => {
    const resolver = createInMemoryScopeResolver({ nodes, assignments });

    await expect(
      resolver.getLineage('company-a', {
        scopeType: 'point-of-sale',
        scopeId: 'pos-1',
      }),
    ).resolves.toEqual([
      { scopeType: 'point-of-sale', scopeId: 'pos-1' },
      { scopeType: 'warehouse', scopeId: 'warehouse-1' },
      { scopeType: 'local', scopeId: 'local-1' },
      { scopeType: 'division', scopeId: 'division-1' },
      { scopeType: 'company', scopeId: 'company-a' },
    ]);
  });

  it('returns only the company node when the requested lineage starts at the root', async () => {
    const resolver = createInMemoryScopeResolver({ nodes, assignments });

    await expect(
      resolver.getLineage('company-a', {
        scopeType: 'company',
        scopeId: 'company-a',
      }),
    ).resolves.toEqual([{ scopeType: 'company', scopeId: 'company-a' }]);
  });

  it('honors subtree_inclusive and exact_node authorization semantics', async () => {
    const resolver = createInMemoryScopeResolver({ nodes, assignments });

    await expect(
      resolver.isAuthorized('company-a', 'user-subtree', {
        scopeType: 'point-of-sale',
        scopeId: 'pos-1',
      }),
    ).resolves.toBe(true);

    await expect(
      resolver.isAuthorized('company-a', 'user-exact', {
        scopeType: 'point-of-sale',
        scopeId: 'pos-1',
      }),
    ).resolves.toBe(false);

    await expect(
      resolver.isAuthorized('company-a', 'user-exact', {
        scopeType: 'warehouse',
        scopeId: 'warehouse-1',
      }),
    ).resolves.toBe(true);
  });

  it('lists the visible assigned subtree without leaking foreign-company nodes', async () => {
    const resolver = createInMemoryScopeResolver({ nodes, assignments });

    await expect(
      resolver.listAuthorizedDescendants('company-a', 'user-subtree'),
    ).resolves.toEqual([
      {
        ref: { scopeType: 'division', scopeId: 'division-1' },
        parentRef: { scopeType: 'company', scopeId: 'company-a' },
        companyId: 'company-a',
        name: 'North Division',
      },
      {
        ref: { scopeType: 'local', scopeId: 'local-1' },
        parentRef: { scopeType: 'division', scopeId: 'division-1' },
        companyId: 'company-a',
        name: 'HQ',
      },
      {
        ref: { scopeType: 'warehouse', scopeId: 'warehouse-1' },
        parentRef: { scopeType: 'local', scopeId: 'local-1' },
        companyId: 'company-a',
        name: 'Main Warehouse',
      },
      {
        ref: { scopeType: 'point-of-sale', scopeId: 'pos-1' },
        parentRef: { scopeType: 'warehouse', scopeId: 'warehouse-1' },
        companyId: 'company-a',
        name: 'Checkout',
      },
    ]);
  });

  it('keeps same-company sibling branches hidden when they are outside the assigned subtree', async () => {
    const resolver = createInMemoryScopeResolver({ nodes, assignments });

    const visibleNodes = await resolver.listAuthorizedDescendants(
      'company-a',
      'user-subtree',
    );

    expect(visibleNodes).not.toContainEqual(
      expect.objectContaining({
        ref: { scopeType: 'division', scopeId: 'division-2' },
      }),
    );
    expect(visibleNodes).not.toContainEqual(
      expect.objectContaining({
        ref: { scopeType: 'local', scopeId: 'local-2' },
      }),
    );
  });
});
