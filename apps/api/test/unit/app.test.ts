import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { ApiFailure } from '../../src/common/api-failure.js';
import type { AuthProvider, AuthSession } from '../../src/auth/auth-provider.js';
import { testApp } from './test-app.js';

const session: AuthSession = {
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  expiresIn: 3600,
  user: {
    id: '0b1f6d2e-3c4a-4b5c-8d6e-7f8091a2b3c4',
    email: 'ana@example.com',
    fullName: 'Ana',
    isAdmin: false,
  },
};

const fakeAuth: Partial<AuthProvider> = {
  signInWithPassword: async (email, password) => {
    if (email === 'ana@example.com' && password === 'right-password') return session;
    throw new ApiFailure('invalid_login', 401);
  },
  signOut: async () => undefined,
  getUser: async () => null,
  refresh: async () => {
    throw new ApiFailure('not_signed_in', 401);
  },
};

describe('the API shell', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await testApp(fakeAuth);
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health answers without the database', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.body).toEqual({ ok: true, app: 'Smart App PH' });
  });

  it('a signed-out owner route is 401 in the error shape', async () => {
    const res = await request(app.getHttpServer()).get('/owner/shop').expect(401);
    expect(res.body).toEqual({
      status: 401,
      code: 'not_signed_in',
      message: 'Please sign in to view this page.',
    });
  });

  it('a made-up token is not a session', async () => {
    await request(app.getHttpServer())
      .get('/owner/onboarding')
      .set('authorization', 'Bearer not-a-jwt')
      .expect(401);
  });

  it('GET /auth/session without a session answers null', async () => {
    const res = await request(app.getHttpServer()).get('/auth/session').expect(200);
    expect(res.body).toEqual({ session: null });
  });

  it('a write without our header is refused (CSRF)', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/sign-in')
      .send({ email: 'ana@example.com', password: 'right-password' })
      .expect(403);
    expect(res.body.code).toBe('not_allowed');
  });

  it('a write from another site is refused even with the header', async () => {
    await request(app.getHttpServer())
      .post('/auth/sign-in')
      .set('x-smartapp', '1')
      .set('origin', 'https://evil.example')
      .send({ email: 'ana@example.com', password: 'right-password' })
      .expect(403);
  });

  it('a bad body is 400 invalid_input with fieldErrors', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/sign-in')
      .set('x-smartapp', '1')
      .send({ email: 'not-an-email', password: '' })
      .expect(400);
    expect(res.body.code).toBe('invalid_input');
    expect(res.body.fieldErrors.email).toBeDefined();
    expect(res.body.fieldErrors.password).toBeDefined();
  });

  it('a wrong password is the one login error', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/sign-in')
      .set('x-smartapp', '1')
      .set('origin', 'http://localhost:5173')
      .send({ email: 'ana@example.com', password: 'wrong-password' })
      .expect(401);
    expect(res.body.code).toBe('invalid_login');
  });

  it('signing in sets two httpOnly, SameSite=Lax cookies and answers the session', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/sign-in')
      .set('x-smartapp', '1')
      .set('origin', 'http://localhost:5173')
      .send({ email: 'ANA@example.com', password: 'right-password' })
      .expect(200);
    expect(res.body).toEqual({
      userId: session.user.id,
      email: 'ana@example.com',
      fullName: 'Ana',
      isAdmin: false,
    });
    const cookies = res.headers['set-cookie'];
    const list = Array.isArray(cookies) ? cookies : [String(cookies)];
    expect(list).toHaveLength(2);
    for (const cookie of list) {
      expect(cookie).toMatch(/HttpOnly/);
      expect(cookie).toMatch(/SameSite=Lax/);
      expect(cookie).toMatch(/Path=\//);
      expect(cookie).not.toMatch(/Domain=/);
    }
  });

  it('signing out clears both cookies', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/sign-out')
      .set('x-smartapp', '1')
      .set('cookie', 'sa_owner_at=access-token; sa_owner_rt=refresh-token')
      .expect(200);
    const list = res.headers['set-cookie'];
    expect(String(list)).toMatch(/sa_owner_at=;/);
    expect(String(list)).toMatch(/sa_owner_rt=;/);
  });

  it('an unknown route is not_found in the error shape', async () => {
    const res = await request(app.getHttpServer()).get('/nothing-here').expect(404);
    expect(res.body).toEqual({
      status: 404,
      code: 'not_found',
      message: 'We could not find it. It may have been removed.',
    });
  });

  it('CORS answers our dashboard with credentials and our header', async () => {
    const res = await request(app.getHttpServer())
      .options('/auth/sign-in')
      .set('origin', 'http://localhost:5173')
      .set('access-control-request-method', 'POST')
      .set('access-control-request-headers', 'content-type,x-smartapp')
      .expect(204);
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(res.headers['access-control-allow-credentials']).toBe('true');
    expect(res.headers['access-control-allow-headers']).toMatch(/x-smartapp/);
  });
});
