import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  BrowserRouter,
  MemoryRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
} from 'react-router-dom';

import { LoginPage } from '../features/auth/presentation/login-page';
import { RegisterPage } from '../features/auth/presentation/register-page';
import { useAuth } from '../features/auth/presentation/use-auth';
import { canViewAdminSignals } from '../features/dashboard/domain/dashboard';
import { ApplicationErrorDetailPage } from '../features/dashboard/presentation/application-error-detail-page';
import { ApplicationErrorsListPage } from '../features/dashboard/presentation/application-errors-list-page';
import { AuditEventDetailPage } from '../features/dashboard/presentation/audit-event-detail-page';
import { AuditEventsListPage } from '../features/dashboard/presentation/audit-events-list-page';
import { DashboardPage } from '../features/dashboard/presentation/dashboard-page';
import { DashboardProfileSettingsPage } from '../features/dashboard/presentation/dashboard-profile-settings-page';
import { DashboardShell } from '../features/dashboard/presentation/dashboard-shell';
import { DashboardThemeSettingsPage } from '../features/dashboard/presentation/dashboard-theme-settings-page';
import { ProvisioningRunDetailPage } from '../features/dashboard/presentation/provisioning-run-detail-page';
import { ProvisioningRunsListPage } from '../features/dashboard/presentation/provisioning-runs-list-page';
import { DesktopGate } from '../features/desktop-access/presentation/desktop-gate';
import { CategoriesPage } from '../features/items/presentation/categories-page';
import { ItemCatalogPage } from '../features/items/presentation/item-catalog-page';
import { needsCompanyOnboarding } from '../features/onboarding/domain/onboarding';
import { OnboardingPage } from '../features/onboarding/presentation/onboarding-page';
import { ThemeProvider } from '../features/theme/presentation/theme-provider';

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

  return <DashboardShell session={auth.session} {...(apiBaseUrl ? { apiBaseUrl } : {})} />;
};

const ProtectedDashboard = ({ apiBaseUrl }: { apiBaseUrl?: string }) => {
  const auth = useAuth(apiBaseUrl);

  if (auth.isLoading) return <p>Loading...</p>;
  if (!auth.session) return <Navigate to="/login" replace />;
  if (needsCompanyOnboarding(auth.session)) return <Navigate to="/onboarding" replace />;

  return (
    <DashboardPage
      session={auth.session}
      {...(apiBaseUrl ? { apiBaseUrl } : {})}
    />
  );
};

const ItemsRoute = ({ apiBaseUrl }: { apiBaseUrl?: string }) => {
  const auth = useAuth(apiBaseUrl);

  if (auth.isLoading || !auth.session) {
    return <p>Loading...</p>;
  }

  return <ItemCatalogPage session={auth.session} />;
};

const CategoriesRoute = ({ apiBaseUrl }: { apiBaseUrl?: string }) => {
  const auth = useAuth(apiBaseUrl);

  if (auth.isLoading || !auth.session) {
    return <p>Loading...</p>;
  }

  return <CategoriesPage session={auth.session} />;
};

const LoginRoute = ({ apiBaseUrl }: { apiBaseUrl?: string }) => {
  const auth = useAuth(apiBaseUrl);

  if (auth.isSuccess && auth.session) {
    return <Navigate to={needsCompanyOnboarding(auth.session) ? '/onboarding' : '/dashboard'} replace />;
  }

  return <LoginPage {...(apiBaseUrl ? { apiBaseUrl } : {})} />;
};

const RegisterRoute = ({ apiBaseUrl }: { apiBaseUrl?: string }) => {
  const auth = useAuth(apiBaseUrl);

  if (auth.isSuccess && auth.session) {
    return <Navigate to={needsCompanyOnboarding(auth.session) ? '/onboarding' : '/dashboard'} replace />;
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
    return <Navigate to="/dashboard" replace />;
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

const RootLayout = () => <Outlet />;

const AppRoutes = ({ apiBaseUrl }: { apiBaseUrl?: string }) => (
  <Routes>
    <Route path="/" element={<RootLayout />}>
      <Route index element={<Navigate to="/dashboard" replace />} />
      <Route
        path="/login"
        element={<LoginRoute {...(apiBaseUrl ? { apiBaseUrl } : {})} />}
      />
      <Route
        path="/register"
        element={<RegisterRoute {...(apiBaseUrl ? { apiBaseUrl } : {})} />}
      />
      <Route path="/dashboard" element={<ProtectedDashboardShell {...(apiBaseUrl ? { apiBaseUrl } : {})} />}>
        <Route index element={<ProtectedDashboard {...(apiBaseUrl ? { apiBaseUrl } : {})} />} />
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
          element={<DashboardProfileSettingsPage {...(apiBaseUrl ? { apiBaseUrl } : {})} />}
        />
        <Route
          path="settings/theme"
          element={<DashboardThemeSettingsPage {...(apiBaseUrl ? { apiBaseUrl } : {})} />}
        />
        <Route path="admin" element={<ProtectedAdminDashboard {...(apiBaseUrl ? { apiBaseUrl } : {})} />}>
        <Route
          path="provisioning-runs"
          element={<ProvisioningRunsListPage {...(apiBaseUrl ? { apiBaseUrl } : {})} />}
        />
        <Route
          path="provisioning-runs/:id"
          element={<ProvisioningRunDetailPage {...(apiBaseUrl ? { apiBaseUrl } : {})} />}
        />
        <Route
          path="application-errors"
          element={<ApplicationErrorsListPage {...(apiBaseUrl ? { apiBaseUrl } : {})} />}
        />
        <Route
          path="application-errors/:id"
          element={<ApplicationErrorDetailPage {...(apiBaseUrl ? { apiBaseUrl } : {})} />}
        />
        <Route
          path="audit-events"
          element={<AuditEventsListPage {...(apiBaseUrl ? { apiBaseUrl } : {})} />}
        />
        <Route
          path="audit-events/:id"
          element={<AuditEventDetailPage {...(apiBaseUrl ? { apiBaseUrl } : {})} />}
        />
        </Route>
      </Route>
      <Route
        path="/onboarding"
        element={<ProtectedOnboarding {...(apiBaseUrl ? { apiBaseUrl } : {})} />}
      />
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
          </ThemeProvider>
        </DesktopGate>
      </RouterComponent>
    </QueryClientProvider>
  );
};
