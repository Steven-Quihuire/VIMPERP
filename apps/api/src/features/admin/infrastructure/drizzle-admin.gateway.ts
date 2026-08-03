import { and, count, desc, eq, lt, or } from 'drizzle-orm';
import { z } from 'zod';

import type { AppDb } from '../../../shared/infrastructure/db/client';
import {
  applicationErrorsTable,
  auditEventsTable,
  companiesTable,
  companyProfilesTable,
  notificationsTable,
  provisioningRunsTable,
  provisioningStepsTable,
} from '../../../shared/infrastructure/db/schema';
import {
  adminProvisioningRunStatusValues,
  type AdminApplicationErrorDetail,
  type AdminApplicationErrorSummary,
  type AdminAuditEventDetail,
  type AdminAuditEventSummary,
  type AdminGateway,
  type AdminProvisioningRunDetail,
  type AdminProvisioningRunSummary,
} from '../domain/admin';
import { decodeAdminCursor, toCursorPage } from './admin-cursor';

const listProvisioningRunsSchema = z.object({
  status: z.enum(adminProvisioningRunStatusValues).optional(),
  correlationId: z.string().min(1).optional(),
  limit: z.number().int().min(1).max(50).default(20),
  cursor: z.string().min(1).optional(),
});

const listApplicationErrorsSchema = z.object({
  fingerprint: z.string().min(1).optional(),
  correlationId: z.string().min(1).optional(),
  limit: z.number().int().min(1).max(50).default(20),
  cursor: z.string().min(1).optional(),
});

const listAuditEventsSchema = z.object({
  type: z.string().min(1).optional(),
  companyId: z.string().min(1).optional(),
  correlationId: z.string().min(1).optional(),
  limit: z.number().int().min(1).max(50).default(20),
  cursor: z.string().min(1).optional(),
});

const parseCompanyServices = (value: string | null) => {
  if (!value) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) &&
      parsed.every((service) => typeof service === 'string')
      ? parsed
      : [];
  } catch {
    return [];
  }
};

const mapProvisioningRunSummary = (row: {
  id: string;
  correlationId: string;
  requestId: string;
  actorUserId: string;
  process: string;
  status: AdminProvisioningRunSummary['status'];
  attempt: number;
  idempotencyKey: string | null;
  errorSummary: string | null;
  createdAt: Date;
  updatedAt: Date;
}): AdminProvisioningRunSummary => ({
  id: row.id,
  correlationId: row.correlationId,
  requestId: row.requestId,
  actorUserId: row.actorUserId,
  process: row.process,
  status: row.status,
  attempt: row.attempt,
  idempotencyKey: row.idempotencyKey,
  errorSummary: row.errorSummary,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

const mapApplicationErrorSummary = (row: {
  id: string;
  correlationId: string;
  requestId: string;
  fingerprint: string;
  status: string;
  code: string;
  message: string;
  createdAt: Date;
}): AdminApplicationErrorSummary => ({
  id: row.id,
  correlationId: row.correlationId,
  requestId: row.requestId,
  fingerprint: row.fingerprint,
  status: row.status,
  code: row.code,
  message: row.message,
  createdAt: row.createdAt.toISOString(),
});

const mapAuditEventSummary = (row: {
  id: string;
  actorUserId: string;
  companyId: string;
  type: string;
  correlationId: string | null;
  entityType: string | null;
  entityId: string | null;
  createdAt: Date;
}): AdminAuditEventSummary => ({
  id: row.id,
  actorUserId: row.actorUserId,
  companyId: row.companyId,
  type: row.type,
  correlationId: row.correlationId,
  entityType: row.entityType,
  entityId: row.entityId,
  createdAt: row.createdAt.toISOString(),
});

export const createDrizzleAdminGateway = (db: AppDb): AdminGateway => ({
  getCompanySummary: async () => {
    const [companyTotals] = await db
      .select({ totalCompanies: count(companiesTable.id) })
      .from(companiesTable);
    const [notificationTotals] = await db
      .select({ notificationCount: count(notificationsTable.id) })
      .from(notificationsTable)
      .where(eq(notificationsTable.targetRole, 'platform-admin'));
    const [auditTotals] = await db
      .select({ auditEventCount: count(auditEventsTable.id) })
      .from(auditEventsTable);
    const companies = await db
      .select({
        id: companiesTable.id,
        name: companiesTable.name,
        createdAt: companiesTable.createdAt,
        legalIdentifier: companyProfilesTable.legalIdentifier,
        services: companyProfilesTable.services,
        country: companyProfilesTable.country,
        city: companyProfilesTable.city,
        exactLocation: companyProfilesTable.exactLocation,
        contactPhone: companyProfilesTable.contactPhone,
        contactEmail: companyProfilesTable.contactEmail,
        erpModuleId: companyProfilesTable.erpModuleId,
      })
      .from(companiesTable)
      .leftJoin(companyProfilesTable, eq(companiesTable.id, companyProfilesTable.companyId))
      .orderBy(desc(companiesTable.createdAt))
      .limit(5);

    return {
      totalCompanies: Number(companyTotals?.totalCompanies ?? 0),
      notificationCount: Number(notificationTotals?.notificationCount ?? 0),
      auditEventCount: Number(auditTotals?.auditEventCount ?? 0),
      companies: companies.map((company) => ({
        id: company.id,
        name: company.name,
        createdAt: company.createdAt.toISOString(),
        legalIdentifier: company.legalIdentifier ?? undefined,
        services: parseCompanyServices(company.services),
        country: company.country ?? undefined,
        city: company.city ?? undefined,
        exactLocation: company.exactLocation ?? undefined,
        contactPhone: company.contactPhone ?? undefined,
        contactEmail: company.contactEmail ?? undefined,
        erpModuleId: company.erpModuleId ?? undefined,
      })),
    };
  },
  listNotifications: async () => {
    const notifications = await db
      .select({
        id: notificationsTable.id,
        companyId: notificationsTable.companyId,
        targetRole: notificationsTable.targetRole,
        type: notificationsTable.type,
        message: notificationsTable.message,
        createdAt: notificationsTable.createdAt,
      })
      .from(notificationsTable)
      .where(eq(notificationsTable.targetRole, 'platform-admin'))
      .orderBy(desc(notificationsTable.createdAt))
      .limit(10);

    return notifications.map((notification) => ({
      ...notification,
      createdAt: notification.createdAt.toISOString(),
    }));
  },
  listProvisioningRuns: async (filters) => {
    const parsedFilters = listProvisioningRunsSchema.parse(filters);
    const conditions = [];

    if (parsedFilters.status) {
      conditions.push(eq(provisioningRunsTable.status, parsedFilters.status));
    }

    if (parsedFilters.correlationId) {
      conditions.push(
        eq(provisioningRunsTable.correlationId, parsedFilters.correlationId),
      );
    }

    if (parsedFilters.cursor) {
      const cursor = decodeAdminCursor(parsedFilters.cursor);
      const cursorCreatedAt = new Date(cursor.createdAt);

      conditions.push(
        or(
          lt(provisioningRunsTable.createdAt, cursorCreatedAt),
          and(
            eq(provisioningRunsTable.createdAt, cursorCreatedAt),
            lt(provisioningRunsTable.id, cursor.id),
          ),
        )!,
      );
    }

    const rows = await db
      .select({
        id: provisioningRunsTable.id,
        correlationId: provisioningRunsTable.correlationId,
        requestId: provisioningRunsTable.requestId,
        actorUserId: provisioningRunsTable.actorUserId,
        process: provisioningRunsTable.process,
        status: provisioningRunsTable.status,
        attempt: provisioningRunsTable.attempt,
        idempotencyKey: provisioningRunsTable.idempotencyKey,
        errorSummary: provisioningRunsTable.errorSummary,
        createdAt: provisioningRunsTable.createdAt,
        updatedAt: provisioningRunsTable.updatedAt,
      })
      .from(provisioningRunsTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(provisioningRunsTable.createdAt), desc(provisioningRunsTable.id))
      .limit(parsedFilters.limit + 1);

    const mappedRows = rows.map((row) => mapProvisioningRunSummary(row));

    return toCursorPage(mappedRows, parsedFilters.limit, (row) => ({
      createdAt: row.createdAt,
      id: row.id,
    }));
  },
  getProvisioningRun: async (runId) => {
    const [run] = await db
      .select({
        id: provisioningRunsTable.id,
        correlationId: provisioningRunsTable.correlationId,
        requestId: provisioningRunsTable.requestId,
        actorUserId: provisioningRunsTable.actorUserId,
        process: provisioningRunsTable.process,
        status: provisioningRunsTable.status,
        attempt: provisioningRunsTable.attempt,
        idempotencyKey: provisioningRunsTable.idempotencyKey,
        errorSummary: provisioningRunsTable.errorSummary,
        createdAt: provisioningRunsTable.createdAt,
        updatedAt: provisioningRunsTable.updatedAt,
      })
      .from(provisioningRunsTable)
      .where(eq(provisioningRunsTable.id, runId))
      .limit(1);

    const steps = await db
      .select({
        id: provisioningStepsTable.id,
        name: provisioningStepsTable.name,
        status: provisioningStepsTable.status,
        attempt: provisioningStepsTable.attempt,
        detail: provisioningStepsTable.detail,
        createdAt: provisioningStepsTable.createdAt,
      })
      .from(provisioningStepsTable)
      .where(eq(provisioningStepsTable.runId, runId))
      .orderBy(desc(provisioningStepsTable.createdAt), desc(provisioningStepsTable.id));

    const mappedRun = mapProvisioningRunSummary(run!);

    return {
      ...mappedRun,
      steps: steps
        .map((step) => ({
          id: step.id,
          name: step.name,
          status: step.status,
          attempt: step.attempt,
          detail: (step.detail as Record<string, unknown> | null) ?? null,
          createdAt: step.createdAt.toISOString(),
        }))
        .reverse(),
    } satisfies AdminProvisioningRunDetail;
  },
  listApplicationErrors: async (filters) => {
    const parsedFilters = listApplicationErrorsSchema.parse(filters);
    const conditions = [];

    if (parsedFilters.fingerprint) {
      conditions.push(eq(applicationErrorsTable.fingerprint, parsedFilters.fingerprint));
    }

    if (parsedFilters.correlationId) {
      conditions.push(
        eq(applicationErrorsTable.correlationId, parsedFilters.correlationId),
      );
    }

    if (parsedFilters.cursor) {
      const cursor = decodeAdminCursor(parsedFilters.cursor);
      const cursorCreatedAt = new Date(cursor.createdAt);

      conditions.push(
        or(
          lt(applicationErrorsTable.createdAt, cursorCreatedAt),
          and(
            eq(applicationErrorsTable.createdAt, cursorCreatedAt),
            lt(applicationErrorsTable.id, cursor.id),
          ),
        )!,
      );
    }

    const rows = await db
      .select({
        id: applicationErrorsTable.id,
        correlationId: applicationErrorsTable.correlationId,
        requestId: applicationErrorsTable.requestId,
        fingerprint: applicationErrorsTable.fingerprint,
        status: applicationErrorsTable.status,
        code: applicationErrorsTable.code,
        message: applicationErrorsTable.message,
        createdAt: applicationErrorsTable.createdAt,
      })
      .from(applicationErrorsTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(applicationErrorsTable.createdAt), desc(applicationErrorsTable.id))
      .limit(parsedFilters.limit + 1);

    const mappedRows = rows.map((row) => mapApplicationErrorSummary(row));

    return toCursorPage(mappedRows, parsedFilters.limit, (row) => ({
      createdAt: row.createdAt,
      id: row.id,
    }));
  },
  getApplicationError: async (errorId) => {
    const [error] = await db
      .select({
        id: applicationErrorsTable.id,
        correlationId: applicationErrorsTable.correlationId,
        requestId: applicationErrorsTable.requestId,
        fingerprint: applicationErrorsTable.fingerprint,
        status: applicationErrorsTable.status,
        code: applicationErrorsTable.code,
        message: applicationErrorsTable.message,
        stack: applicationErrorsTable.stack,
        context: applicationErrorsTable.context,
        createdAt: applicationErrorsTable.createdAt,
      })
      .from(applicationErrorsTable)
      .where(eq(applicationErrorsTable.id, errorId))
      .limit(1);

    return {
      ...mapApplicationErrorSummary(error!),
      stack: error?.stack ?? null,
      context: (error?.context as Record<string, unknown> | null) ?? null,
    } satisfies AdminApplicationErrorDetail;
  },
  listAuditEvents: async (filters) => {
    const parsedFilters = listAuditEventsSchema.parse(filters);
    const conditions = [];

    if (parsedFilters.type) {
      conditions.push(eq(auditEventsTable.type, parsedFilters.type));
    }

    if (parsedFilters.companyId) {
      conditions.push(eq(auditEventsTable.companyId, parsedFilters.companyId));
    }

    if (parsedFilters.correlationId) {
      conditions.push(eq(auditEventsTable.correlationId, parsedFilters.correlationId));
    }

    if (parsedFilters.cursor) {
      const cursor = decodeAdminCursor(parsedFilters.cursor);
      const cursorCreatedAt = new Date(cursor.createdAt);

      conditions.push(
        or(
          lt(auditEventsTable.createdAt, cursorCreatedAt),
          and(
            eq(auditEventsTable.createdAt, cursorCreatedAt),
            lt(auditEventsTable.id, cursor.id),
          ),
        )!,
      );
    }

    const rows = await db
      .select({
        id: auditEventsTable.id,
        actorUserId: auditEventsTable.actorUserId,
        companyId: auditEventsTable.companyId,
        type: auditEventsTable.type,
        correlationId: auditEventsTable.correlationId,
        entityType: auditEventsTable.entityType,
        entityId: auditEventsTable.entityId,
        createdAt: auditEventsTable.createdAt,
      })
      .from(auditEventsTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(auditEventsTable.createdAt), desc(auditEventsTable.id))
      .limit(parsedFilters.limit + 1);

    const mappedRows = rows.map((row) => mapAuditEventSummary(row));

    return toCursorPage(mappedRows, parsedFilters.limit, (row) => ({
      createdAt: row.createdAt,
      id: row.id,
    }));
  },
  getAuditEvent: async (eventId) => {
    const [event] = await db
      .select({
        id: auditEventsTable.id,
        actorUserId: auditEventsTable.actorUserId,
        companyId: auditEventsTable.companyId,
        type: auditEventsTable.type,
        correlationId: auditEventsTable.correlationId,
        entityType: auditEventsTable.entityType,
        entityId: auditEventsTable.entityId,
        details: auditEventsTable.details,
        oldValues: auditEventsTable.oldValues,
        newValues: auditEventsTable.newValues,
        createdAt: auditEventsTable.createdAt,
      })
      .from(auditEventsTable)
      .where(eq(auditEventsTable.id, eventId))
      .limit(1);

    return {
      ...mapAuditEventSummary(event!),
      details: event?.details as Record<string, unknown>,
      oldValues: (event?.oldValues as Record<string, unknown> | null) ?? null,
      newValues: (event?.newValues as Record<string, unknown> | null) ?? null,
    } satisfies AdminAuditEventDetail;
  },
});
