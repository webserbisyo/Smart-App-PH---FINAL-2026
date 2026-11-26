import * as React from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, PackageIcon, UtensilsIcon } from 'lucide-react';
import {
  ApiErrorSchema,
  BRAND_COLOR_PRESETS,
  errorWords,
  normalisePhPhone,
  signupWords,
  type ErrorCode,
  ShopKind,
  type SignupSource,
} from '@smartapp/core';
import {
  errorCodeOf,
  type UserClaims,
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
import { ColorPicker, ColorPickerSwatches } from '@smartapp/ui/components/reui/color-picker';
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
import { rewardReady } from '@smartapp/ui/compositions/celebrate';
import { notify } from '@smartapp/ui/compositions/notify';
import { OtpResend } from '@smartapp/ui/compositions/otp-resend';
import { cn } from 'cn';
import { newEventId, pixelTrack, readFbp, type Attribution } from '@/app/meta-pixel';
import { ownerAuth } from '@/app/data';
import { useOnlineStatus } from '@/app/use-online-status';
import { PasswordInput } from './password-input.js';

const W = signupWords;
const TERMS_VERSION = '2026-11';
// The ready moment's confetti and toast show this long before the dashboard loads.
const READY_PAUSE_MS = 1400;
const KIND_ICON: Record<ShopKind, React.ReactNode> = {
  food: <UtensilsIcon aria-hidden="true" />,
  retail: <PackageIcon aria-hidden="true" />,
};

type Step = 1 | 2 | 3;

interface You {
  fullName: string;
  email: string;
  phone: string;
  terms: boolean;
}

interface Shop {
  shopName: string;
  kind: ShopKind;
  city: string;
  facebookPage: string;
  colour: string | null;
  password: string;
}

/** What the phone beside the form shows while the person types (T108 L1). */
export interface ShopDraft {
  name: string;
  kind: ShopKind;
  colour: string | null;
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
  if (!you.terms) out.terms = W.you.termsBad;
  return out;
}

function shopProblems(shop: Shop, needsPassword: boolean): Partial<Record<keyof Shop, string>> {
  const out: Partial<Record<keyof Shop, string>> = {};
  if (shop.shopName.trim().length < 2) out.shopName = W.shop.shopNameBad;
  if (shop.city.trim().length < 2) out.city = W.shop.cityBad;
  if (needsPassword && shop.password.length < 8) out.password = W.you.passwordBad;
  return out;
}

/**
 * The sign-up form (decision T89, slimmer step 1 in T108 L3): 1 You (name, email, mobile), saved as a lead on
 * Continue; 2 Your shop, its colour and the password; 3 the email code. Every step tells Meta through NestJS
 * with the same id the pixel used (T90). The shop name, kind and colour go up to the page for the phone.
 * `finishing` is an owner who confirmed the code but has no shop yet: the form opens on step 2, without the
 * password, and makes the shop (T116).
 */
export function SignupForm({
  attribution,
  onDraft,
  finishing = null,
  className,
}: {
  attribution: Attribution;
  onDraft?: ((draft: ShopDraft) => void) | undefined;
  finishing?: UserClaims | null | undefined;
  className?: string | undefined;
}) {
  const online = useOnlineStatus();
  const saveLead = useSaveSignupLead();
  const signUp = useSignUp(ownerAuth);
  const verify = useVerifySignupCode(ownerAuth);
  const resend = useResendSignupCode(ownerAuth);
  const register = useRegisterShop();
  const nextAction = useAsyncAction();
  const createAction = useAsyncAction();
  const [step, setStep] = React.useState<Step>(finishing ? 2 : 1);
  const [tried, setTried] = React.useState(false);
  const [leadId, setLeadId] = React.useState<string | null>(null);
  // The code was right: a second press only makes the shop again (a used code would fail).
  const [verified, setVerified] = React.useState(finishing !== null);
  const [you, setYou] = React.useState<You>({
    fullName: finishing?.fullName ?? '',
    email: finishing?.email ?? '',
    phone: '',
    terms: finishing !== null,
  });
  const [shop, setShopState] = React.useState<Shop>({
    shopName: '',
    kind: 'food',
    city: '',
    facebookPage: '',
    colour: null,
    password: '',
  });
  const setShop = (next: Shop) => {
    setShopState(next);
    onDraft?.({ name: next.shopName, kind: next.kind, colour: next.colour });
  };
  const [code, setCode] = React.useState('');
  const [codeError, setCodeError] = React.useState<string | null>(null);
  const [resendAt, setResendAt] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [emailTaken, setEmailTaken] = React.useState(false);
  const heading = React.useRef<HTMLHeadingElement>(null);

  const yp = youProblems(you);
  const sp = shopProblems(shop, !verified);
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
        brandColor: shop.colour,
      },
      eventId,
      ...ids(),
    });
    // The ready moment (T108): the reward confetti, then the dashboard.
    void rewardReady();
    notify({
      title: W.done.title(you.fullName.trim().split(/\s+/)[0] ?? ''),
      description: W.done.line,
      tone: 'success',
    });
    // A full page load into the dashboard leaves Meta's pixel behind on /signup (T118): it never sees the
    // owner's pages. The short wait lets the confetti and the toast show first.
    await new Promise((done) => window.setTimeout(done, READY_PAUSE_MS));
    window.location.assign('/');
  };

  // Step 2: the account (Supabase Auth behind NestJS, T34) emails the code; an owner who already confirmed it
  // makes the shop straight away.
  const onShop = async () => {
    setTried(true);
    if (Object.keys(sp).length > 0) return;
    try {
      await createAction.run(async () => {
        if (verified) {
          await finish();
          return;
        }
        const res = await signUp.mutateAsync({
          fullName: you.fullName.trim(),
          email: you.email.trim().toLowerCase(),
          password: shop.password,
        });
        setResendAt(res.resendAt);
        goTo(3);
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
    if (!verified) {
      try {
        await verify.mutateAsync({ email: you.email.trim().toLowerCase(), code: value });
        setVerified(true);
      } catch (err) {
        const c = codeOf(err);
        setCodeError(errorWords(c === 'unknown' ? 'invalid_code' : c));
        return;
      }
    }
    try {
      await finish();
    } catch (err) {
      const c = codeOf(err);
      setCodeError(c === 'unknown' ? W.error : errorWords(c));
    }
  };

  return (
    <Card className={cn('elevation-sm', className)}>
      <CardHeader className="gap-4 lg:gap-3">
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
                            ? 'bg-card text-primary ring-2 ring-primary ring-inset'
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
          <p className="sr-only">{W.progress(step)}</p>
          <CardTitle>
            <h2 ref={heading} tabIndex={-1} className="outline-none">
              {step === 1 ? W.you.title : step === 2 ? W.shop.title : W.code.title}
            </h2>
          </CardTitle>
          {step === 3 ? <CardDescription>{W.code.sent(you.email.trim())}</CardDescription> : null}
          {step === 2 && finishing ? <CardDescription>{W.shop.finishing}</CardDescription> : null}
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
            <FieldGroup className="lg:gap-5">
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
              {/* Laptops: email and mobile side by side, so the whole step fits one screen. */}
              <div className="grid gap-7 lg:grid-cols-2 lg:gap-4">
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
              </div>
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
              <Field>
                <FieldLabel id="su-colour-label">{W.shop.colour}</FieldLabel>
                <ColorPicker
                  value={shop.colour}
                  format="hex"
                  aria-label={W.shop.colour}
                  i18n={{ labels: { swatches: W.shop.colour } }}
                  onValueChange={(next) => {
                    if (next && /^#[0-9a-f]{6}$/i.test(next))
                      setShop({ ...shop, colour: next.toUpperCase() });
                  }}
                >
                  <ColorPickerSwatches shape="circle" colors={[...BRAND_COLOR_PRESETS]} />
                </ColorPicker>
                <FieldDescription>{W.shop.colourHelp}</FieldDescription>
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
              {verified ? null : (
                <Field data-invalid={show(sp, 'password') ? true : undefined}>
                  <FieldLabel htmlFor="su-password">{W.shop.password}</FieldLabel>
                  <PasswordInput
                    id="su-password"
                    capsId="su-password-caps"
                    autoComplete="new-password"
                    value={shop.password}
                    maxLength={72}
                    aria-invalid={show(sp, 'password') ? true : undefined}
                    onChange={(e) => setShop({ ...shop, password: e.target.value })}
                  />
                  {show(sp, 'password') ? (
                    <FieldError>{sp.password}</FieldError>
                  ) : (
                    <FieldDescription>{W.shop.passwordHelp}</FieldDescription>
                  )}
                </Field>
              )}
              <div className="flex gap-2">
                {finishing ? null : (
                  <Button type="button" variant="outline" className="h-12" onClick={() => goTo(1)}>
                    <ArrowLeftIcon aria-hidden="true" />
                    {W.shop.back}
                  </Button>
                )}
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
                  .then((res) => {
                    setResendAt(res.resendAt);
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
            {verified ? null : (
              <Button variant="link" className="h-11 self-center" onClick={() => goTo(1)}>
                {W.code.wrongEmail}
              </Button>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
