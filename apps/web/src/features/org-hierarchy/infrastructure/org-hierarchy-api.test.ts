import { describe, expect, it } from 'vitest';

import {
  normalizeArea,
  normalizePointOfSale,
  normalizeWarehouse,
} from './org-hierarchy-api';

describe('org hierarchy API normalization', () => {
  it('accepts area responses with exactly one parent', () => {
    expect(
      normalizeArea({
        id: 'area-1',
        companyId: 'company-1',
        divisionId: 'division-1',
        localId: null,
        name: 'Operations',
        kind: 'area',
        createdAt: '2026-08-01T10:00:00.000Z',
      }),
    ).toEqual({
      id: 'area-1',
      companyId: 'company-1',
      divisionId: 'division-1',
      localId: null,
      name: 'Operations',
      kind: 'area',
      createdAt: '2026-08-01T10:00:00.000Z',
    });
  });

  it('rejects area responses without an exclusive parent', () => {
    expect(() =>
      normalizeArea({
        id: 'area-1',
        companyId: 'company-1',
        divisionId: null,
        localId: null,
        name: 'Operations',
        kind: 'area',
        createdAt: '2026-08-01T10:00:00.000Z',
      }),
    ).toThrow(/Invalid area parent state/);

    expect(() =>
      normalizeArea({
        id: 'area-1',
        companyId: 'company-1',
        divisionId: 'division-1',
        localId: 'local-1',
        name: 'Operations',
        kind: 'area',
        createdAt: '2026-08-01T10:00:00.000Z',
      }),
    ).toThrow(/Invalid area parent state/);
  });

  it('rejects warehouse and point-of-sale responses without an exclusive parent', () => {
    expect(() =>
      normalizeWarehouse({
        id: 'warehouse-1',
        companyId: 'company-1',
        areaId: 'area-1',
        localId: 'local-1',
        name: 'Main Warehouse',
        createdAt: '2026-08-01T10:00:00.000Z',
      }),
    ).toThrow(/Invalid warehouse parent state/);

    expect(() =>
      normalizePointOfSale({
        id: 'pos-1',
        companyId: 'company-1',
        areaId: null,
        localId: null,
        name: 'POS 01',
        createdAt: '2026-08-01T10:00:00.000Z',
      }),
    ).toThrow(/Invalid point of sale parent state/);
  });
});
