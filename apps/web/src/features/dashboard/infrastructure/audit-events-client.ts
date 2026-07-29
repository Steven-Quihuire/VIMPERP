import { getApiBaseUrl } from '../../../shared/lib/http/api-base-url';
import { createHttpClient } from '../../../shared/lib/http/http-client';
import type {
  AuditEventDetail,
  AuditEventListFilters,
  AuditEventsPage,
} from '../domain/audit-events';

const toQueryString = (filters: AuditEventListFilters) => {
  const params = new URLSearchParams();

  if (filters.type) {
    params.set('type', filters.type);
  }

  if (filters.companyId) {
    params.set('companyId', filters.companyId);
  }

  if (filters.correlationId) {
    params.set('correlationId', filters.correlationId);
  }

  if (typeof filters.limit === 'number') {
    params.set('limit', String(filters.limit));
  }

  if (filters.cursor) {
    params.set('cursor', filters.cursor);
  }

  const queryString = params.toString();

  return queryString.length > 0 ? `?${queryString}` : '';
};

export const createAuditEventsClient = (apiBaseUrl = getApiBaseUrl()) => {
  const httpClient = createHttpClient(apiBaseUrl);

  return {
    listAuditEvents: async (filters: AuditEventListFilters): Promise<AuditEventsPage> => {
      const response = await httpClient.get<{
        auditEvents: AuditEventsPage['items'];
        nextCursor: string | null;
      }>(`/admin/audit-events${toQueryString(filters)}`);

      return {
        items: response.auditEvents,
        nextCursor: response.nextCursor,
      };
    },
    getAuditEventDetail: async (eventId: string): Promise<AuditEventDetail> =>
      httpClient.get<AuditEventDetail>(`/admin/audit-events/${eventId}`),
  };
};
