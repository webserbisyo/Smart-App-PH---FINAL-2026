// Sign-up and going live for NestJS (T89, T90). Same rows as docs/api.md "Sign-up and going live". The lead
// and the browser events are public (rate-limited); registerShop and the rest need the owner's login (T34).
import { OwnerOnboardingSchema, SignupLeadResultSchema } from '@smartapp/core';
import { z } from 'zod';
import { fetchApi } from '../../api-client';
import type { OnboardingAdapter } from '../types';

export interface ApiOnboardingOptions {
  baseUrl: string;
  getToken: () => Promise<string | null>;
}

const OkSchema = z.object({ ok: z.literal(true) });

export function createApiOnboardingAdapter({
  baseUrl,
  getToken,
}: ApiOnboardingOptions): OnboardingAdapter {
  const call = async <T>(
    path: string,
    schema: z.ZodType<T>,
    method: 'GET' | 'POST',
    body?: unknown,
  ): Promise<T> => {
    const token = await getToken();
    return fetchApi(`${baseUrl}${path}`, schema, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  };

  return {
    saveSignupLead: (input) => call('/signup/leads', SignupLeadResultSchema, 'POST', input),
    registerShop: (input) => call('/signup/shop', OwnerOnboardingSchema, 'POST', input),
    trackEvent: (input) => call('/track', OkSchema, 'POST', input),
    getOnboarding: () => call('/owner/onboarding', OwnerOnboardingSchema, 'GET'),
    askToGoLive: () => call('/owner/onboarding/ask', OwnerOnboardingSchema, 'POST', {}),
  };
}
