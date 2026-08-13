import { describe, expect, it } from 'vitest';

import {
  InvalidHierarchyParentError,
  ParentOwnershipError,
  type OrgHierarchyGateway,
} from '../domain/org-hierarchy';
import { createCreateAreaUseCase } from './create-area';
import { createCreatePointOfSaleUseCase } from './create-point-of-sale';
import { createCreateWarehouseUseCase } from './create-warehouse';
import { createUpdateAreaUseCase } from './update-area';
import { createUpdatePointOfSaleUseCase } from './update-point-of-sale';
import { createUpdateWarehouseUseCase } from './update-warehouse';

const baseGateway = (): OrgHierarchyGateway => ({
  getScopeNodeDependencyCounts: async () => ({
    roleAssignments: 0,
    responsibilities: 0,
    managementInvitations: 0,
    activeScopePreferences: 0,
  }),
  createDivision: async () => {
    throw new Error('not implemented');
  },
  listDivisions: async () => [],
  updateDivision: async () => {
    throw new Error('not implemented');
  },
  deleteDivision: async () => {},
  countLocalsInDivision: async () => 0,
  createLocal: async () => {
    throw new Error('not implemented');
  },
  listLocals: async () => [],
  updateLocal: async () => {
    throw new Error('not implemented');
  },
  deleteLocal: async () => {},
  countItemsInLocal: async () => 0,
  countMembershipsInLocal: async () => 0,
  countAreasInDivision: async () => 0,
  countAreasInLocal: async () => 0,
  countWarehousesInLocal: async () => 0,
  countPointsOfSaleInLocal: async () => 0,
  findLocalById: async (localId) => ({
    id: localId,
    companyId: 'company-a',
    divisionId: null,
    name: 'Local',
    locale: null,
  }),
  findDivisionById: async (divisionId) => ({
    id: divisionId,
    companyId: 'company-a',
    name: 'Division',
    createdAt: new Date(),
  }),
  createArea: async () => {
    throw new Error('not implemented');
  },
  listAreas: async () => [],
  updateArea: async () => {
    throw new Error('not implemented');
  },
  deleteArea: async () => {},
  countWarehousesInArea: async () => 0,
  countPointsOfSaleInArea: async () => 0,
  countEmployeesInArea: async () => 0,
  createWarehouse: async () => {
    throw new Error('not implemented');
  },
  listWarehouses: async () => [],
  updateWarehouse: async () => {
    throw new Error('not implemented');
  },
  deleteWarehouse: async () => {},
  createPointOfSale: async () => {
    throw new Error('not implemented');
  },
  listPointsOfSale: async () => [],
  updatePointOfSale: async () => {
    throw new Error('not implemented');
  },
  deletePointOfSale: async () => {},
  findAreaById: async (areaId) => ({
    id: areaId,
    companyId: 'company-a',
    divisionId: null,
    localId: 'local-1',
    name: 'Area',
    kind: 'area',
    createdAt: new Date(),
  }),
  findWarehouseById: async (warehouseId) => ({
    id: warehouseId,
    companyId: 'company-a',
    areaId: null,
    localId: 'local-1',
    name: 'Warehouse',
    createdAt: new Date(),
  }),
  findPointOfSaleById: async (pointOfSaleId) => ({
    id: pointOfSaleId,
    companyId: 'company-a',
    areaId: null,
    localId: 'local-1',
    name: 'POS',
    createdAt: new Date(),
  }),
});

describe('org hierarchy parent invariants', () => {
  it('rejects createArea inputs with both divisionId and localId', async () => {
    const useCase = createCreateAreaUseCase({ gateway: baseGateway() });

    await expect(
      useCase({
        companyId: 'company-a',
        name: 'Operations',
        divisionId: 'division-1',
        localId: 'local-1',
      } as never),
    ).rejects.toBeInstanceOf(InvalidHierarchyParentError);
  });

  it('allows name-only area updates without forcing a parent change', async () => {
    const gateway = baseGateway();
    const useCase = createUpdateAreaUseCase({
      gateway: {
        ...gateway,
        updateArea: async (input) => ({
          id: input.areaId,
          companyId: 'company-a',
          divisionId: null,
          localId: 'local-1',
          name: input.name ?? 'Area',
          kind: 'area',
          createdAt: new Date(),
        }),
      },
    });

    await expect(
      useCase({ areaId: 'area-1', name: 'Renamed Area' }),
    ).resolves.toMatchObject({
      id: 'area-1',
      name: 'Renamed Area',
    });
  });

  it('rejects createArea inputs with no parent', async () => {
    const useCase = createCreateAreaUseCase({ gateway: baseGateway() });

    await expect(
      useCase({
        companyId: 'company-a',
        name: 'Operations',
      } as never),
    ).rejects.toBeInstanceOf(InvalidHierarchyParentError);
  });

  it('rejects updateArea parent changes to a different company', async () => {
    const useCase = createUpdateAreaUseCase({
      gateway: {
        ...baseGateway(),
        findDivisionById: async (divisionId) => ({
          id: divisionId,
          companyId: 'company-b',
          name: 'Foreign Division',
          createdAt: new Date(),
        }),
      },
    });

    await expect(
      useCase({ areaId: 'area-1', divisionId: 'division-foreign' }),
    ).rejects.toBeInstanceOf(ParentOwnershipError);
  });

  it('rejects createWarehouse inputs with both areaId and localId', async () => {
    const useCase = createCreateWarehouseUseCase({ gateway: baseGateway() });

    await expect(
      useCase({
        companyId: 'company-a',
        name: 'Main Warehouse',
        areaId: 'area-1',
        localId: 'local-1',
      } as never),
    ).rejects.toBeInstanceOf(InvalidHierarchyParentError);
  });

  it('rejects createWarehouse inputs with no parent', async () => {
    const useCase = createCreateWarehouseUseCase({ gateway: baseGateway() });

    await expect(
      useCase({
        companyId: 'company-a',
        name: 'Main Warehouse',
      } as never),
    ).rejects.toBeInstanceOf(InvalidHierarchyParentError);
  });

  it('rejects updateWarehouse inputs with both areaId and localId', async () => {
    const useCase = createUpdateWarehouseUseCase({ gateway: baseGateway() });

    await expect(
      useCase({
        warehouseId: 'warehouse-1',
        areaId: 'area-1',
        localId: 'local-1',
      } as never),
    ).rejects.toBeInstanceOf(InvalidHierarchyParentError);
  });

  it('rejects updateWarehouse parent changes to a different company', async () => {
    const useCase = createUpdateWarehouseUseCase({
      gateway: {
        ...baseGateway(),
        findAreaById: async (areaId) => ({
          id: areaId,
          companyId: 'company-b',
          divisionId: null,
          localId: 'local-foreign',
          name: 'Foreign Area',
          kind: 'area',
          createdAt: new Date(),
        }),
      },
    });

    await expect(
      useCase({ warehouseId: 'warehouse-1', areaId: 'area-foreign' }),
    ).rejects.toBeInstanceOf(ParentOwnershipError);
  });

  it('rejects createPointOfSale inputs with both areaId and localId', async () => {
    const useCase = createCreatePointOfSaleUseCase({ gateway: baseGateway() });

    await expect(
      useCase({
        companyId: 'company-a',
        name: 'POS 01',
        areaId: 'area-1',
        localId: 'local-1',
      } as never),
    ).rejects.toBeInstanceOf(InvalidHierarchyParentError);
  });

  it('rejects createPointOfSale inputs with no parent', async () => {
    const useCase = createCreatePointOfSaleUseCase({ gateway: baseGateway() });

    await expect(
      useCase({
        companyId: 'company-a',
        name: 'POS 01',
      } as never),
    ).rejects.toBeInstanceOf(InvalidHierarchyParentError);
  });

  it('rejects updatePointOfSale inputs with both areaId and localId', async () => {
    const useCase = createUpdatePointOfSaleUseCase({ gateway: baseGateway() });

    await expect(
      useCase({
        pointOfSaleId: 'pos-1',
        areaId: 'area-1',
        localId: 'local-1',
      } as never),
    ).rejects.toBeInstanceOf(InvalidHierarchyParentError);
  });

  it('rejects updatePointOfSale parent changes to a different company', async () => {
    const useCase = createUpdatePointOfSaleUseCase({
      gateway: {
        ...baseGateway(),
        findLocalById: async (localId) => ({
          id: localId,
          companyId: 'company-b',
          divisionId: null,
          name: 'Foreign Local',
          locale: null,
        }),
      },
    });

    await expect(
      useCase({ pointOfSaleId: 'pos-1', localId: 'local-foreign' }),
    ).rejects.toBeInstanceOf(ParentOwnershipError);
  });
});
