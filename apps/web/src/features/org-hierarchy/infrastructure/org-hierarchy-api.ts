import { getApiBaseUrl } from '@/shared/lib/http/api-base-url';
import { createHttpClient } from '@/shared/lib/http/http-client';

import type {
  CreateDivisionInput,
  CreateLocalInput,
  DeleteDivisionInput,
  DeleteLocalInput,
  Division,
  Local,
  OrgHierarchyApi,
  UpdateDivisionInput,
  UpdateLocalInput,
} from '../domain/org-hierarchy';

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
  };
};

export type { DeleteDivisionInput, DeleteLocalInput };
