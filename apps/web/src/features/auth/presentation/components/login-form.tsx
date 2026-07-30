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
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

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
          <p className="font-bold uppercase tracking-[0.2em] text-primary">
            {loginCopy.eyebrow}
          </p>
          <h1 className="text-4xl font-medium tracking-tight">
            {loginCopy.title}
          </h1>
          <p className="max-w-sm text-balance text-sm">
            {loginCopy.description}
          </p>
        </div>
        <Field>
          <FieldLabel htmlFor="identifier">
            {loginCopy.identifierLabel}
          </FieldLabel>
          <Input
            id="identifier"
            name="identifier"
            type="text"
            autoComplete="username"
            placeholder={loginCopy.identifierPlaceholder}
            required
          />
        </Field>
        <Field>
          <div className="flex items-center">
            <FieldLabel htmlFor="password">
              {loginCopy.passwordLabel}
            </FieldLabel>
          </div>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={isPasswordVisible ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder={loginCopy.passwordPlaceholder}
              className="pr-10"
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
        {error ? (
          <FieldDescription className="text-destructive">
            {error}
          </FieldDescription>
        ) : null}
        <Field>
          <Button
            variant={'vimcore'}
            type="submit"
            className="h-12 hover:shadow-2xl"
            disabled={isPending}
          >
            {isPending ? loginCopy.submittingLabel : loginCopy.submitLabel}
          </Button>
        </Field>
        <p className="text-center text-sm text-muted-foreground">
          ¿Necesitas crear una cuenta?{' '}
          <Link className="font-medium text-primary underline-offset-4 hover:underline" to="/register">
            Registra tu empresa
          </Link>
        </p>
      </FieldGroup>
    </form>
  );
}
