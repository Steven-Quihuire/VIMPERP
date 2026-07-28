import express, { type Express } from 'express';

import {
  createGetCompanySummary,
} from '../features/admin/application/get-company-summary';
import { createListAdminNotifications } from '../features/admin/application/list-admin-notifications';
import type { AdminGateway } from '../features/admin/domain/admin';
import { createDrizzleAdminGateway } from '../features/admin/infrastructure/drizzle-admin.gateway';
import { createAdminRouter } from '../features/admin/presentation/admin.router';
import { createCreateCompany } from '../features/companies/application/create-company';
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
import { createResolveAuthSession } from '../features/identity/application/resolve-auth-session';
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
  nodeEnv?: 'development' | 'test' | 'production';
  seedAdminEnabled?: boolean;
  sessionCookieName?: string;
  provisioningStaleTimeoutMs?: number;
};

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
      getThemePreference: createGetThemePreference(companyOnboardingGateway),
      updateThemePreference: createUpdateThemePreference(companyOnboardingGateway),
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
