import { useNavigate } from 'react-router-dom';

import type { LoginInput } from '../domain/auth';
import { LoginForm } from './components/login-form';
import { loginCopy } from './login-copy';
import { useLogin } from './use-auth';

export const LoginPage = ({ apiBaseUrl }: { apiBaseUrl?: string }) => {
  const navigate = useNavigate();
  const login = useLogin(apiBaseUrl);

  return (
    <main className="flex h-dvh items-center justify-center bg-background px-6 py-12">
      <section className="w-full max-w-xl">
        <LoginForm
          onSubmitCredentials={(input: LoginInput) => {
            void login
              .mutateAsync(input)
              .then(() => navigate('/dashboard'))
              .catch(() => undefined);
          }}
          isPending={login.isPending}
          error={login.isError ? loginCopy.error : undefined}
        />
      </section>
    </main>
  );
};
