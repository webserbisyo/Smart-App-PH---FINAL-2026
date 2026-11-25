import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { CSRF_HEADER } from './auth/origin.guard.js';
import { corsOrigins } from './env.js';

/** Settings shared by main.ts and the tests, so tests run the app exactly as it ships. */
export function configureApp(app: NestExpressApplication): void {
  const config = app.get(ConfigService);
  const hops = config.getOrThrow<number>('TRUST_PROXY_HOPS');
  // Behind Railway's proxy the phone's address is in X-Forwarded-For; trust only that many hops.
  if (hops > 0) app.set('trust proxy', hops);
  // JSON only, 100 kB at most (photos go straight to Storage with a signed link, never through here).
  app.useBodyParser('json', { limit: '100kb' });
  app.enableCors({
    origin: corsOrigins(config.getOrThrow<string>('CORS_ORIGINS')),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['content-type', 'authorization', CSRF_HEADER],
    maxAge: 600,
  });
}
