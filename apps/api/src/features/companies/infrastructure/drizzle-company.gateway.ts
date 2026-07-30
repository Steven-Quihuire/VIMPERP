import { randomUUID } from 'node:crypto';

import { and, eq, isNotNull } from 'drizzle-orm';

import type { AppDb } from '../../../shared/infrastructure/db/client';
import {
  auditEventsTable,
  branchesTable,
  companiesTable,
  companyProfilesTable,
  companyServicesTable,
  membershipsTable,
  notificationsTable,
  themePreferencesTable,
} from '../../../shared/infrastructure/db/schema';
import type {
  CompanyOnboardingGateway,
  PaletteId,
} from '../domain/company';
import { paletteValues } from '../domain/company';

const toPaletteId = (value: string): PaletteId => {
  if (paletteValues.includes(value as PaletteId)) {
    return value as PaletteId;
  }

  return 'ocean';
};

const normalizeServices = (services: string[]) => {
  const normalizedServices = new Set<string>();

  for (const service of services) {
    const normalizedService = service.trim();

    if (normalizedService.length > 0) {
      normalizedServices.add(normalizedService);
    }
  }

  return [...normalizedServices];
};

export const createDrizzleCompanyOnboardingGateway = (
  db: AppDb,
  {
    createId,
    now = () => new Date(),
  }: {
    createId?: () => string;
    now?: () => Date;
  } = {},
): CompanyOnboardingGateway => ({
  createCompany: async (input) => {
    return db.transaction(async (tx) => {
      const generateId = createId ?? randomUUID;
      const companyId = generateId();
      const createdAt = now();
      const services = normalizeServices(input.services);

      await tx.insert(companiesTable).values({
        id: companyId,
        name: input.name,
        createdAt,
      });

      await tx.insert(companyProfilesTable).values({
        companyId,
        legalIdentifier: input.legalIdentifier,
        services: JSON.stringify(services),
        country: input.address.country,
        city: input.address.city,
        exactLocation: input.address.exactLocation,
        contactPhone: input.contact.phone,
        contactEmail: input.contact.email,
      });

      await tx.insert(companyServicesTable).values(
        services.map((service) => ({
          id: generateId(),
          companyId,
          name: service,
          createdAt,
        })),
      );

      if (input.branches.length > 0) {
        await tx.insert(branchesTable).values(
          input.branches.map((branch) => ({
            id: generateId(),
            companyId,
            name: branch.name,
            locale: branch.locale ?? null,
          })),
        );
      }

      await tx.insert(membershipsTable).values({
        userId: input.ownerUserId,
        companyId,
        role: 'company-owner',
      });

      await tx.insert(themePreferencesTable).values({
        userId: input.ownerUserId,
        companyId,
        paletteId: input.paletteId,
      });

      await tx.insert(notificationsTable).values({
        id: generateId(),
        companyId,
        targetRole: 'platform-admin',
        type: 'company.registered',
        message: `${input.name} registered`,
        createdAt,
      });

      await tx.insert(auditEventsTable).values({
        id: generateId(),
        actorUserId: input.ownerUserId,
        companyId,
        type: 'company.created',
        correlationId: input.correlationId,
        entityType: 'company',
        entityId: companyId,
        details: {
          legalIdentifier: input.legalIdentifier,
          services,
        },
        oldValues: null,
        newValues: {
          name: input.name,
          legalIdentifier: input.legalIdentifier,
          services,
        },
        createdAt,
      });

      return {
        companyId,
        paletteId: input.paletteId,
      };
    });
  },
  getCurrentCompanySummary: async (userId) => {
    const [company] = await db
      .select({
        companyId: companiesTable.id,
        name: companiesTable.name,
      })
      .from(membershipsTable)
      .innerJoin(companiesTable, eq(membershipsTable.companyId, companiesTable.id))
      .where(
        and(eq(membershipsTable.userId, userId), isNotNull(membershipsTable.companyId)),
      )
      .limit(1);

    return company ?? null;
  },
  getThemePreference: async (userId) => {
    const [preference] = await db
      .select({ paletteId: themePreferencesTable.paletteId })
      .from(themePreferencesTable)
      .where(eq(themePreferencesTable.userId, userId))
      .limit(1);

    return preference ? { paletteId: toPaletteId(preference.paletteId) } : null;
  },
  saveThemePreference: async ({ userId, paletteId }) => {
    const [preference] = await db
      .select({ userId: themePreferencesTable.userId })
      .from(themePreferencesTable)
      .where(eq(themePreferencesTable.userId, userId))
      .limit(1);

    if (preference) {
      await db
        .update(themePreferencesTable)
        .set({ paletteId })
        .where(eq(themePreferencesTable.userId, userId));

      return { paletteId };
    }

    const [membership] = await db
      .select({ companyId: membershipsTable.companyId })
      .from(membershipsTable)
      .where(eq(membershipsTable.userId, userId))
      .limit(1);

    await db.insert(themePreferencesTable).values({
      userId,
      companyId: membership?.companyId ?? null,
      paletteId,
    });

    return { paletteId };
  },
});
