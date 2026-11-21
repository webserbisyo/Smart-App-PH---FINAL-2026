import * as React from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeftIcon } from 'lucide-react';
import { authWords, errorWords, signupWords } from '@smartapp/core';
import { errorCodeOf, useResetPassword, useSendResetCode } from '@smartapp/data';
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
import { notify } from '@smartapp/ui/compositions/notify';
import { OtpResend } from '@smartapp/ui/compositions/otp-resend';
import { supabase } from '@/app/supabase';
import { useOnlineStatus } from '@/app/use-online-status';
import { usePageTitle } from '@/app/use-page-title';
import { AuthFrame } from '../auth-frame.js';
import { PasswordInput } from '../password-input.js';

const W = authWords.forgotPage;
const RESEND_SECONDS = 60;
// When Resend unlocks again.
const nextResend = () => new Date(Date.now() + RESEND_SECONDS * 1000).toISOString();
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Forgot password (T108 L5): the login email gets a 6-digit code, then the code and a new password log the
 * owner in. The first step answers the same for every email, so it never tells who has a shop (rule 12).
 */
export function ForgotScreen() {
  usePageTitle(W.pageTitle);
  const navigate = useNavigate();
  const online = useOnlineStatus();
  const send = useSendResetCode(supabase);
  const reset = useResetPassword(supabase);
  const [step, setStep] = React.useState<'email' | 'code'>('email');
  const [email, setEmail] = React.useState('');
  const [code, setCode] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [tried, setTried] = React.useState(false);
  const [resendAt, setResendAt] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const heading = React.useRef<HTMLHeadingElement>(null);

  const clean = email.trim().toLowerCase();
  const emailBad = tried && !EMAIL.test(clean);
  const codeBad = tried && !/^\d{6}$/.test(code);
  const passwordBad = tried && password.length < 8;

  const sendCode = async (resend: boolean) => {
    setError(null);
    try {
      await send.mutateAsync({ email: clean });
      setResendAt(nextResend());
      if (resend) notify({ title: W.resent, tone: 'success' });
      else {
        setTried(false);
        setStep('code');
        requestAnimationFrame(() => heading.current?.focus());
      }
    } catch (err) {
      setError(errorWords(errorCodeOf(err)));
    }
  };

  const save = async () => {
    setTried(true);
    setError(null);
    if (!/^\d{6}$/.test(code) || password.length < 8) return;
    try {
      await reset.mutateAsync({ email: clean, code, newPassword: password });
      notify({ title: W.done, tone: 'success' });
      await navigate({ to: '/' });
    } catch (err) {
      const c = errorCodeOf(err);
      setError(errorWords(c === 'unknown' ? 'invalid_code' : c));
    }
  };

  return (
    <AuthFrame>
      <Card className="elevation-sm">
        <CardHeader>
          <CardTitle>
            <h1 ref={heading} tabIndex={-1} className="text-xl font-bold outline-none">
              {step === 'email' ? W.title : W.codeTitle}
            </h1>
          </CardTitle>
          <CardDescription>{step === 'email' ? W.line : W.sent(clean)}</CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'email' ? (
            <form
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                setTried(true);
                if (EMAIL.test(clean)) void sendCode(false);
              }}
            >
              <FieldGroup>
                {error ? <FieldError>{error}</FieldError> : null}
                <Field data-invalid={emailBad ? true : undefined}>
                  <FieldLabel htmlFor="fp-email">{W.email}</FieldLabel>
                  <Input
                    id="fp-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    className="h-11 text-base md:text-sm"
                    value={email}
                    maxLength={254}
                    aria-invalid={emailBad ? true : undefined}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  {emailBad ? <FieldError>{signupWords.you.emailBad}</FieldError> : null}
                </Field>
                <Button
                  type="submit"
                  className="h-12 w-full text-base font-semibold"
                  disabled={!online || send.isPending}
                >
                  {!online ? authWords.offline : send.isPending ? W.sending : W.send}
                </Button>
              </FieldGroup>
            </form>
          ) : (
            <form
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                void save();
              }}
            >
              <FieldGroup>
                {error ? <FieldError>{error}</FieldError> : null}
                <OtpResend
                  id="fp-code"
                  value={code}
                  onChange={(v) => {
                    setCode(v);
                    setError(null);
                  }}
                  label={W.code}
                  sentLine={W.sent(clean)}
                  hint={W.hint}
                  resendAt={resendAt}
                  resending={send.isPending}
                  onResend={() => void sendCode(true)}
                  resendLabel={W.resend}
                  resendInLabel={W.resendIn}
                  error={codeBad ? W.codeBad : null}
                  disabled={reset.isPending}
                />
                <Field data-invalid={passwordBad ? true : undefined}>
                  <FieldLabel htmlFor="fp-password">{W.newPassword}</FieldLabel>
                  <PasswordInput
                    id="fp-password"
                    capsId="fp-password-caps"
                    autoComplete="new-password"
                    value={password}
                    maxLength={72}
                    aria-invalid={passwordBad ? true : undefined}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  {passwordBad ? (
                    <FieldError>{W.passwordBad}</FieldError>
                  ) : (
                    <FieldDescription>{W.newPasswordHelp}</FieldDescription>
                  )}
                </Field>
                <Button
                  type="submit"
                  className="h-12 w-full text-base font-semibold"
                  disabled={!online || reset.isPending}
                >
                  {!online ? authWords.offline : reset.isPending ? W.saving : W.save}
                </Button>
                <Button
                  type="button"
                  variant="link"
                  className="h-11 self-center"
                  onClick={() => {
                    setStep('email');
                    setCode('');
                    setError(null);
                  }}
                >
                  {W.wrongEmail}
                </Button>
              </FieldGroup>
            </form>
          )}
          <p className="mt-6 text-center text-sm">
            <Link
              to="/login"
              className="inline-flex min-h-11 items-center gap-1.5 font-medium text-foreground underline-offset-4 hover:underline"
            >
              <ArrowLeftIcon aria-hidden="true" className="size-4" />
              {W.back}
            </Link>
          </p>
        </CardContent>
      </Card>
    </AuthFrame>
  );
}
