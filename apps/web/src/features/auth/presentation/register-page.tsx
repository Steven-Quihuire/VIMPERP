import { useNavigate } from 'react-router-dom';

import { needsCompanyOnboarding } from '../../onboarding/domain/onboarding';
import type { RegisterInput } from '../domain/auth';
import { RegisterForm } from './components/register-form';
import { registerCopy } from './register-copy';
import { useRegister } from './use-auth';

export const RegisterPage = ({ apiBaseUrl }: { apiBaseUrl?: string }) => {
  const navigate = useNavigate();
  const register = useRegister(apiBaseUrl);

  return (
    <main className="h-dvh overflow-hidden bg-[radial-gradient(circle_at_top,_hsl(var(--primary)/0.09),_transparent_34%),linear-gradient(180deg,_hsl(var(--background)),_hsl(var(--muted)/0.26))]">
      <section className="mx-auto flex h-full w-full max-w-5xl items-center justify-center px-6 py-4 sm:px-8 sm:py-6">
        <div className="w-full max-w-[29rem]">
          <RegisterForm
            onSubmitRegistration={(input: RegisterInput) => {
              void register
                .mutateAsync(input)
                .then((session) => navigate(needsCompanyOnboarding(session) ? '/onboarding' : '/dashboard'))
                .catch(() => undefined);
            }}
            isPending={register.isPending}
            error={register.isError ? (register.error instanceof Error ? register.error.message : registerCopy.error) : undefined}
          />
        </div>
      </section>
    </main>
  );
};
