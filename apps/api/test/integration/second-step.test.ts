// Super Admin's second step (T118 Q16): the authenticator app code after the password, on the local
// Supabase (TOTP turned on in supabase/config.toml). The code is worked out here from the setup key.
import './second-step-env.js';
import { createHmac } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { admin, integrationApp, makeAccount, signedIn, uniqueEmail } from './support.js';

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32(secret: string): Buffer {
  let bits = '';
  for (const char of secret.replace(/=+$/, '').toUpperCase()) {
    const value = BASE32.indexOf(char);
    if (value < 0) throw new Error('not base32');
    bits += value.toString(2).padStart(5, '0');
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

/** RFC 6238: the 6 digits an authenticator app shows now. */
function totp(secret: string, at = Date.now()): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(at / 30_000)));
  const mac = createHmac('sha1', base32(secret)).update(counter).digest();
  const offset = (mac[mac.length - 1] ?? 0) & 0xf;
  const value = (mac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return String(value).padStart(6, '0');
}

describe('Super Admin second step', () => {
  let app: NestExpressApplication;
  let founderEmail: string;
  let ownerEmail: string;

  beforeAll(async () => {
    app = await integrationApp();
    founderEmail = uniqueEmail('founder2fa');
    ownerEmail = uniqueEmail('owner2fa');
    const founderId = await makeAccount(founderEmail, 'Founder Two');
    await admin.auth.admin.updateUserById(founderId, { app_metadata: { platform_admin: true } });
    await makeAccount(ownerEmail, 'Plain Owner');
  });

  afterAll(async () => {
    await app.close();
  });

  it('keeps Super Admin shut until the app is set up and its code typed', async () => {
    const founder = await signedIn(app, founderEmail);
    const session = await founder.get('/auth/session').expect(200);
    expect(session.body.session.adminStep).toBe('enroll');

    const shut = await founder.get('/admin/today').expect(403);
    expect(shut.body.code).toBe('second_step_needed');

    const setup = await founder.post('/auth/second-step/setup').send({}).expect(200);
    expect(setup.body.uri).toMatch(/^otpauth:\/\/totp\//);
    const secret: string = setup.body.secret;

    const wrong = await founder
      .post('/auth/second-step/verify')
      .send({ code: totp(secret) === '000000' ? '111111' : '000000' })
      .expect(400);
    expect(wrong.body.code).toBe('invalid_code');

    const done = await founder.post('/auth/second-step/verify').send({ code: totp(secret) });
    expect(done.status).toBe(200);
    expect(done.body.adminStep).toBe('done');
    await founder.get('/admin/today').expect(200);

    // The next login asks for the code only, and a stolen password cannot add a second app.
    const again = await signedIn(app, founderEmail);
    const next = await again.get('/auth/session').expect(200);
    expect(next.body.session.adminStep).toBe('code');
    await again.get('/admin/today').expect(403);
    const refused = await again.post('/auth/second-step/setup').send({}).expect(403);
    expect(refused.body.code).toBe('not_allowed');
  });

  it('is Not found for an owner (rule 12)', async () => {
    const owner = await signedIn(app, ownerEmail);
    const session = await owner.get('/auth/session').expect(200);
    expect(session.body.session.adminStep).toBeNull();
    await owner.post('/auth/second-step/setup').send({}).expect(404);
    await owner.post('/auth/second-step/verify').send({ code: '123456' }).expect(404);
  });
});
