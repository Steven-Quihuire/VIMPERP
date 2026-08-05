import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  CreateDivisionInput,
  CreateLocalInput,
  UpdateDivisionInput,
  UpdateLocalInput,
} from '../domain/org-hierarchy';
import { createOrgHierarchyApi } from '../infrastructure/org-hierarchy-api';

export const orgHierarchyQueryKeys = {
  divisions: (companyId: string) => ['org-hierarchy', 'divisions', companyId] as const,
  locals: (companyId: string) => ['org-hierarchy', 'locals', companyId] as const,
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
