import { describe, expect, it, vi } from 'vitest';

import { createDeleteDivisionUseCase } from './delete-division';
import {
  DivisionConflictError,
  DivisionNotFoundError,
  type OrgHierarchyGateway,
} from '../domain/org-hierarchy';

const createGateway = (): OrgHierarchyGateway => ({
  getScopeNodeDependencyCounts: vi.fn(async () => ({
    roleAssignments: 0,
    responsibilities: 0,
    managementInvitations: 0,
    activeScopePreferences: 0,
  })),
  createDivision: vi.fn(),
  listDivisions: vi.fn(),
  updateDivision: vi.fn(),
  deleteDivision: vi.fn(),
  countLocalsInDivision: vi.fn(async () => 0),
  createLocal: vi.fn(),
  listLocals: vi.fn(),
  updateLocal: vi.fn(),
  deleteLocal: vi.fn(),
  countItemsInLocal: vi.fn(),
  countMembershipsInLocal: vi.fn(),
  countAreasInDivision: vi.fn(async () => 0),
  countAreasInLocal: vi.fn(),
  countWarehousesInLocal: vi.fn(),
  countPointsOfSaleInLocal: vi.fn(),
  findLocalById: vi.fn(),
  findDivisionById: vi.fn(),
  createArea: vi.fn(),
  listAreas: vi.fn(),
  updateArea: vi.fn(),
  deleteArea: vi.fn(),
  countWarehousesInArea: vi.fn(),
  countPointsOfSaleInArea: vi.fn(),
  countEmployeesInArea: vi.fn(),
  createWarehouse: vi.fn(),
  listWarehouses: vi.fn(),
  updateWarehouse: vi.fn(),
  deleteWarehouse: vi.fn(),
  createPointOfSale: vi.fn(),
  listPointsOfSale: vi.fn(),
  updatePointOfSale: vi.fn(),
  deletePointOfSale: vi.fn(),
  findAreaById: vi.fn(),
  findWarehouseById: vi.fn(),
  findPointOfSaleById: vi.fn(),
});

describe('createDeleteDivisionUseCase', () => {
  it('fails before delete when the division still has locals', async () => {
    const gateway = createGateway();
    vi.mocked(gateway.countLocalsInDivision).mockResolvedValue(1);
    const useCase = createDeleteDivisionUseCase({ gateway });

    await expect(
      useCase({
        divisionId: 'division-1',
        actorUserId: 'user-1',
        correlationId: 'corr-1',
      }),
    ).rejects.toBeInstanceOf(DivisionConflictError);

    expect(gateway.deleteDivision).not.toHaveBeenCalled();
  });

  it('fails before delete when the division still has direct areas', async () => {
    const gateway = createGateway();
    vi.mocked(gateway.countAreasInDivision).mockResolvedValue(2);
    const useCase = createDeleteDivisionUseCase({ gateway });

    await expect(
      useCase({
        divisionId: 'division-1',
        actorUserId: 'user-1',
        correlationId: 'corr-1',
      }),
    ).rejects.toBeInstanceOf(DivisionConflictError);

    expect(gateway.deleteDivision).not.toHaveBeenCalled();
  });

  it('preserves not found errors from the gateway delete', async () => {
    const gateway = createGateway();
    vi.mocked(gateway.deleteDivision).mockRejectedValue(
      new DivisionNotFoundError(),
    );
    const useCase = createDeleteDivisionUseCase({ gateway });

    await expect(
      useCase({
        divisionId: 'division-404',
        actorUserId: 'user-1',
        correlationId: 'corr-1',
      }),
    ).rejects.toBeInstanceOf(DivisionNotFoundError);
  });
});
