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
import { createUpdateThemePreference } from '../features/companies/application/update-theme-preference';
import type { CompanyOnboardingGateway } from '../features/companies/domain/company';
import { createDrizzleCompanyOnboardingGateway } from '../features/companies/infrastructure/drizzle-company.gateway';
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
import { errorMiddleware } from '../shared/presentation/error.middleware';
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
  adminGateway?: AdminGateway;
  nodeEnv?: 'development' | 'test' | 'production';
  seedAdminEnabled?: boolean;
  sessionCookieName?: string;
};

export const createApp = (input: CreateAppInput = {}): Express => {
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
      createCompany: createCreateCompany(companyOnboardingGateway),
      getThemePreference: createGetThemePreference(companyOnboardingGateway),
      updateThemePreference: createUpdateThemePreference(companyOnboardingGateway),
    }),
  );
  app.use(errorMiddleware);

  return app;
};
