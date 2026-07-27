import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  BrowserRouter,
  MemoryRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
} from 'react-router-dom';

import { DashboardPage } from '../features/auth/presentation/dashboard-page';
import { LoginPage } from '../features/auth/presentation/login-page';
import { useAuth } from '../features/auth/presentation/use-auth';

const ProtectedDashboard = ({ apiBaseUrl }: { apiBaseUrl?: string }) => {
  const auth = useAuth(apiBaseUrl);

  if (auth.isLoading) {
    return <p>Loading...</p>;
  }

  if (!auth.session) {
    return <Navigate to="/login" replace />;
  }

  return (
    <DashboardPage
      email={auth.session.user.email}
      {...(apiBaseUrl ? { apiBaseUrl } : {})}
    />
  );
};

const LoginRoute = ({ apiBaseUrl }: { apiBaseUrl?: string }) => {
  const auth = useAuth(apiBaseUrl);

  if (auth.isSuccess && auth.session) {
    return <Navigate to="/dashboard" replace />;
  }

  return <LoginPage {...(apiBaseUrl ? { apiBaseUrl } : {})} />;
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
        path="/dashboard"
        element={<ProtectedDashboard {...(apiBaseUrl ? { apiBaseUrl } : {})} />}
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
        <AppRoutes {...(apiBaseUrl ? { apiBaseUrl } : {})} />
      </RouterComponent>
    </QueryClientProvider>
  );
};
