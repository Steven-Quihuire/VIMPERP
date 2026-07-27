import { index, pgEnum, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const authRoleEnum = pgEnum('auth_role', [
  'platform-admin',
  'company-owner',
  'company-user',
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
  details: text('details').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
});
