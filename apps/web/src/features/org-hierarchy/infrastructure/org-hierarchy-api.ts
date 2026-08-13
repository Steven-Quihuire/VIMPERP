import { getApiBaseUrl } from '@/shared/lib/http/api-base-url';
import { createHttpClient } from '@/shared/lib/http/http-client';

import type {
  Area,
  CreateAreaInput,
  CreatePointOfSaleInput,
  CreateWarehouseInput,
  CreateDivisionInput,
  CreateLocalInput,
  DeleteAreaInput,
  DeletePointOfSaleInput,
  DeleteWarehouseInput,
  DeleteDivisionInput,
  DeleteLocalInput,
  Division,
  Local,
  OrgHierarchyApi,
  PointOfSale,
  UpdateAreaInput,
  UpdateDivisionInput,
  UpdateLocalInput,
  UpdatePointOfSaleInput,
  UpdateWarehouseInput,
  Warehouse,
} from '../domain/org-hierarchy';

type RawArea = {
  id: string;
  companyId: string;
  divisionId: string | null;
  localId: string | null;
  name: string;
  kind: 'area';
  createdAt: string;
};

type RawWarehouse = {
  id: string;
  companyId: string;
  areaId: string | null;
  localId: string | null;
  name: string;
  createdAt: string;
};

type RawPointOfSale = {
  id: string;
  companyId: string;
  areaId: string | null;
  localId: string | null;
  name: string;
  createdAt: string;
};

const hasExactlyOneParent = (left: string | null, right: string | null) =>
  (left === null) !== (right === null);

const normalizeArea = (area: RawArea): Area => {
  if (!hasExactlyOneParent(area.divisionId, area.localId)) {
    throw new Error(`Invalid area parent state for area ${area.id}`);
  }

  return area.divisionId
    ? { ...area, divisionId: area.divisionId, localId: null }
    : { ...area, divisionId: null, localId: area.localId as string };
};

const normalizeWarehouse = (warehouse: RawWarehouse): Warehouse => {
  if (!hasExactlyOneParent(warehouse.areaId, warehouse.localId)) {
    throw new Error(`Invalid warehouse parent state for warehouse ${warehouse.id}`);
  }

  return warehouse.areaId
    ? { ...warehouse, areaId: warehouse.areaId, localId: null }
    : { ...warehouse, areaId: null, localId: warehouse.localId as string };
};

const normalizePointOfSale = (pointOfSale: RawPointOfSale): PointOfSale => {
  if (!hasExactlyOneParent(pointOfSale.areaId, pointOfSale.localId)) {
    throw new Error(`Invalid point of sale parent state for point of sale ${pointOfSale.id}`);
  }

  return pointOfSale.areaId
    ? { ...pointOfSale, areaId: pointOfSale.areaId, localId: null }
    : { ...pointOfSale, areaId: null, localId: pointOfSale.localId as string };
};

export const createOrgHierarchyApi = (
  apiBaseUrl = getApiBaseUrl(),
): OrgHierarchyApi => {
  const httpClient = createHttpClient(apiBaseUrl);

  return {
    listDivisions: (companyId: string) =>
      httpClient.get<Division[]>(`/companies/${companyId}/divisions`),

    createDivision: async (input: CreateDivisionInput) => {
      const response = await httpClient.post<{ name: string }>(
        `/companies/${input.companyId}/divisions`,
        { name: input.name },
      );
      return (await response.json()) as Division;
    },

    updateDivision: async (input: UpdateDivisionInput) => {
      const response = await httpClient.patch<{ name: string }>(
        `/divisions/${input.divisionId}`,
        { name: input.name },
      );
      return (await response.json()) as Division;
    },

    deleteDivision: async (divisionId: string) => {
      await httpClient.delete(`/divisions/${divisionId}`);
    },

    listLocals: (companyId: string) =>
      httpClient.get<Local[]>(`/companies/${companyId}/locals`),

    createLocal: async (input: CreateLocalInput) => {
      const body: Record<string, unknown> = { name: input.name };
      if (input.divisionId !== undefined) {
        body.divisionId = input.divisionId;
      }
      const response = await httpClient.post<Record<string, unknown>>(
        `/companies/${input.companyId}/locals`,
        body,
      );
      return (await response.json()) as Local;
    },

    updateLocal: async (input: UpdateLocalInput) => {
      const body: Record<string, unknown> = {};
      if (input.name !== undefined) {
        body.name = input.name;
      }
      if (input.divisionId !== undefined) {
        body.divisionId = input.divisionId;
      }
      const response = await httpClient.patch<Record<string, unknown>>(
        `/locals/${input.localId}`,
        body,
      );
      return (await response.json()) as Local;
    },

    deleteLocal: async (localId: string) => {
      await httpClient.delete(`/locals/${localId}`);
    },

    listAreas: async (companyId: string) =>
      (await httpClient.get<RawArea[]>(`/companies/${companyId}/areas`)).map(normalizeArea),

    createArea: async (input: CreateAreaInput) => {
      const body: Record<string, unknown> = { name: input.name };
      if ('divisionId' in input) {
        body.divisionId = input.divisionId;
      }
      if ('localId' in input) {
        body.localId = input.localId;
      }
      const response = await httpClient.post<Record<string, unknown>>(
        `/companies/${input.companyId}/areas`,
        body,
      );
      return normalizeArea((await response.json()) as RawArea);
    },

    updateArea: async (input: UpdateAreaInput) => {
      const body: Record<string, unknown> = {};
      if (input.name !== undefined) {
        body.name = input.name;
      }
      if ('divisionId' in input) {
        body.divisionId = input.divisionId;
      }
      if ('localId' in input) {
        body.localId = input.localId;
      }
      const response = await httpClient.patch<Record<string, unknown>>(
        `/areas/${input.areaId}`,
        body,
      );
      return normalizeArea((await response.json()) as RawArea);
    },

    deleteArea: async (areaId: string) => {
      await httpClient.delete(`/areas/${areaId}`);
    },

    listWarehouses: async (companyId: string) =>
      (await httpClient.get<RawWarehouse[]>(`/companies/${companyId}/warehouses`)).map(
        normalizeWarehouse,
      ),

    createWarehouse: async (input: CreateWarehouseInput) => {
      const body: Record<string, unknown> = { name: input.name };
      if ('areaId' in input) {
        body.areaId = input.areaId;
      }
      if ('localId' in input) {
        body.localId = input.localId;
      }
      const response = await httpClient.post<Record<string, unknown>>(
        `/companies/${input.companyId}/warehouses`,
        body,
      );
      return normalizeWarehouse((await response.json()) as RawWarehouse);
    },

    updateWarehouse: async (input: UpdateWarehouseInput) => {
      const body: Record<string, unknown> = {};
      if (input.name !== undefined) {
        body.name = input.name;
      }
      if ('areaId' in input) {
        body.areaId = input.areaId;
      }
      if ('localId' in input) {
        body.localId = input.localId;
      }
      const response = await httpClient.patch<Record<string, unknown>>(
        `/warehouses/${input.warehouseId}`,
        body,
      );
      return normalizeWarehouse((await response.json()) as RawWarehouse);
    },

    deleteWarehouse: async (warehouseId: string) => {
      await httpClient.delete(`/warehouses/${warehouseId}`);
    },

    listPointsOfSale: async (companyId: string) =>
      (await httpClient.get<RawPointOfSale[]>(`/companies/${companyId}/points-of-sale`)).map(
        normalizePointOfSale,
      ),

    createPointOfSale: async (input: CreatePointOfSaleInput) => {
      const body: Record<string, unknown> = { name: input.name };
      if ('areaId' in input) {
        body.areaId = input.areaId;
      }
      if ('localId' in input) {
        body.localId = input.localId;
      }
      const response = await httpClient.post<Record<string, unknown>>(
        `/companies/${input.companyId}/points-of-sale`,
        body,
      );
      return normalizePointOfSale((await response.json()) as RawPointOfSale);
    },

    updatePointOfSale: async (input: UpdatePointOfSaleInput) => {
      const body: Record<string, unknown> = {};
      if (input.name !== undefined) {
        body.name = input.name;
      }
      if ('areaId' in input) {
        body.areaId = input.areaId;
      }
      if ('localId' in input) {
        body.localId = input.localId;
      }
      const response = await httpClient.patch<Record<string, unknown>>(
        `/points-of-sale/${input.pointOfSaleId}`,
        body,
      );
      return normalizePointOfSale((await response.json()) as RawPointOfSale);
    },

    deletePointOfSale: async (pointOfSaleId: string) => {
      await httpClient.delete(`/points-of-sale/${pointOfSaleId}`);
    },
  };
};

export type {
  DeleteAreaInput,
  DeleteDivisionInput,
  DeleteLocalInput,
  DeletePointOfSaleInput,
  DeleteWarehouseInput,
};

export { normalizeArea, normalizePointOfSale, normalizeWarehouse };
