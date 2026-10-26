'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GiftIcon, MailIcon, StampIcon } from 'lucide-react';
import {
  CustomerEmailSchema,
  errorWords,
  imageSources,
  normalisePhPhone,
  vocab,
  words,
  type MemberAccount,
} from '@smartapp/core';
import {
  errorCodeOf,
  useCheckoutDraft,
  useGuestOrderTokens,
  useJoin,
  useMyAccount,
  useSendCode,
  useVerifyCode,
} from '@smartapp/data';
import { Button } from '@smartapp/ui/components/button';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@smartapp/ui/components/field';
import { Input } from '@smartapp/ui/components/input';
import { MaskInput } from '@smartapp/ui/components/mask-input';
import { Pending } from '@smartapp/ui/components/pending';
import { Alert, AlertDescription } from '@smartapp/ui/components/reui/alert';
import { Spinner } from '@smartapp/ui/components/spinner';
import { stampBurst } from '@smartapp/ui/compositions/celebrate';
import { notify } from '@smartapp/ui/compositions/notify';
import { OtpResend } from '@smartapp/ui/compositions/otp-resend';
import { StampCard } from '@smartapp/ui/compositions/stamp-card';
import { InstallCard } from '../../install/components/install-card';
import { useShop } from '../../shell/components/shop-context';
import { maskEmail } from '../rewards-rules';

const W = words.join;

type Step = 'details' | 'code' | 'done';

/**
 * Join (T12): name, mobile and email, then the 6-digit email code (otp-resend), then the welcome stamp
 * landing on the card. Already a member on this phone: straight to Rewards.
 */
export function JoinFlow() {
  const { slug, shop } = useShop();
  const router = useRouter();
  const account = useMyAccount(slug);
  const { draft } = useCheckoutDraft(slug);
  const tokens = useGuestOrderTokens(slug);
  const sendCode = useSendCode();
  const verifyCode = useVerifyCode();
  const join = useJoin(slug);
  const card = shop.storefront.stampCard;
  const cardOn = card.status !== 'off';

  const [step, setStep] = useState<Step>('details');
  // Typed values, else what checkout saved on this phone (read after hydration, so no effect needed).
  const [typedName, setName] = useState<string | null>(null);
  const [typedPhone, setPhone] = useState<string | null>(null);
  const [typedEmail, setEmail] = useState<string | null>(null);
  const name = typedName ?? draft?.name ?? '';
  const phone = typedPhone ?? draft?.phone ?? '';
  const email = typedEmail ?? draft?.email ?? '';
  const [code, setCode] = useState('');
  const [resendAt, setResendAt] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ name?: string; phone?: string; email?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [joined, setJoined] = useState<MemberAccount | null>(null);
  const codeRef = useRef<HTMLInputElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Already a member here: Rewards (or Account when the shop has no stamp card).
  const isMember = Boolean(account.data) && step !== 'done';
  useEffect(() => {
    if (isMember) router.replace(`/${slug}/${cardOn ? 'rewards' : 'account'}`);
  }, [isMember, router, slug, cardOn]);

  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  function send(onSent?: () => void) {
    sendCode.mutate(
      { email: email.trim() },
      {
        onSuccess: (result) => {
          setResendAt(result.resendAt);
          if (result.devCode) notify({ title: words.shop.devCode(result.devCode), tone: 'info' });
          onSent?.();
        },
        onError: (error) => {
          const message = errorWords(errorCodeOf(error));
          if (step === 'code') setCodeError(message);
          else setFormError(message);
        },
      },
    );
  }

  function handleDetails(event: FormEvent) {
    event.preventDefault();
    const next: typeof errors = {};
    if (!name.trim()) next.name = W.nameRequired;
    if (!normalisePhPhone(phone).ok) next.phone = words.shop.phoneInvalid;
    if (!CustomerEmailSchema.safeParse(email.trim()).success) next.email = W.emailInvalid;
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length > 0) return;
    send(() => {
      setCode('');
      setCodeError(null);
      setNotice(null);
      setStep('code');
    });
  }

  function handleVerify(value: string) {
    if (value.length < 6 || verifyCode.isPending || join.isPending) return;
    setCodeError(null);
    verifyCode.mutate(
      { email: email.trim(), code: value },
      {
        onSuccess: () => {
          join.mutate(
            { name: name.trim(), phone, orderToken: tokens.at(-1) },
            {
              onSuccess: (member) => {
                setJoined(member);
                setStep('done');
                const tile = document.querySelector('[data-slot="stamp-card"] [role="img"]');
                const box = tile?.getBoundingClientRect();
                void stampBurst(
                  box
                    ? {
                        x: (box.left + 24) / window.innerWidth,
                        y: (box.top + 24) / window.innerHeight,
                      }
                    : { x: 0.5, y: 0.4 },
                );
              },
              onError: (error) => setCodeError(errorWords(errorCodeOf(error))),
            },
          );
        },
        onError: (error) => {
          const errorCode = errorCodeOf(error);
          if (errorCode === 'code_expired') {
            setCode('');
            send(() => setNotice(W.expired));
            return;
          }
          // Clear a wrong code so typing the next one starts fresh (and fires onComplete again).
          if (errorCode === 'invalid_code') setCode('');
          setCodeError(errorCode === 'invalid_code' ? W.wrongCode : errorWords(errorCode));
          codeRef.current?.focus();
        },
      },
    );
  }

  if (step === 'done' && joined) {
    const stamps = joined.balance;
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col gap-4 pt-2 pb-6">
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="text-2xl font-bold tracking-tight outline-none"
        >
          {W.doneTitle(joined.name.split(' ')[0] ?? joined.name)}
        </h1>
        <p className="text-muted-foreground">{W.doneBody(stamps)}</p>
        {cardOn ? (
          <StampCard
            needed={card.rule.stampsNeeded}
            stamped={Math.min(stamps, card.rule.stampsNeeded)}
            pending={joined.pendingStamps}
            pressIndex={stamps > 0 ? stamps - 1 : undefined}
            title={words.rewards.toGo(
              Math.max(0, card.rule.stampsNeeded - stamps),
              card.reward.title,
            )}
            progressLabel={words.storefrontShell.home.stampCard.progress(
              stamps,
              card.rule.stampsNeeded,
            )}
            prize={{
              title: card.reward.title,
              photo: imageSources(card.reward.image),
              label: words.storefrontShell.home.stampCard.prize,
            }}
            action={
              <Button
                nativeButton={false}
                render={<Link href={`/${slug}/rewards`} />}
                className="h-12 rounded-full text-base"
              >
                {W.seeCard}
              </Button>
            }
          />
        ) : (
          <Button
            nativeButton={false}
            render={<Link href={`/${slug}/menu`} />}
            className="h-12 rounded-full text-base"
          >
            {words.rewards.order(vocab(shop.storefront.info.kind).catalog)}
          </Button>
        )}
        <InstallCard slug={slug} shopName={shop.storefront.info.name} />
      </div>
    );
  }

  if (account.isPending || isMember) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4 pt-2 pb-6">
      <div className="flex flex-col gap-1">
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="text-2xl font-bold tracking-tight outline-none"
        >
          {step === 'details' ? W.title : W.codeTitle}
        </h1>
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {step === 'details' ? W.stepDetails : W.stepCode} · {step === 'details' ? '1' : '2'}/2
        </p>
      </div>

      {step === 'details' ? (
        <>
          <section
            aria-label={W.title}
            className="flex items-center gap-3 rounded-3xl bg-member-soft p-4 text-member-soft-foreground"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-member text-member-foreground">
              {cardOn ? (
                <StampIcon aria-hidden="true" className="size-5" />
              ) : (
                <GiftIcon aria-hidden="true" className="size-5" />
              )}
            </span>
            <div className="flex min-w-0 flex-col">
              <p className="font-semibold">
                {cardOn ? W.perk(card.rule.stampsNeeded, card.reward.title) : W.noCardPerk}
              </p>
              {cardOn ? <p className="text-sm">{W.welcome(card.rule.welcomeStamps)}</p> : null}
            </div>
          </section>

          <form
            noValidate
            onSubmit={handleDetails}
            className="flex flex-col gap-5 rounded-3xl bg-card p-4 shadow-xs ring-1 ring-foreground/8 sm:p-5"
          >
            <FieldGroup className="gap-4">
              <Field data-invalid={errors.name ? 'true' : undefined}>
                <FieldLabel htmlFor="join-name">{W.name}</FieldLabel>
                <Input
                  id="join-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={W.namePlaceholder}
                  autoComplete="name"
                  maxLength={80}
                  className="h-11 rounded-xl text-base"
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={errors.name ? 'join-name-error' : undefined}
                />
                {errors.name ? (
                  <p id="join-name-error" className="text-sm text-destructive-text">
                    {errors.name}
                  </p>
                ) : null}
              </Field>
              <Field data-invalid={errors.phone ? 'true' : undefined}>
                <FieldLabel htmlFor="join-phone">{W.mobile}</FieldLabel>
                <MaskInput
                  id="join-phone"
                  mask={{
                    pattern: '####-###-####',
                    transform: (val) => val.replace(/\D/g, ''),
                    validate: (val) => normalisePhPhone(val).ok,
                  }}
                  inputMode="numeric"
                  value={phone}
                  onValueChange={(_, unmasked) => setPhone(unmasked)}
                  placeholder={words.checkout.mobilePlaceholder}
                  autoComplete="tel"
                  className="h-11 rounded-xl text-base"
                  aria-invalid={Boolean(errors.phone)}
                  aria-describedby={errors.phone ? 'join-phone-error' : undefined}
                />
                {errors.phone ? (
                  <p id="join-phone-error" className="text-sm text-destructive-text">
                    {errors.phone}
                  </p>
                ) : null}
              </Field>
              <Field data-invalid={errors.email ? 'true' : undefined}>
                <FieldLabel htmlFor="join-email">{W.email}</FieldLabel>
                <div className="relative">
                  <MailIcon
                    aria-hidden="true"
                    className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    id="join-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={W.emailPlaceholder}
                    className="h-11 rounded-xl pl-10 text-base"
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={errors.email ? 'join-email-error' : 'join-email-hint'}
                  />
                </div>
                {errors.email ? (
                  <p id="join-email-error" className="text-sm text-destructive-text">
                    {errors.email}
                  </p>
                ) : (
                  <FieldDescription id="join-email-hint">{W.emailHint}</FieldDescription>
                )}
              </Field>
            </FieldGroup>

            {formError ? (
              <Alert variant="destructive">
                <AlertDescription role="alert">{formError}</AlertDescription>
              </Alert>
            ) : null}

            <Pending isPending={sendCode.isPending}>
              <Button
                id="join-send-code"
                type="submit"
                disabled={sendCode.isPending}
                className="h-12 w-full rounded-full text-base font-semibold"
              >
                {sendCode.isPending ? <Spinner aria-hidden="true" /> : null}
                {sendCode.isPending ? W.sending : W.sendCode}
              </Button>
            </Pending>
            <p className="text-center text-xs text-muted-foreground">
              {W.consent}{' '}
              <Link
                href={`/${slug}/privacy`}
                className="font-medium text-foreground underline underline-offset-4"
              >
                {W.privacyLink}
              </Link>
            </p>
          </form>
        </>
      ) : (
        <div className="flex flex-col gap-4 rounded-3xl bg-card p-4 shadow-xs ring-1 ring-foreground/8 sm:p-5">
          {notice ? (
            <Alert variant="info">
              <AlertDescription role="status">{notice}</AlertDescription>
            </Alert>
          ) : null}
          <OtpResend
            id="join-code"
            inputRef={codeRef}
            value={code}
            onChange={(value) => {
              setCode(value);
              if (codeError) setCodeError(null);
            }}
            onComplete={handleVerify}
            label={W.codeLabel}
            sentLine={W.sentTo(maskEmail(email.trim()))}
            hint={W.checkSpam}
            resendAt={resendAt}
            onResend={() => send(() => setNotice(W.resent))}
            resendLabel={W.resend}
            resendInLabel={W.resendIn}
            resending={sendCode.isPending}
            error={codeError}
            disabled={verifyCode.isPending || join.isPending}
          />
          <Button
            id="join-verify"
            type="button"
            onClick={() => handleVerify(code)}
            disabled={code.length < 6 || verifyCode.isPending || join.isPending}
            className="h-12 w-full rounded-full text-base font-semibold"
          >
            {verifyCode.isPending || join.isPending ? <Spinner aria-hidden="true" /> : null}
            {verifyCode.isPending || join.isPending ? W.verifying : W.verify}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setStep('details')}
            className="h-11 self-center rounded-full px-4"
          >
            {W.changeEmail}
          </Button>
        </div>
      )}
    </div>
  );
}
