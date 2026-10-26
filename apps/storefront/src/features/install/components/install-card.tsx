'use client';

import { DownloadIcon, PlusIcon, ShareIcon, SquarePlusIcon, XIcon } from 'lucide-react';
import { artPath, words } from '@smartapp/core';
import { useInstallDismissed, useNow } from '@smartapp/data';
import { Button } from '@smartapp/ui/components/button';
import {
  Stepper,
  StepperDescription,
  StepperIndicator,
  StepperItem,
  StepperNav,
  StepperSeparator,
  StepperTitle,
} from '@smartapp/ui/components/reui/stepper';
import { installCardVisible } from '../install-rules';
import { promptInstall, useInstallPlatform } from '../install-store';

const W = words.install;

const IOS_STEPS = [
  { title: W.iosShare, hint: W.iosShareHint, icon: ShareIcon },
  { title: W.iosAdd, hint: W.iosAddHint, icon: SquarePlusIcon },
  { title: W.iosConfirm, hint: W.iosConfirmHint, icon: PlusIcon },
] as const;

/**
 * Add the shop to the home screen (T13), shown after joining or after an order: Chrome's Install button,
 * or the iPhone Share steps (c-stepper-13 look) in Safari. Hidden when installed, in other browsers, and
 * for 30 days after Hide this.
 */
export function InstallCard({ slug, shopName }: { slug: string; shopName: string }) {
  const platform = useInstallPlatform();
  const now = useNow();
  const { dismissedAt, dismiss } = useInstallDismissed(slug);
  if (!installCardVisible({ platform, dismissedAt, now })) return null;

  return (
    <section
      id="install-card"
      aria-labelledby="install-card-title"
      className="relative flex flex-col gap-4 rounded-3xl bg-info-soft p-5 text-info-soft-foreground sm:p-6 print:hidden"
    >
      <div className="flex items-center gap-3 pr-9">
        <img
          src={artPath('install')}
          alt=""
          width={48}
          height={48}
          loading="lazy"
          className="size-12 shrink-0 object-contain"
        />
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 id="install-card-title" className="text-base font-semibold text-balance">
            {W.title(shopName)}
          </h2>
          <p className="text-sm opacity-90">{platform === 'ios' ? W.iosTitle : W.text}</p>
        </div>
      </div>

      {platform === 'prompt' ? (
        <Button
          id="install-card-install"
          onClick={() => void promptInstall()}
          className="h-12 gap-2 rounded-full text-base font-semibold"
        >
          <DownloadIcon aria-hidden="true" className="size-5" />
          {W.install}
        </Button>
      ) : (
        <Stepper defaultValue={0} orientation="vertical" role="group" aria-label={W.iosSteps}>
          <StepperNav>
            {IOS_STEPS.map((step, index) => {
              const Icon = step.icon;
              return (
                <StepperItem key={step.title} step={index + 1} className="relative items-start">
                  <div className="flex items-start gap-3 pb-5 group-last/step:pb-0">
                    <StepperIndicator className="size-8 rounded-full bg-card text-foreground">
                      <Icon aria-hidden="true" className="size-4" />
                    </StepperIndicator>
                    <div className="flex flex-col pt-1">
                      <StepperTitle className="text-sm font-semibold">
                        {index + 1}. {step.title}
                      </StepperTitle>
                      <StepperDescription className="text-sm opacity-90">
                        {step.hint}
                      </StepperDescription>
                    </div>
                  </div>
                  {index < IOS_STEPS.length - 1 ? (
                    <StepperSeparator className="absolute top-9 left-4 m-0 h-full-less-8 w-px -translate-x-1/2 bg-current opacity-30" />
                  ) : null}
                </StepperItem>
              );
            })}
          </StepperNav>
        </Stepper>
      )}

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => dismiss(new Date())}
        aria-label={W.dismiss}
        className="absolute top-2 right-2 size-11 rounded-full"
      >
        <XIcon aria-hidden="true" className="size-5" />
      </Button>
    </section>
  );
}
