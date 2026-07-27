import { useLogout } from './use-auth';

export const DashboardPage = ({
  email,
  apiBaseUrl,
}: {
  email: string;
  apiBaseUrl?: string;
}) => {
  const logout = useLogout(apiBaseUrl);

  return (
    <main>
      <h1>ERP dashboard</h1>
      <p>{email}</p>
      <button type="button" onClick={() => logout.mutate()}>
        Sign out
      </button>
    </main>
  );
};
