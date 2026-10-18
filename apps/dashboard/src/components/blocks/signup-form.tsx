import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from '@tanstack/react-router';
import { ApiErrorSchema, SignUpSchema, words, type SignUpInput } from '@smartapp/core';
import { useSignUp } from '@smartapp/data';
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
import { supabase } from '../../lib/supabase.js';
import { useOnlineStatus } from '../../lib/use-online-status.js';

export function SignupForm({ className, ...props }: React.ComponentProps<'div'>) {
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();
  const isOffline = !isOnline;
  const signUp = useSignUp(supabase);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignUpInput>({
    resolver: zodResolver(SignUpSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
    },
  });

  async function onSubmit(data: SignUpInput): Promise<void> {
    setFormError(null);
    try {
      await signUp.mutateAsync(data);
      await navigate({ to: '/' });
    } catch (err: unknown) {
      const parsed = ApiErrorSchema.safeParse(err);
      if (parsed.success && parsed.data.code === 'email_taken') {
        setError('email', {
          type: 'manual',
          message: words.errors.emailTaken,
        });
      } else {
        setFormError(words.errors.unknown);
      }
    }
  }

  const buttonText = isOffline
    ? words.auth.offline
    : isSubmitting
      ? words.auth.signingUp
      : words.auth.signupButton;

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>{words.auth.signupTitle}</CardTitle>
          <CardDescription>{words.auth.signupSubtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void handleSubmit(onSubmit)(e)}>
            <FieldGroup>
              {formError ? <FieldError>{formError}</FieldError> : null}
              <Field data-invalid={Boolean(errors.fullName)}>
                <FieldLabel htmlFor="fullName">{words.auth.fullNameLabel}</FieldLabel>
                <Input
                  id="fullName"
                  type="text"
                  autoComplete="name"
                  placeholder={words.auth.fullNamePlaceholder}
                  disabled={isSubmitting}
                  aria-invalid={Boolean(errors.fullName)}
                  aria-describedby={errors.fullName ? 'fullName-error' : undefined}
                  {...register('fullName')}
                />
                {errors.fullName?.message ? (
                  <FieldError id="fullName-error">{errors.fullName.message}</FieldError>
                ) : null}
              </Field>

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
                  autoComplete="new-password"
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
                  {words.auth.haveAccount}{' '}
                  <Link to="/login" className="underline underline-offset-4">
                    {words.auth.logInLink}
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
