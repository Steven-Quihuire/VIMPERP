import { useQuery } from '@tanstack/react-query';

import { createDashboardRepository } from '../infrastructure/dashboard-client';

export const dashboardSummaryQueryKey = ['dashboard', 'admin', 'summary'] as const;
export const dashboardNotificationsQueryKey = ['dashboard', 'admin', 'notifications'] as const;

export const useDashboardSummary = (apiBaseUrl?: string, enabled = false) => {
  const repository = createDashboardRepository(apiBaseUrl);

  return useQuery({
    queryKey: dashboardSummaryQueryKey,
    queryFn: () => repository.getCompanySummary(),
    enabled,
  });
};

export const useDashboardNotifications = (apiBaseUrl?: string, enabled = false) => {
  const repository = createDashboardRepository(apiBaseUrl);

  return useQuery({
    queryKey: dashboardNotificationsQueryKey,
    queryFn: () => repository.getNotifications(),
    enabled,
  });
};
