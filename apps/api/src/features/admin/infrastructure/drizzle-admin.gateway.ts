import { count, desc, eq } from 'drizzle-orm';

import type { AppDb } from '../../../shared/infrastructure/db/client';
import {
  auditEventsTable,
  companiesTable,
  notificationsTable,
} from '../../../shared/infrastructure/db/schema';
import type { AdminGateway } from '../domain/admin';

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
      })
      .from(companiesTable)
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
});
