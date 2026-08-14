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
import { createCreateAssignmentUseCase } from '../features/hr-employees/application/create-assignment';
import { createCreateEmployeeUseCase } from '../features/hr-employees/application/create-employee';
import { createCreatePositionUseCase } from '../features/hr-employees/application/create-position';
import { createGetEmployeeUseCase } from '../features/hr-employees/application/get-employee';
import { createListEmployeesUseCase } from '../features/hr-employees/application/list-employees';
import { createListAssignmentHistoryUseCase } from '../features/hr-employees/application/list-assignment-history';
import { createUpdateEmployeeUseCase } from '../features/hr-employees/application/update-employee';
import { createResolveDirectReportsUseCase } from '../features/hr-employees/application/resolve-direct-reports';
import { createResolveReportingLineUseCase } from '../features/hr-employees/application/resolve-reporting-line';
import type { HrEmployeesGateway } from '../features/hr-employees/domain/employees';
import { createDrizzleHrEmployeesGateway } from '../features/hr-employees/infrastructure/drizzle-hr-employees.gateway';
import { createHrEmployeesRouter } from '../features/hr-employees/presentation/hr-employees.router';
import { createAcceptErpAccessInvitationUseCase } from '../features/hr-erp-access/application/accept-erp-access-invitation';
import { createCreateErpAccessInvitationUseCase } from '../features/hr-erp-access/application/create-erp-access-invitation';
import { createListErpAccessInvitationsUseCase } from '../features/hr-erp-access/application/list-erp-access-invitations';
import { createRevokeErpAccessInvitationUseCase } from '../features/hr-erp-access/application/revoke-erp-access-invitation';
import type { ErpAccessGateway } from '../features/hr-erp-access/domain/erp-access-invitations';
import { createDrizzleErpAccessGateway } from '../features/hr-erp-access/infrastructure/drizzle-erp-access.gateway';
import { createHrErpAccessRouter } from '../features/hr-erp-access/presentation/hr-erp-access.router';
import { createCreateApprovalPolicyUseCase } from '../features/approval-policy/application/create-approval-policy';
import { createDeactivateApprovalPolicyUseCase } from '../features/approval-policy/application/deactivate-approval-policy';
import { createGetApprovalPolicyUseCase } from '../features/approval-policy/application/get-approval-policy';
import { createListApprovalPoliciesUseCase } from '../features/approval-policy/application/list-approval-policies';
import { createUpdateApprovalPolicyUseCase } from '../features/approval-policy/application/update-approval-policy';
import type { ApprovalPolicyGateway } from '../features/approval-policy/domain/approval-policy';
import { createDrizzleApprovalPolicyGateway } from '../features/approval-policy/infrastructure/drizzle-approval-policy.gateway';
import { createApprovalPolicyRouter } from '../features/approval-policy/presentation/approval-policy.router';
import { createAcceptNodeManagementInvitationUseCase } from '../features/node-management/application/accept-node-management-invitation';
import { createCreateNodeManagementInvitationUseCase } from '../features/node-management/application/create-node-management-invitation';
import { createGetNodeManagementInvitationUseCase } from '../features/node-management/application/get-node-management-invitation';
import { createGetNodeResponsibilityStateUseCase } from '../features/node-management/application/get-node-responsibility-state';
import { createListNodeManagementPendingInvitationsUseCase } from '../features/node-management/application/list-node-management-pending-invitations';
import { createListNodeResponsibilitiesUseCase } from '../features/node-management/application/list-node-responsibilities';
import type { NodeManagementGateway } from '../features/node-management/domain/node-management';
import { createDrizzleNodeManagementGateway } from '../features/node-management/infrastructure/drizzle-node-management.gateway';
import {
  createNoopNodeManagementInvitationEmailSender,
  createResendNodeManagementInvitationEmailSender,
} from '../features/node-management/infrastructure/resend-node-management-invitation-email-sender';
import { createNodeManagementRouter } from '../features/node-management/presentation/node-management.router';
import { createComputeEffectivePermissionsUseCase } from '../features/roles-management/application/compute-effective-permissions';
import { createEvaluateReportingLineScopes } from '../features/roles-management/application/evaluate-reporting-line-scopes';
import type { PermissionScope } from '../features/roles-management/domain/assignments';
import {
  createRequireHrCapability,
} from '../features/roles-management/presentation/require-hr-capability';
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
import { createDrizzleAssignmentsGateway } from '../features/roles-management/infrastructure/drizzle-assignments.gateway';
import { createDrizzleRolesGateway } from '../features/roles-management/infrastructure/drizzle-roles.gateway';
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

type ComputeEffectivePermissions = (input: {
  companyId: string;
  userId: string;
  currentContext: ScopeRef;
  permissionScope?: PermissionScope;
}) => Promise<string[]>;

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
  hrEmployeesGateway?: HrEmployeesGateway;
  hrErpAccessGateway?: ErpAccessGateway;
  approvalPolicyGateway?: ApprovalPolicyGateway;
  nodeManagementGateway?: NodeManagementGateway;
  scopeResolver?: ScopeResolver;
  computeEffectivePermissions?: ComputeEffectivePermissions;
  nodeEnv?: 'development' | 'test' | 'production';
  seedAdminEnabled?: boolean;
  sessionCookieName?: string;
  provisioningStaleTimeoutMs?: number;
  appBaseUrl?: string;
  resendApiKey?: string;
  resendFromEmail?: string;
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
  const roleAssignmentsGateway = createDrizzleAssignmentsGateway(db);
  const rolesGateway = createDrizzleRolesGateway(db);
  const nodeEnv = input.nodeEnv ?? 'development';
  const seedAdminEnabled = nodeEnv !== 'production' && (input.seedAdminEnabled ?? false);
  const sessionCookieName = input.sessionCookieName ?? 'vimcore_session';
  const requestMetrics = createRequestMetrics();
  const logger = createLogger(nodeEnv !== 'test');
  const orgTreeGateway =
    input.orgTreeGateway ?? createDrizzleOrgTreeGateway({ scopeResolver });
  const orgHierarchyGateway =
    input.orgHierarchyGateway ?? createDrizzleOrgHierarchyGateway(db, { logger });
  const hrEmployeesGateway =
    input.hrEmployeesGateway ?? createDrizzleHrEmployeesGateway(db);
  const hrErpAccessGateway =
    input.hrErpAccessGateway ?? createDrizzleErpAccessGateway(db);
  const approvalPolicyGateway =
    input.approvalPolicyGateway ?? createDrizzleApprovalPolicyGateway(db);
  const computeEffectivePermissions =
    input.computeEffectivePermissions ??
    createComputeEffectivePermissionsUseCase({
      rolesGateway,
      assignmentsGateway: roleAssignmentsGateway,
      evaluateReportingLineScopes: createEvaluateReportingLineScopes({
        hrEmployeesGateway,
        erpAccessGateway: hrErpAccessGateway,
      }),
      scopeHierarchyGateway: {
        assertScopeRefBelongsToCompany: async () => undefined,
        getScopeLineage: scopeResolver.getLineage,
      },
    });
  const nodeManagementGateway =
    input.nodeManagementGateway ?? createDrizzleNodeManagementGateway(db);
  const rawInvitationEmailSender =
    input.resendApiKey && input.resendFromEmail
      ? createResendNodeManagementInvitationEmailSender({
          apiKey: input.resendApiKey,
          fromEmail: input.resendFromEmail,
        })
      : createNoopNodeManagementInvitationEmailSender();
  const invitationEmailMode =
    input.resendApiKey && input.resendFromEmail ? 'resend' : 'noop';
  const invitationEmailSender = {
    sendInvitationEmail: async (emailInput: Parameters<typeof rawInvitationEmailSender.sendInvitationEmail>[0]) => {
      logger.info(
        {
          invitationId: emailInput.invitationId,
          inviteeEmail: emailInput.inviteeEmail,
          mode: invitationEmailMode,
          scopeType: emailInput.scopeType,
        },
        'Node management invitation email delivery attempt started',
      );

      try {
        const delivery = await rawInvitationEmailSender.sendInvitationEmail(emailInput);

        logger.info(
          {
            invitationId: emailInput.invitationId,
            inviteeEmail: emailInput.inviteeEmail,
            mode: invitationEmailMode,
            status: delivery.status,
            message: delivery.message,
          },
          'Node management invitation email delivery finished',
        );

        return delivery;
      } catch (error) {
        logger.error(
          {
            invitationId: emailInput.invitationId,
            inviteeEmail: emailInput.inviteeEmail,
            mode: invitationEmailMode,
            err: error,
          },
          'Node management invitation email delivery crashed',
        );

        throw error;
      }
    },
  };
  logger.info(
    {
      mode: invitationEmailMode,
      configured: invitationEmailMode === 'resend',
      hasResendApiKey: Boolean(input.resendApiKey),
      hasResendFromEmail: Boolean(input.resendFromEmail),
    },
    invitationEmailMode === 'resend'
      ? 'Node management invitation email delivery configured'
      : 'Node management invitation email delivery running in noop mode',
  );
  const appBaseUrl = input.appBaseUrl ?? 'http://127.0.0.1:5173';
  const resolveAuthSession = createResolveAuthSession({
    authIdentityGateway,
    scopeResolver,
    computeEffectivePermissions,
    seedAdminSessions,
    seedAdminEnabled,
  });
  const requireAuth = createRequireAuth(resolveAuthSession, sessionCookieName);
  const requireHrCapability = createRequireHrCapability({
    computeEffectivePermissions,
  });
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
  app.use(
    createApprovalPolicyRouter({
      requireAuth,
      requireHrCapability,
      createApprovalPolicy: createCreateApprovalPolicyUseCase({
        gateway: approvalPolicyGateway,
      }),
      listApprovalPolicies: createListApprovalPoliciesUseCase({
        gateway: approvalPolicyGateway,
      }),
      getApprovalPolicy: createGetApprovalPolicyUseCase({
        gateway: approvalPolicyGateway,
      }),
      updateApprovalPolicy: createUpdateApprovalPolicyUseCase({
        gateway: approvalPolicyGateway,
      }),
      deactivateApprovalPolicy: createDeactivateApprovalPolicyUseCase({
        gateway: approvalPolicyGateway,
      }),
    }),
  );
  app.use(
    createHrEmployeesRouter({
      requireAuth,
      requireHrCapability,
      createEmployee: createCreateEmployeeUseCase({ gateway: hrEmployeesGateway }),
      updateEmployee: (companyId, employeeId, input) =>
        createUpdateEmployeeUseCase({ gateway: hrEmployeesGateway })({
          companyId,
          employeeId,
          ...input,
        }),
      listEmployees: createListEmployeesUseCase({ gateway: hrEmployeesGateway }),
      getEmployee: createGetEmployeeUseCase({ gateway: hrEmployeesGateway }),
      createPosition: createCreatePositionUseCase({ gateway: hrEmployeesGateway }),
      listPositions: async ({ companyId }) =>
        await hrEmployeesGateway.listPositions(companyId),
      createAssignment: createCreateAssignmentUseCase({ gateway: hrEmployeesGateway }),
      listAssignmentHistory: createListAssignmentHistoryUseCase({ gateway: hrEmployeesGateway }),
      resolveReportingLine: createResolveReportingLineUseCase({ gateway: hrEmployeesGateway }),
      resolveDirectReports: createResolveDirectReportsUseCase({ gateway: hrEmployeesGateway }),
    }),
  );
  app.use(
    createHrErpAccessRouter({
      requireAuth,
      requireHrCapability,
      createInvitation: createCreateErpAccessInvitationUseCase({
        gateway: hrErpAccessGateway,
      }),
      listInvitations: createListErpAccessInvitationsUseCase({
        gateway: hrErpAccessGateway,
      }),
      acceptInvitation: createAcceptErpAccessInvitationUseCase({
        gateway: hrErpAccessGateway,
        passwordHasher,
        sessionTokenService,
      }),
      revokeAccess: createRevokeErpAccessInvitationUseCase({
        gateway: hrErpAccessGateway,
      }),
      sessionCookieName,
      secureCookies: nodeEnv === 'production',
    }),
  );
  app.use(
    createNodeManagementRouter({
      requireAuth,
      createInvitation: createCreateNodeManagementInvitationUseCase({
        gateway: nodeManagementGateway,
        emailSender: invitationEmailSender,
        buildInvitationLink: (token) => `${appBaseUrl}/accept-invitation/${token}`,
        onEmailDeliveryFailure: ({ invitationId, inviteeEmail, errorMessage }) => {
          logger.error(
            { invitationId, inviteeEmail, err: errorMessage },
            'Node management invitation email delivery failed',
          );
        },
      }),
      listResponsibilities: createListNodeResponsibilitiesUseCase({
        gateway: nodeManagementGateway,
      }),
      listPendingInvitations: createListNodeManagementPendingInvitationsUseCase({
        gateway: nodeManagementGateway,
      }),
      getResponsibilityState: createGetNodeResponsibilityStateUseCase({
        gateway: nodeManagementGateway,
      }),
      getInvitation: createGetNodeManagementInvitationUseCase({
        gateway: nodeManagementGateway,
      }),
      acceptInvitation: createAcceptNodeManagementInvitationUseCase({
        gateway: nodeManagementGateway,
        passwordHasher,
        sessionTokenService,
      }),
      sessionCookieName,
      secureCookies: nodeEnv === 'production',
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
