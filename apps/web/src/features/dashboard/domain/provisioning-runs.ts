import type { DashboardCursorPage } from './admin-query';

export type ProvisioningRunStatus = 'running' | 'succeeded' | 'failed' | 'incomplete';

export type ProvisioningRunListFilters = {
  status?: ProvisioningRunStatus | undefined;
  correlationId?: string | undefined;
  limit?: number | undefined;
  cursor?: string | undefined;
};

export type ProvisioningStep = {
  id: string;
  name: string;
  status: 'pending' | 'succeeded' | 'failed' | 'skipped';
  attempt: number;
  detail: Record<string, unknown> | null;
  createdAt: string;
};

export type ProvisioningRunSummary = {
  id: string;
  correlationId: string;
  requestId: string;
  actorUserId: string;
  process: string;
  status: ProvisioningRunStatus;
  attempt: number;
  idempotencyKey: string | null;
  errorSummary: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProvisioningRunDetail = ProvisioningRunSummary & {
  steps: ProvisioningStep[];
};

export type ProvisioningRunsPage = DashboardCursorPage<ProvisioningRunSummary>;
