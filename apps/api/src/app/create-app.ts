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
import { createGetHealth } from '../features/sample-health/application/get-health';
import type { HealthGateway } from '../features/sample-health/domain/health';
import { createDrizzleHealthGateway } from '../features/sample-health/infrastructure/drizzle-health.gateway';
import { createHealthRouter } from '../features/sample-health/presentation/health.router';
import {
  createErrorMiddleware,
  type ApplicationErrorRecorder,
} from '../shared/presentation/error.middleware';
import { createDb } from '../shared/infrastructure/db/client';
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
  const nodeEnv = input.nodeEnv ?? 'development';
  const seedAdminEnabled = nodeEnv !== 'production' && (input.seedAdminEnabled ?? false);
  const sessionCookieName = input.sessionCookieName ?? 'vimcore_session';
  const requestMetrics = createRequestMetrics();
  const logger = createLogger(nodeEnv !== 'test');
  const resolveAuthSession = createResolveAuthSession({
    authIdentityGateway,
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
      sessionCookieName,
      secureCookies: nodeEnv === 'production',
    }),
  );
  app.use(
    createAdminRouter({
      getCompanySummary: createGetCompanySummary(adminGateway),
      listNotifications: createListAdminNotifications(adminGateway),
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
  app.use(createErrorMiddleware({ recorder: provisioningRecorder }));

  return {
    app,
    sweepStaleProvisioningRuns,
  };
};

export const createApp = (input: CreateAppInput = {}): Express => {
  return createAppRuntime(input).app;
};
