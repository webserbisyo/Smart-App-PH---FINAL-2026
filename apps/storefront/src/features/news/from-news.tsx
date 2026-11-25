'use client';

import { useEffect, useRef } from 'react';
import { shopNewsWords } from '@smartapp/core';
import { useMarkNewsOpened, useNewsChoice, useSetNewsChoice } from '@smartapp/data';
import { useSearchParams } from 'next/navigation';
import { closeToast, notify } from '@smartapp/ui/compositions/notify';

const W = shopNewsWords;
const SHOW_MS = 8000;

/**
 * Opened from a news push (?from=news, decision T106): one toast says where it came from, with Stop news
 * one tap away, and Undo after stopping. Shows only while this phone has news on, once per visit.
 */
export function FromNews({ slug, shopName }: { slug: string; shopName: string }) {
  const choice = useNewsChoice(slug);
  const save = useSetNewsChoice(slug);
  const opened = useMarkNewsOpened(slug);
  const delivery = useSearchParams()?.get('d') ?? null;
  const shown = useRef(false);
  const counted = useRef(false);
  const on = choice.data?.news === true;

  // The push's own id (`d`) counts the tap once for the owner's results.
  useEffect(() => {
    if (!delivery || counted.current) return;
    counted.current = true;
    opened.mutate(delivery);
  }, [delivery, opened]);

  useEffect(() => {
    if (!on || shown.current) return;
    shown.current = true;
    const id = notify({
      title: W.fromNews(shopName),
      tone: 'info',
      durationMs: SHOW_MS,
      action: {
        label: W.stop,
        onClick: () => {
          closeToast(id);
          save.mutate(false, {
            onSuccess: () => {
              const stoppedId = notify({
                title: W.stopped,
                tone: 'success',
                durationMs: SHOW_MS,
                action: {
                  label: W.undo,
                  onClick: () => {
                    closeToast(stoppedId);
                    save.mutate(true);
                  },
                },
              });
            },
            onError: () => notify({ title: W.offline, tone: 'error' }),
          });
        },
      },
    });
  }, [on, save, shopName]);

  return null;
}
