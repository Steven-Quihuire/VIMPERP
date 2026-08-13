import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  CreateAreaInput,
  CreatePointOfSaleInput,
  CreateWarehouseInput,
  CreateDivisionInput,
  CreateLocalInput,
  UpdatePointOfSaleInput,
  UpdateAreaInput,
  UpdateDivisionInput,
  UpdateLocalInput,
  UpdateWarehouseInput,
} from '../domain/org-hierarchy';
import { createOrgHierarchyApi } from '../infrastructure/org-hierarchy-api';

export const orgHierarchyQueryKeys = {
  areas: (companyId: string) => ['org-hierarchy', 'areas', companyId] as const,
  divisions: (companyId: string) => ['org-hierarchy', 'divisions', companyId] as const,
  locals: (companyId: string) => ['org-hierarchy', 'locals', companyId] as const,
  pointsOfSale: (companyId: string) =>
    ['org-hierarchy', 'points-of-sale', companyId] as const,
  warehouses: (companyId: string) => ['org-hierarchy', 'warehouses', companyId] as const,
};

export const usePointsOfSale = (
  companyId: string | undefined,
  apiBaseUrl?: string,
) => {
  const api = createOrgHierarchyApi(apiBaseUrl);

  return useQuery({
    queryKey: orgHierarchyQueryKeys.pointsOfSale(companyId ?? ''),
    queryFn: () => api.listPointsOfSale(companyId as string),
    enabled: Boolean(companyId),
  });
};

export const useWarehouses = (companyId: string | undefined, apiBaseUrl?: string) => {
  const api = createOrgHierarchyApi(apiBaseUrl);

  return useQuery({
    queryKey: orgHierarchyQueryKeys.warehouses(companyId ?? ''),
    queryFn: () => api.listWarehouses(companyId as string),
    enabled: Boolean(companyId),
  });
};

export const useAreas = (companyId: string | undefined, apiBaseUrl?: string) => {
  const api = createOrgHierarchyApi(apiBaseUrl);

  return useQuery({
    queryKey: orgHierarchyQueryKeys.areas(companyId ?? ''),
    queryFn: () => api.listAreas(companyId as string),
    enabled: Boolean(companyId),
  });
};

export const useDivisions = (companyId: string | undefined, apiBaseUrl?: string) => {
  const api = createOrgHierarchyApi(apiBaseUrl);

  return useQuery({
    queryKey: orgHierarchyQueryKeys.divisions(companyId ?? ''),
    queryFn: () => api.listDivisions(companyId as string),
    enabled: Boolean(companyId),
  });
};

export const useLocals = (companyId: string | undefined, apiBaseUrl?: string) => {
  const api = createOrgHierarchyApi(apiBaseUrl);

  return useQuery({
    queryKey: orgHierarchyQueryKeys.locals(companyId ?? ''),
    queryFn: () => api.listLocals(companyId as string),
    enabled: Boolean(companyId),
  });
};

export const useCreateDivision = (apiBaseUrl?: string) => {
  const queryClient = useQueryClient();
  const api = createOrgHierarchyApi(apiBaseUrl);

  return useMutation({
    mutationFn: (input: CreateDivisionInput) => api.createDivision(input),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: orgHierarchyQueryKeys.divisions(variables.companyId),
      });
    },
  });
};

export const useUpdateDivision = (companyId: string, apiBaseUrl?: string) => {
  const queryClient = useQueryClient();
  const api = createOrgHierarchyApi(apiBaseUrl);

  return useMutation({
    mutationFn: (input: UpdateDivisionInput) => api.updateDivision(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: orgHierarchyQueryKeys.divisions(companyId),
      });
    },
  });
};

export const useDeleteDivision = (companyId: string, apiBaseUrl?: string) => {
  const queryClient = useQueryClient();
  const api = createOrgHierarchyApi(apiBaseUrl);

  return useMutation({
    mutationFn: (divisionId: string) => api.deleteDivision(divisionId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: orgHierarchyQueryKeys.divisions(companyId),
      });
    },
  });
};

export const useCreateLocal = (apiBaseUrl?: string) => {
  const queryClient = useQueryClient();
  const api = createOrgHierarchyApi(apiBaseUrl);

  return useMutation({
    mutationFn: (input: CreateLocalInput) => api.createLocal(input),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: orgHierarchyQueryKeys.locals(variables.companyId),
      });
    },
  });
};

export const useUpdateLocal = (companyId: string, apiBaseUrl?: string) => {
  const queryClient = useQueryClient();
  const api = createOrgHierarchyApi(apiBaseUrl);

  return useMutation({
    mutationFn: (input: UpdateLocalInput) => api.updateLocal(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: orgHierarchyQueryKeys.locals(companyId),
      });
    },
  });
};

export const useDeleteLocal = (companyId: string, apiBaseUrl?: string) => {
  const queryClient = useQueryClient();
  const api = createOrgHierarchyApi(apiBaseUrl);

  return useMutation({
    mutationFn: (localId: string) => api.deleteLocal(localId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: orgHierarchyQueryKeys.locals(companyId),
      });
    },
  });
};

export const useCreateArea = (apiBaseUrl?: string) => {
  const queryClient = useQueryClient();
  const api = createOrgHierarchyApi(apiBaseUrl);

  return useMutation({
    mutationFn: (input: CreateAreaInput) => api.createArea(input),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: orgHierarchyQueryKeys.areas(variables.companyId),
      });
    },
  });
};

export const useUpdateArea = (companyId: string, apiBaseUrl?: string) => {
  const queryClient = useQueryClient();
  const api = createOrgHierarchyApi(apiBaseUrl);

  return useMutation({
    mutationFn: (input: UpdateAreaInput) => api.updateArea(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: orgHierarchyQueryKeys.areas(companyId),
      });
    },
  });
};

export const useDeleteArea = (companyId: string, apiBaseUrl?: string) => {
  const queryClient = useQueryClient();
  const api = createOrgHierarchyApi(apiBaseUrl);

  return useMutation({
    mutationFn: (areaId: string) => api.deleteArea(areaId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: orgHierarchyQueryKeys.areas(companyId),
      });
    },
  });
};

export const useCreateWarehouse = (apiBaseUrl?: string) => {
  const queryClient = useQueryClient();
  const api = createOrgHierarchyApi(apiBaseUrl);

  return useMutation({
    mutationFn: (input: CreateWarehouseInput) => api.createWarehouse(input),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: orgHierarchyQueryKeys.warehouses(variables.companyId),
      });
    },
  });
};

export const useUpdateWarehouse = (companyId: string, apiBaseUrl?: string) => {
  const queryClient = useQueryClient();
  const api = createOrgHierarchyApi(apiBaseUrl);

  return useMutation({
    mutationFn: (input: UpdateWarehouseInput) => api.updateWarehouse(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: orgHierarchyQueryKeys.warehouses(companyId),
      });
    },
  });
};

export const useDeleteWarehouse = (companyId: string, apiBaseUrl?: string) => {
  const queryClient = useQueryClient();
  const api = createOrgHierarchyApi(apiBaseUrl);

  return useMutation({
    mutationFn: (warehouseId: string) => api.deleteWarehouse(warehouseId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: orgHierarchyQueryKeys.warehouses(companyId),
      });
    },
  });
};

export const useCreatePointOfSale = (apiBaseUrl?: string) => {
  const queryClient = useQueryClient();
  const api = createOrgHierarchyApi(apiBaseUrl);

  return useMutation({
    mutationFn: (input: CreatePointOfSaleInput) => api.createPointOfSale(input),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: orgHierarchyQueryKeys.pointsOfSale(variables.companyId),
      });
    },
  });
};

export const useUpdatePointOfSale = (
  companyId: string,
  apiBaseUrl?: string,
) => {
  const queryClient = useQueryClient();
  const api = createOrgHierarchyApi(apiBaseUrl);

  return useMutation({
    mutationFn: (input: UpdatePointOfSaleInput) => api.updatePointOfSale(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: orgHierarchyQueryKeys.pointsOfSale(companyId),
      });
    },
  });
};

export const useDeletePointOfSale = (
  companyId: string,
  apiBaseUrl?: string,
) => {
  const queryClient = useQueryClient();
  const api = createOrgHierarchyApi(apiBaseUrl);

  return useMutation({
    mutationFn: (pointOfSaleId: string) => api.deletePointOfSale(pointOfSaleId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: orgHierarchyQueryKeys.pointsOfSale(companyId),
      });
    },
  });
};
