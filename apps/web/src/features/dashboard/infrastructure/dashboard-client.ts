import { getApiBaseUrl } from '../../../shared/lib/http/api-base-url';
import { createHttpClient } from '../../../shared/lib/http/http-client';
import type {
  DashboardCompanySummary,
  DashboardNotification,
} from '../domain/dashboard';

export type DashboardRepository = {
  getCompanySummary: () => Promise<DashboardCompanySummary>;
  getNotifications: () => Promise<{ notifications: DashboardNotification[] }>;
};

export const createDashboardRepository = (
  apiBaseUrl = getApiBaseUrl(),
): DashboardRepository => {
  const httpClient = createHttpClient(apiBaseUrl);

  return {
    getCompanySummary: async () =>
      httpClient.get<DashboardCompanySummary>('/admin/companies/summary'),
    getNotifications: async () =>
      httpClient.get<{ notifications: DashboardNotification[] }>('/admin/notifications'),
  };
};
