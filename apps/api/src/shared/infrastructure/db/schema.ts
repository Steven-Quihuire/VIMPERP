import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const authRoleEnum = pgEnum('auth_role', [
  'platform-admin',
  'company-owner',
  'company-user',
]);

export const provisioningStatusEnum = pgEnum('provisioning_status', [
  'running',
  'succeeded',
  'failed',
  'incomplete',
]);

export const provisioningStepStatusEnum = pgEnum('provisioning_step_status', [
  'pending',
  'succeeded',
  'failed',
  'skipped',
]);

export const usersTable = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
});

export const sessionsTable = pgTable('sessions', {
  token: text('token').primaryKey(),
  userId: text('user_id').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
});

export const membershipsTable = pgTable('memberships', {
  userId: text('user_id').notNull(),
  companyId: text('company_id'),
  role: authRoleEnum('role').notNull(),
});

export const companiesTable = pgTable('companies', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
});

export const companyProfilesTable = pgTable('company_profiles', {
  companyId: text('company_id').primaryKey(),
  legalIdentifier: text('legal_identifier').notNull(),
  services: text('services').notNull(),
  country: text('country').notNull(),
  city: text('city').notNull(),
  exactLocation: text('exact_location').notNull(),
  contactPhone: text('contact_phone').notNull(),
  contactEmail: text('contact_email').notNull(),
});

export const companyServicesTable = pgTable('company_services', {
  id: text('id').primaryKey(),
  companyId: text('company_id').notNull(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
}, (table) => [uniqueIndex('company_services_company_name_idx').on(table.companyId, table.name)]);

export const branchesTable = pgTable('branches', {
  id: text('id').primaryKey(),
  companyId: text('company_id').notNull(),
  name: text('name').notNull(),
  locale: text('locale'),
});

export const themePreferencesTable = pgTable('theme_preferences', {
  userId: text('user_id').primaryKey(),
  companyId: text('company_id'),
  paletteId: text('palette_id').notNull(),
});

export const notificationsTable = pgTable('notifications', {
  id: text('id').primaryKey(),
  companyId: text('company_id').notNull(),
  targetRole: authRoleEnum('target_role').notNull(),
  type: text('type').notNull(),
  message: text('message').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
}, (table) => [index('notifications_target_role_idx').on(table.targetRole)]);

export const auditEventsTable = pgTable('audit_events', {
  id: text('id').primaryKey(),
  actorUserId: text('actor_user_id').notNull(),
  companyId: text('company_id').notNull(),
  type: text('type').notNull(),
  correlationId: text('correlation_id'),
  entityType: text('entity_type'),
  entityId: text('entity_id'),
  details: jsonb('details').notNull(),
  oldValues: jsonb('old_values'),
  newValues: jsonb('new_values'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
}, (table) => [
  index('audit_events_company_created_at_idx').on(table.companyId, table.createdAt),
  index('audit_events_correlation_id_idx').on(table.correlationId),
]);

export const provisioningRunsTable = pgTable('provisioning_runs', {
  id: text('id').primaryKey(),
  correlationId: text('correlation_id').notNull(),
  requestId: text('request_id').notNull(),
  actorUserId: text('actor_user_id').notNull(),
  process: text('process').notNull(),
  status: provisioningStatusEnum('status').notNull(),
  attempt: integer('attempt').notNull().default(1),
  idempotencyKey: text('idempotency_key'),
  errorSummary: text('error_summary'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
}, (table) => [
  uniqueIndex('provisioning_runs_process_idempotency_idx')
    .on(table.process, table.idempotencyKey)
    .where(sql`${table.idempotencyKey} IS NOT NULL`),
  index('provisioning_runs_correlation_id_idx').on(table.correlationId),
  index('provisioning_runs_status_created_at_idx').on(table.status, table.createdAt),
]);

export const provisioningStepsTable = pgTable('provisioning_steps', {
  id: text('id').primaryKey(),
  runId: text('run_id').notNull(),
  name: text('name').notNull(),
  status: provisioningStepStatusEnum('status').notNull(),
  attempt: integer('attempt').notNull().default(1),
  detail: jsonb('detail'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
}, (table) => [
  index('provisioning_steps_run_id_created_at_idx').on(table.runId, table.createdAt),
  index('provisioning_steps_status_idx').on(table.status),
]);

export const applicationErrorsTable = pgTable('application_errors', {
  id: text('id').primaryKey(),
  correlationId: text('correlation_id').notNull(),
  requestId: text('request_id').notNull(),
  fingerprint: text('fingerprint').notNull(),
  status: text('status').notNull(),
  code: text('code').notNull(),
  message: text('message').notNull(),
  stack: text('stack'),
  context: jsonb('context'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
}, (table) => [
  index('application_errors_correlation_id_idx').on(table.correlationId),
  index('application_errors_fingerprint_idx').on(table.fingerprint),
  index('application_errors_created_at_idx').on(table.createdAt),
]);
