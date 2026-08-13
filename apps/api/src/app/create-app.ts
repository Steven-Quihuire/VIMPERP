import express, { type Express } from 'express';

import {
  createGetApplicationErrorDetail,
} from '../features/admin/application/get-application-error-detail';
import {
  createGetAuditEventDetail,
} from '../features/admin/application/get-audit-event-detail';
import {
  createGetCompanySummary,
} from '../features/admin/application/get-company-summary';
import {
  createGetProvisioningRunDetail,
} from '../features/admin/application/get-provisioning-run-detail';
import {
  createListApplicationErrors,
} from '../features/admin/application/list-application-errors';
import { createListAdminNotifications } from '../features/admin/application/list-admin-notifications';
import { createListCompanyNotifications } from '../features/admin/application/list-company-notifications';
import { createListAuditEvents } from '../features/admin/application/list-audit-events';
import {
  createListProvisioningRuns,
} from '../features/admin/application/list-provisioning-runs';
import type { AdminGateway } from '../features/admin/domain/admin';
import { createDrizzleAdminGateway } from '../features/admin/infrastructure/drizzle-admin.gateway';
import { createAdminRouter } from '../features/admin/presentation/admin.router';
import { createCreateCompany } from '../features/companies/application/create-company';
import { createGetCurrentCompanySummary } from '../features/companies/application/get-current-company-summary';
import { createGetThemePreference } from '../features/companies/application/get-theme-preference';
import { createSweepStaleProvisioningRuns } from '../features/companies/application/sweep-stale-provisioning-runs';
import { createUpdateThemePreference } from '../features/companies/application/update-theme-preference';
import type {
  CompanyOnboardingGateway,
  ProvisioningRecorder,
} from '../features/companies/domain/company';
import { createDrizzleCompanyOnboardingGateway } from '../features/companies/infrastructure/drizzle-company.gateway';
import { createDrizzleProvisioningRecorder } from '../features/companies/infrastructure/drizzle-provisioning.recorder';
import { createCompanyRouter } from '../features/companies/presentation/company.router';
import { createLogin } from '../features/identity/application/login';
import { createLogout } from '../features/identity/application/logout';
import { createRegister } from '../features/identity/application/register';
import { createResolveAuthSession } from '../features/identity/application/resolve-auth-session';
import {
  ForbiddenError,
  TooManyRequestsError,
} from '../features/identity/domain/auth';
import type {
  AuthIdentityGateway,
  PasswordHasher,
  SessionTokenService,
} from '../features/identity/domain/auth';
import { createArgon2PasswordHasher } from '../features/identity/infrastructure/argon2-password-hasher';
import { createDrizzleAuthIdentityGateway } from '../features/identity/infrastructure/drizzle-auth.gateway';
import { createSessionTokenService } from '../features/identity/infrastructure/session-token.service';
import {
  createRequireAuth,
  createRequireRole,
} from '../features/identity/presentation/auth.middleware';
import { createAuthRouter } from '../features/identity/presentation/auth.router';
import { createCreateCategoryUseCase } from '../features/items/application/create-category';
import { createCreateItemUseCase } from '../features/items/application/create-item';
import { createGetItemUseCase } from '../features/items/application/get-item';
import { createListCategoriesUseCase } from '../features/items/application/list-categories';
import { createListItemsUseCase } from '../features/items/application/list-items';
import { createSoftDeleteItemUseCase } from '../features/items/application/soft-delete-item';
import { createUpdateCategoryUseCase } from '../features/items/application/update-category';
import { createUpdateItemUseCase } from '../features/items/application/update-item';
import type {
  CategoryGateway,
  ItemCatalogGateway,
} from '../features/items/domain/item';
import { createDrizzleItemGateway } from '../features/items/infrastructure/drizzle-item.gateway';
import { createItemRouter } from '../features/items/presentation/item.router';
import { createListOrgTreeUseCase } from '../features/org-tree/application/list-org-tree';
import type { OrgTreeGateway } from '../features/org-tree/domain/org-tree';
import { createDrizzleOrgTreeGateway } from '../features/org-tree/infrastructure/drizzle-org-tree.gateway';
import { createOrgTreeRouter } from '../features/org-tree/presentation/org-tree.router';
import { createNodeManagementRouter } from '../features/node-management/presentation/node-management.router';
import { createCreateAreaUseCase } from '../features/org-hierarchy/application/create-area';
import { createCreateLocalUseCase } from '../features/org-hierarchy/application/create-local';
import { createCreatePointOfSaleUseCase } from '../features/org-hierarchy/application/create-point-of-sale';
import { createCreateWarehouseUseCase } from '../features/org-hierarchy/application/create-warehouse';
import { createDeleteAreaUseCase } from '../features/org-hierarchy/application/delete-area';
import { createCreateDivisionUseCase } from '../features/org-hierarchy/application/create-division';
import { createDeleteDivisionUseCase } from '../features/org-hierarchy/application/delete-division';
import { createDeleteLocalUseCase } from '../features/org-hierarchy/application/delete-local';
import { createDeletePointOfSaleUseCase } from '../features/org-hierarchy/application/delete-point-of-sale';
import { createDeleteWarehouseUseCase } from '../features/org-hierarchy/application/delete-warehouse';
import { createListAreasUseCase } from '../features/org-hierarchy/application/list-areas';
import { createListDivisionsUseCase } from '../features/org-hierarchy/application/list-divisions';
import { createListLocalsUseCase } from '../features/org-hierarchy/application/list-locals';
import { createListPointsOfSaleUseCase } from '../features/org-hierarchy/application/list-points-of-sale';
import { createListWarehousesUseCase } from '../features/org-hierarchy/application/list-warehouses';
import { createUpdateAreaUseCase } from '../features/org-hierarchy/application/update-area';
import { createUpdateDivisionUseCase } from '../features/org-hierarchy/application/update-division';
import { createUpdateLocalUseCase } from '../features/org-hierarchy/application/update-local';
import { createUpdatePointOfSaleUseCase } from '../features/org-hierarchy/application/update-point-of-sale';
import { createUpdateWarehouseUseCase } from '../features/org-hierarchy/application/update-warehouse';
import type { OrgHierarchyGateway } from '../features/org-hierarchy/domain/org-hierarchy';
import { createDrizzleOrgHierarchyGateway } from '../features/org-hierarchy/infrastructure/drizzle-org-hierarchy.gateway';
import { createOrgHierarchyRouter } from '../features/org-hierarchy/presentation/org-hierarchy.router';
import { createGetHealth } from '../features/sample-health/application/get-health';
import type { HealthGateway } from '../features/sample-health/domain/health';
import { createDrizzleHealthGateway } from '../features/sample-health/infrastructure/drizzle-health.gateway';
import { createHealthRouter } from '../features/sample-health/presentation/health.router';
import {
  createErrorMiddleware,
  type ApplicationErrorRecorder,
} from '../shared/presentation/error.middleware';
import { createDb } from '../shared/infrastructure/db/client';
import { createDrizzleScopeResolver } from '../shared/infrastructure/scope-hierarchy/drizzle-scope-resolver';
import type { ScopeRef, ScopeResolver } from '../shared/infrastructure/scope-hierarchy/scope-hierarchy.port';
import {
  createLogger,
  createMetricsRouter,
  createRequestContextMiddleware,
  createRequestMetrics,
} from '../shared/presentation/observability';

type CreateAppInput = {
  databaseUrl?: string;
  healthGateway?: HealthGateway;
  authIdentityGateway?: AuthIdentityGateway;
  passwordHasher?: PasswordHasher;
  sessionTokenService?: SessionTokenService;
  companyOnboardingGateway?: CompanyOnboardingGateway;
  provisioningRecorder?: ProvisioningRecorder & ApplicationErrorRecorder;
  adminGateway?: AdminGateway;
  itemGateway?: ItemCatalogGateway & CategoryGateway;
  orgTreeGateway?: OrgTreeGateway;
  orgHierarchyGateway?: OrgHierarchyGateway;
  scopeResolver?: ScopeResolver;
  nodeEnv?: 'development' | 'test' | 'production';
  seedAdminEnabled?: boolean;
  sessionCookieName?: string;
  provisioningStaleTimeoutMs?: number;
};

const ACTIVE_COMPANY_SWITCH_WINDOW_MS = 60 * 1000;
const ACTIVE_COMPANY_SWITCH_LIMIT = 10;

export const createAppRuntime = (input: CreateAppInput = {}) => {
  const db = createDb(input.databaseUrl);
  const app = express();
  const seedAdminSessions = new Map<string, Date>();
  const getHealth = createGetHealth(
    input.healthGateway ?? createDrizzleHealthGateway(db),
  );
  const authIdentityGateway =
    input.authIdentityGateway ?? createDrizzleAuthIdentityGateway(db);
  const passwordHasher = input.passwordHasher ?? createArgon2PasswordHasher();
  const sessionTokenService =
    input.sessionTokenService ?? createSessionTokenService();
  const companyOnboardingGateway =
    input.companyOnboardingGateway ?? createDrizzleCompanyOnboardingGateway(db);
  const provisioningRecorder =
    input.provisioningRecorder ?? createDrizzleProvisioningRecorder(db);
  const adminGateway = input.adminGateway ?? createDrizzleAdminGateway(db);
  const itemGateway = input.itemGateway ?? createDrizzleItemGateway(db);
  const scopeResolver = input.scopeResolver ?? createDrizzleScopeResolver(db);
  const orgTreeGateway =
    input.orgTreeGateway ?? createDrizzleOrgTreeGateway({ scopeResolver });
  const orgHierarchyGateway =
    input.orgHierarchyGateway ?? createDrizzleOrgHierarchyGateway(db);
  const nodeEnv = input.nodeEnv ?? 'development';
  const seedAdminEnabled = nodeEnv !== 'production' && (input.seedAdminEnabled ?? false);
  const sessionCookieName = input.sessionCookieName ?? 'vimcore_session';
  const requestMetrics = createRequestMetrics();
  const logger = createLogger(nodeEnv !== 'test');
  const resolveAuthSession = createResolveAuthSession({
    authIdentityGateway,
    scopeResolver,
    seedAdminSessions,
    seedAdminEnabled,
  });
  const requireAuth = createRequireAuth(resolveAuthSession, sessionCookieName);
  const requirePlatformAdmin = createRequireRole('platform-admin');
  const sweepStaleProvisioningRuns = createSweepStaleProvisioningRuns({
    recorder: provisioningRecorder,
    ...(input.provisioningStaleTimeoutMs !== undefined
      ? { staleTimeoutMs: input.provisioningStaleTimeoutMs }
      : {}),
  });
  const switchActiveCompany = async (input: {
    userId: string;
    companyId: string;
    memberships: Array<{ companyId: string | null; role: string }>;
    correlationId: string;
    currentActiveCompanyId: string | null;
  }) => {
    const belongsToCompany = input.memberships.some(
      (membership) => membership.companyId === input.companyId,
    );

    if (!belongsToCompany) {
      throw new ForbiddenError();
    }

    if (input.currentActiveCompanyId === input.companyId) {
      return;
    }

    const switchCount = await authIdentityGateway.countRecentActiveCompanySwitches(
      input.userId,
      new Date(Date.now() - ACTIVE_COMPANY_SWITCH_WINDOW_MS),
    );

    if (switchCount >= ACTIVE_COMPANY_SWITCH_LIMIT) {
      throw new TooManyRequestsError();
    }

    await authIdentityGateway.setActiveCompanyId(input.userId, input.companyId);
    await authIdentityGateway.recordActiveCompanySwitch({
      userId: input.userId,
      companyId: input.companyId,
      correlationId: input.correlationId,
    });
  };

  const switchActiveLocal = async (input: {
    userId: string;
    localId: string | null;
  }) => {
    await authIdentityGateway.setActiveLocalId(input.userId, input.localId);
  };
  const switchActiveScope = async (input: {
    userId: string;
    scope: ScopeRef | null;
  }) => {
    await authIdentityGateway.setActiveScopeNodeId(
      input.userId,
      input.scope ? `${input.scope.scopeType}:${input.scope.scopeId}` : null,
    );
  };

  app.use(express.json());
  app.use(createRequestContextMiddleware({ logger, metrics: requestMetrics }));
  app.use(createHealthRouter(getHealth));
  app.use(createMetricsRouter(requestMetrics));
  app.use(
    createAuthRouter({
      login: createLogin({
        authIdentityGateway,
        passwordHasher,
        sessionTokenService,
        seedAdminSessions,
        seedAdminEnabled,
      }),
      register: createRegister({
        authIdentityGateway,
        passwordHasher,
        sessionTokenService,
      }),
      resolveAuthSession,
      logout: createLogout(authIdentityGateway, seedAdminSessions),
      switchActiveLocal,
      switchActiveScope,
      scopeResolver,
      findLocalCompanyById: async (localId) => {
        return await authIdentityGateway.findLocalCompanyById(localId);
      },
      requireAuth,
      requireRole: createRequireRole,
      sessionCookieName,
      secureCookies: nodeEnv === 'production',
    }),
  );
  app.use(
    createAdminRouter({
      getCompanySummary: createGetCompanySummary(adminGateway),
      listNotifications: createListAdminNotifications(adminGateway),
      listCompanyNotifications: createListCompanyNotifications(adminGateway),
      listProvisioningRuns: createListProvisioningRuns(adminGateway),
      getProvisioningRunDetail: createGetProvisioningRunDetail(adminGateway),
      listApplicationErrors: createListApplicationErrors(adminGateway),
      getApplicationErrorDetail: createGetApplicationErrorDetail(adminGateway),
      listAuditEvents: createListAuditEvents(adminGateway),
      getAuditEventDetail: createGetAuditEventDetail(adminGateway),
      requireAuth,
      requirePlatformAdmin,
    }),
  );
  app.use(
    createCompanyRouter({
      requireAuth,
      createCompany: createCreateCompany({
        gateway: companyOnboardingGateway,
        recorder: provisioningRecorder,
      }),
      recordPrivacyPolicyAcceptance:
        companyOnboardingGateway.recordPrivacyPolicyAcceptance,
      getCurrentCompanySummary: createGetCurrentCompanySummary(companyOnboardingGateway),
      getThemePreference: createGetThemePreference(companyOnboardingGateway),
      switchActiveCompany,
      updateThemePreference: createUpdateThemePreference(companyOnboardingGateway),
    }),
  );
  app.use(
    createItemRouter({
      requireAuth,
      createItem: createCreateItemUseCase({ itemGateway }),
      updateItem: createUpdateItemUseCase({ itemGateway }),
      softDeleteItem: createSoftDeleteItemUseCase({ itemGateway }),
      getItem: createGetItemUseCase({ itemGateway }),
      listItems: createListItemsUseCase({ itemGateway }),
      listCategories: createListCategoriesUseCase({ itemGateway }),
      createCategory: createCreateCategoryUseCase({ itemGateway }),
      updateCategory: createUpdateCategoryUseCase({ itemGateway }),
      getCategoryById: async (input) => {
        return await itemGateway.getCategoryById(input);
      },
    }),
  );
  app.use(
    createOrgTreeRouter({
      requireAuth,
      requireRole: createRequireRole,
      listOrgTree: createListOrgTreeUseCase({ gateway: orgTreeGateway }),
    }),
  );
  app.use(
    createOrgHierarchyRouter({
      requireAuth,
      requireRole: createRequireRole,
      createDivision: createCreateDivisionUseCase({ gateway: orgHierarchyGateway }),
      listDivisions: createListDivisionsUseCase({ gateway: orgHierarchyGateway }),
      findDivisionById: async (divisionId) =>
        await orgHierarchyGateway.findDivisionById(divisionId),
      updateDivision: createUpdateDivisionUseCase({ gateway: orgHierarchyGateway }),
      deleteDivision: createDeleteDivisionUseCase({ gateway: orgHierarchyGateway }),
      createLocal: createCreateLocalUseCase({ gateway: orgHierarchyGateway }),
      listLocals: createListLocalsUseCase({ gateway: orgHierarchyGateway }),
      findLocalById: async (localId) => await orgHierarchyGateway.findLocalById(localId),
      updateLocal: createUpdateLocalUseCase({ gateway: orgHierarchyGateway }),
      deleteLocal: createDeleteLocalUseCase({ gateway: orgHierarchyGateway }),
      createArea: createCreateAreaUseCase({ gateway: orgHierarchyGateway }),
      listAreas: createListAreasUseCase({ gateway: orgHierarchyGateway }),
      findAreaById: async (areaId) => await orgHierarchyGateway.findAreaById(areaId),
      updateArea: createUpdateAreaUseCase({ gateway: orgHierarchyGateway }),
      deleteArea: createDeleteAreaUseCase({ gateway: orgHierarchyGateway }),
      createWarehouse: createCreateWarehouseUseCase({ gateway: orgHierarchyGateway }),
      listWarehouses: createListWarehousesUseCase({ gateway: orgHierarchyGateway }),
      findWarehouseById: async (warehouseId) =>
        await orgHierarchyGateway.findWarehouseById(warehouseId),
      updateWarehouse: createUpdateWarehouseUseCase({ gateway: orgHierarchyGateway }),
      deleteWarehouse: createDeleteWarehouseUseCase({ gateway: orgHierarchyGateway }),
      createPointOfSale: createCreatePointOfSaleUseCase({ gateway: orgHierarchyGateway }),
      listPointsOfSale: createListPointsOfSaleUseCase({ gateway: orgHierarchyGateway }),
      findPointOfSaleById: async (pointOfSaleId) =>
        await orgHierarchyGateway.findPointOfSaleById(pointOfSaleId),
      updatePointOfSale: createUpdatePointOfSaleUseCase({ gateway: orgHierarchyGateway }),
      deletePointOfSale: createDeletePointOfSaleUseCase({ gateway: orgHierarchyGateway }),
    }),
  );
  app.use(createNodeManagementRouter());
  app.use(createErrorMiddleware({ recorder: provisioningRecorder }));

  return {
    app,
    sweepStaleProvisioningRuns,
  };
};

export const createApp = (input: CreateAppInput = {}): Express => {
  return createAppRuntime(input).app;
};
