import express, { type Express, type RequestHandler } from 'express';
import { z } from 'zod';

import { createGetApplicationErrorDetail } from '../features/admin/application/get-application-error-detail';
import { createGetAuditEventDetail } from '../features/admin/application/get-audit-event-detail';
import { createGetCompanySummary } from '../features/admin/application/get-company-summary';
import { createGetProvisioningRunDetail } from '../features/admin/application/get-provisioning-run-detail';
import { createListApplicationErrors } from '../features/admin/application/list-application-errors';
import { createListAdminNotifications } from '../features/admin/application/list-admin-notifications';
import { createListCompanyNotifications } from '../features/admin/application/list-company-notifications';
import { createListAuditEvents } from '../features/admin/application/list-audit-events';
import { createListProvisioningRuns } from '../features/admin/application/list-provisioning-runs';
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
  AuthSession,
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
import { createDeleteEmployeeUseCase } from '../features/hr-employees/application/delete-employee';
import { createCreatePositionUseCase } from '../features/hr-employees/application/create-position';
import { createGetEmployeeUseCase } from '../features/hr-employees/application/get-employee';
import { createListEmployeesUseCase } from '../features/hr-employees/application/list-employees';
import { createListAssignmentHistoryUseCase } from '../features/hr-employees/application/list-assignment-history';
import { createListAssignmentsUseCase } from '../features/hr-employees/application/list-assignments';
import { createUpdateEmployeeUseCase } from '../features/hr-employees/application/update-employee';
import { createResolveDirectReportsUseCase } from '../features/hr-employees/application/resolve-direct-reports';
import { createResolveReportingLineUseCase } from '../features/hr-employees/application/resolve-reporting-line';
import type { HrEmployeesGateway } from '../features/hr-employees/domain/employees';
import { createDrizzleHrEmployeesGateway } from '../features/hr-employees/infrastructure/drizzle-hr-employees.gateway';
import { createHrEmployeesRouter } from '../features/hr-employees/presentation/hr-employees.router';
import { createAcceptErpAccessInvitationUseCase } from '../features/hr-erp-access/application/accept-erp-access-invitation';
import { createCreateErpAccessInvitationUseCase } from '../features/hr-erp-access/application/create-erp-access-invitation';
import { createListErpAccessInvitationsPageUseCase } from '../features/hr-erp-access/application/list-erp-access-invitations-page';
import { createRevokeErpAccessInvitationUseCase } from '../features/hr-erp-access/application/revoke-erp-access-invitation';
import type { ErpAccessGateway } from '../features/hr-erp-access/domain/erp-access-invitations';
import { createDrizzleErpAccessGateway } from '../features/hr-erp-access/infrastructure/drizzle-erp-access.gateway';
import { createHrErpAccessRouter } from '../features/hr-erp-access/presentation/hr-erp-access.router';
import { createDrizzleHrResponsibilityGateway } from '../features/hr-responsibility/infrastructure/drizzle-hr-responsibility.gateway';
import { createAssignHrResponsible } from '../features/hr-responsibility/application/assign-hr-responsible';
import { createGetHrResponsibilityState } from '../features/hr-responsibility/application/get-hr-responsibility-state';
import type { HrResponsibilityGateway } from '../features/hr-responsibility/domain/hr-responsibility';
import { createHrResponsibilityRouter } from '../features/hr-responsibility/presentation/hr-responsibility.router';
import { createAcceptHrResponsibilityInvitation } from '../features/hr-responsibility/application/accept-hr-responsibility-invitation';
import { createHrResponsibilityInvitation } from '../features/hr-responsibility/application/create-hr-responsibility-invitation';
import { createGetHrResponsibilityInvitation } from '../features/hr-responsibility/application/get-hr-responsibility-invitation';
import { createListHrResponsibilityInvitations } from '../features/hr-responsibility/application/list-hr-responsibility-invitations';
import { createCreateApprovalPolicyUseCase } from '../features/approval-policy/application/create-approval-policy';
import { createDeactivateApprovalPolicyUseCase } from '../features/approval-policy/application/deactivate-approval-policy';
import { createGetApprovalPolicyUseCase } from '../features/approval-policy/application/get-approval-policy';
import { createListApprovalPoliciesUseCase } from '../features/approval-policy/application/list-approval-policies';
import { createUpdateApprovalPolicyUseCase } from '../features/approval-policy/application/update-approval-policy';
import type { ApprovalPolicyGateway } from '../features/approval-policy/domain/approval-policy';
import { createDrizzleApprovalPolicyGateway } from '../features/approval-policy/infrastructure/drizzle-approval-policy.gateway';
import { createApprovalPolicyRouter } from '../features/approval-policy/presentation/approval-policy.router';
import { createApprovePeriodUseCase } from '../features/hr-timesheets/application/approve-period';
import type { ApprovalPolicyGateway as TimesheetApprovalPolicyGateway } from '../features/hr-timesheets/application/approval-policy.gateway';
import { createCreatePeriodUseCase } from '../features/hr-timesheets/application/create-period';
import { createGetPeriodUseCase } from '../features/hr-timesheets/application/get-period';
import { createListEntriesUseCase } from '../features/hr-timesheets/application/list-entries';
import { createListPeriodsUseCase } from '../features/hr-timesheets/application/list-periods';
import { createPatchPeriodUseCase } from '../features/hr-timesheets/application/patch-period';
import { createRejectPeriodUseCase } from '../features/hr-timesheets/application/reject-period';
import { createReopenPeriodUseCase } from '../features/hr-timesheets/application/reopen-period';
import { createSubmitPeriodUseCase } from '../features/hr-timesheets/application/submit-period';
import { createAddEntryUseCase } from '../features/hr-timesheets/application/entries/add-entry';
import { createRemoveEntryUseCase } from '../features/hr-timesheets/application/entries/remove-entry';
import { createUpdateEntryUseCase } from '../features/hr-timesheets/application/entries/update-entry';
import {
  TimesheetAssignmentNotFoundError,
  TimesheetPeriodNotFoundError,
  type TimesheetGateway,
} from '../features/hr-timesheets/domain/timesheets';
import { createDrizzleTimesheetsGateway } from '../features/hr-timesheets/infrastructure/drizzle-timesheets.gateway';
import { createTimesheetsRouter } from '../features/hr-timesheets/presentation/timesheets.router';
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
import {
  createNoopInvitationEmailSender,
  createResendInvitationEmailSender,
} from '../shared/infrastructure/resend-invitation-email-sender';
import { createComputeEffectivePermissionsUseCase } from '../features/roles-management/application/compute-effective-permissions';
import { createEvaluateReportingLineScopes } from '../features/roles-management/application/evaluate-reporting-line-scopes';
import type { PermissionScope } from '../features/roles-management/domain/assignments';
import { createRequireHrCapability } from '../features/roles-management/presentation/require-hr-capability';
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
import type {
  ScopeRef,
  ScopeResolver,
} from '../shared/infrastructure/scope-hierarchy/scope-hierarchy.port';
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
  hrResponsibilityGateway?: HrResponsibilityGateway;
  approvalPolicyGateway?: ApprovalPolicyGateway;
  timesheetGateway?: TimesheetGateway;
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
const nonEmptyPathParamSchema = z.string().trim().min(1);

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
  const seedAdminEnabled =
    nodeEnv !== 'production' && (input.seedAdminEnabled ?? false);
  const sessionCookieName = input.sessionCookieName ?? 'vimcore_session';
  const requestMetrics = createRequestMetrics();
  const logger = createLogger(nodeEnv !== 'test');
  const orgTreeGateway =
    input.orgTreeGateway ?? createDrizzleOrgTreeGateway({ scopeResolver });
  const orgHierarchyGateway =
    input.orgHierarchyGateway ??
    createDrizzleOrgHierarchyGateway(db, { logger });
  const hrEmployeesGateway =
    input.hrEmployeesGateway ?? createDrizzleHrEmployeesGateway(db);
  const hrErpAccessGateway =
    input.hrErpAccessGateway ?? createDrizzleErpAccessGateway(db);
  const hrResponsibilityGateway =
    input.hrResponsibilityGateway ?? createDrizzleHrResponsibilityGateway(db);
  const approvalPolicyGateway =
    input.approvalPolicyGateway ?? createDrizzleApprovalPolicyGateway(db);
  const timesheetGateway =
    input.timesheetGateway ?? createDrizzleTimesheetsGateway(db);
  const timesheetApprovalPolicyGateway: TimesheetApprovalPolicyGateway = {
    findActivePolicyForScope: async (companyId, scopeNodeId) => {
      const policies = await approvalPolicyGateway.listApprovalPolicies(companyId);
      const activePolicy = policies.find(
        (policy) => policy.isActive && policy.scopeNodeId === scopeNodeId,
      );

      return activePolicy ? { id: activePolicy.id } : null;
    },
  };
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
        assertScopeRefBelongsToCompany: () => Promise.resolve(undefined),
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
    sendInvitationEmail: async (
      emailInput: Parameters<
        typeof rawInvitationEmailSender.sendInvitationEmail
      >[0],
    ) => {
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
        const delivery =
          await rawInvitationEmailSender.sendInvitationEmail(emailInput);

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
  const rawHrInvitationEmailSender =
    input.resendApiKey && input.resendFromEmail
      ? createResendInvitationEmailSender({
          apiKey: input.resendApiKey,
          fromEmail: input.resendFromEmail,
        })
      : createNoopInvitationEmailSender();
  const hrInvitationEmailSender = {
    sendInvitationEmail: async (
      emailInput: Parameters<
        typeof rawHrInvitationEmailSender.sendInvitationEmail
      >[0],
    ) => {
      logger.info(
        {
          invitationId: emailInput.invitationId,
          inviteeEmail: emailInput.inviteeEmail,
          mode: invitationEmailMode,
        },
        'HR responsibility invitation email delivery attempt started',
      );
      const delivery =
        await rawHrInvitationEmailSender.sendInvitationEmail(emailInput);
      logger.info(
        {
          invitationId: emailInput.invitationId,
          inviteeEmail: emailInput.inviteeEmail,
          mode: invitationEmailMode,
          status: delivery.status,
        },
        'HR responsibility invitation email delivery finished',
      );
      return delivery;
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
  const getActiveScope = (auth: AuthSession): ScopeRef =>
    auth.activeScope ?? {
      scopeType: 'company',
      scopeId: auth.activeCompany!.companyId,
    };
  const assertScopeVisible = async (
    auth: AuthSession,
    companyId: string,
    scope: ScopeRef,
  ) => {
    const activeScope = getActiveScope(auth);
    const lineage = await scopeResolver.getLineage(companyId, scope);
    if (
      !lineage.some(
        (entry) =>
          entry.scopeType === activeScope.scopeType &&
          entry.scopeId === activeScope.scopeId,
      )
    ) {
      throw new ForbiddenError();
    }
  };
  const parseEmployeeParams = (request: Parameters<RequestHandler>[0]) => ({
    companyId: String(request.params.companyId),
    employeeId: String(request.params.employeeId),
  });
  const resolveEmployeePermissionScope = async ({
    request,
    auth,
  }: {
    request: Parameters<RequestHandler>[0];
    response: Parameters<RequestHandler>[1];
    auth: AuthSession;
  }): Promise<PermissionScope | undefined> => {
    const { companyId, employeeId } = parseEmployeeParams(request);
    const body = (request.body ?? {}) as { scopeNodeId?: unknown };
    if (typeof body.scopeNodeId === 'string') {
      const requestedNode = await hrEmployeesGateway.findScopeNode(
        companyId,
        body.scopeNodeId,
      );
      if (!requestedNode) {
        throw new ForbiddenError();
      }
      const requestedScope: ScopeRef = {
        scopeType: requestedNode.nodeType,
        scopeId: requestedNode.sourceId,
      };
      await assertScopeVisible(auth, companyId, requestedScope);
      return { kind: 'node+descendants', scope: requestedScope };
    }
    const assignment =
      await hrEmployeesGateway.getActivePrimaryAssignmentByEmployeeId(
        companyId,
        employeeId,
      );
    if (!assignment) {
      if (auth.activeScope && auth.activeScope.scopeType !== 'company') {
        throw new ForbiddenError();
      }
      return undefined;
    }
    const scopeNode = await hrEmployeesGateway.findScopeNode(
      companyId,
      assignment.scopeNodeId,
    );
    if (!scopeNode) {
      throw new ForbiddenError();
    }
    const employeeScope: ScopeRef = {
      scopeType: scopeNode.nodeType,
      scopeId: scopeNode.sourceId,
    };
    await assertScopeVisible(auth, companyId, employeeScope);

    let activeLink: Awaited<
      ReturnType<ErpAccessGateway['getActiveLinkByUserId']>
    > = null;
    try {
      activeLink = await hrErpAccessGateway.getActiveLinkByUserId(
        companyId,
        auth.user.id,
      );
    } catch {
      // A custom HR gateway can be used without provisioning ERP storage.
    }
    if (activeLink?.employeeId === employeeId) {
      return { kind: 'self' };
    }
    if (activeLink) {
      const actorAssignment =
        await hrEmployeesGateway.getActivePrimaryAssignmentByEmployeeId(
          companyId,
          activeLink.employeeId,
        );
      if (actorAssignment) {
        const directReports =
          await hrEmployeesGateway.listDirectReportAssignments(
            companyId,
            actorAssignment.positionId,
          );
        if (directReports.some((report) => report.employeeId === employeeId)) {
          return { kind: 'direct_reports' };
        }
      }
    }
    return { kind: 'node+descendants', scope: employeeScope };
  };
  const resolveApprovalPolicyPermissionScope = async ({
    request,
    auth,
  }: {
    request: Parameters<RequestHandler>[0];
    response: Parameters<RequestHandler>[1];
    auth: AuthSession;
  }): Promise<PermissionScope | undefined> => {
    const companyId = String(request.params.companyId);
    const body = (request.body ?? {}) as { scopeNodeId?: unknown };
    const scopeNodeId =
      typeof body.scopeNodeId === 'string'
        ? body.scopeNodeId
        : request.params.policyId
          ? (
              await approvalPolicyGateway.getApprovalPolicyById(
                companyId,
                String(request.params.policyId),
              )
            )?.scopeNodeId
          : null;
    if (!scopeNodeId) {
      return undefined;
    }
    const scopeNode = await approvalPolicyGateway.findScopeNode(
      companyId,
      scopeNodeId,
    );
    if (!scopeNode) {
      throw new ForbiddenError();
    }
    const scope: ScopeRef = {
      scopeType: scopeNode.scopeType,
      scopeId: scopeNode.sourceId,
    };
    await assertScopeVisible(auth, companyId, scope);
    return { kind: 'node+descendants', scope };
  };
  const listEmployees = createListEmployeesUseCase({
    gateway: hrEmployeesGateway,
  });
  const listVisibleEmployees = async ({
    companyId,
    auth,
    filters,
  }: {
    companyId: string;
    auth: AuthSession;
    filters?: {
      page: number;
      pageSize: number;
      search?: string | undefined;
      status?: 'active' | 'suspended' | 'separated' | undefined;
    };
  }) => {
    if (filters && hrEmployeesGateway.listEmployeesPage) {
      const page = await hrEmployeesGateway.listEmployeesPage(
        companyId,
        filters,
      );
      const activeScope = getActiveScope(auth);
      if (activeScope.scopeType === 'company') {
        return page;
      }
    }
    const employees = await listEmployees({ companyId });
    const activeScope = getActiveScope(auth);
    const visibleEmployees = (
      await Promise.all(
        employees.map(async (employee) => {
          const assignment =
            await hrEmployeesGateway.getActivePrimaryAssignmentByEmployeeId(
              companyId,
              employee.id,
            );
          if (!assignment)
            return activeScope.scopeType === 'company' ? employee : null;
          const node = await hrEmployeesGateway.findScopeNode(
            companyId,
            assignment.scopeNodeId,
          );
          if (!node) return null;
          const lineage = await scopeResolver.getLineage(companyId, {
            scopeType: node.nodeType,
            scopeId: node.sourceId,
          });
          return lineage.some(
            (entry) =>
              entry.scopeType === activeScope.scopeType &&
              entry.scopeId === activeScope.scopeId,
          )
            ? employee
            : null;
        }),
      )
    ).filter(
      (employee): employee is NonNullable<typeof employee> => employee !== null,
    );
    if (!filters) return visibleEmployees;

    const normalizedSearch = filters.search?.trim().toLowerCase();
    const filteredVisibleEmployees = visibleEmployees.filter((employee) => {
      const matchesStatus =
        !filters.status || employee.employmentStatus === filters.status;
      const searchableText = [
        employee.fullName,
        employee.id,
        employee.email ?? '',
        employee.documentNumber ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return (
        matchesStatus &&
        (!normalizedSearch || searchableText.includes(normalizedSearch))
      );
    });
    const first = (filters.page - 1) * filters.pageSize;
    return {
      items: filteredVisibleEmployees.slice(first, first + filters.pageSize),
      total: filteredVisibleEmployees.length,
      page: filters.page,
      pageSize: filters.pageSize,
    };
  };
  const listPositions = async ({
    companyId,
    auth,
  }: {
    companyId: string;
    auth: AuthSession;
  }) => {
    const positions = await hrEmployeesGateway.listPositions(companyId);
    const activeScope = getActiveScope(auth);
    if (activeScope.scopeType === 'company') {
      return positions;
    }

    return (
      await Promise.all(
        positions.map(async (position) => {
          const assignment =
            await hrEmployeesGateway.getActivePrimaryAssignmentByPositionId(
              companyId,
              position.id,
            );
          if (!assignment) return null;
          const node = await hrEmployeesGateway.findScopeNode(
            companyId,
            assignment.scopeNodeId,
          );
          if (!node) return null;
          const lineage = await scopeResolver.getLineage(companyId, {
            scopeType: node.nodeType,
            scopeId: node.sourceId,
          });
          return lineage.some(
            (entry) =>
              entry.scopeType === activeScope.scopeType &&
              entry.scopeId === activeScope.scopeId,
          )
            ? position
            : null;
        }),
      )
    ).filter(
      (position): position is NonNullable<typeof position> => position !== null,
    );
  };
  const listApprovalPolicies = createListApprovalPoliciesUseCase({
    gateway: approvalPolicyGateway,
  });
  const listVisibleApprovalPolicies = async ({
    companyId,
    auth,
    filters,
  }: {
    companyId: string;
    auth: AuthSession;
    filters?: {
      page: number;
      pageSize: number;
      search?: string | undefined;
    };
  }) => {
    const policies = await listApprovalPolicies(companyId);
    const activeScope = getActiveScope(auth);
    const visiblePolicies = (
      await Promise.all(
        policies.map(async (policy) => {
          if (!policy.scopeNodeId) return policy;
          const node = await approvalPolicyGateway.findScopeNode(
            companyId,
            policy.scopeNodeId,
          );
          if (!node) return null;
          const lineage = await scopeResolver.getLineage(companyId, {
            scopeType: node.scopeType,
            scopeId: node.sourceId,
          });
          return lineage.some(
            (entry) =>
              entry.scopeType === activeScope.scopeType &&
              entry.scopeId === activeScope.scopeId,
          )
            ? policy
            : null;
        }),
      )
    ).filter((policy): policy is NonNullable<typeof policy> => policy !== null);

    if (!filters) {
      return visiblePolicies;
    }

    const normalizedSearch = filters.search?.trim().toLowerCase();
    const filtered = normalizedSearch
      ? visiblePolicies.filter(
          (policy) =>
            policy.name.toLowerCase().includes(normalizedSearch) ||
            policy.id.toLowerCase().includes(normalizedSearch),
        )
      : visiblePolicies;
    const first = (filters.page - 1) * filters.pageSize;

    return {
      items: filtered.slice(first, first + filters.pageSize),
      total: filtered.length,
      page: filters.page,
      pageSize: filters.pageSize,
    };
  };
  const getActorTimesheetContext = async ({
    companyId,
    auth,
  }: {
    companyId: string;
    auth: AuthSession;
  }) => {
    const activeLink = await hrErpAccessGateway.getActiveLinkByUserId(
      companyId,
      auth.user.id,
    );

    if (!activeLink) {
      return {
        actorAssignment: null,
        actorEmployeeId: null,
        directReportEmployeeIds: [] as string[],
      };
    }

    const actorAssignment =
      await hrEmployeesGateway.getActivePrimaryAssignmentByEmployeeId(
        companyId,
        activeLink.employeeId,
      );
    const directReportEmployeeIds = actorAssignment
      ? (
          await hrEmployeesGateway.listDirectReportAssignments(
            companyId,
            actorAssignment.positionId,
          )
        ).map((assignment) => assignment.employeeId)
      : [];

    return {
      actorAssignment,
      actorEmployeeId: activeLink.employeeId,
      directReportEmployeeIds,
    };
  };
  const listVisibleTimesheetEmployeeIds = async ({
    companyId,
    auth,
  }: {
    companyId: string;
    auth: AuthSession;
  }) => {
    const context = await getActorTimesheetContext({ companyId, auth });

    if (!context.actorEmployeeId) {
      return [];
    }

    return [
      ...new Set([context.actorEmployeeId, ...context.directReportEmployeeIds]),
    ];
  };
  const resolveTimesheetPermissionScope = async ({
    request,
    auth,
  }: {
    request: Parameters<RequestHandler>[0];
    response: Parameters<RequestHandler>[1];
    auth: AuthSession;
  }): Promise<PermissionScope | undefined> => {
    const companyId = nonEmptyPathParamSchema.parse(request.params.companyId);
    const periodId =
      typeof request.params.periodId === 'string'
        ? nonEmptyPathParamSchema.parse(request.params.periodId)
        : null;
    const body = (request.body ?? {}) as { employeeAssignmentId?: unknown };
    const context = await getActorTimesheetContext({ companyId, auth });
    const isPeriodRoute = periodId !== null;

    let targetEmployeeId: string | null = null;

    if (typeof body.employeeAssignmentId === 'string') {
      const assignment = await timesheetGateway.findActiveAssignment(
        companyId,
        body.employeeAssignmentId,
      );

      if (!assignment) {
        throw new TimesheetAssignmentNotFoundError();
      }

      targetEmployeeId = assignment.employeeId;
    } else if (isPeriodRoute) {
      const period = await timesheetGateway.getPeriod(
        companyId,
        periodId,
      );

      if (!period) {
        throw new TimesheetPeriodNotFoundError();
      }

      const assignment = await timesheetGateway.findActiveAssignment(
        companyId,
        period.employeeAssignmentId,
      );

      if (!assignment) {
        throw new TimesheetPeriodNotFoundError();
      }

      targetEmployeeId = assignment.employeeId;
    }

    if (!targetEmployeeId) {
      return context.directReportEmployeeIds.length > 0
        ? { kind: 'direct_reports' }
        : { kind: 'self' };
    }

    if (context.actorEmployeeId === targetEmployeeId) {
      return { kind: 'self' };
    }

    if (context.directReportEmployeeIds.includes(targetEmployeeId)) {
      return { kind: 'direct_reports' };
    }

    if (isPeriodRoute) {
      throw new TimesheetPeriodNotFoundError();
    }

    throw new TimesheetAssignmentNotFoundError();
  };
  const createPeriod = createCreatePeriodUseCase({ gateway: timesheetGateway });
  const listPeriods = createListPeriodsUseCase({ gateway: timesheetGateway });
  const getPeriod = createGetPeriodUseCase({ gateway: timesheetGateway });
  const listEntries = createListEntriesUseCase({ gateway: timesheetGateway });
  const patchPeriod = createPatchPeriodUseCase({ gateway: timesheetGateway });
  const addEntry = createAddEntryUseCase({ gateway: timesheetGateway });
  const updateEntry = createUpdateEntryUseCase({ gateway: timesheetGateway });
  const removeEntry = createRemoveEntryUseCase({ gateway: timesheetGateway });
  const submitPeriod = createSubmitPeriodUseCase({
    gateway: timesheetGateway,
    approvalPolicyGateway: timesheetApprovalPolicyGateway,
  });
  const approvePeriod = createApprovePeriodUseCase({ gateway: timesheetGateway });
  const rejectPeriod = createRejectPeriodUseCase({ gateway: timesheetGateway });
  const reopenPeriod = createReopenPeriodUseCase({ gateway: timesheetGateway });
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

    const switchCount =
      await authIdentityGateway.countRecentActiveCompanySwitches(
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
      getCurrentCompanySummary: createGetCurrentCompanySummary(
        companyOnboardingGateway,
      ),
      getThemePreference: createGetThemePreference(companyOnboardingGateway),
      switchActiveCompany,
      updateThemePreference: createUpdateThemePreference(
        companyOnboardingGateway,
      ),
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
      createDivision: createCreateDivisionUseCase({
        gateway: orgHierarchyGateway,
      }),
      listDivisions: createListDivisionsUseCase({
        gateway: orgHierarchyGateway,
      }),
      findDivisionById: async (divisionId) =>
        await orgHierarchyGateway.findDivisionById(divisionId),
      updateDivision: createUpdateDivisionUseCase({
        gateway: orgHierarchyGateway,
      }),
      deleteDivision: createDeleteDivisionUseCase({
        gateway: orgHierarchyGateway,
      }),
      createLocal: createCreateLocalUseCase({ gateway: orgHierarchyGateway }),
      listLocals: createListLocalsUseCase({ gateway: orgHierarchyGateway }),
      findLocalById: async (localId) =>
        await orgHierarchyGateway.findLocalById(localId),
      updateLocal: createUpdateLocalUseCase({ gateway: orgHierarchyGateway }),
      deleteLocal: createDeleteLocalUseCase({ gateway: orgHierarchyGateway }),
      createArea: createCreateAreaUseCase({ gateway: orgHierarchyGateway }),
      listAreas: createListAreasUseCase({ gateway: orgHierarchyGateway }),
      findAreaById: async (areaId) =>
        await orgHierarchyGateway.findAreaById(areaId),
      updateArea: createUpdateAreaUseCase({ gateway: orgHierarchyGateway }),
      deleteArea: createDeleteAreaUseCase({ gateway: orgHierarchyGateway }),
      createWarehouse: createCreateWarehouseUseCase({
        gateway: orgHierarchyGateway,
      }),
      listWarehouses: createListWarehousesUseCase({
        gateway: orgHierarchyGateway,
      }),
      findWarehouseById: async (warehouseId) =>
        await orgHierarchyGateway.findWarehouseById(warehouseId),
      updateWarehouse: createUpdateWarehouseUseCase({
        gateway: orgHierarchyGateway,
      }),
      deleteWarehouse: createDeleteWarehouseUseCase({
        gateway: orgHierarchyGateway,
      }),
      createPointOfSale: createCreatePointOfSaleUseCase({
        gateway: orgHierarchyGateway,
      }),
      listPointsOfSale: createListPointsOfSaleUseCase({
        gateway: orgHierarchyGateway,
      }),
      findPointOfSaleById: async (pointOfSaleId) =>
        await orgHierarchyGateway.findPointOfSaleById(pointOfSaleId),
      updatePointOfSale: createUpdatePointOfSaleUseCase({
        gateway: orgHierarchyGateway,
      }),
      deletePointOfSale: createDeletePointOfSaleUseCase({
        gateway: orgHierarchyGateway,
      }),
    }),
  );
  app.use(
    createApprovalPolicyRouter({
      requireAuth,
      requireHrCapability,
      createApprovalPolicy: createCreateApprovalPolicyUseCase({
        gateway: approvalPolicyGateway,
      }),
      listApprovalPolicies: listVisibleApprovalPolicies,
      resolvePermissionScope: resolveApprovalPolicyPermissionScope,
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
    createTimesheetsRouter({
      requireAuth,
      requireHrCapability,
      resolvePermissionScope: resolveTimesheetPermissionScope,
      createPeriod: async ({
        companyId,
        employeeAssignmentId,
        periodStart,
        periodEnd,
      }) =>
        await createPeriod({
          companyId,
          employeeAssignmentId,
          periodStart,
          periodEnd,
        }),
      listPeriods: async ({ companyId, status, auth }) => {
        const visibleEmployeeIds = await listVisibleTimesheetEmployeeIds({
          companyId,
          auth,
        });

        return await listPeriods({
          companyId,
          visibleEmployeeIds,
          ...(status ? { status } : {}),
        });
      },
      getPeriod: async ({ companyId, periodId, auth }) => {
        const visibleEmployeeIds = await listVisibleTimesheetEmployeeIds({
          companyId,
          auth,
        });

        return await getPeriod({ companyId, periodId, visibleEmployeeIds });
      },
      listEntries: async ({ companyId, periodId, auth }) => {
        const visibleEmployeeIds = await listVisibleTimesheetEmployeeIds({
          companyId,
          auth,
        });

        return await listEntries({ companyId, periodId, visibleEmployeeIds });
      },
      patchPeriod: async ({ companyId, periodId, periodStart, periodEnd }) =>
        await patchPeriod({ companyId, periodId, periodStart, periodEnd }),
      createEntry: async ({
        companyId,
        periodId,
        entryDate,
        hours,
        projectId,
        taskLabel,
        note,
      }) =>
        await addEntry({
          companyId,
          periodId,
          entryDate,
          hours,
          projectId,
          taskLabel,
          note,
        }),
      updateEntry: async ({
        companyId,
        periodId,
        entryId,
        entryDate,
        hours,
        projectId,
        taskLabel,
        note,
      }) =>
        await updateEntry({
          companyId,
          periodId,
          entryId,
          entryDate,
          hours,
          projectId,
          taskLabel,
          note,
        }),
      deleteEntry: async ({ companyId, periodId, entryId }) =>
        await removeEntry({ companyId, periodId, entryId }),
      submitPeriod: async ({ companyId, periodId, auth }) =>
        await submitPeriod({
          companyId,
          periodId,
          submittedByUserId: auth.user.id,
        }),
      approvePeriod: async ({ companyId, periodId, auth }) =>
        await approvePeriod({
          companyId,
          periodId,
          approvedByUserId: auth.user.id,
        }),
      rejectPeriod: async ({ companyId, periodId, rejectionReason }) =>
        await rejectPeriod({ companyId, periodId, rejectionReason }),
      reopenPeriod: async ({ companyId, periodId }) =>
        await reopenPeriod({ companyId, periodId }),
    }),
  );
  app.use(
    createHrEmployeesRouter({
      requireAuth,
      requireHrCapability,
      createEmployee: createCreateEmployeeUseCase({
        gateway: hrEmployeesGateway,
      }),
      updateEmployee: (companyId, employeeId, input) =>
        createUpdateEmployeeUseCase({ gateway: hrEmployeesGateway })({
          companyId,
          employeeId,
          ...input,
        }),
      deleteEmployee: (input) =>
        createDeleteEmployeeUseCase({ gateway: hrEmployeesGateway })(input),
      listEmployees: listVisibleEmployees,
      resolvePermissionScope: resolveEmployeePermissionScope,
      getEmployee: createGetEmployeeUseCase({ gateway: hrEmployeesGateway }),
      createPosition: createCreatePositionUseCase({
        gateway: hrEmployeesGateway,
      }),
      listPositions,
      createAssignment: createCreateAssignmentUseCase({
        gateway: hrEmployeesGateway,
      }),
      listAssignmentHistory: createListAssignmentHistoryUseCase({
        gateway: hrEmployeesGateway,
      }),
      listAssignments: createListAssignmentsUseCase({
        gateway: hrEmployeesGateway,
      }),
      resolveReportingLine: createResolveReportingLineUseCase({
        gateway: hrEmployeesGateway,
      }),
      resolveDirectReports: createResolveDirectReportsUseCase({
        gateway: hrEmployeesGateway,
      }),
    }),
  );
  app.use(
    createHrErpAccessRouter({
      requireAuth,
      requireHrCapability,
      createInvitation: createCreateErpAccessInvitationUseCase({
        gateway: hrErpAccessGateway,
      }),
      listInvitations: createListErpAccessInvitationsPageUseCase({
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
    createHrResponsibilityRouter({
      requireAuth,
      getState: createGetHrResponsibilityState(hrResponsibilityGateway),
      assign: createAssignHrResponsible(hrResponsibilityGateway),
      listPendingInvitations: createListHrResponsibilityInvitations({
        gateway: hrResponsibilityGateway,
      }),
      createInvitation: createHrResponsibilityInvitation({
        gateway: hrResponsibilityGateway,
        emailSender: hrInvitationEmailSender,
        buildInvitationLink: (token) =>
          `${appBaseUrl}/hr-responsibility/accept/${token}`,
      }),
      getInvitation: createGetHrResponsibilityInvitation({
        gateway: hrResponsibilityGateway,
      }),
      acceptInvitation: createAcceptHrResponsibilityInvitation({
        gateway: hrResponsibilityGateway,
        passwordHasher,
        sessionTokenService,
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
        buildInvitationLink: (token) =>
          `${appBaseUrl}/accept-invitation/${token}`,
        onEmailDeliveryFailure: ({
          invitationId,
          inviteeEmail,
          errorMessage,
        }) => {
          logger.error(
            { invitationId, inviteeEmail, err: errorMessage },
            'Node management invitation email delivery failed',
          );
        },
      }),
      listResponsibilities: createListNodeResponsibilitiesUseCase({
        gateway: nodeManagementGateway,
      }),
      listPendingInvitations: createListNodeManagementPendingInvitationsUseCase(
        {
          gateway: nodeManagementGateway,
        },
      ),
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
