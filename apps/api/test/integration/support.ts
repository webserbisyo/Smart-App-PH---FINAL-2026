import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { createClient } from '@supabase/supabase-js';
import request from 'supertest';
import { ConfirmUploadResultSchema, UploadResultSchema } from '@smartapp/core';
import { expect } from 'vitest';
import { z } from 'zod';
import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/configure-app.js';

// The local Supabase's own keys (`supabase status`); CI passes them the same way. Local keys only.
const SUPABASE_URL = process.env['SUPABASE_URL'] ?? 'http://127.0.0.1:54321';
const SECRET_KEY = process.env['SUPABASE_SECRET_KEY'] ?? '';
const MAILPIT_URL = process.env['MAILPIT_URL'] ?? 'http://127.0.0.1:54324';
export const DASHBOARD = 'http://localhost:5173';
export const PASSWORD = 'Test-password-123';

if (!SECRET_KEY) {
  throw new Error(
    'Set SUPABASE_SECRET_KEY from `supabase status -o env` (SECRET_KEY) to run these tests.',
  );
}

export const admin = createClient(SUPABASE_URL, SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export async function integrationApp(): Promise<NestExpressApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>();
  configureApp(app);
  await app.init();
  return app;
}

/** A made-up phone address: rate limits count per address, as they do behind Railway. */
export function phoneIp(): string {
  const n = () => Math.floor(Math.random() * 250) + 1;
  return `10.${n()}.${n()}.${n()}`;
}

/** A cookie-keeping client that is one phone (its own address) and carries our write header. */
export function phone(app: NestExpressApplication) {
  return request
    .agent(app.getHttpServer())
    .set('x-forwarded-for', phoneIp())
    .set('x-smartapp', '1')
    .set('origin', DASHBOARD);
}

/** A fresh address per test run, so runs never collide. */
export function uniqueEmail(name: string): string {
  return `${name}.${randomUUID().slice(0, 8)}@example.com`;
}

/** A confirmed owner account made straight in Supabase (for tests that are not about sign-up). */
export async function makeAccount(email: string, fullName = 'Test Owner'): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error || !data.user) throw new Error(`createUser failed: ${error?.code ?? 'no user'}`);
  return data.user.id;
}

/** A supertest agent that keeps cookies, signed in through our own /auth/sign-in. */
export async function signedIn(app: NestExpressApplication, email: string) {
  const agent = phone(app);
  await agent.post('/auth/sign-in').send({ email, password: PASSWORD }).expect(200);
  return agent;
}

export function shopInput(
  shopName: string,
  kind: 'food' | 'retail' = 'food',
  leadId: string | null = null,
) {
  return {
    leadId,
    shop: { shopName, kind, city: 'Quezon City', facebookPage: '', brandColor: '#ff6600' },
    eventId: `test-${randomUUID()}`,
    fbp: null,
    fbc: null,
    pageUrl: 'http://localhost:5173/signup',
  };
}

/** An owner with a shop, signed in. */
export async function ownerWithShop(
  app: NestExpressApplication,
  name: string,
  kind: 'food' | 'retail' = 'food',
) {
  const email = uniqueEmail(name);
  const userId = await makeAccount(email);
  const agent = await signedIn(app, email);
  await agent
    .post('/signup/shop')
    .set('x-smartapp', '1')
    .send(shopInput(`${name} ${randomUUID().slice(0, 4)}`, kind))
    .expect(201);
  const shop = await agent.get('/owner/shop').expect(200);
  const parsed = z
    .object({ shop: z.object({ id: z.string(), slug: z.string() }) })
    .parse(shop.body);
  return { email, userId, agent, shopId: parsed.shop.id, slug: parsed.shop.slug };
}

const MailListSchema = z.object({
  messages: z.array(
    z.object({
      ID: z.string(),
      To: z.array(z.object({ Address: z.string() })),
      Subject: z.string(),
    }),
  ),
});
const MailSchema = z.object({ Text: z.string() });

/** The newest 6-digit code Mailpit caught for this address. */
export async function latestCode(email: string, subject: RegExp): Promise<string> {
  for (let attempt = 0; attempt < 30; attempt++) {
    const res = await fetch(
      `${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`,
    );
    const list = MailListSchema.parse(await res.json());
    const hit = list.messages.find((m) => subject.test(m.Subject));
    if (hit) {
      const mail = MailSchema.parse(
        await (await fetch(`${MAILPIT_URL}/api/v1/message/${hit.ID}`)).json(),
      );
      const code = /\b(\d{6})\b/.exec(mail.Text)?.[1];
      if (code) return code;
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`No code email for ${email}`);
}

// A tiny real WebP (1 x 1), so Storage keeps a real picture.
export const WEBP = Buffer.from(
  'UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA',
  'base64',
);

type Agent = Awaited<ReturnType<typeof ownerWithShop>>['agent'];

/** The three upload steps a phone takes: room, the file to the signed link, confirm. */
export async function upload(
  agent: Agent,
  kind: string,
  body: Buffer = WEBP,
  type = 'image/webp',
): Promise<{ id: string; ref: string; bytes: number }> {
  const created = UploadResultSchema.parse(
    (await agent.post('/owner/uploads').send({ kind, bytes: body.length }).expect(201)).body,
  );
  const sent = await fetch(created.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': type },
    body,
  });
  expect(sent.ok).toBe(true);
  const done = ConfirmUploadResultSchema.parse(
    (await agent.post(`/owner/uploads/${created.id}/confirm`).send({}).expect(200)).body,
  );
  return { id: created.id, ...done };
}
