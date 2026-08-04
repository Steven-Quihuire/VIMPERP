import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  BrowserRouter,
  MemoryRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
} from 'react-router-dom';
import { Toaster } from 'sileo';

import { LoginPage } from '../features/auth/presentation/login-page';
import { RegisterPage } from '../features/auth/presentation/register-page';
import { AuthLayout } from '../features/auth/presentation/auth-layout';
import { useAuth } from '../features/auth/presentation/use-auth';
import {
  hasBlockedActiveCompany,
  needsActiveCompanySelection,
} from '../features/auth/domain/auth';
import { canViewAdminSignals } from '../features/dashboard/domain/dashboard';
import { ApplicationErrorDetailPage } from '../features/dashboard/presentation/application-error-detail-page';
import { ApplicationErrorsListPage } from '../features/dashboard/presentation/application-errors-list-page';
import { AuditEventDetailPage } from '../features/dashboard/presentation/audit-event-detail-page';
import { AuditEventsListPage } from '../features/dashboard/presentation/audit-events-list-page';
import { DashboardPage } from '../features/dashboard/presentation/dashboard-page';
import { AdminCompaniesPage } from '../features/dashboard/presentation/admin-companies-page';
import { BlockedCompanyPage } from '../features/dashboard/presentation/blocked-company-page';
import { DashboardNotificationsPage } from '../features/dashboard/presentation/dashboard-notifications-page';
import { DashboardProfileSettingsPage } from '../features/dashboard/presentation/dashboard-profile-settings-page';
import { DashboardShell } from '../features/dashboard/presentation/dashboard-shell';
import { DashboardThemeSettingsPage } from '../features/dashboard/presentation/dashboard-theme-settings-page';
import { ProvisioningRunDetailPage } from '../features/dashboard/presentation/provisioning-run-detail-page';
import { ProvisioningRunsListPage } from '../features/dashboard/presentation/provisioning-runs-list-page';
import { DesktopGate } from '../features/desktop-access/presentation/desktop-gate';
import { CategoriesPage } from '../features/items/presentation/categories-page';
import { ItemCatalogPage } from '../features/items/presentation/item-catalog-page';
import { LandingPage } from '../features/landing/presentation/landing-page';
import { PrivacyPolicyPage } from '../features/legal/presentation/privacy-policy-page';
import { needsCompanyOnboarding } from '../features/onboarding/domain/onboarding';
import { OnboardingPage } from '../features/onboarding/presentation/onboarding-page';
import { ThemeProvider } from '../features/theme/presentation/theme-provider';

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
    return <p>Loading...</p>;
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

  if (auth.isLoading) return <p>Loading...</p>;
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

const ItemsRoute = ({ apiBaseUrl }: { apiBaseUrl?: string }) => {
  const auth = useAuth(apiBaseUrl);

  if (auth.isLoading) {
    return <p>Loading...</p>;
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
    return <p>Loading...</p>;
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
    return <p>Loading...</p>;
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
    return <p>Loading...</p>;
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
    return <p>Loading...</p>;
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
          element={<DashboardNotificationsPage {...(apiBaseUrl ? { apiBaseUrl } : {})} />}
        />
        <Route
          path="notifications/all"
          element={<DashboardNotificationsPage {...(apiBaseUrl ? { apiBaseUrl } : {})} />}
        />
        <Route
          path="notifications/unread"
          element={<DashboardNotificationsPage {...(apiBaseUrl ? { apiBaseUrl } : {})} />}
        />
        <Route
          path="admin"
          element={
            <ProtectedAdminDashboard {...(apiBaseUrl ? { apiBaseUrl } : {})} />
          }
        >
          <Route
            index
            element={<Navigate to="companies" replace />}
          />
          <Route
            path="companies"
            element={<AdminCompaniesPage {...(apiBaseUrl ? { apiBaseUrl } : {})} />}
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
      <Route path="/enterprise" element={<Navigate to="/dashboard/admin/companies" replace />} />
      <Route path="/companies" element={<Navigate to="/dashboard/admin/companies" replace />} />
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
            <Toaster position="top-center" theme="dark" />
          </ThemeProvider>
        </DesktopGate>
      </RouterComponent>
    </QueryClientProvider>
  );
};
