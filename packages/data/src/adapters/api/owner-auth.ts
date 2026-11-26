// The owner's login through NestJS `/auth` (docs/api.md "Auth"). Cookies carry the session; the API client
// sends them (credentials: 'include') with our write header.
import {
  OkSchema,
  OwnerSessionSchema,
  SecondStepSetupSchema,
  SendCodeResultSchema,
  type OwnerSession,
} from '@smartapp/core';
import { z } from 'zod';
import { fetchApi } from '../../api-client';
import type { OwnerAuth, UserClaims } from '../../owner-auth';

const SessionAnswerSchema = z.object({ session: OwnerSessionSchema.nullable() });

function claimsOf(session: OwnerSession): UserClaims {
  return {
    userId: session.userId,
    email: session.email,
    fullName: session.fullName ?? undefined,
    isAdmin: session.isAdmin,
    adminStep: session.adminStep,
  };
}

export function createApiOwnerAuth(baseUrl: string): OwnerAuth {
  const post = <T>(path: string, schema: z.ZodType<T>, body: unknown = {}) =>
    fetchApi(`${baseUrl}/auth${path}`, schema, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

  return {
    getSession: async () => {
      try {
        const answer = await fetchApi(`${baseUrl}/auth/session`, SessionAnswerSchema);
        return answer.session ? claimsOf(answer.session) : null;
      } catch {
        return null;
      }
    },
    signIn: async (input) => claimsOf(await post('/sign-in', OwnerSessionSchema, input)),
    signOut: async () => {
      await post('/sign-out', OkSchema);
    },
    signUp: (input) => post('/sign-up', SendCodeResultSchema, input),
    verifySignupCode: async (input) =>
      claimsOf(await post('/sign-up/verify', OwnerSessionSchema, input)),
    resendSignupCode: (input) => post('/sign-up/resend', SendCodeResultSchema, input),
    sendResetCode: (input) => post('/forgot/code', SendCodeResultSchema, input),
    resetPassword: async (input) =>
      claimsOf(await post('/forgot/reset', OwnerSessionSchema, input)),
    startSecondStep: () => post('/second-step/setup', SecondStepSetupSchema),
    verifySecondStep: async (input) =>
      claimsOf(await post('/second-step/verify', OwnerSessionSchema, input)),
  };
}
