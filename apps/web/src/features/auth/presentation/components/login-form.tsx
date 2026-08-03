import { Eye, EyeOff } from 'lucide-react';
import { useState, type FormEvent } from 'react';
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

import type { LoginInput } from '../../domain/auth';
import { loginCopy } from '../login-copy';

type LoginFormProps = Omit<React.ComponentProps<'form'>, 'onSubmit'> & {
  onSubmitCredentials: (input: LoginInput) => void;
  isPending?: boolean;
  error?: string | undefined;
};

export function LoginForm({
  className,
  onSubmitCredentials,
  isPending = false,
  error,
  ...props
}: LoginFormProps) {
  const [identifier, setIdentifier] = useState('');
  const [identifierFocused, setIdentifierFocused] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const identifierLabelFloats = identifierFocused || identifier !== '';
  const passwordLabelFloats = passwordFocused || password !== '';

  const readTextValue = (formData: FormData, name: string) => {
    const value = formData.get(name);
    return typeof value === 'string' ? value : '';
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    onSubmitCredentials({
      identifier: readTextValue(formData, 'identifier'),
      password: readTextValue(formData, 'password'),
    });
  };

  return (
    <form
      className={cn('flex flex-col gap-6', className)}
      onSubmit={handleSubmit}
      {...props}
    >
      <FieldGroup>
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-5xl tracking-tight text-balance ">
            {loginCopy.title}
          </h1>
          <p className="text-sm leading-6 flex flex-col">
            <span className="uppercase">{loginCopy.description__upercase}</span>
            <span className="text-sm leading-6">{loginCopy.description}</span>
          </p>
          <p className="max-w-sm text-balance text-sm"></p>
        </div>
        <div className="flex flex-col gap-9">
          <Field>
            <div className="relative">
              <Input
                id="identifier"
                name="identifier"
                type="text"
                autoComplete="username"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                onFocus={() => setIdentifierFocused(true)}
                onBlur={() => setIdentifierFocused(false)}
                className={cn(
                  'auth-autofill-input text-sm caret-transparent transition-[caret-color] duration-300 ease-in-out',
                  identifierFocused && 'caret-current',
                )}
                required
              />
              <FieldLabel
                htmlFor="identifier"
                className={cn(
                  'pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted-foreground transition-all duration-300 ease-in-out',
                  identifierLabelFloats && 'translate-y-[-200%] text-xs',
                )}
              >
                {loginCopy.identifierLabel}
              </FieldLabel>
            </div>
          </Field>
          <Field>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={isPasswordVisible ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                className={cn(
                  'auth-autofill-input pr-10 text-sm caret-transparent transition-[caret-color] duration-300 ease-in-out',
                  passwordFocused && 'caret-current',
                )}
                required
              />
              <FieldLabel
                htmlFor="password"
                className={cn(
                  'pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted-foreground transition-all duration-300 ease-in-out',
                  passwordLabelFloats && 'translate-y-[-200%] text-xs',
                )}
              >
                {loginCopy.passwordLabel}
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
                  <EyeOff className="cursor-pointer text-gray-500" size={20} />
                ) : (
                  <Eye className="cursor-pointer text-gray-500" size={20} />
                )}
              </button>
            </div>
          </Field>
        </div>
        {error ? (
          <FieldDescription className="text-destructive">
            {error}
          </FieldDescription>
        ) : null}
        <Field>
          <Button
            type="submit"
            className="h-12 mt-4 rounded-xl text-sm font-normal cursor-pointer w-full sm:ml-auto"
            disabled={isPending}
          >
            {isPending ? loginCopy.submittingLabel : loginCopy.submitLabel}
          </Button>
        </Field>
        <p className="text-center text-gray-600 text-xs">
          ¿Necesitas crear una cuenta?{' '}
          <Link
            className="font-medium text-gray-900 transition-all duration-500 ease-in-out hover:underline"
            to="/register"
          >
            Registra tu empresa
          </Link>
        </p>
      </FieldGroup>
    </form>
  );
}
