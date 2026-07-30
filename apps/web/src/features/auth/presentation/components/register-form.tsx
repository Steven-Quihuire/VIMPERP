import { Eye, EyeOff } from 'lucide-react';
import { useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';

import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/shared/ui/field';
import { Input } from '@/shared/ui/input';
import { Separator } from '@/shared/ui/separator';

import type { RegisterInput } from '../../domain/auth';
import { registerCopy } from '../register-copy';

type RegisterFormProps = Omit<React.ComponentProps<'form'>, 'onSubmit'> & {
  onSubmitRegistration: (input: RegisterInput) => void;
  isPending?: boolean;
  error?: string | undefined;
};

const readTextValue = (formData: FormData, name: string) => {
  const value = formData.get(name);
  return typeof value === 'string' ? value : '';
};

const totalSteps = 3;

export function RegisterForm({
  className,
  onSubmitRegistration,
  isPending = false,
  error,
  ...props
}: RegisterFormProps) {
  const emailRef = useRef<HTMLInputElement>(null);
  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(0);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [passwordMismatch, setPasswordMismatch] = useState(false);

  const currentStep = step + 1;

  const validateStepOne = () => {
    const isEmailValid = emailRef.current?.reportValidity() ?? false;
    const isUsernameValid = usernameRef.current?.reportValidity() ?? false;

    if (isEmailValid && isUsernameValid) {
      setStep(1);
    }
  };

  const validateStepTwo = () => {
    const isPasswordValid = passwordRef.current?.reportValidity() ?? false;
    const isConfirmPasswordValid = confirmPasswordRef.current?.reportValidity() ?? false;

    if (!isPasswordValid || !isConfirmPasswordValid) {
      return;
    }

    if (password !== confirmPassword) {
      setPasswordMismatch(true);
      return;
    }

    setPasswordMismatch(false);
    setStep(2);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (step < totalSteps - 1) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const nextPassword = readTextValue(formData, 'password');
    const nextConfirmPassword = readTextValue(formData, 'confirmPassword');

    if (nextPassword !== nextConfirmPassword) {
      setPasswordMismatch(true);
      setStep(1);
      return;
    }

    setPasswordMismatch(false);
    onSubmitRegistration({
      email: readTextValue(formData, 'email'),
      username: readTextValue(formData, 'username'),
      password: nextPassword,
    });
  };

  const stepTitle =
    step === 0
      ? registerCopy.accountStepTitle
      : step === 1
        ? registerCopy.securityStepTitle
        : registerCopy.reviewStepTitle;

  const stepDescription =
    step === 0
      ? registerCopy.accountStepDescription
      : step === 1
        ? registerCopy.securityStepDescription
        : registerCopy.reviewStepDescription;

  return (
    <form
      className={cn('w-full', className)}
      onSubmit={handleSubmit}
      {...props}
    >
      <div className="mx-auto flex max-h-[calc(100dvh-2rem)] w-full max-w-[28rem] flex-col justify-center gap-5 sm:max-h-[calc(100dvh-3rem)]">
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                {registerCopy.eyebrow}
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-[2rem]">
                {registerCopy.title}
              </h1>
            </div>

            <p className="pt-1 text-right text-sm text-muted-foreground">
              {registerCopy.loginPrompt}{' '}
              <Link
                className="font-medium text-foreground underline-offset-4 hover:underline"
                to="/login"
              >
                {registerCopy.loginLinkLabel}
              </Link>
            </p>
          </div>

          <p className="max-w-sm text-sm leading-6 text-muted-foreground">
            {registerCopy.description}
          </p>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{registerCopy.progressLabel.replace('{current}', String(currentStep)).replace('{total}', String(totalSteps))}</span>
              <span>{registerCopy.steps[step]}</span>
            </div>
            <div className="grid grid-cols-3 gap-2" aria-hidden="true">
              {registerCopy.steps.map((stepLabel, stepIndex) => (
                <div
                  key={stepLabel}
                  className={cn(
                    'h-1 rounded-full bg-primary/10 transition-colors',
                    stepIndex <= step ? 'bg-primary' : 'bg-primary/10',
                  )}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-[1.75rem] bg-background/82 p-5 shadow-lg shadow-black/5 ring-1 ring-black/5 backdrop-blur-sm sm:p-6">
          <FieldGroup className="gap-5">
            <div className="space-y-1.5">
              <h2 className="text-xl font-semibold tracking-tight">{stepTitle}</h2>
              <p className="text-sm leading-6 text-muted-foreground">{stepDescription}</p>
            </div>

            <div className="space-y-4">
              <Field className={step === 0 ? undefined : 'hidden'}>
                <FieldLabel htmlFor="email">{registerCopy.emailLabel}</FieldLabel>
                <Input
                  ref={emailRef}
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder={registerCopy.emailPlaceholder}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </Field>

              <Field className={step === 0 ? undefined : 'hidden'}>
                <FieldLabel htmlFor="username">{registerCopy.usernameLabel}</FieldLabel>
                <Input
                  ref={usernameRef}
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  minLength={3}
                  pattern="[a-z0-9._-]+"
                  placeholder={registerCopy.usernamePlaceholder}
                  value={username}
                  onChange={(event) => setUsername(event.target.value.toLowerCase())}
                  required
                />
                <FieldDescription>{registerCopy.usernameHelp}</FieldDescription>
              </Field>

              <Field className={step === 1 ? undefined : 'hidden'}>
                <FieldLabel htmlFor="register-password">
                  {registerCopy.passwordLabel}
                </FieldLabel>
                <div className="relative">
                  <Input
                    ref={passwordRef}
                    id="register-password"
                    name="password"
                    type={isPasswordVisible ? 'text' : 'password'}
                    autoComplete="new-password"
                    minLength={8}
                    placeholder={registerCopy.passwordPlaceholder}
                    className="pr-10"
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setPasswordMismatch(false);
                    }}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => setIsPasswordVisible((visible) => !visible)}
                    aria-label={
                      isPasswordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'
                    }
                    aria-pressed={isPasswordVisible}
                  >
                    {isPasswordVisible ? (
                      <EyeOff className="cursor-pointer text-gray-500" size={20} />
                    ) : (
                      <Eye className="cursor-pointer text-gray-500" size={20} />
                    )}
                  </button>
                </div>
              </Field>

              <Field className={step === 1 ? undefined : 'hidden'}>
                <FieldLabel htmlFor="confirm-password">
                  {registerCopy.confirmPasswordLabel}
                </FieldLabel>
                <Input
                  ref={confirmPasswordRef}
                  id="confirm-password"
                  name="confirmPassword"
                  type={isPasswordVisible ? 'text' : 'password'}
                  autoComplete="new-password"
                  minLength={8}
                  placeholder={registerCopy.confirmPasswordPlaceholder}
                  value={confirmPassword}
                  onChange={(event) => {
                    setConfirmPassword(event.target.value);
                    setPasswordMismatch(false);
                  }}
                  required
                />
              </Field>

              <div className={step === 2 ? 'space-y-3' : 'hidden'}>
                <div className="rounded-2xl bg-muted/35 p-4">
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">{registerCopy.reviewEmailLabel}</span>
                      <span className="font-medium text-foreground">{email || '-'}</span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">{registerCopy.reviewUsernameLabel}</span>
                      <span className="font-medium text-foreground">{username || '-'}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl bg-primary/6 p-4">
                  <p className="text-sm font-medium text-foreground">
                    {registerCopy.trustTitle}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {registerCopy.trustDescription}
                  </p>
                </div>

                <FieldDescription>{registerCopy.finalCtaNote}</FieldDescription>
              </div>
            </div>

            {passwordMismatch ? (
              <FieldDescription className="text-destructive">
                {registerCopy.passwordMismatch}
              </FieldDescription>
            ) : null}

            {error ? (
              <FieldDescription className="text-destructive">
                {error}
              </FieldDescription>
            ) : null}

            <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:items-center">
              {step > 0 ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="h-11 px-0 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setPasswordMismatch(false);
                    setStep((current) => Math.max(0, current - 1));
                  }}
                >
                  {registerCopy.backLabel}
                </Button>
              ) : null}

              {step < totalSteps - 1 ? (
                <Button
                  variant="vimcore"
                  type="button"
                  className="h-11 w-full sm:ml-auto"
                  onClick={step === 0 ? validateStepOne : validateStepTwo}
                >
                  {registerCopy.continueLabel}
                </Button>
              ) : (
                <Button
                  variant="vimcore"
                  type="submit"
                  className="h-11 w-full sm:ml-auto"
                  disabled={isPending}
                >
                  {isPending ? registerCopy.submittingLabel : registerCopy.submitLabel}
                </Button>
              )}
            </div>
          </FieldGroup>
        </div>
      </div>
    </form>
  );
}
