import type { DashboardCursorPage } from './admin-query';

export type AuditEventListFilters = {
  type?: string | undefined;
  companyId?: string | undefined;
  correlationId?: string | undefined;
  limit?: number | undefined;
  cursor?: string | undefined;
};

export type AuditEventSummary = {
  id: string;
  actorUserId: string;
  companyId: string;
  type: string;
  correlationId: string | null;
  entityType: string | null;
  entityId: string | null;
  createdAt: string;
};

export type AuditEventDetail = AuditEventSummary & {
  details: Record<string, unknown>;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
};

export type AuditEventsPage = DashboardCursorPage<AuditEventSummary>;
