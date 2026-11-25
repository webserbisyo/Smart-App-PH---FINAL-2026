import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from '@tanstack/react-router';
import {
  authWords,
  LoginSchema,
  PLAN_TRIAL_DAYS,
  previewWords,
  words,
  type LoginInput,
} from '@smartapp/core';
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
import { writePreviewViewer } from '@/app/preview';
import { env } from '@/app/env';
import { ownerAuth } from '@/app/data';
import { useOnlineStatus } from '@/app/use-online-status';
import { PasswordInput } from './password-input.js';

export function LoginForm({ className, ...props }: React.ComponentProps<'div'>) {
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();
  const isOffline = !isOnline;
  const signIn = useSignIn(ownerAuth);
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
      <Card className="elevation-sm">
        <CardHeader>
          <CardTitle>
            <h1 className="text-xl font-bold">{authWords.welcome}</h1>
          </CardTitle>
          <CardDescription>{authWords.welcomeLine}</CardDescription>
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
                  className="h-11 text-base md:text-sm"
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
                <div className="flex items-center justify-between gap-2">
                  <FieldLabel htmlFor="password">{words.auth.passwordLabel}</FieldLabel>
                  <Link
                    to="/forgot"
                    className="-my-3 inline-flex min-h-11 items-center text-sm font-medium text-primary underline-offset-4 hover:underline"
                  >
                    {authWords.forgot}
                  </Link>
                </div>
                <PasswordInput
                  id="password"
                  capsId="password-caps"
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
                <Button
                  type="submit"
                  disabled={isSubmitting || isOffline}
                  className="h-12 w-full text-base font-semibold"
                >
                  {buttonText}
                </Button>
                <FieldDescription className="text-center">
                  {authWords.newHere}{' '}
                  <Link
                    to="/signup"
                    className="font-medium text-foreground underline underline-offset-4"
                  >
                    {authWords.startFree(PLAN_TRIAL_DAYS)}
                  </Link>
                </FieldDescription>
              </Field>
              {/* Sample sign-in (T100): development and preview builds on sample data only. */}
              {(import.meta.env.DEV || import.meta.env.VITE_APP_ENV === 'preview') &&
              env.VITE_DATA_SOURCE === 'mock' ? (
                <Field>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      writePreviewViewer('kanto-smash');
                      void navigate({ to: '/' });
                    }}
                  >
                    {previewWords.sampleSignIn}
                  </Button>
                  <FieldDescription className="text-center">
                    {previewWords.sampleSignInLine}
                  </FieldDescription>
                </Field>
              ) : null}
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
