// The members' 6-digit email code through NestJS (launch phase 6, D2). The member's session rides in its own
// cookie (sa_member_*), separate from the owner's.
import { SendCodeResultSchema } from '@smartapp/core';
import { z } from 'zod';
import { fetchApi } from '../../api-client';
import type { CustomerAuthAdapter } from '../types';

const VerifiedSchema = z.object({ email: z.string() });
const OkSchema = z.object({ ok: z.literal(true) });

export function createApiCustomerAuthAdapter(baseUrl: string): CustomerAuthAdapter {
  const post = <T>(path: string, schema: z.ZodType<T>, body: unknown) =>
    fetchApi(`${baseUrl}/auth/member${path}`, schema, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  return {
    sendCustomerCode: ({ email }) => post('/code', SendCodeResultSchema, { email }),
    verifyCustomerCode: ({ email, code }) => post('/verify', VerifiedSchema, { email, code }),
    signOutCustomer: async () => {
      await post('/sign-out', OkSchema, {});
    },
  };
}
