import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { sileo } from 'sileo';

import { needsCompanyOnboarding } from '../../onboarding/domain/onboarding';
import type { RegisterInput } from '../domain/auth';
import { RegisterForm } from './components/register-form';
import { registerCopy } from './register-copy';
import { useRegister } from './use-auth';

export const RegisterPage = ({ apiBaseUrl }: { apiBaseUrl?: string }) => {
  const navigate = useNavigate();
  const register = useRegister(apiBaseUrl);

  useEffect(() => {
    if (register.isError) {
      const message =
        register.error instanceof Error
          ? register.error.message
          : registerCopy.error;

      sileo.error({
        title: registerCopy.error,
        description: message === registerCopy.error ? undefined : message,
      });
    }
  }, [register.isError, register.error]);

  return (
    <main className="flex h-dvh items-center justify-center bg-background px-6 py-12">
      <section className="w-full max-w-xl">
        <RegisterForm
          onSubmitRegistration={(input: RegisterInput) => {
            void register
              .mutateAsync(input)
              .then((session) =>
                navigate(
                  needsCompanyOnboarding(session)
                    ? '/onboarding'
                    : '/dashboard',
                ),
              )
              .catch(() => undefined);
          }}
          isPending={register.isPending}
        />
      </section>
    </main>
  );
};
