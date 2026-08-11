import { randomUUID } from 'node:crypto';

import { and, eq, inArray, isNotNull } from 'drizzle-orm';

import type { AppDb } from '../../../shared/infrastructure/db/client';
import {
  auditEventsTable,
  companiesTable,
  companyProfilesTable,
  companyServicesTable,
  localsTable,
  membershipsTable,
  notificationsTable,
  permissionsTable,
  privacyConsentsTable,
  privacyPolicyAcceptancesTable,
  roleAssignmentsTable,
  rolePermissionsTable,
  rolesTable,
  themePreferencesTable,
  userPreferencesTable,
} from '../../../shared/infrastructure/db/schema';
import {
  DuplicateCompanyError,
  normalizeCompanyServices,
  paletteValues,
  type CompanyOnboardingGateway,
  type PaletteId,
  PrivacyPolicyNotAcceptedError,
} from '../domain/company';
import { toScopeNodeId } from '../../roles-management/infrastructure/scope-node-id';
import {
  getCompanyOwnerPermissionKeys,
  getCompanyUserPermissionKeys,
  permissionCatalogSeeds,
} from '../../roles-management/domain/permissions';

type CompanyTx = Parameters<Parameters<AppDb['transaction']>[0]>[0];

const toPaletteId = (value: string): PaletteId => {
  if (paletteValues.includes(value as PaletteId)) {
    return value as PaletteId;
  }

  return 'ocean';
};

const ensurePermissionCatalog = async (tx: CompanyTx) => {
  const existingPermissions = await tx.select().from(permissionsTable);
  const existingKeys = new Set(existingPermissions.map((permission) => permission.key));
  const missingPermissions = permissionCatalogSeeds.filter(
    (permission) => !existingKeys.has(permission.key),
  );

  if (missingPermissions.length === 0) {
    return;
  }

  await tx.insert(permissionsTable).values(
    missingPermissions.map((permission) => ({
      id: randomUUID(),
      key: permission.key,
      family: permission.family,
    })),
  );
};

const ensureSystemRole = async (
  tx: CompanyTx,
  {
    companyId,
    userId,
    key,
    name,
    permissionKeys,
    createId,
    createdAt,
  }: {
    companyId: string;
    userId: string;
    key: string;
    name: string;
    permissionKeys: string[];
    createId: () => string;
    createdAt: Date;
  },
) => {
  const [existingRole] = await tx
    .select({ id: rolesTable.id })
    .from(rolesTable)
    .where(and(eq(rolesTable.companyId, companyId), eq(rolesTable.key, key)))
    .limit(1);

  const roleId = existingRole?.id ?? createId();

  if (!existingRole) {
    await tx.insert(rolesTable).values({
      id: roleId,
      companyId,
      key,
      name,
      isSystem: true,
      createdAt,
    });
  }

  const permissions = await tx
    .select({ id: permissionsTable.id })
    .from(permissionsTable)
    .where(inArray(permissionsTable.key, permissionKeys));
  const existingRolePermissions = await tx
    .select({ permissionId: rolePermissionsTable.permissionId })
    .from(rolePermissionsTable)
    .where(eq(rolePermissionsTable.roleId, roleId));
  const existingPermissionIds = new Set(
    existingRolePermissions.map((entry) => entry.permissionId),
  );
  const missingRolePermissions = permissions.filter(
    (permission) => !existingPermissionIds.has(permission.id),
  );

  if (missingRolePermissions.length > 0) {
    await tx.insert(rolePermissionsTable).values(
      missingRolePermissions.map((permission) => ({
        roleId,
        permissionId: permission.id,
      })),
    );
  }

  const [existingAssignment] = await tx
    .select({ id: roleAssignmentsTable.id })
    .from(roleAssignmentsTable)
    .where(
      and(
        eq(roleAssignmentsTable.companyId, companyId),
        eq(roleAssignmentsTable.userId, userId),
        eq(roleAssignmentsTable.roleId, roleId),
        eq(roleAssignmentsTable.scopeType, 'company'),
      ),
    )
    .limit(1);

  if (!existingAssignment) {
    await tx.insert(roleAssignmentsTable).values({
      id: createId(),
      companyId,
      userId,
      roleId,
      scopeNodeId: toScopeNodeId({
        companyId,
        scopeType: 'company',
        scopeId: companyId,
      }),
      scopeType: 'company',
      scopeId: companyId,
      createdAt,
    });
  }
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
      const services = normalizeCompanyServices(input.services);

      const [existingCompanyProfile] = await tx
        .select({ companyId: companyProfilesTable.companyId })
        .from(companyProfilesTable)
        .where(eq(companyProfilesTable.legalIdentifier, input.legalIdentifier))
        .limit(1);

      if (existingCompanyProfile) {
        throw new DuplicateCompanyError();
      }

      const [privacyPolicyAcceptance] = await tx
        .select({ id: privacyPolicyAcceptancesTable.id })
        .from(privacyPolicyAcceptancesTable)
        .where(
          and(
            eq(privacyPolicyAcceptancesTable.userId, input.ownerUserId),
            eq(
              privacyPolicyAcceptancesTable.policyVersion,
              input.privacyPolicyVersion,
            ),
          ),
        )
        .limit(1);

      if (!privacyPolicyAcceptance) {
        throw new PrivacyPolicyNotAcceptedError();
      }

      await tx.insert(companiesTable).values({
        id: companyId,
        name: input.name,
        status: 'active',
        createdAt,
      });

      await tx.insert(privacyConsentsTable).values({
        id: generateId(),
        userId: input.ownerUserId,
        companyId,
        policyVersion: input.privacyPolicyVersion,
        acceptedAt: createdAt,
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
        erpModuleId: input.erpModuleId,
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
        await tx.insert(localsTable).values(
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

      await ensurePermissionCatalog(tx);

      await ensureSystemRole(tx, {
        companyId,
        userId: input.ownerUserId,
        key: 'company-owner',
        name: 'Company Owner',
        permissionKeys: getCompanyOwnerPermissionKeys([input.erpModuleId]),
        createId: generateId,
        createdAt,
      });

      await ensureSystemRole(tx, {
        companyId,
        userId: input.ownerUserId,
        key: 'company-user',
        name: 'Company User',
        permissionKeys: getCompanyUserPermissionKeys([input.erpModuleId]),
        createId: generateId,
        createdAt,
      });

      const [existingThemePreference] = await tx
        .select({ userId: themePreferencesTable.userId })
        .from(themePreferencesTable)
        .where(eq(themePreferencesTable.userId, input.ownerUserId))
        .limit(1);

      if (existingThemePreference) {
        await tx
          .update(themePreferencesTable)
          .set({ companyId, paletteId: input.paletteId })
          .where(eq(themePreferencesTable.userId, input.ownerUserId));
      } else {
        await tx.insert(themePreferencesTable).values({
          userId: input.ownerUserId,
          companyId,
          paletteId: input.paletteId,
        });
      }

      const [existingUserPreference] = await tx
        .select({ userId: userPreferencesTable.userId })
        .from(userPreferencesTable)
        .where(eq(userPreferencesTable.userId, input.ownerUserId))
        .limit(1);

      if (existingUserPreference) {
        await tx
          .update(userPreferencesTable)
          .set({ activeCompanyId: companyId })
          .where(eq(userPreferencesTable.userId, input.ownerUserId));
      } else {
        await tx.insert(userPreferencesTable).values({
          userId: input.ownerUserId,
          activeCompanyId: companyId,
        });
      }

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
  recordPrivacyPolicyAcceptance: async ({ userId, policyVersion }) => {
    const acceptedAt = now();
    const [existingAcceptance] = await db
      .select({ id: privacyPolicyAcceptancesTable.id })
      .from(privacyPolicyAcceptancesTable)
      .where(
        and(
          eq(privacyPolicyAcceptancesTable.userId, userId),
          eq(privacyPolicyAcceptancesTable.policyVersion, policyVersion),
        ),
      )
      .limit(1);

    if (existingAcceptance) {
      await db
        .update(privacyPolicyAcceptancesTable)
        .set({ acceptedAt })
        .where(eq(privacyPolicyAcceptancesTable.id, existingAcceptance.id));
      return;
    }

    await db.insert(privacyPolicyAcceptancesTable).values({
      id: (createId ?? randomUUID)(),
      userId,
      policyVersion,
      acceptedAt,
    });
  },
  getCurrentCompanySummary: async (activeCompanyId) => {
    if (!activeCompanyId) {
      return null;
    }

    const [company] = await db
      .select({
        companyId: companiesTable.id,
        name: companiesTable.name,
      })
      .from(companiesTable)
      .where(
        and(
          eq(companiesTable.id, activeCompanyId),
          isNotNull(companiesTable.id),
        ),
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
