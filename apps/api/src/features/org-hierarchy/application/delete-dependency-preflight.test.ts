import { describe, expect, it, vi } from 'vitest';

import type {
  OrgHierarchyGateway,
  ScopeNodeDependencyCounts,
} from '../domain/org-hierarchy';
import { createDeleteAreaUseCase } from './delete-area';
import { createDeleteDivisionUseCase } from './delete-division';
import { createDeleteLocalUseCase } from './delete-local';
import { createDeletePointOfSaleUseCase } from './delete-point-of-sale';
import { createDeleteWarehouseUseCase } from './delete-warehouse';

const zeroDependencies: ScopeNodeDependencyCounts = {
  roleAssignments: 0,
  responsibilities: 0,
  managementInvitations: 0,
  activeScopePreferences: 0,
  employeeAssignments: 0,
};

const createGateway = (dependencies: ScopeNodeDependencyCounts) =>
  ({
    getScopeNodeDependencyCounts: vi.fn(async () => dependencies),
    countLocalsInDivision: vi.fn(async () => 0),
    countAreasInDivision: vi.fn(async () => 0),
    countItemsInLocal: vi.fn(async () => 0),
    countMembershipsInLocal: vi.fn(async () => 0),
    countAreasInLocal: vi.fn(async () => 0),
    countWarehousesInLocal: vi.fn(async () => 0),
    countPointsOfSaleInLocal: vi.fn(async () => 0),
    countWarehousesInArea: vi.fn(async () => 0),
    countPointsOfSaleInArea: vi.fn(async () => 0),
    countEmployeesInArea: vi.fn(async () => 0),
    deleteDivision: vi.fn(),
    deleteLocal: vi.fn(),
    deleteArea: vi.fn(),
    deleteWarehouse: vi.fn(),
    deletePointOfSale: vi.fn(),
  }) as unknown as OrgHierarchyGateway;

describe('org hierarchy delete dependency preflight', () => {
  it.each([
    ['role assignment', { roleAssignments: 1 }],
    ['responsibility', { responsibilities: 1 }],
  ] as const)(
    'blocks every node type for a %s dependency',
    async (_kind, dependency) => {
      for (const [nodeType, createUseCase, id, deleteMethod] of [
        [
          'division',
          createDeleteDivisionUseCase,
          { divisionId: 'division-1' },
          'deleteDivision',
        ],
        [
          'local',
          createDeleteLocalUseCase,
          { localId: 'local-1' },
          'deleteLocal',
        ],
        ['area', createDeleteAreaUseCase, { areaId: 'area-1' }, 'deleteArea'],
        [
          'warehouse',
          createDeleteWarehouseUseCase,
          { warehouseId: 'warehouse-1' },
          'deleteWarehouse',
        ],
        [
          'point-of-sale',
          createDeletePointOfSaleUseCase,
          { pointOfSaleId: 'pos-1' },
          'deletePointOfSale',
        ],
      ] as const) {
        const gateway = createGateway({ ...zeroDependencies, ...dependency });
        const useCase = createUseCase({ gateway }) as (
          input: Record<string, string>,
        ) => Promise<void>;

        await expect(
          useCase({ ...id, actorUserId: 'user-1', correlationId: 'corr-1' }),
        ).rejects.toMatchObject({
          code: expect.stringContaining('CONFLICT'),
        });

        expect(gateway.getScopeNodeDependencyCounts).toHaveBeenCalledWith({
          nodeType,
          sourceId: Object.values(id)[0],
        });
        expect(gateway[deleteMethod]).not.toHaveBeenCalled();
      }
    },
  );

  it.each([
    [
      'division',
      createDeleteDivisionUseCase,
      { divisionId: 'division-1' },
      'deleteDivision',
    ],
    ['local', createDeleteLocalUseCase, { localId: 'local-1' }, 'deleteLocal'],
    ['area', createDeleteAreaUseCase, { areaId: 'area-1' }, 'deleteArea'],
    [
      'warehouse',
      createDeleteWarehouseUseCase,
      { warehouseId: 'warehouse-1' },
      'deleteWarehouse',
    ],
    [
      'point-of-sale',
      createDeletePointOfSaleUseCase,
      { pointOfSaleId: 'pos-1' },
      'deletePointOfSale',
    ],
  ] as const)(
    'allows %s deletion with a pending invitation for gateway cleanup',
    async (_kind, createUseCase, id, deleteMethod) => {
      const gateway = createGateway({
        ...zeroDependencies,
      });
      const useCase = createUseCase({ gateway }) as (
        input: Record<string, string>,
      ) => Promise<void>;

      await useCase({ ...id, actorUserId: 'user-1', correlationId: 'corr-1' });

      expect(gateway[deleteMethod]).toHaveBeenCalledOnce();
    },
  );

  it('does not treat an active scope preference as a permanent blocker', async () => {
    const gateway = createGateway({
      ...zeroDependencies,
      activeScopePreferences: 1,
    });
    const useCase = createDeleteDivisionUseCase({ gateway });

    await useCase({
      divisionId: 'division-1',
      actorUserId: 'user-1',
      correlationId: 'corr-1',
    });

    expect(gateway.deleteDivision).toHaveBeenCalledOnce();
  });

  it.each([
    [
      'division',
      createDeleteDivisionUseCase,
      { divisionId: 'division-1' },
      'deleteDivision',
    ],
    ['local', createDeleteLocalUseCase, { localId: 'local-1' }, 'deleteLocal'],
    ['area', createDeleteAreaUseCase, { areaId: 'area-1' }, 'deleteArea'],
    [
      'warehouse',
      createDeleteWarehouseUseCase,
      { warehouseId: 'warehouse-1' },
      'deleteWarehouse',
    ],
    [
      'point-of-sale',
      createDeletePointOfSaleUseCase,
      { pointOfSaleId: 'pos-1' },
      'deletePointOfSale',
    ],
  ] as const)(
    '%s blocks deletion for an accepted invitation',
    async (_kind, createUseCase, id, deleteMethod) => {
      const gateway = createGateway({
        ...zeroDependencies,
        managementInvitations: 1,
      });
      const useCase = createUseCase({ gateway }) as (
        input: Record<string, string>,
      ) => Promise<void>;

      await expect(
        useCase({ ...id, actorUserId: 'user-1', correlationId: 'corr-1' }),
      ).rejects.toMatchObject({ code: expect.stringContaining('CONFLICT') });

      expect(gateway[deleteMethod]).not.toHaveBeenCalled();
    },
  );

  it.each([
    [
      'division',
      createDeleteDivisionUseCase,
      { divisionId: 'division-1' },
      'deleteDivision',
    ],
    ['local', createDeleteLocalUseCase, { localId: 'local-1' }, 'deleteLocal'],
    ['area', createDeleteAreaUseCase, { areaId: 'area-1' }, 'deleteArea'],
    [
      'warehouse',
      createDeleteWarehouseUseCase,
      { warehouseId: 'warehouse-1' },
      'deleteWarehouse',
    ],
    [
      'point-of-sale',
      createDeletePointOfSaleUseCase,
      { pointOfSaleId: 'pos-1' },
      'deletePointOfSale',
    ],
  ] as const)(
    '%s blocks deletion for scope-node dependencies',
    async (_kind, createUseCase, id, deleteMethod) => {
      const gateway = createGateway({
        ...zeroDependencies,
        responsibilities: 1,
      });
      const useCase = createUseCase({ gateway }) as (
        input: Record<string, string>,
      ) => Promise<void>;

      await expect(
        useCase({ ...id, actorUserId: 'user-1', correlationId: 'corr-1' }),
      ).rejects.toMatchObject({
        code: expect.stringContaining('CONFLICT'),
      });
      expect(gateway[deleteMethod]).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['division', createDeleteDivisionUseCase, { divisionId: 'division-1' }, 'deleteDivision'],
    ['local', createDeleteLocalUseCase, { localId: 'local-1' }, 'deleteLocal'],
    ['area', createDeleteAreaUseCase, { areaId: 'area-1' }, 'deleteArea'],
    ['warehouse', createDeleteWarehouseUseCase, { warehouseId: 'warehouse-1' }, 'deleteWarehouse'],
    ['point-of-sale', createDeletePointOfSaleUseCase, { pointOfSaleId: 'pos-1' }, 'deletePointOfSale'],
  ] as const)('%s blocks deletion for active or historical HR assignments', async (_kind, createUseCase, id, deleteMethod) => {
    const gateway = createGateway({
      ...zeroDependencies,
      employeeAssignments: 1,
    });
    const useCase = createUseCase({ gateway }) as (
      input: Record<string, string>,
    ) => Promise<void>;

    await expect(
      useCase({ ...id, actorUserId: 'user-1', correlationId: 'corr-1' }),
    ).rejects.toMatchObject({ code: expect.stringContaining('CONFLICT') });
    expect(gateway[deleteMethod]).not.toHaveBeenCalled();
  });

  it('allows division deletion when no restrictive scope-node dependencies exist', async () => {
    const gateway = createGateway(zeroDependencies);
    const useCase = createDeleteDivisionUseCase({ gateway });

    await useCase({
      divisionId: 'division-1',
      actorUserId: 'user-1',
      correlationId: 'corr-1',
    });

    expect(gateway.deleteDivision).toHaveBeenCalledOnce();
  });
});
