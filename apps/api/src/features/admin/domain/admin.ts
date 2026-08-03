import type { AuthRole } from '../../identity/domain/auth';

export const adminProvisioningRunStatusValues = [
  'running',
  'succeeded',
  'failed',
  'incomplete',
] as const;

export type AdminProvisioningRunStatus =
  (typeof adminProvisioningRunStatusValues)[number];

export type AdminCompanySignal = {
  id: string;
  name: string;
  createdAt: string;
  legalIdentifier?: string | undefined;
  services?: string[] | undefined;
  country?: string | undefined;
  city?: string | undefined;
  exactLocation?: string | undefined;
  contactPhone?: string | undefined;
  contactEmail?: string | undefined;
  erpModuleId?: string | undefined;
};

export type AdminCompanySummary = {
  totalCompanies: number;
  notificationCount: number;
  auditEventCount: number;
  companies: AdminCompanySignal[];
};

export type AdminNotification = {
  id: string;
  companyId: string;
  targetRole: AuthRole;
  type: string;
  message: string;
  createdAt: string;
};

export type AdminCursorPage<TItem> = {
  items: TItem[];
  nextCursor: string | null;
};

export type AdminProvisioningRunListFilters = {
  status?: AdminProvisioningRunStatus | undefined;
  correlationId?: string | undefined;
  limit?: number | undefined;
  cursor?: string | undefined;
};

export type AdminProvisioningStep = {
  id: string;
  name: string;
  status: 'pending' | 'succeeded' | 'failed' | 'skipped';
  attempt: number;
  detail: Record<string, unknown> | null;
  createdAt: string;
};

export type AdminProvisioningRunSummary = {
  id: string;
  correlationId: string;
  requestId: string;
  actorUserId: string;
  companyName: string | null;
  process: string;
  status: AdminProvisioningRunStatus;
  attempt: number;
  idempotencyKey: string | null;
  errorSummary: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminProvisioningRunDetail = AdminProvisioningRunSummary & {
  steps: AdminProvisioningStep[];
};

export type AdminApplicationErrorListFilters = {
  fingerprint?: string | undefined;
  correlationId?: string | undefined;
  limit?: number | undefined;
  cursor?: string | undefined;
};

export type AdminApplicationErrorSummary = {
  id: string;
  correlationId: string;
  requestId: string;
  fingerprint: string;
  status: string;
  code: string;
  message: string;
  createdAt: string;
};

export type AdminApplicationErrorDetail = AdminApplicationErrorSummary & {
  stack: string | null;
  context: Record<string, unknown> | null;
};

export type AdminAuditEventListFilters = {
  type?: string | undefined;
  companyId?: string | undefined;
  correlationId?: string | undefined;
  limit?: number | undefined;
  cursor?: string | undefined;
};

export type AdminAuditEventSummary = {
  id: string;
  actorUserId: string;
  companyId: string;
  type: string;
  correlationId: string | null;
  entityType: string | null;
  entityId: string | null;
  createdAt: string;
};

export type AdminAuditEventDetail = AdminAuditEventSummary & {
  details: Record<string, unknown>;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
};

export type AdminGateway = {
  getCompanySummary: () => Promise<AdminCompanySummary>;
  listNotifications: () => Promise<AdminNotification[]>;
  listProvisioningRuns: (
    filters: AdminProvisioningRunListFilters,
  ) => Promise<AdminCursorPage<AdminProvisioningRunSummary>>;
  getProvisioningRun: (runId: string) => Promise<AdminProvisioningRunDetail>;
  listApplicationErrors: (
    filters: AdminApplicationErrorListFilters,
  ) => Promise<AdminCursorPage<AdminApplicationErrorSummary>>;
  getApplicationError: (
    errorId: string,
  ) => Promise<AdminApplicationErrorDetail>;
  listAuditEvents: (
    filters: AdminAuditEventListFilters,
  ) => Promise<AdminCursorPage<AdminAuditEventSummary>>;
  getAuditEvent: (eventId: string) => Promise<AdminAuditEventDetail>;
};
