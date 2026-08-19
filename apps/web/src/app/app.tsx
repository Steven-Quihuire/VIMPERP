import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import {
  BrowserRouter,
  Link,
  MemoryRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom';
import { Toaster as SileoToaster } from 'sileo';
import { toast } from 'sonner';

import { useApprovalPolicies } from '../features/approval-policy/application/approval-policy-queries';
import { PoliciesListPage } from '../features/approval-policy/presentation/pages/policies-list';
import { PolicyFormPage } from '../features/approval-policy/presentation/pages/policy-form';
import {
  hasBlockedActiveCompany,
  needsActiveCompanySelection,
} from '../features/auth/domain/auth';
import { AuthLayout } from '../features/auth/presentation/auth-layout';
import { LoginPage } from '../features/auth/presentation/login-page';
import { RegisterPage } from '../features/auth/presentation/register-page';
import { useAuth } from '../features/auth/presentation/use-auth';
import { canViewAdminSignals } from '../features/dashboard/domain/dashboard';
import { AdminCompaniesPage } from '../features/dashboard/presentation/admin-companies-page';
import { ApplicationErrorDetailPage } from '../features/dashboard/presentation/application-error-detail-page';
import { ApplicationErrorsListPage } from '../features/dashboard/presentation/application-errors-list-page';
import { AuditEventDetailPage } from '../features/dashboard/presentation/audit-event-detail-page';
import { AuditEventsListPage } from '../features/dashboard/presentation/audit-events-list-page';
import { BlockedCompanyPage } from '../features/dashboard/presentation/blocked-company-page';
import { DashboardNotificationsPage } from '../features/dashboard/presentation/dashboard-notifications-page';
import { DashboardPage } from '../features/dashboard/presentation/dashboard-page';
import { DashboardProfileSettingsPage } from '../features/dashboard/presentation/dashboard-profile-settings-page';
import { DashboardShell } from '../features/dashboard/presentation/dashboard-shell';
import { DashboardThemeSettingsPage } from '../features/dashboard/presentation/dashboard-theme-settings-page';
import { ProvisioningRunDetailPage } from '../features/dashboard/presentation/provisioning-run-detail-page';
import { ProvisioningRunsListPage } from '../features/dashboard/presentation/provisioning-runs-list-page';
import { DesktopGate } from '../features/desktop-access/presentation/desktop-gate';
import {
  useCreateEmployee,
  useEmployees,
} from '../features/hr-employees/application/hr-employees-queries';
import {
  toCreateEmployeeInput,
  toEmployeeFormValues,
  type Employee,
} from '../features/hr-employees/domain/employees';
import { AssignmentTimelinePage } from '../features/hr-employees/presentation/pages/assignment-timeline';
import { EmployeeDetailPage } from '../features/hr-employees/presentation/pages/employee-detail';
import { EmployeesListPage } from '../features/hr-employees/presentation/pages/employees-list';
import { PositionFormPage } from '../features/hr-employees/presentation/pages/position-form';
import { PositionsListPage } from '../features/hr-employees/presentation/pages/positions-list';
import { AcceptErpAccessInvitationPage } from '../features/hr-erp-access/presentation/pages/accept-invitation';
import { InvitationsListPage } from '../features/hr-erp-access/presentation/pages/invitations-list';
import { useHrResponsibility } from '../features/hr-responsibility/application/hr-responsibility-queries';
import { AcceptHrResponsibilityInvitationPage } from '../features/hr-responsibility/presentation/accept-invitation-page';
import { HrResponsibilityPage } from '../features/hr-responsibility/presentation/hr-responsibility-page';
import { CategoriesPage } from '../features/items/presentation/categories-page';
import { ItemCatalogPage } from '../features/items/presentation/item-catalog-page';
import { LandingPage } from '../features/landing/presentation/landing-page';
import { PrivacyPolicyPage } from '../features/legal/presentation/privacy-policy-page';
import { AcceptInvitationPage } from '../features/node-management/presentation/accept-invitation-page';
import { needsCompanyOnboarding } from '../features/onboarding/domain/onboarding';
import { OnboardingPage } from '../features/onboarding/presentation/onboarding-page';
import { OrganizationPage } from '../features/org-hierarchy/presentation/organization-page';
import { ThemeProvider } from '../features/theme/presentation/theme-provider';

import { RrhHWorkspaceNav } from '@/features/dashboard/presentation/rrhh-workspace-nav';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/shared/ui/breadcrumb';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/shared/ui/dialog';
import { Toaster as ShadcnToaster } from '@/shared/ui/sonner';
import { ChevronLeft, Plus } from 'lucide-react';
import type { AuthSession } from '../features/auth/domain/auth';

const getAuthenticatedEntryRoute = (
  session: Parameters<typeof needsCompanyOnboarding>[0],
) => {
  if (!session) {
    return '/login';
  }

  if (needsCompanyOnboarding(session)) {
    return '/onboarding';
  }

  if (hasBlockedActiveCompany(session)) {
    return '/dashboard/company-status';
  }

  return '/dashboard';
};

const ProtectedDashboardShell = ({ apiBaseUrl }: { apiBaseUrl?: string }) => {
  const auth = useAuth(apiBaseUrl);

  if (auth.isLoading) {
    return <p>Cargando...</p>;
  }

  if (!auth.session) {
    return <Navigate to="/login" replace />;
  }

  if (needsCompanyOnboarding(auth.session)) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <DashboardShell
      session={auth.session}
      {...(apiBaseUrl ? { apiBaseUrl } : {})}
    />
  );
};

const ProtectedDashboard = ({ apiBaseUrl }: { apiBaseUrl?: string }) => {
  const auth = useAuth(apiBaseUrl);

  if (auth.isLoading) return <p>Cargando...</p>;
  if (!auth.session) return <Navigate to="/login" replace />;
  if (needsCompanyOnboarding(auth.session)) {
    return <Navigate to="/onboarding" replace />;
  }
  if (hasBlockedActiveCompany(auth.session)) {
    return <Navigate to="/dashboard/company-status" replace />;
  }

  return (
    <DashboardPage
      session={auth.session}
      {...(apiBaseUrl ? { apiBaseUrl } : {})}
    />
  );
};

const useCompanyScopedSession = (apiBaseUrl?: string) => {
  const auth = useAuth(apiBaseUrl);

  if (auth.isLoading) {
    return { state: 'loading' as const, auth };
  }

  if (!auth.session) {
    return { state: 'redirect-login' as const, auth };
  }

  if (needsCompanyOnboarding(auth.session)) {
    return { state: 'redirect-onboarding' as const, auth };
  }

  if (needsActiveCompanySelection(auth.session)) {
    return { state: 'redirect-dashboard' as const, auth };
  }

  if (hasBlockedActiveCompany(auth.session)) {
    return { state: 'redirect-company-status' as const, auth };
  }

  return { state: 'ready' as const, auth };
};

const renderCompanyScopedRoute = (
  state: ReturnType<typeof useCompanyScopedSession>['state'],
) => {
  if (state === 'loading') {
    return <p>Cargando...</p>;
  }

  if (state === 'redirect-login') {
    return <Navigate to="/login" replace />;
  }

  if (state === 'redirect-onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  if (state === 'redirect-dashboard') {
    return <Navigate to="/dashboard" replace />;
  }

  if (state === 'redirect-company-status') {
    return <Navigate to="/dashboard/company-status" replace />;
  }

  return null;
};

const HrEmployeesWorkspace = ({
  session,
  apiBaseUrl,
}: {
  session: AuthSession;
  apiBaseUrl?: string;
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { employeeId: routeEmployeeId } = useParams<{ employeeId?: string }>();
  const [localEmployeeId, setLocalEmployeeId] = useState<string | null>(null);
  const selectedEmployeeId = routeEmployeeId ?? localEmployeeId;
  const employeesQuery = useEmployees(
    session.activeCompany?.companyId,
    apiBaseUrl,
  );
  const createEmployeeMutation = useCreateEmployee(apiBaseUrl);
  const selectedEmployeeName = employeesQuery.data?.find(
    (employee) => employee.id === selectedEmployeeId,
  )?.fullName;
  const selectEmployee = (employeeId: string) => {
    if (location.pathname.startsWith('/manage-employees')) {
      void navigate(`/manage-employees/${employeeId}`);
      return;
    }

    setLocalEmployeeId(employeeId);
  };

  const handleDeletedEmployee = (deleted: Employee) => {
    toast('Empleado eliminado', {
      action: {
        label: 'Deshacer',
        onClick: () => {
          void createEmployeeMutation.mutateAsync(
            toCreateEmployeeInput(
              deleted.companyId,
              toEmployeeFormValues(deleted),
            ),
          );
        },
      },
    });

    if (routeEmployeeId) {
      void navigate('/manage-employees');
      return;
    }

    setLocalEmployeeId(null);
  };

  return (
    <main className="mx-auto flex w-full max-w-[1480px] flex-col gap-6 p-4 md:p-6">
      <div className="space-y-6">
        <header>
          <div className="">
            {selectedEmployeeId ? (
              <button
                type="button"
                aria-label="Volver a empleados"
                className="cursor-pointer"
                onClick={() => {
                  if (routeEmployeeId) {
                    void navigate('/manage-employees');
                    return;
                  }

                  setLocalEmployeeId(null);
                }}
              >
                <ChevronLeft className="size-7" />
              </button>
            ) : null}
            <h1 className="text-3xl font-medium tracking-tight">
              {selectedEmployeeId ? 'Detalles del empleado' : 'Empleados'}
            </h1>
          </div>
          <Breadcrumb className="mt-1">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link
                    className="text-gray-500 text-xs hover:text-gray-700 transition-all ease-in-out duration-300"
                    to="/dashboard"
                  >
                    Inicio
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="text-gray-500 text-xs" />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link
                    className="text-gray-500 text-xs hover:text-gray-700 transition-all ease-in-out duration-300"
                    to="/dashboard/hr/employees"
                  >
                    Recursos humanos
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              {selectedEmployeeId ? (
                <>
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link
                        className="text-gray-500 text-xs hover:text-gray-700 transition-all ease-in-out duration-300"
                        to="/manage-employees"
                      >
                        Empleados
                      </Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage className="text-gray-800 text-xs">
                      {selectedEmployeeName || 'Detalles del empleado'}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              ) : (
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-gray-800 text-xs">
                    Empleados
                  </BreadcrumbPage>
                </BreadcrumbItem>
              )}
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        {!selectedEmployeeId ? <RrhHWorkspaceNav /> : null}

        {selectedEmployeeId ? (
          <div className="space-y-4">
            <EmployeeDetailPage
              session={session}
              {...(apiBaseUrl ? { apiBaseUrl } : {})}
              employeeId={selectedEmployeeId}
              onSelectEmployee={selectEmployee}
              onDeleted={handleDeletedEmployee}
            />
            <AssignmentTimelinePage
              session={session}
              {...(apiBaseUrl ? { apiBaseUrl } : {})}
              employeeId={selectedEmployeeId}
            />
          </div>
        ) : (
          <div className="space-y-6">
            <EmployeesListPage
              session={session}
              {...(apiBaseUrl ? { apiBaseUrl } : {})}
              selectedEmployeeId={selectedEmployeeId}
              onSelectEmployee={selectEmployee}
            />
          </div>
        )}
      </div>
    </main>
  );
};

const HrPositionsWorkspace = ({
  session,
  apiBaseUrl,
}: {
  session: AuthSession;
  apiBaseUrl?: string;
}) => {
  const [selectedPositionId, setSelectedPositionId] = useState<string | null>(
    null,
  );
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  return (
    <main className="mx-auto flex w-full max-w-[1480px] flex-col gap-6 p-4 md:p-6">
      <div className="space-y-6">
        <header>
          <div className="">
            <h1 className="text-3xl font-medium tracking-tight">Puestos</h1>
          </div>
          <Breadcrumb className="mt-1">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link
                    className="text-gray-500 text-xs hover:text-gray-700 transition-all ease-in-out duration-300"
                    to="/dashboard"
                  >
                    Inicio
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="text-gray-500 text-xs" />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link
                    className="text-gray-500 text-xs hover:text-gray-700 transition-all ease-in-out duration-300"
                    to="/dashboard/hr/employees"
                  >
                    Recursos humanos
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="text-gray-800 text-xs">
                  Puestos
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-sm text-muted-foreground">
            Definí los puestos de reporte y la capacidad de personal.
          </p>
          <Button
            type="button"
            variant="outline"
            className="shrink-0 cursor-pointer rounded-2xl"
            onClick={() => setIsCreateDialogOpen(true)}
          >
            <Plus className="size-4" color="#000" />
            Agregar puesto
          </Button>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent
            hideCloseButton
            className="gap-0 overflow-hidden border-0 p-0 sm:max-w-4xl"
          >
            <DialogTitle className="sr-only">Agregar puesto</DialogTitle>
            <div className="grid sm:grid-cols-[2fr_3fr]">
            <div className="relative hidden overflow-hidden sm:block">
              <img
                src="/bg__positions-bw.svg"
                alt=""
                className="positions-svg-drift absolute inset-0 h-full w-full object-cover"
              />
            </div>
              <div className="max-h-[90vh] overflow-y-auto">
              <PositionFormPage
                key={isCreateDialogOpen ? 'open' : 'closed'}
                session={session}
                {...(apiBaseUrl ? { apiBaseUrl } : {})}
                onCreated={(positionId) => {
                  setIsCreateDialogOpen(false);
                  setSelectedPositionId(positionId);
                }}
                onCancel={() => setIsCreateDialogOpen(false)}
              />
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <PositionsListPage
          session={session}
          {...(apiBaseUrl ? { apiBaseUrl } : {})}
          selectedPositionId={selectedPositionId}
          onSelectPosition={setSelectedPositionId}
        />
      </div>
    </main>
  );
};

const HrErpAccessWorkspace = ({
  session,
  apiBaseUrl,
}: {
  session: AuthSession;
  apiBaseUrl?: string;
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          Invitaciones de acceso al ERP
        </h1>
        <p className="text-sm text-muted-foreground">
          Invitá empleados al acceso ERP sin redefinir su identidad.
        </p>
      </div>

      <InvitationsListPage
        session={session}
        {...(apiBaseUrl ? { apiBaseUrl } : {})}
      />
    </div>
  );
};

const ApprovalPoliciesWorkspace = ({
  session,
  apiBaseUrl,
}: {
  session: AuthSession;
  apiBaseUrl?: string;
}) => {
  const [selectedPolicyId, setSelectedPolicyId] = useState<string | null>(null);
  const companyId = session.activeCompany?.companyId;
  const { policiesQuery } = useApprovalPolicies(companyId, apiBaseUrl);
  const selectedPolicy =
    policiesQuery.data?.find((policy) => policy.id === selectedPolicyId) ??
    null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Políticas de aprobación</h1>
        <p className="text-sm text-muted-foreground">
          Configurá las bases de las políticas de aprobación de la compañía y
          sus nodos.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <PoliciesListPage
          session={session}
          {...(apiBaseUrl ? { apiBaseUrl } : {})}
          selectedPolicyId={selectedPolicyId}
          onSelectPolicy={setSelectedPolicyId}
        />
        <PolicyFormPage
          key={selectedPolicy?.id ?? 'new-policy'}
          session={session}
          {...(apiBaseUrl ? { apiBaseUrl } : {})}
          policy={selectedPolicy}
          onSaved={setSelectedPolicyId}
        />
      </div>
    </div>
  );
};

const HrEmployeesRoute = ({ apiBaseUrl }: { apiBaseUrl?: string }) => {
  const scoped = useCompanyScopedSession(apiBaseUrl);
  const fallback = renderCompanyScopedRoute(scoped.state);

  if (fallback) {
    return fallback;
  }

  return (
    <HrEmployeesWorkspace
      session={scoped.auth.session!}
      {...(apiBaseUrl ? { apiBaseUrl } : {})}
    />
  );
};

const HrPositionsRoute = ({ apiBaseUrl }: { apiBaseUrl?: string }) => {
  const scoped = useCompanyScopedSession(apiBaseUrl);
  const fallback = renderCompanyScopedRoute(scoped.state);

  if (fallback) {
    return fallback;
  }

  return (
    <HrPositionsWorkspace
      session={scoped.auth.session!}
      {...(apiBaseUrl ? { apiBaseUrl } : {})}
    />
  );
};

const HrErpAccessRoute = ({ apiBaseUrl }: { apiBaseUrl?: string }) => {
  const scoped = useCompanyScopedSession(apiBaseUrl);
  const fallback = renderCompanyScopedRoute(scoped.state);

  if (fallback) {
    return fallback;
  }

  return (
    <HrErpAccessWorkspace
      session={scoped.auth.session!}
      {...(apiBaseUrl ? { apiBaseUrl } : {})}
    />
  );
};

const ApprovalPoliciesRoute = ({ apiBaseUrl }: { apiBaseUrl?: string }) => {
  const scoped = useCompanyScopedSession(apiBaseUrl);
  const fallback = renderCompanyScopedRoute(scoped.state);

  if (fallback) {
    return fallback;
  }

  return (
    <ApprovalPoliciesWorkspace
      session={scoped.auth.session!}
      {...(apiBaseUrl ? { apiBaseUrl } : {})}
    />
  );
};

const HrResponsibilityRoute = ({ apiBaseUrl }: { apiBaseUrl?: string }) => {
  const scoped = useCompanyScopedSession(apiBaseUrl);
  const fallback = renderCompanyScopedRoute(scoped.state);

  if (fallback) return fallback;

  return (
    <HrResponsibilityPage
      session={scoped.auth.session!}
      {...(apiBaseUrl ? { apiBaseUrl } : {})}
    />
  );
};

const ItemsRoute = ({ apiBaseUrl }: { apiBaseUrl?: string }) => {
  const auth = useAuth(apiBaseUrl);

  if (auth.isLoading) {
    return <p>Cargando...</p>;
  }

  if (!auth.session) {
    return <Navigate to="/login" replace />;
  }

  if (needsCompanyOnboarding(auth.session)) {
    return <Navigate to="/onboarding" replace />;
  }

  if (needsActiveCompanySelection(auth.session)) {
    return <Navigate to="/dashboard" replace />;
  }

  if (hasBlockedActiveCompany(auth.session)) {
    return <Navigate to="/dashboard/company-status" replace />;
  }

  return <ItemCatalogPage session={auth.session} />;
};

const CategoriesRoute = ({ apiBaseUrl }: { apiBaseUrl?: string }) => {
  const auth = useAuth(apiBaseUrl);

  if (auth.isLoading) {
    return <p>Cargando...</p>;
  }

  if (!auth.session) {
    return <Navigate to="/login" replace />;
  }

  if (needsCompanyOnboarding(auth.session)) {
    return <Navigate to="/onboarding" replace />;
  }

  if (needsActiveCompanySelection(auth.session)) {
    return <Navigate to="/dashboard" replace />;
  }

  if (hasBlockedActiveCompany(auth.session)) {
    return <Navigate to="/dashboard/company-status" replace />;
  }

  return <CategoriesPage session={auth.session} />;
};

const getActiveRole = (
  session: import('../features/auth/domain/auth').AuthSession,
) => {
  if (!session.activeCompany) return null;
  return (
    session.memberships.find(
      (m) => m.companyId === session.activeCompany?.companyId,
    )?.role ?? null
  );
};

const DivisionsRoute = ({ apiBaseUrl }: { apiBaseUrl?: string }) => {
  const auth = useAuth(apiBaseUrl);

  if (auth.isLoading) {
    return <p>Cargando...</p>;
  }

  if (!auth.session) {
    return <Navigate to="/login" replace />;
  }

  if (needsCompanyOnboarding(auth.session)) {
    return <Navigate to="/onboarding" replace />;
  }

  if (needsActiveCompanySelection(auth.session)) {
    return <Navigate to="/dashboard" replace />;
  }

  if (hasBlockedActiveCompany(auth.session)) {
    return <Navigate to="/dashboard/company-status" replace />;
  }

  if (getActiveRole(auth.session) !== 'company-owner') {
    return <Navigate to="/dashboard" replace />;
  }

  return <Navigate to="/dashboard/organization" replace />;
};

const LocalsRoute = ({ apiBaseUrl }: { apiBaseUrl?: string }) => {
  const auth = useAuth(apiBaseUrl);

  if (auth.isLoading) {
    return <p>Cargando...</p>;
  }

  if (!auth.session) {
    return <Navigate to="/login" replace />;
  }

  if (needsCompanyOnboarding(auth.session)) {
    return <Navigate to="/onboarding" replace />;
  }

  if (needsActiveCompanySelection(auth.session)) {
    return <Navigate to="/dashboard" replace />;
  }

  if (hasBlockedActiveCompany(auth.session)) {
    return <Navigate to="/dashboard/company-status" replace />;
  }

  if (getActiveRole(auth.session) !== 'company-owner') {
    return <Navigate to="/dashboard" replace />;
  }

  return <Navigate to="/dashboard/organization" replace />;
};

const AreasRoute = ({ apiBaseUrl }: { apiBaseUrl?: string }) => {
  const auth = useAuth(apiBaseUrl);

  if (auth.isLoading) {
    return <p>Cargando...</p>;
  }

  if (!auth.session) {
    return <Navigate to="/login" replace />;
  }

  if (needsCompanyOnboarding(auth.session)) {
    return <Navigate to="/onboarding" replace />;
  }

  if (needsActiveCompanySelection(auth.session)) {
    return <Navigate to="/dashboard" replace />;
  }

  if (hasBlockedActiveCompany(auth.session)) {
    return <Navigate to="/dashboard/company-status" replace />;
  }

  if (getActiveRole(auth.session) !== 'company-owner') {
    return <Navigate to="/dashboard" replace />;
  }

  return <Navigate to="/dashboard/organization" replace />;
};

const WarehousesRoute = ({ apiBaseUrl }: { apiBaseUrl?: string }) => {
  const auth = useAuth(apiBaseUrl);

  if (auth.isLoading) {
    return <p>Cargando...</p>;
  }

  if (!auth.session) {
    return <Navigate to="/login" replace />;
  }

  if (needsCompanyOnboarding(auth.session)) {
    return <Navigate to="/onboarding" replace />;
  }

  if (needsActiveCompanySelection(auth.session)) {
    return <Navigate to="/dashboard" replace />;
  }

  if (hasBlockedActiveCompany(auth.session)) {
    return <Navigate to="/dashboard/company-status" replace />;
  }

  if (getActiveRole(auth.session) !== 'company-owner') {
    return <Navigate to="/dashboard" replace />;
  }

  return <Navigate to="/dashboard/organization" replace />;
};

const PointsOfSaleRoute = ({ apiBaseUrl }: { apiBaseUrl?: string }) => {
  const auth = useAuth(apiBaseUrl);

  if (auth.isLoading) {
    return <p>Cargando...</p>;
  }

  if (!auth.session) {
    return <Navigate to="/login" replace />;
  }

  if (needsCompanyOnboarding(auth.session)) {
    return <Navigate to="/onboarding" replace />;
  }

  if (needsActiveCompanySelection(auth.session)) {
    return <Navigate to="/dashboard" replace />;
  }

  if (hasBlockedActiveCompany(auth.session)) {
    return <Navigate to="/dashboard/company-status" replace />;
  }

  if (getActiveRole(auth.session) !== 'company-owner') {
    return <Navigate to="/dashboard" replace />;
  }

  return <Navigate to="/dashboard/organization" replace />;
};

const OrganizationRoute = ({ apiBaseUrl }: { apiBaseUrl?: string }) => {
  const auth = useAuth(apiBaseUrl);
  const { stateQuery: hrResponsibilityQuery } = useHrResponsibility(
    auth.session?.activeCompany?.status === 'active'
      ? auth.session.activeCompany.companyId
      : undefined,
    apiBaseUrl,
  );

  if (auth.isLoading) {
    return <p>Cargando...</p>;
  }

  if (!auth.session) {
    return <Navigate to="/login" replace />;
  }

  if (needsCompanyOnboarding(auth.session)) {
    return <Navigate to="/onboarding" replace />;
  }

  if (needsActiveCompanySelection(auth.session)) {
    return <Navigate to="/dashboard" replace />;
  }

  if (hasBlockedActiveCompany(auth.session)) {
    return <Navigate to="/dashboard/company-status" replace />;
  }

  const canViewOrganization =
    getActiveRole(auth.session) === 'company-owner' ||
    Boolean(hrResponsibilityQuery.data?.hasResponsibles);

  if (!canViewOrganization) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <OrganizationPage
      session={auth.session}
      readOnly={getActiveRole(auth.session) !== 'company-owner'}
    />
  );
};

const LoginRoute = ({ apiBaseUrl }: { apiBaseUrl?: string }) => {
  const auth = useAuth(apiBaseUrl);

  if (auth.isSuccess && auth.session) {
    return <Navigate to={getAuthenticatedEntryRoute(auth.session)} replace />;
  }

  return <LoginPage {...(apiBaseUrl ? { apiBaseUrl } : {})} />;
};

const RegisterRoute = ({ apiBaseUrl }: { apiBaseUrl?: string }) => {
  const auth = useAuth(apiBaseUrl);

  if (auth.isSuccess && auth.session) {
    return <Navigate to={getAuthenticatedEntryRoute(auth.session)} replace />;
  }

  return <RegisterPage {...(apiBaseUrl ? { apiBaseUrl } : {})} />;
};

const ProtectedOnboarding = ({ apiBaseUrl }: { apiBaseUrl?: string }) => {
  const auth = useAuth(apiBaseUrl);

  if (auth.isLoading) {
    return <p>Cargando...</p>;
  }

  if (!auth.session) {
    return <Navigate to="/login" replace />;
  }

  if (!needsCompanyOnboarding(auth.session)) {
    return <Navigate to={getAuthenticatedEntryRoute(auth.session)} replace />;
  }

  return (
    <OnboardingPage
      session={auth.session}
      {...(apiBaseUrl ? { apiBaseUrl } : {})}
    />
  );
};

const ProtectedAdminDashboard = ({ apiBaseUrl }: { apiBaseUrl?: string }) => {
  const auth = useAuth(apiBaseUrl);

  if (auth.isLoading) {
    return <p>Cargando...</p>;
  }

  if (!auth.session) {
    return <Navigate to="/login" replace />;
  }

  if (needsCompanyOnboarding(auth.session)) {
    return <Navigate to="/onboarding" replace />;
  }

  if (!canViewAdminSignals(auth.session)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

const BlockedCompanyRoute = ({ apiBaseUrl }: { apiBaseUrl?: string }) => {
  const auth = useAuth(apiBaseUrl);

  if (auth.isLoading) {
    return <p>Cargando...</p>;
  }

  if (!auth.session) {
    return <Navigate to="/login" replace />;
  }

  if (!hasBlockedActiveCompany(auth.session)) {
    return <Navigate to={getAuthenticatedEntryRoute(auth.session)} replace />;
  }

  return <BlockedCompanyPage session={auth.session} />;
};

const RootLayout = () => <Outlet />;

const AppRoutes = ({ apiBaseUrl }: { apiBaseUrl?: string }) => (
  <Routes>
    <Route path="/" element={<RootLayout />}>
      <Route index element={<LandingPage />} />
      <Route element={<AuthLayout />}>
        <Route
          path="login"
          element={<LoginRoute {...(apiBaseUrl ? { apiBaseUrl } : {})} />}
        />
        <Route
          path="register"
          element={<RegisterRoute {...(apiBaseUrl ? { apiBaseUrl } : {})} />}
        />
        <Route
          path="accept-invitation/:token"
          element={
            <AcceptInvitationPage {...(apiBaseUrl ? { apiBaseUrl } : {})} />
          }
        />
        <Route
          path="hr-erp-access/accept/:token"
          element={
            <AcceptErpAccessInvitationPage
              {...(apiBaseUrl ? { apiBaseUrl } : {})}
            />
          }
        />
        <Route
          path="hr-responsibility/accept/:token"
          element={
            <AcceptHrResponsibilityInvitationPage
              {...(apiBaseUrl ? { apiBaseUrl } : {})}
            />
          }
        />
        <Route
          path="hr/responsibility"
          element={<Navigate to="/dashboard/hr/responsibility" replace />}
        />
      </Route>
      <Route
        path="/dashboard"
        element={
          <ProtectedDashboardShell {...(apiBaseUrl ? { apiBaseUrl } : {})} />
        }
      >
        <Route
          index
          element={
            <ProtectedDashboard {...(apiBaseUrl ? { apiBaseUrl } : {})} />
          }
        />
        <Route
          path="company-status"
          element={
            <BlockedCompanyRoute {...(apiBaseUrl ? { apiBaseUrl } : {})} />
          }
        />
        <Route
          path="items"
          element={<ItemsRoute {...(apiBaseUrl ? { apiBaseUrl } : {})} />}
        />
        <Route
          path="categories"
          element={<CategoriesRoute {...(apiBaseUrl ? { apiBaseUrl } : {})} />}
        />
        <Route
          path="divisions"
          element={<DivisionsRoute {...(apiBaseUrl ? { apiBaseUrl } : {})} />}
        />
        <Route
          path="locals"
          element={<LocalsRoute {...(apiBaseUrl ? { apiBaseUrl } : {})} />}
        />
        <Route
          path="areas"
          element={<AreasRoute {...(apiBaseUrl ? { apiBaseUrl } : {})} />}
        />
        <Route
          path="organization"
          element={
            <OrganizationRoute {...(apiBaseUrl ? { apiBaseUrl } : {})} />
          }
        />
        <Route
          path="hr/employees"
          element={<HrEmployeesRoute {...(apiBaseUrl ? { apiBaseUrl } : {})} />}
        />
        <Route
          path="hr/positions"
          element={<HrPositionsRoute {...(apiBaseUrl ? { apiBaseUrl } : {})} />}
        />
        <Route
          path="hr/erp-access"
          element={<HrErpAccessRoute {...(apiBaseUrl ? { apiBaseUrl } : {})} />}
        />
        <Route
          path="hr/approval-policies"
          element={
            <ApprovalPoliciesRoute {...(apiBaseUrl ? { apiBaseUrl } : {})} />
          }
        />
        <Route
          path="hr/responsibility"
          element={
            <HrResponsibilityRoute {...(apiBaseUrl ? { apiBaseUrl } : {})} />
          }
        />
        <Route
          path="warehouses"
          element={<WarehousesRoute {...(apiBaseUrl ? { apiBaseUrl } : {})} />}
        />
        <Route
          path="points-of-sale"
          element={
            <PointsOfSaleRoute {...(apiBaseUrl ? { apiBaseUrl } : {})} />
          }
        />
        <Route
          path="settings/profile"
          element={
            <DashboardProfileSettingsPage
              {...(apiBaseUrl ? { apiBaseUrl } : {})}
            />
          }
        />
        <Route
          path="settings/theme"
          element={
            <DashboardThemeSettingsPage
              {...(apiBaseUrl ? { apiBaseUrl } : {})}
            />
          }
        />
        <Route
          path="notifications"
          element={
            <DashboardNotificationsPage
              {...(apiBaseUrl ? { apiBaseUrl } : {})}
            />
          }
        />
        <Route
          path="notifications/all"
          element={
            <DashboardNotificationsPage
              {...(apiBaseUrl ? { apiBaseUrl } : {})}
            />
          }
        />
        <Route
          path="notifications/unread"
          element={
            <DashboardNotificationsPage
              {...(apiBaseUrl ? { apiBaseUrl } : {})}
            />
          }
        />
        <Route
          path="admin"
          element={
            <ProtectedAdminDashboard {...(apiBaseUrl ? { apiBaseUrl } : {})} />
          }
        >
          <Route index element={<Navigate to="companies" replace />} />
          <Route
            path="companies"
            element={
              <AdminCompaniesPage {...(apiBaseUrl ? { apiBaseUrl } : {})} />
            }
          />
          <Route
            path="provisioning-runs"
            element={
              <ProvisioningRunsListPage
                {...(apiBaseUrl ? { apiBaseUrl } : {})}
              />
            }
          />
          <Route
            path="provisioning-runs/:id"
            element={
              <ProvisioningRunDetailPage
                {...(apiBaseUrl ? { apiBaseUrl } : {})}
              />
            }
          />
          <Route
            path="application-errors"
            element={
              <ApplicationErrorsListPage
                {...(apiBaseUrl ? { apiBaseUrl } : {})}
              />
            }
          />
          <Route
            path="application-errors/:id"
            element={
              <ApplicationErrorDetailPage
                {...(apiBaseUrl ? { apiBaseUrl } : {})}
              />
            }
          />
          <Route
            path="audit-events"
            element={
              <AuditEventsListPage {...(apiBaseUrl ? { apiBaseUrl } : {})} />
            }
          />
          <Route
            path="audit-events/:id"
            element={
              <AuditEventDetailPage {...(apiBaseUrl ? { apiBaseUrl } : {})} />
            }
          />
        </Route>
      </Route>
      <Route
        path="/enterprise"
        element={<Navigate to="/dashboard/admin/companies" replace />}
      />
      <Route
        path="/manage-employees"
        element={
          <ProtectedDashboardShell {...(apiBaseUrl ? { apiBaseUrl } : {})} />
        }
      >
        <Route
          index
          element={<HrEmployeesRoute {...(apiBaseUrl ? { apiBaseUrl } : {})} />}
        />
        <Route
          path=":employeeId"
          element={<HrEmployeesRoute {...(apiBaseUrl ? { apiBaseUrl } : {})} />}
        />
      </Route>
      <Route
        path="/companies"
        element={<Navigate to="/dashboard/admin/companies" replace />}
      />
      <Route
        path="/onboarding"
        element={
          <ProtectedOnboarding {...(apiBaseUrl ? { apiBaseUrl } : {})} />
        }
      />
      <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
    </Route>
  </Routes>
);

export const App = ({
  initialEntries,
  apiBaseUrl,
}: {
  initialEntries?: string[];
  apiBaseUrl?: string;
}) => {
  const queryClient = new QueryClient();
  const RouterComponent = initialEntries ? MemoryRouter : BrowserRouter;
  const routerProps = initialEntries ? { initialEntries } : {};

  return (
    <QueryClientProvider client={queryClient}>
      <RouterComponent {...routerProps}>
        <DesktopGate>
          <ThemeProvider {...(apiBaseUrl ? { apiBaseUrl } : {})}>
            <AppRoutes {...(apiBaseUrl ? { apiBaseUrl } : {})} />
            <SileoToaster position="top-center" theme="dark" />
            <ShadcnToaster position="bottom-right" />
          </ThemeProvider>
        </DesktopGate>
      </RouterComponent>
    </QueryClientProvider>
  );
};
