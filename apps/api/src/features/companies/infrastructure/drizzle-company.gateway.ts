import { randomUUID } from 'node:crypto';

import { eq } from 'drizzle-orm';

import type { AppDb } from '../../../shared/infrastructure/db/client';
import {
  auditEventsTable,
  branchesTable,
  companiesTable,
  companyProfilesTable,
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

export const createDrizzleCompanyOnboardingGateway = (
  db: AppDb,
): CompanyOnboardingGateway => ({
  createCompany: async (input) => {
    return db.transaction(async (tx) => {
      const companyId = randomUUID();
      const createdAt = new Date();

      await tx.insert(companiesTable).values({
        id: companyId,
        name: input.name,
        createdAt,
      });

      await tx.insert(companyProfilesTable).values({
        companyId,
        legalIdentifier: input.legalIdentifier,
        services: JSON.stringify(input.services),
        country: input.address.country,
        city: input.address.city,
        exactLocation: input.address.exactLocation,
        contactPhone: input.contact.phone,
        contactEmail: input.contact.email,
      });

      if (input.branches.length > 0) {
        await tx.insert(branchesTable).values(
          input.branches.map((branch) => ({
            id: randomUUID(),
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
        id: randomUUID(),
        companyId,
        targetRole: 'platform-admin',
        type: 'company.registered',
        message: `${input.name} registered`,
        createdAt,
      });

      await tx.insert(auditEventsTable).values({
        id: randomUUID(),
        actorUserId: input.ownerUserId,
        companyId,
        type: 'company.created',
        details: JSON.stringify({
          legalIdentifier: input.legalIdentifier,
          services: input.services,
        }),
        createdAt,
      });

      return {
        companyId,
        paletteId: input.paletteId,
      };
    });
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
