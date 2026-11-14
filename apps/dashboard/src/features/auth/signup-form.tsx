import * as React from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, PackageIcon, UtensilsIcon } from 'lucide-react';
import {
  ApiErrorSchema,
  errorWords,
  normalisePhPhone,
  signupWords,
  type ErrorCode,
  ShopKind,
  type SignupSource,
} from '@smartapp/core';
import {
  errorCodeOf,
  useRegisterShop,
  useResendSignupCode,
  useSaveSignupLead,
  useSignUp,
  useVerifySignupCode,
} from '@smartapp/data';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@smartapp/ui/components/card';
import { Checkbox } from '@smartapp/ui/components/checkbox';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@smartapp/ui/components/field';
import { Input } from '@smartapp/ui/components/input';
import { MaskInput } from '@smartapp/ui/components/mask-input';
import { Button } from '@smartapp/ui/components/button';
import {
  Stepper,
  StepperIndicator,
  StepperItem,
  StepperNav,
  StepperSeparator,
  StepperTitle,
} from '@smartapp/ui/components/reui/stepper';
import { ToggleGroup, ToggleGroupItem } from '@smartapp/ui/components/toggle-group';
import { AsyncButton, useAsyncAction } from '@smartapp/ui/compositions/async-button';
import { notify } from '@smartapp/ui/compositions/notify';
import { OtpResend } from '@smartapp/ui/compositions/otp-resend';
import { cn } from 'cn';
import { newEventId, pixelTrack, readFbp, type Attribution } from '@/app/meta-pixel';
import { supabase } from '@/app/supabase';
import { useOnlineStatus } from '@/app/use-online-status';

const W = signupWords;
const TERMS_VERSION = '2026-11';
const RESEND_SECONDS = 60;
const KIND_ICON: Record<ShopKind, React.ReactNode> = {
  food: <UtensilsIcon aria-hidden="true" />,
  retail: <PackageIcon aria-hidden="true" />,
};

type Step = 1 | 2 | 3;

interface You {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  terms: boolean;
}

interface Shop {
  shopName: string;
  kind: ShopKind;
  city: string;
  facebookPage: string;
}

/** An error's code: from the API, or from the login library's own error shape. */
function codeOf(err: unknown): ErrorCode {
  const fromApi = errorCodeOf(err);
  if (fromApi !== 'unknown') return fromApi;
  const parsed = ApiErrorSchema.safeParse(err);
  return parsed.success ? parsed.data.code : 'unknown';
}

function youProblems(you: You): Partial<Record<keyof You, string>> {
  const out: Partial<Record<keyof You, string>> = {};
  if (you.fullName.trim().length < 2) out.fullName = W.you.fullNameBad;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(you.email.trim())) out.email = W.you.emailBad;
  if (!normalisePhPhone(you.phone).ok) out.phone = W.you.phoneBad;
  if (you.password.length < 8) out.password = W.you.passwordBad;
  if (!you.terms) out.terms = W.you.termsBad;
  return out;
}

function shopProblems(shop: Shop): Partial<Record<keyof Shop, string>> {
  const out: Partial<Record<keyof Shop, string>> = {};
  if (shop.shopName.trim().length < 2) out.shopName = W.shop.shopNameBad;
  if (shop.city.trim().length < 2) out.city = W.shop.cityBad;
  return out;
}

/**
 * The sign-up form (decision T89): 1 You, saved as a lead on Continue; 2 Your shop; 3 the email code. Every
 * step tells Meta through NestJS with the same id the pixel used (T90).
 */
export function SignupForm({
  attribution,
  className,
}: {
  attribution: Attribution;
  className?: string | undefined;
}) {
  const navigate = useNavigate();
  const online = useOnlineStatus();
  const saveLead = useSaveSignupLead();
  const signUp = useSignUp(supabase);
  const verify = useVerifySignupCode(supabase);
  const resend = useResendSignupCode(supabase);
  const register = useRegisterShop();
  const nextAction = useAsyncAction();
  const createAction = useAsyncAction();
  const [step, setStep] = React.useState<Step>(1);
  const [tried, setTried] = React.useState(false);
  const [leadId, setLeadId] = React.useState<string | null>(null);
  const [you, setYou] = React.useState<You>({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    terms: false,
  });
  const [shop, setShop] = React.useState<Shop>({
    shopName: '',
    kind: 'food',
    city: '',
    facebookPage: '',
  });
  const [code, setCode] = React.useState('');
  const [codeError, setCodeError] = React.useState<string | null>(null);
  const [resendAt, setResendAt] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [emailTaken, setEmailTaken] = React.useState(false);
  const heading = React.useRef<HTMLHeadingElement>(null);

  const yp = youProblems(you);
  const sp = shopProblems(shop);
  const show = <T extends string>(problems: Partial<Record<T, string>>, key: T) =>
    tried ? problems[key] : undefined;

  const pageUrl = () => window.location.href.split('#')[0] ?? window.location.href;
  const ids = () => ({ fbp: readFbp(), fbc: attribution.fbc, pageUrl: pageUrl() });
  const source: SignupSource = attribution.source;

  const goTo = (next: Step) => {
    setStep(next);
    setTried(false);
    setFormError(null);
    requestAnimationFrame(() => heading.current?.focus());
  };

  // Step 1: the lead is saved now, so the founder can call someone who stops here.
  const onYou = async () => {
    setTried(true);
    setEmailTaken(false);
    if (Object.keys(yp).length > 0) return;
    const phone = normalisePhPhone(you.phone);
    if (!phone.ok) return;
    const eventId = newEventId('Lead');
    pixelTrack('Lead', eventId);
    try {
      await nextAction.run(async () => {
        const res = await saveLead.mutateAsync({
          fullName: you.fullName.trim(),
          email: you.email.trim().toLowerCase(),
          phone: phone.e164,
          termsVersion: TERMS_VERSION,
          source,
          eventId,
          ...ids(),
        });
        setLeadId(res.leadId);
      });
      goTo(2);
    } catch (err) {
      const c = codeOf(err);
      if (c === 'email_taken') {
        setEmailTaken(true);
        return;
      }
      // A lead that didn't save never stops a sign-up.
      if (c === 'offline') setFormError(W.offline);
      else goTo(2);
    }
  };

  const finish = async () => {
    const eventId = newEventId('CompleteRegistration');
    pixelTrack('CompleteRegistration', eventId);
    await register.mutateAsync({
      leadId,
      shop: {
        shopName: shop.shopName.trim(),
        kind: shop.kind,
        city: shop.city.trim(),
        facebookPage: shop.facebookPage.trim() === '' ? null : shop.facebookPage.trim(),
      },
      eventId,
      ...ids(),
    });
    notify({
      title: W.done.title(you.fullName.trim().split(/\s+/)[0] ?? ''),
      description: W.done.line,
      tone: 'success',
    });
    await navigate({ to: '/' });
  };

  // Step 2: the account (Supabase Auth behind NestJS later, T34), then the code, or straight in.
  const onShop = async () => {
    setTried(true);
    if (Object.keys(sp).length > 0) return;
    const phone = normalisePhPhone(you.phone);
    try {
      await createAction.run(async () => {
        const res = await signUp.mutateAsync({
          fullName: you.fullName.trim(),
          email: you.email.trim().toLowerCase(),
          password: you.password,
          phone: phone.ok ? phone.e164 : undefined,
        });
        if (res.session) await finish();
        else {
          setResendAt(new Date(Date.now() + RESEND_SECONDS * 1000).toISOString());
          goTo(3);
        }
      });
    } catch (err) {
      const c = codeOf(err);
      if (c === 'email_taken') {
        setEmailTaken(true);
        goTo(1);
        return;
      }
      setFormError(c === 'unknown' ? W.error : errorWords(c));
    }
  };

  const onCode = async (value: string) => {
    setCodeError(null);
    if (!/^\d{6}$/.test(value)) {
      setCodeError(W.code.bad);
      return;
    }
    try {
      await verify.mutateAsync({ email: you.email.trim().toLowerCase(), code: value });
      await finish();
    } catch (err) {
      const c = codeOf(err);
      setCodeError(errorWords(c === 'unknown' ? 'invalid_code' : c));
    }
  };

  return (
    <Card className={cn('elevation-sm', className)}>
      <CardHeader className="gap-4">
        <Stepper value={step} indicators={{}} className="w-full">
          <StepperNav>
            {([1, 2, 3] as const).map((n, i) => (
              <StepperItem
                key={n}
                step={n}
                completed={step > n}
                className="relative items-start not-last:flex-1"
              >
                <div className="flex flex-col items-center gap-1.5">
                  <StepperIndicator className="size-8">
                    <span
                      className={cn(
                        'flex size-8 items-center justify-center rounded-full text-sm font-semibold tabular-nums',
                        step > n
                          ? 'bg-primary text-primary-foreground'
                          : step === n
                            ? 'bg-primary/10 text-primary ring-2 ring-primary'
                            : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {step > n ? <CheckIcon className="size-4" aria-hidden="true" /> : n}
                    </span>
                  </StepperIndicator>
                  <StepperTitle
                    className={cn(
                      'text-xs whitespace-nowrap',
                      step === n ? 'font-bold text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    {n === 1 ? W.steps.you : n === 2 ? W.steps.shop : W.steps.code}
                  </StepperTitle>
                </div>
                {i < 2 ? (
                  <StepperSeparator className={cn('mx-2 mt-4 flex-1', step > n && 'bg-primary')} />
                ) : null}
              </StepperItem>
            ))}
          </StepperNav>
        </Stepper>
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium text-muted-foreground tabular-nums">
            {W.progress(step)}
          </p>
          <CardTitle>
            <h2 ref={heading} tabIndex={-1} className="outline-none">
              {step === 1 ? W.you.title : step === 2 ? W.shop.title : W.code.title}
            </h2>
          </CardTitle>
          {step === 3 ? <CardDescription>{W.code.sent(you.email.trim())}</CardDescription> : null}
        </div>
      </CardHeader>
      <CardContent>
        {step === 1 ? (
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              void onYou();
            }}
          >
            <FieldGroup>
              {formError ? <FieldError>{formError}</FieldError> : null}
              <Field data-invalid={show(yp, 'fullName') ? true : undefined}>
                <FieldLabel htmlFor="su-name">{W.you.fullName}</FieldLabel>
                <Input
                  id="su-name"
                  autoComplete="name"
                  className="h-11 text-base md:text-sm"
                  placeholder={W.you.fullNamePlaceholder}
                  value={you.fullName}
                  maxLength={80}
                  aria-invalid={show(yp, 'fullName') ? true : undefined}
                  onChange={(e) => setYou({ ...you, fullName: e.target.value })}
                />
                {show(yp, 'fullName') ? <FieldError>{yp.fullName}</FieldError> : null}
              </Field>
              <Field data-invalid={show(yp, 'email') || emailTaken ? true : undefined}>
                <FieldLabel htmlFor="su-email">{W.you.email}</FieldLabel>
                <Input
                  id="su-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  className="h-11 text-base md:text-sm"
                  placeholder={W.you.emailPlaceholder}
                  value={you.email}
                  maxLength={254}
                  aria-invalid={show(yp, 'email') || emailTaken ? true : undefined}
                  onChange={(e) => {
                    setEmailTaken(false);
                    setYou({ ...you, email: e.target.value });
                  }}
                />
                {emailTaken ? (
                  <FieldError>
                    {W.emailTaken}{' '}
                    <Link to="/login" className="underline underline-offset-4">
                      {W.logIn}
                    </Link>
                  </FieldError>
                ) : show(yp, 'email') ? (
                  <FieldError>{yp.email}</FieldError>
                ) : (
                  <FieldDescription>{W.you.emailHelp}</FieldDescription>
                )}
              </Field>
              <Field data-invalid={show(yp, 'phone') ? true : undefined}>
                <FieldLabel htmlFor="su-phone">{W.you.phone}</FieldLabel>
                <MaskInput
                  id="su-phone"
                  mask={{
                    pattern: '####-###-####',
                    transform: (val) => val.replace(/\D/g, ''),
                    validate: (val) => normalisePhPhone(val).ok,
                  }}
                  inputMode="numeric"
                  autoComplete="tel-national"
                  className="h-11 text-base md:text-sm"
                  placeholder={W.you.phonePlaceholder}
                  value={you.phone}
                  aria-invalid={show(yp, 'phone') ? true : undefined}
                  onValueChange={(_, unmasked) => setYou({ ...you, phone: unmasked })}
                />
                {show(yp, 'phone') ? (
                  <FieldError>{yp.phone}</FieldError>
                ) : (
                  <FieldDescription>{W.you.phoneHelp}</FieldDescription>
                )}
              </Field>
              <Field data-invalid={show(yp, 'password') ? true : undefined}>
                <FieldLabel htmlFor="su-password">{W.you.password}</FieldLabel>
                <Input
                  id="su-password"
                  type="password"
                  autoComplete="new-password"
                  className="h-11 text-base md:text-sm"
                  value={you.password}
                  maxLength={72}
                  aria-invalid={show(yp, 'password') ? true : undefined}
                  onChange={(e) => setYou({ ...you, password: e.target.value })}
                />
                {show(yp, 'password') ? (
                  <FieldError>{yp.password}</FieldError>
                ) : (
                  <FieldDescription>{W.you.passwordHelp}</FieldDescription>
                )}
              </Field>
              <Field
                orientation="horizontal"
                data-invalid={show(yp, 'terms') ? true : undefined}
                className="items-start"
              >
                <Checkbox
                  id="su-terms"
                  checked={you.terms}
                  onCheckedChange={(checked) => setYou({ ...you, terms: checked === true })}
                  aria-invalid={show(yp, 'terms') ? true : undefined}
                  className="mt-0.5 size-5"
                />
                <div className="flex flex-col gap-1">
                  <FieldLabel htmlFor="su-terms" className="font-normal">
                    {W.you.terms}
                  </FieldLabel>
                  {show(yp, 'terms') ? <FieldError>{yp.terms}</FieldError> : null}
                </div>
              </Field>
              <AsyncButton
                type="submit"
                status={nextAction.status}
                busyLabel={W.you.nexting}
                doneLabel={W.you.next}
                disabled={!online}
                className="h-12 w-full text-base font-semibold"
              >
                {online ? W.you.next : W.offline}
                {online ? <ArrowRightIcon aria-hidden="true" /> : null}
              </AsyncButton>
              <p className="text-xs text-muted-foreground">{W.privacyLine}</p>
            </FieldGroup>
          </form>
        ) : null}

        {step === 2 ? (
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              void onShop();
            }}
          >
            <FieldGroup>
              {formError ? <FieldError>{formError}</FieldError> : null}
              <Field data-invalid={show(sp, 'shopName') ? true : undefined}>
                <FieldLabel htmlFor="su-shop">{W.shop.shopName}</FieldLabel>
                <Input
                  id="su-shop"
                  autoComplete="organization"
                  className="h-11 text-base md:text-sm"
                  placeholder={W.shop.shopNamePlaceholder}
                  value={shop.shopName}
                  maxLength={60}
                  aria-invalid={show(sp, 'shopName') ? true : undefined}
                  onChange={(e) => setShop({ ...shop, shopName: e.target.value })}
                />
                {show(sp, 'shopName') ? <FieldError>{sp.shopName}</FieldError> : null}
              </Field>
              <Field>
                <FieldLabel id="su-kind-label">{W.shop.kind}</FieldLabel>
                <ToggleGroup
                  aria-labelledby="su-kind-label"
                  value={[shop.kind]}
                  onValueChange={(value) => {
                    const next = ShopKind.find((k) => k === value[0]);
                    if (next) setShop({ ...shop, kind: next });
                  }}
                  className="grid w-full grid-cols-2"
                >
                  {ShopKind.map((k) => (
                    <ToggleGroupItem key={k} value={k} className="h-11 gap-2">
                      {KIND_ICON[k]}
                      {W.shop.kinds[k]}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
                <FieldDescription>{W.shop.kindHelp}</FieldDescription>
              </Field>
              <Field data-invalid={show(sp, 'city') ? true : undefined}>
                <FieldLabel htmlFor="su-city">{W.shop.city}</FieldLabel>
                <Input
                  id="su-city"
                  autoComplete="address-level2"
                  className="h-11 text-base md:text-sm"
                  placeholder={W.shop.cityPlaceholder}
                  value={shop.city}
                  maxLength={60}
                  aria-invalid={show(sp, 'city') ? true : undefined}
                  onChange={(e) => setShop({ ...shop, city: e.target.value })}
                />
                {show(sp, 'city') ? <FieldError>{sp.city}</FieldError> : null}
              </Field>
              <Field>
                <FieldLabel htmlFor="su-fb">{W.shop.facebook}</FieldLabel>
                <Input
                  id="su-fb"
                  inputMode="url"
                  className="h-11 text-base md:text-sm"
                  placeholder={W.shop.facebookPlaceholder}
                  value={shop.facebookPage}
                  maxLength={200}
                  onChange={(e) => setShop({ ...shop, facebookPage: e.target.value })}
                />
                <FieldDescription>{W.shop.facebookHelp}</FieldDescription>
              </Field>
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="h-12" onClick={() => goTo(1)}>
                  <ArrowLeftIcon aria-hidden="true" />
                  {W.shop.back}
                </Button>
                <AsyncButton
                  type="submit"
                  status={createAction.status}
                  busyLabel={W.shop.creating}
                  doneLabel={W.shop.create}
                  disabled={!online}
                  className="h-12 flex-1 text-base font-semibold"
                >
                  {online ? W.shop.create : W.offline}
                </AsyncButton>
              </div>
            </FieldGroup>
          </form>
        ) : null}

        {step === 3 ? (
          <div className="flex flex-col gap-4">
            <OtpResend
              id="su-code"
              value={code}
              onChange={(v) => {
                setCode(v);
                setCodeError(null);
              }}
              onComplete={(v) => void onCode(v)}
              label={W.code.label}
              sentLine={W.code.sent(you.email.trim())}
              hint={W.code.hint}
              resendAt={resendAt}
              resending={resend.isPending}
              onResend={() => {
                void resend
                  .mutateAsync({ email: you.email.trim().toLowerCase() })
                  .then(() => {
                    setResendAt(new Date(Date.now() + RESEND_SECONDS * 1000).toISOString());
                    notify({ title: W.code.resent, tone: 'success' });
                  })
                  .catch((err: unknown) =>
                    notify({ title: errorWords(codeOf(err)), tone: 'error' }),
                  );
              }}
              resendLabel={W.code.resend}
              resendInLabel={W.code.resendIn}
              error={codeError}
              disabled={verify.isPending || register.isPending}
            />
            <Button
              className="h-12 w-full text-base font-semibold"
              disabled={!online || verify.isPending || register.isPending}
              onClick={() => void onCode(code)}
            >
              {verify.isPending || register.isPending ? W.code.confirming : W.code.confirm}
            </Button>
            <Button variant="link" className="h-11 self-center" onClick={() => goTo(1)}>
              {W.code.wrongEmail}
            </Button>
          </div>
        ) : null}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {W.haveAccount}{' '}
          <Link to="/login" className="font-medium text-foreground underline underline-offset-4">
            {W.logIn}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
