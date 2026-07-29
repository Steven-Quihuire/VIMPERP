import type { DashboardCursorPage } from './admin-query';

export type ApplicationErrorListFilters = {
  fingerprint?: string | undefined;
  correlationId?: string | undefined;
  limit?: number | undefined;
  cursor?: string | undefined;
};

export type ApplicationErrorSummary = {
  id: string;
  correlationId: string;
  requestId: string;
  fingerprint: string;
  status: string;
  code: string;
  message: string;
  createdAt: string;
};

export type ApplicationErrorDetail = ApplicationErrorSummary & {
  stack: string | null;
  context: Record<string, unknown> | null;
};

export type ApplicationErrorsPage = DashboardCursorPage<ApplicationErrorSummary>;
