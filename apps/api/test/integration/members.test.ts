import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { integrationApp, latestCode, phone, uniqueEmail } from './support.js';

describe('members on the storefront (phase 6)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await integrationApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('signs a customer in with the emailed code, in the member cookies only', async () => {
    const email = uniqueEmail('mila');
    const agent = phone(app);

    const sent = await agent.post('/auth/member/code').send({ email }).expect(200);
    expect(sent.body.devCode).toBeNull();
    expect(Date.parse(sent.body.resendAt) - Date.parse(sent.body.sentAt)).toBe(60_000);

    await agent
      .post('/auth/member/verify')
      .send({ email, code: '000000' })
      .expect(400)
      .expect((res) => expect(res.body.code).toBe('invalid_code'));

    const code = await latestCode(email, /code/i);
    const verified = await agent.post('/auth/member/verify').send({ email, code }).expect(200);
    expect(verified.body).toEqual({ email });
    const cookies = String(verified.headers['set-cookie'] ?? '');
    expect(cookies).toContain('sa_member_at');
    expect(cookies).not.toContain('sa_owner_at');

    // A member is not an owner: the dashboard still sees nobody.
    expect((await agent.get('/auth/session').expect(200)).body).toEqual({ session: null });

    await agent.post('/auth/member/sign-out').send({}).expect(200);
  });
});
