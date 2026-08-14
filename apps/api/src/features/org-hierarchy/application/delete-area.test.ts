import { describe, expect, it } from 'vitest';

import { AreaConflictError, type OrgHierarchyGateway } from '../domain/org-hierarchy';
import { createDeleteAreaUseCase } from './delete-area';

const createGateway = (): OrgHierarchyGateway => ({
  createDivision: async () => {
    throw new Error('not implemented');
  },
  listDivisions: async () => [],
  findDivisionById: async () => null,
  updateDivision: async () => {
    throw new Error('not implemented');
  },
  deleteDivision: async () => {},
  countLocalsInDivision: async () => 0,
  createLocal: async () => {
    throw new Error('not implemented');
  },
  listLocals: async () => [],
  findLocalById: async () => null,
  updateLocal: async () => {
    throw new Error('not implemented');
  },
  deleteLocal: async () => {},
  countItemsInLocal: async () => 0,
  countMembershipsInLocal: async () => 0,
  countAreasInDivision: async () => 0,
  countAreasInLocal: async () => 0,
  createArea: async () => {
    throw new Error('not implemented');
  },
  listAreas: async () => [],
  findAreaById: async () => null,
  updateArea: async () => {
    throw new Error('not implemented');
  },
  deleteArea: async () => {},
  countWarehousesInArea: async () => 0,
  countPointsOfSaleInArea: async () => 0,
  countEmployeesInArea: async () => 1,
  createWarehouse: async () => {
    throw new Error('not implemented');
  },
  listWarehouses: async () => [],
  findWarehouseById: async () => null,
  updateWarehouse: async () => {
    throw new Error('not implemented');
  },
  deleteWarehouse: async () => {},
  createPointOfSale: async () => {
    throw new Error('not implemented');
  },
  listPointsOfSale: async () => [],
  findPointOfSaleById: async () => null,
  updatePointOfSale: async () => {
    throw new Error('not implemented');
  },
  deletePointOfSale: async () => {},
  getScopeNodeDependencyCounts: async () => ({
    roleAssignments: 0,
    responsibilities: 0,
    managementInvitations: 0,
    activeScopePreferences: 0,
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
