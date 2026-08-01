import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useRef, useState, type FormEvent } from 'react';

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
  const [emailFocused, setEmailFocused] = useState(false);
  const [username, setUsername] = useState('');
  const [usernameFocused, setUsernameFocused] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [passwordMismatch, setPasswordMismatch] = useState(false);
  const submitAuthorizedRef = useRef(false);

  const currentStep = step + 1;
  const emailLabelFloats = emailFocused || email !== '';
  const usernameLabelFloats = usernameFocused || username !== '';
  const passwordLabelFloats = passwordFocused || password !== '';
  const confirmPasswordLabelFloats =
    confirmPasswordFocused || confirmPassword !== '';

  const validateStepOne = () => {
    const isEmailValid = emailRef.current?.reportValidity() ?? false;
    const isUsernameValid = usernameRef.current?.reportValidity() ?? false;

    if (isEmailValid && isUsernameValid) {
      setStep(1);
    }
  };

  const validateStepTwo = () => {
    const isPasswordValid = passwordRef.current?.reportValidity() ?? false;
    const isConfirmPasswordValid =
      confirmPasswordRef.current?.reportValidity() ?? false;

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
      if (step === 0) {
        validateStepOne();
      } else {
        validateStepTwo();
      }
      return;
    }

    if (!submitAuthorizedRef.current) {
      return;
    }
    submitAuthorizedRef.current = false;

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

  return (
    <form
      className={cn('w-full', className)}
      onSubmit={handleSubmit}
      noValidate
      {...props}
    >
      <div className="flex w-full flex-col justify-center gap-5">
        <div className="space-y-4 text-center">
          <h1 className="text-5xl tracking-tight text-balance ">
            {registerCopy.eyebrow}
          </h1>
          <p className="text-sm leading-6 flex flex-col">
            <span className="uppercase">{registerCopy.title}</span>
            <span className="text-sm leading-6">
              {registerCopy.description}
            </span>
          </p>

          <div className="flex w-full h-auto items-center justify-between">
            {step > 0 ? (
              <Button
                type="button"
                variant="icons"
                className="h-12 w-12 cursor-pointer"
                onClick={() => {
                  setPasswordMismatch(false);
                  setStep((current) => Math.max(0, current - 1));
                }}
              >
                <ArrowLeft className="size-6" color="#000" />
              </Button>
            ) : null}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {registerCopy.progressLabel
                  .replace('{current}', String(currentStep))
                  .replace('{total}', String(totalSteps))}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-card py-5 sm:p-6">
          <FieldGroup className="">
            <div className="flex flex-col gap-8">
              <Field className={step === 0 ? undefined : 'hidden'}>
                <div className="relative">
                  <Input
                    ref={emailRef}
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                    className={cn(
                      'caret-transparent transition-[caret-color] duration-300 ease-in-out',
                      emailFocused && 'caret-current',
                    )}
                    required
                  />
                  <FieldLabel
                    htmlFor="email"
                    className={cn(
                      'pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted-foreground transition-all duration-300 ease-in-out',
                      emailLabelFloats && 'translate-y-[-200%] text-xs',
                    )}
                  >
                    {registerCopy.emailLabel}
                  </FieldLabel>
                </div>
              </Field>

              <Field className={step === 0 ? undefined : 'hidden'}>
                <div className="relative">
                  <Input
                    ref={usernameRef}
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    minLength={3}
                    pattern="[a-z0-9._-]+"
                    value={username}
                    onChange={(event) =>
                      setUsername(event.target.value.toLowerCase())
                    }
                    onFocus={() => setUsernameFocused(true)}
                    onBlur={() => setUsernameFocused(false)}
                    className={cn(
                      'caret-transparent transition-[caret-color] duration-300 ease-in-out',
                      usernameFocused && 'caret-current',
                    )}
                    required
                  />
                  <FieldLabel
                    htmlFor="username"
                    className={cn(
                      'pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted-foreground transition-all duration-300 ease-in-out',
                      usernameLabelFloats && 'translate-y-[-200%] text-xs',
                    )}
                  >
                    {registerCopy.usernameLabel}
                  </FieldLabel>
                </div>
              </Field>

              <Field className={step === 1 ? undefined : 'hidden'}>
                <div className="relative">
                  <Input
                    ref={passwordRef}
                    id="register-password"
                    name="password"
                    type={isPasswordVisible ? 'text' : 'password'}
                    autoComplete="new-password"
                    minLength={8}
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setPasswordMismatch(false);
                    }}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    className={cn(
                      'pr-10 caret-transparent transition-[caret-color] duration-300 ease-in-out',
                      passwordFocused && 'caret-current',
                    )}
                    required
                  />
                  <FieldLabel
                    htmlFor="register-password"
                    className={cn(
                      'pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted-foreground transition-all duration-300 ease-in-out',
                      passwordLabelFloats && 'translate-y-[-200%] text-xs',
                    )}
                  >
                    {registerCopy.passwordLabel}
                  </FieldLabel>
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => setIsPasswordVisible((visible) => !visible)}
                    aria-label={
                      isPasswordVisible
                        ? 'Ocultar contraseña'
                        : 'Mostrar contraseña'
                    }
                    aria-pressed={isPasswordVisible}
                  >
                    {isPasswordVisible ? (
                      <EyeOff
                        className="cursor-pointer text-muted-foreground"
                        size={20}
                      />
                    ) : (
                      <Eye
                        className="cursor-pointer text-muted-foreground"
                        size={20}
                      />
                    )}
                  </button>
                </div>
              </Field>

              <Field className={step === 1 ? undefined : 'hidden'}>
                <div className="relative">
                  <Input
                    ref={confirmPasswordRef}
                    id="confirm-password"
                    name="confirmPassword"
                    type={isPasswordVisible ? 'text' : 'password'}
                    autoComplete="new-password"
                    minLength={8}
                    value={confirmPassword}
                    onChange={(event) => {
                      setConfirmPassword(event.target.value);
                      setPasswordMismatch(false);
                    }}
                    onFocus={() => setConfirmPasswordFocused(true)}
                    onBlur={() => setConfirmPasswordFocused(false)}
                    className={cn(
                      'caret-transparent transition-[caret-color] duration-300 ease-in-out',
                      confirmPasswordFocused && 'caret-current',
                    )}
                    required
                  />
                  <FieldLabel
                    htmlFor="confirm-password"
                    className={cn(
                      'pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted-foreground transition-all duration-300 ease-in-out',
                      confirmPasswordLabelFloats &&
                        'translate-y-[-200%] text-xs',
                    )}
                  >
                    {registerCopy.confirmPasswordLabel}
                  </FieldLabel>
                </div>
              </Field>

              <div className={step === 2 ? 'space-y-3' : 'hidden'}>
                <div className="rounded-lg bg-muted/50 p-4">
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">
                        {registerCopy.reviewEmailLabel}
                      </span>
                      <span className="font-medium text-foreground">
                        {email || '-'}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">
                        {registerCopy.reviewUsernameLabel}
                      </span>
                      <span className="font-medium text-foreground">
                        {username || '-'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border p-4">
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
              {step < totalSteps - 1 ? (
                <Button
                  variant="default"
                  type="button"
                  className="h-12 mt-4 rounded-xl text-sm font-normal cursor-pointer w-full sm:ml-auto"
                  onClick={step === 0 ? validateStepOne : validateStepTwo}
                >
                  {registerCopy.continueLabel}
                </Button>
              ) : (
                <Button
                  variant="default"
                  type="submit"
                  className="h-12 mt-4 rounded-xl text-sm font-normal cursor-pointer w-full sm:ml-auto"
                  onClick={() => {
                    submitAuthorizedRef.current = true;
                  }}
                  disabled={isPending}
                >
                  {isPending
                    ? registerCopy.submittingLabel
                    : registerCopy.submitLabel}
                </Button>
              )}
            </div>
          </FieldGroup>
        </div>
      </div>
    </form>
  );
}
