import * as React from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { ShieldCheckIcon } from 'lucide-react';
import { authWords, errorWords, secondStepWords } from '@smartapp/core';
import {
  errorCodeOf,
  useStartSecondStep,
  useVerifySecondStep,
  type UserClaims,
} from '@smartapp/data';
import { Button } from '@smartapp/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@smartapp/ui/components/card';
import { Field, FieldError, FieldGroup, FieldLabel } from '@smartapp/ui/components/field';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@smartapp/ui/components/input-otp';
import { QRCode, QRCodeSvg } from '@smartapp/ui/components/qr-code';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { CopyButton } from '@smartapp/ui/compositions/copy-button';
import { ownerAuth } from '@/app/data';
import { useOnlineStatus } from '@/app/use-online-status';
import { usePageTitle } from '@/app/use-page-title';
import { AuthFrame } from '../auth-frame.js';

const W = secondStepWords;
const LENGTH = 6;

/**
 * Super Admin's second step (T118 Q16): after the password, a 6-digit code from an authenticator app. The
 * first time it shows the app's QR (and the same key as text); every later login asks for the code only.
 * Owners never reach this page: it sits behind the platform admin flag.
 */
export function SecondStepScreen({ claims }: { claims: UserClaims }) {
  usePageTitle(W.pageTitle);
  const navigate = useNavigate();
  const online = useOnlineStatus();
  const enrolling = claims.adminStep === 'enroll';
  const setup = useStartSecondStep(ownerAuth);
  const verify = useVerifySecondStep(ownerAuth);
  const [code, setCode] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const started = React.useRef(false);

  const startSetup = React.useEffectEvent(() => {
    if (!enrolling || started.current) return;
    started.current = true;
    setup.mutate();
  });
  React.useEffect(() => startSetup(), []);

  const submit = async (value: string) => {
    if (value.length !== LENGTH) return;
    setError(null);
    try {
      await verify.mutateAsync({ code: value });
      await navigate({ to: '/admin' });
    } catch (err) {
      setCode('');
      const c = errorCodeOf(err);
      setError(errorWords(c === 'unknown' ? 'invalid_code' : c));
    }
  };

  const qr = setup.data;
  return (
    <AuthFrame>
      <Card className="elevation-sm">
        <CardHeader>
          <CardTitle>
            <h1 className="flex items-center gap-2 text-xl font-bold">
              <ShieldCheckIcon className="size-5 text-primary" aria-hidden="true" />
              {enrolling ? W.setupTitle : W.codeTitle}
            </h1>
          </CardTitle>
          <CardDescription>{enrolling ? W.setupLine : W.codeLine}</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              void submit(code);
            }}
          >
            <FieldGroup>
              {enrolling ? (
                setup.isError ? (
                  <div className="flex flex-col gap-2">
                    <FieldError>{W.loadError}</FieldError>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11"
                      onClick={() => setup.mutate()}
                    >
                      {W.tryAgain}
                    </Button>
                  </div>
                ) : qr ? (
                  <div className="flex flex-col items-center gap-3">
                    <p className="text-sm font-medium text-foreground">{W.scan}</p>
                    {/* Black on white inside the picture, so phone cameras read it in dark mode too. */}
                    <QRCode value={qr.uri} size={176} className="overflow-hidden rounded-xl">
                      <QRCodeSvg aria-label={W.scan} />
                    </QRCode>
                    <p className="text-xs text-muted-foreground">{W.orType}</p>
                    <span className="flex max-w-full items-center gap-1">
                      <code className="truncate rounded-md bg-muted px-2 py-1 font-mono text-sm tracking-wider">
                        {qr.secret}
                      </code>
                      <CopyButton value={qr.secret} iconOnly className="size-11 md:size-9" />
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3" aria-label={W.loading}>
                    <Skeleton className="size-44 rounded-xl" />
                    <Skeleton className="h-6 w-48 rounded-md" />
                  </div>
                )
              ) : null}
              <Field data-invalid={error ? true : undefined}>
                <FieldLabel htmlFor="second-step-code">{W.codeLabel}</FieldLabel>
                <InputOTP
                  id="second-step-code"
                  maxLength={LENGTH}
                  value={code}
                  onChange={(v) => {
                    setCode(v);
                    setError(null);
                  }}
                  onComplete={(v) => void submit(v)}
                  inputMode="numeric"
                  pattern="^[0-9]+$"
                  autoComplete="one-time-code"
                  disabled={verify.isPending || (enrolling && !qr)}
                  aria-invalid={error ? true : undefined}
                  containerClassName="w-full justify-center"
                >
                  <InputOTPGroup className="w-full justify-center gap-1.5 sm:gap-2">
                    {Array.from({ length: LENGTH }, (_, index) => (
                      <InputOTPSlot
                        key={index}
                        index={index}
                        aria-invalid={error ? true : undefined}
                        className="h-12 max-w-12 min-w-0 flex-1 rounded-xl border text-xl font-semibold first:rounded-xl last:rounded-xl sm:h-13 sm:max-w-13"
                      />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
                {error ? <FieldError>{error}</FieldError> : null}
              </Field>
              <Button
                type="submit"
                className="h-12 w-full text-base font-semibold"
                disabled={!online || verify.isPending || code.length !== LENGTH}
              >
                {!online ? authWords.offline : verify.isPending ? W.verifying : W.verify}
              </Button>
              <p className="text-xs text-muted-foreground">{W.lostPhone}</p>
              <Button
                variant="link"
                className="h-11 self-center"
                nativeButton={false}
                render={<Link to="/logout" />}
              >
                {W.signOut}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </AuthFrame>
  );
}
