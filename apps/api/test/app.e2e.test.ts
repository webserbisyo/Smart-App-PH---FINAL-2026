import 'reflect-metadata';

process.env.SUPABASE_URL = 'http://127.0.0.1:54321';
process.env.PORT = '4000';
process.env.CORS_ORIGINS = 'http://localhost:3000,http://localhost:5173';

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';

describe('App API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('GET /health answers with 200 and app info', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.body).toEqual({
      ok: true,
      app: 'Smart App PH',
    });
  });

  it('GET /me without a token is 401 in the error shape', async () => {
    const res = await request(app.getHttpServer()).get('/me').expect(401);
    expect(res.body).toEqual({
      status: 401,
      code: 'not_signed_in',
      message: 'Please sign in to view this page.',
    });
  });

  it('POST /test-validation with a bad body is 400 invalid_input with fieldErrors', async () => {
    const res = await request(app.getHttpServer())
      .post('/test-validation')
      .send({ email: 'not-an-email', password: '' })
      .expect(400);

    expect(res.body.status).toBe(400);
    expect(res.body.code).toBe('invalid_input');
    expect(typeof res.body.message).toBe('string');
    expect(res.body.fieldErrors).toBeDefined();
    expect(res.body.fieldErrors.email).toBeDefined();
    expect(res.body.fieldErrors.password).toBeDefined();
  });
});
