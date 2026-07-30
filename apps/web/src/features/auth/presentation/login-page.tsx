import { useNavigate } from 'react-router-dom';

import type { LoginInput } from '../domain/auth';
import { LoginForm } from './components/login-form';
import { loginCopy } from './login-copy';
import { useLogin } from './use-auth';

export const LoginPage = ({ apiBaseUrl }: { apiBaseUrl?: string }) => {
  const navigate = useNavigate();
  const login = useLogin(apiBaseUrl);

  return (
    <main className="grid min-h-screen bg-background lg:grid-cols-2">
      <section className="flex min-h-screen items-center justify-center px-6 py-12 sm:px-10 lg:px-16">
        <div className="w-full max-w-md">
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
        </div>
      </section>
      <section
        aria-hidden="true"
        className="relative hidden min-h-screen overflow-hidden bg-primary lg:block"
        style={{
          backgroundImage: "url('/bg__auth.webp')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-primary/35" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="absolute bottom-10 left-10 max-w-sm text-primary-foreground">
          <p className="font-bold uppercase tracking-[0.2em]">VIMPERP</p>
          <p className="mt-3 text-4xl font-medium tracking-tight">
            Gestiona tu negocio con claridad.
          </p>
        </div>
      </section>
    </main>
  );
};
