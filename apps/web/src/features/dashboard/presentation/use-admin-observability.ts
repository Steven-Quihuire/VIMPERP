import { useQuery } from '@tanstack/react-query';

import type {
  ApplicationErrorListFilters,
} from '../domain/application-errors';
import type { AuditEventListFilters } from '../domain/audit-events';
import type { ProvisioningRunListFilters } from '../domain/provisioning-runs';
import { createApplicationErrorsClient } from '../infrastructure/application-errors-client';
import { createAuditEventsClient } from '../infrastructure/audit-events-client';
import { createProvisioningRunsClient } from '../infrastructure/provisioning-runs-client';

export const useProvisioningRunsWorkspace = ({
  apiBaseUrl,
  isPlatformAdmin,
  filters,
  runId,
}: {
  apiBaseUrl: string | undefined;
  isPlatformAdmin: boolean;
  filters: ProvisioningRunListFilters;
  runId?: string;
}) => {
  const client = createProvisioningRunsClient(apiBaseUrl);

  const listQuery = useQuery({
    queryKey: ['dashboard', 'admin', 'provisioning-runs', filters],
    queryFn: () => client.listProvisioningRuns(filters),
    enabled: isPlatformAdmin,
  });

  const detailQuery = useQuery({
    queryKey: ['dashboard', 'admin', 'provisioning-runs', runId],
    queryFn: () => client.getProvisioningRunDetail(runId!),
    enabled: isPlatformAdmin && typeof runId === 'string' && runId.length > 0,
  });

  return { listQuery, detailQuery };
};

export const useApplicationErrorsWorkspace = ({
  apiBaseUrl,
  isPlatformAdmin,
  filters,
  errorId,
}: {
  apiBaseUrl: string | undefined;
  isPlatformAdmin: boolean;
  filters: ApplicationErrorListFilters;
  errorId?: string;
}) => {
  const client = createApplicationErrorsClient(apiBaseUrl);

  const listQuery = useQuery({
    queryKey: ['dashboard', 'admin', 'application-errors', filters],
    queryFn: () => client.listApplicationErrors(filters),
    enabled: isPlatformAdmin,
  });

  const detailQuery = useQuery({
    queryKey: ['dashboard', 'admin', 'application-errors', errorId],
    queryFn: () => client.getApplicationErrorDetail(errorId!),
    enabled: isPlatformAdmin && typeof errorId === 'string' && errorId.length > 0,
  });

  return { listQuery, detailQuery };
};

export const useAuditEventsWorkspace = ({
  apiBaseUrl,
  isPlatformAdmin,
  filters,
  eventId,
}: {
  apiBaseUrl: string | undefined;
  isPlatformAdmin: boolean;
  filters: AuditEventListFilters;
  eventId?: string;
}) => {
  const client = createAuditEventsClient(apiBaseUrl);

  const listQuery = useQuery({
    queryKey: ['dashboard', 'admin', 'audit-events', filters],
    queryFn: () => client.listAuditEvents(filters),
    enabled: isPlatformAdmin,
  });

  const detailQuery = useQuery({
    queryKey: ['dashboard', 'admin', 'audit-events', eventId],
    queryFn: () => client.getAuditEventDetail(eventId!),
    enabled: isPlatformAdmin && typeof eventId === 'string' && eventId.length > 0,
  });

  return { listQuery, detailQuery };
};
