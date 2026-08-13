import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { createDashboardRepository } from '../infrastructure/dashboard-client';

export const dashboardCurrentCompanyQueryKey = ['dashboard', 'current-company'] as const;
export const dashboardSummaryQueryKey = ['dashboard', 'admin', 'summary'] as const;
export const dashboardNotificationsQueryKey = ['dashboard', 'admin', 'notifications'] as const;
const notificationReadStorageKey = 'vimcore.admin.notifications.read';
const notificationReadEvent = 'vimcore:notifications-read';

export const getReadNotificationIds = () => {
  if (typeof window === 'undefined') return new Set<string>();

  try {
    return new Set<string>(
      (JSON.parse(window.localStorage.getItem(notificationReadStorageKey) ?? '[]') as string[]),
    );
  } catch {
    return new Set<string>();
  }
};

export const markNotificationsAsRead = (ids: string[]) => {
  if (typeof window === 'undefined' || ids.length === 0) return;

  const readIds = getReadNotificationIds();
  const unreadIds = ids.filter((id) => !readIds.has(id));

  if (unreadIds.length === 0) return;

  unreadIds.forEach((id) => readIds.add(id));
  window.localStorage.setItem(notificationReadStorageKey, JSON.stringify([...readIds]));
  window.dispatchEvent(new Event(notificationReadEvent));
};

export const useNotificationReadVersion = () => {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const handleRead = () => setVersion((current) => current + 1);
    window.addEventListener(notificationReadEvent, handleRead);
    return () => window.removeEventListener(notificationReadEvent, handleRead);
  }, []);

  return version;
};

export const useDashboardCurrentCompany = (apiBaseUrl?: string, enabled = false) => {
  const repository = createDashboardRepository(apiBaseUrl);

  return useQuery({
    queryKey: dashboardCurrentCompanyQueryKey,
    queryFn: () => repository.getCurrentCompanySummary(),
    enabled,
  });
};

export const useDashboardSummary = (apiBaseUrl?: string, enabled = false) => {
  const repository = createDashboardRepository(apiBaseUrl);

  return useQuery({
    queryKey: dashboardSummaryQueryKey,
    queryFn: () => repository.getCompanySummary(),
    enabled,
    refetchInterval: enabled ? 30_000 : false,
  });
};

export const useDashboardNotifications = (
  apiBaseUrl?: string,
  enabled = false,
  scope: 'admin' | 'user' = 'admin',
) => {
  const repository = createDashboardRepository(apiBaseUrl);

  return useQuery({
    queryKey: [...dashboardNotificationsQueryKey, scope],
    queryFn: () => repository.getNotifications(scope),
    enabled,
    refetchInterval: enabled ? 30_000 : false,
  });
};
