import { describe, expect, it } from 'vitest';

import { AreaConflictError, type OrgHierarchyGateway } from '../domain/org-hierarchy';
import { createDeleteAreaUseCase } from './delete-area';

const createGateway = (): OrgHierarchyGateway => ({
  createDivision: () => {
    throw new Error('not implemented');
  },
  listDivisions: () => Promise.resolve([]),
  findDivisionById: () => Promise.resolve(null),
  updateDivision: () => {
    throw new Error('not implemented');
  },
  deleteDivision: async () => {},
  countLocalsInDivision: () => Promise.resolve(0),
  createLocal: () => {
    throw new Error('not implemented');
  },
  listLocals: () => Promise.resolve([]),
  findLocalById: () => Promise.resolve(null),
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
  createArea: () => {
    throw new Error('not implemented');
  },
  listAreas: () => Promise.resolve([]),
  findAreaById: () => Promise.resolve(null),
  updateArea: () => {
    throw new Error('not implemented');
  },
  deleteArea: async () => {},
  countWarehousesInArea: () => Promise.resolve(0),
  countPointsOfSaleInArea: () => Promise.resolve(0),
  countEmployeesInArea: () => Promise.resolve(1),
  createWarehouse: () => {
    throw new Error('not implemented');
  },
  listWarehouses: () => Promise.resolve([]),
  findWarehouseById: () => Promise.resolve(null),
  updateWarehouse: () => {
    throw new Error('not implemented');
  },
  deleteWarehouse: async () => {},
  createPointOfSale: () => {
    throw new Error('not implemented');
  },
  listPointsOfSale: () => Promise.resolve([]),
  findPointOfSaleById: () => Promise.resolve(null),
  updatePointOfSale: () => {
    throw new Error('not implemented');
  },
  deletePointOfSale: async () => {},
  getScopeNodeDependencyCounts: () => Promise.resolve({
    roleAssignments: 0,
    responsibilities: 0,
    managementInvitations: 0,
    activeScopePreferences: 0,
    employeeAssignments: 0,
  }),
});

describe('createDeleteAreaUseCase', () => {
  it('rejects deleting an area when an active employee assignment still references it', async () => {
    const deleteArea = createDeleteAreaUseCase({ gateway: createGateway() });

    await expect(
      deleteArea({
        areaId: 'area-1',
        actorUserId: 'owner-1',
        correlationId: 'corr-1',
      }),
    ).rejects.toBeInstanceOf(AreaConflictError);
  });
});
