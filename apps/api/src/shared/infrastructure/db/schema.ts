import { pgEnum, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

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
