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

const auditContext = {
  actorUserId: 'owner-1',
  correlationId: 'corr-test',
};

const baseGateway = (): OrgHierarchyGateway => ({
  getScopeNodeDependencyCounts: () => Promise.resolve({
    roleAssignments: 0,
    responsibilities: 0,
    managementInvitations: 0,
    activeScopePreferences: 0,
    employeeAssignments: 0,
  }),
  createDivision: () => {
    throw new Error('not implemented');
  },
  listDivisions: () => Promise.resolve([]),
  updateDivision: () => {
    throw new Error('not implemented');
  },
  deleteDivision: async () => {},
  countLocalsInDivision: () => Promise.resolve(0),
  createLocal: () => {
    throw new Error('not implemented');
  },
  listLocals: () => Promise.resolve([]),
  updateLocal: () => {
    throw new Error('not implemented');
  },
  deleteLocal: async () => {},
  countItemsInLocal: () => Promise.resolve(0),
  countMembershipsInLocal: () => Promise.resolve(0),
  countAreasInDivision: () => Promise.resolve(0),
  countAreasInLocal: () => Promise.resolve(0),
  countWarehousesInLocal: () => Promise.resolve(0),
  countPointsOfSaleInLocal: () => Promise.resolve(0),
  findLocalById: (localId) => Promise.resolve({
    id: localId,
    companyId: 'company-a',
    divisionId: null,
    name: 'Local',
    locale: null,
  }),
  findDivisionById: (divisionId) => Promise.resolve({
    id: divisionId,
    companyId: 'company-a',
    name: 'Division',
    createdAt: new Date(),
  }),
  createArea: () => {
    throw new Error('not implemented');
  },
  listAreas: () => Promise.resolve([]),
  updateArea: () => {
    throw new Error('not implemented');
  },
  deleteArea: async () => {},
  countWarehousesInArea: () => Promise.resolve(0),
  countPointsOfSaleInArea: () => Promise.resolve(0),
  countEmployeesInArea: () => Promise.resolve(0),
  createWarehouse: () => {
    throw new Error('not implemented');
  },
  listWarehouses: () => Promise.resolve([]),
  updateWarehouse: () => {
    throw new Error('not implemented');
  },
  deleteWarehouse: async () => {},
  createPointOfSale: () => {
    throw new Error('not implemented');
  },
  listPointsOfSale: () => Promise.resolve([]),
  updatePointOfSale: () => {
    throw new Error('not implemented');
  },
  deletePointOfSale: async () => {},
  findAreaById: (areaId) => Promise.resolve({
    id: areaId,
    companyId: 'company-a',
    divisionId: null,
    localId: 'local-1',
    name: 'Area',
    kind: 'area',
    createdAt: new Date(),
  }),
  findWarehouseById: (warehouseId) => Promise.resolve({
    id: warehouseId,
    companyId: 'company-a',
    areaId: null,
    localId: 'local-1',
    name: 'Warehouse',
    createdAt: new Date(),
  }),
  findPointOfSaleById: (pointOfSaleId) => Promise.resolve({
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
        updateArea: (input) => Promise.resolve({
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
      useCase({ areaId: 'area-1', name: 'Renamed Area', ...auditContext }),
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
        findDivisionById: (divisionId) => Promise.resolve({
          id: divisionId,
          companyId: 'company-b',
          name: 'Foreign Division',
          createdAt: new Date(),
        }),
      },
    });

    await expect(
      useCase({ areaId: 'area-1', divisionId: 'division-foreign', ...auditContext }),
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
        findAreaById: (areaId) => Promise.resolve({
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
      useCase({ warehouseId: 'warehouse-1', areaId: 'area-foreign', ...auditContext }),
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
        findLocalById: (localId) => Promise.resolve({
          id: localId,
          companyId: 'company-b',
          divisionId: null,
          name: 'Foreign Local',
          locale: null,
        }),
      },
    });

    await expect(
      useCase({ pointOfSaleId: 'pos-1', localId: 'local-foreign', ...auditContext }),
    ).rejects.toBeInstanceOf(ParentOwnershipError);
  });
});
