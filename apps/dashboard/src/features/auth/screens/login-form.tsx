import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from '@tanstack/react-router';
import { LoginSchema, words, type LoginInput } from '@smartapp/core';
import { useSignIn } from '@smartapp/data';
import { Button } from '@smartapp/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@smartapp/ui/components/card';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@smartapp/ui/components/field';
import { Input } from '@smartapp/ui/components/input';
import { cn } from '@smartapp/ui/lib/utils';
import { supabase } from '../../../app/supabase.js';
import { useOnlineStatus } from '../../../app/use-online-status.js';

export function LoginForm({ className, ...props }: React.ComponentProps<'div'>) {
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();
  const isOffline = !isOnline;
  const signIn = useSignIn(supabase);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(data: LoginInput): Promise<void> {
    setFormError(null);
    try {
      await signIn.mutateAsync(data);
      await navigate({ to: '/' });
    } catch {
      setFormError(words.errors.invalidLogin);
    }
  }

  const buttonText = isOffline
    ? words.auth.offline
    : isSubmitting
      ? words.auth.loggingIn
      : words.auth.loginButton;

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>{words.auth.loginTitle}</CardTitle>
          <CardDescription>{words.auth.loginSubtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void handleSubmit(onSubmit)(e)}>
            <FieldGroup>
              {formError ? <FieldError>{formError}</FieldError> : null}
              <Field data-invalid={Boolean(errors.email)}>
                <FieldLabel htmlFor="email">{words.auth.emailLabel}</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder={words.auth.emailPlaceholder}
                  disabled={isSubmitting}
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                  {...register('email')}
                />
                {errors.email?.message ? (
                  <FieldError id="email-error">{errors.email.message}</FieldError>
                ) : null}
              </Field>
              <Field data-invalid={Boolean(errors.password)}>
                <FieldLabel htmlFor="password">{words.auth.passwordLabel}</FieldLabel>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder={words.auth.passwordPlaceholder}
                  disabled={isSubmitting}
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                  {...register('password')}
                />
                {errors.password?.message ? (
                  <FieldError id="password-error">{errors.password.message}</FieldError>
                ) : null}
              </Field>
              <Field>
                <Button type="submit" disabled={isSubmitting || isOffline} className="w-full">
                  {buttonText}
                </Button>
                <FieldDescription className="text-center">
                  {words.auth.noAccount}{' '}
                  <Link to="/signup" className="underline underline-offset-4">
                    {words.auth.signUpLink}
                  </Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
