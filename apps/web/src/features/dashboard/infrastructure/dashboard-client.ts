import { getApiBaseUrl } from '../../../shared/lib/http/api-base-url';
import { createHttpClient } from '../../../shared/lib/http/http-client';
import type {
  DashboardCurrentCompanySummary,
  DashboardCompanySummary,
  DashboardNotification,
} from '../domain/dashboard';

export type DashboardRepository = {
  getCurrentCompanySummary: () => Promise<DashboardCurrentCompanySummary | null>;
  getCompanySummary: () => Promise<DashboardCompanySummary>;
  getNotifications: (scope?: 'admin' | 'user') => Promise<{ notifications: DashboardNotification[] }>;
};

export const createDashboardRepository = (
  apiBaseUrl = getApiBaseUrl(),
): DashboardRepository => {
  const httpClient = createHttpClient(apiBaseUrl);

  return {
    getCurrentCompanySummary: async () =>
      httpClient.get<DashboardCurrentCompanySummary | null>('/me/company'),
    getCompanySummary: async () =>
      httpClient.get<DashboardCompanySummary>('/admin/companies/summary'),
    getNotifications: async (scope = 'admin') =>
      httpClient.get<{ notifications: DashboardNotification[] }>(
        scope === 'admin' ? '/admin/notifications' : '/notifications',
      ),
  };
};
