import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from '../../src/app.module.js';
import { AUTH_PROVIDER, type AuthProvider } from '../../src/auth/auth-provider.js';
import { configureApp } from '../../src/configure-app.js';

/** The real app, as main.ts builds it, with the auth engine swapped when a test needs to. */
export async function testApp(auth?: Partial<AuthProvider>): Promise<NestExpressApplication> {
  let builder = Test.createTestingModule({ imports: [AppModule] });
  if (auth) builder = builder.overrideProvider(AUTH_PROVIDER).useValue(auth);
  const moduleRef = await builder.compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>();
  configureApp(app);
  await app.init();
  return app;
}
