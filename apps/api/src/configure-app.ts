import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { CSRF_HEADER } from './auth/origin.guard.js';
import { corsOrigins, originAllowed } from './env.js';

/** Settings shared by main.ts and the tests, so tests run the app exactly as it ships. */
export function configureApp(app: NestExpressApplication): void {
  const config = app.get(ConfigService);
  const hops = config.getOrThrow<number>('TRUST_PROXY_HOPS');
  // Behind Railway's proxy the phone's address is in X-Forwarded-For; trust only that many hops.
  if (hops > 0) app.set('trust proxy', hops);
  // JSON only, 100 kB at most (photos go straight to Storage with a signed link, never through here).
  app.useBodyParser('json', { limit: '100kb' });
  const exact = new Set(corsOrigins(config.getOrThrow<string>('CORS_ORIGINS')));
  const shopDomain = config.get<string>('SHOP_DOMAIN');
  app.enableCors({
    // The exact list, plus each shop's own address by pattern (X8).
    origin: (origin, done) =>
      done(null, origin === undefined || originAllowed(origin, exact, shopDomain)),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['content-type', 'authorization', CSRF_HEADER],
    maxAge: 600,
  });
}
