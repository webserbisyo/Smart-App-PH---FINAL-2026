import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthGuard } from './auth/auth.guard.js';
import { AuthModule } from './auth/auth.module.js';
import { CatalogModule } from './catalog/catalog.module.js';
import { OriginGuard } from './auth/origin.guard.js';
import { ScopeInterceptor } from './auth/scope.interceptor.js';
import { serverReadSkip } from './auth/server-read.js';
import { ApiExceptionFilter } from './common/filters/api-exception.filter.js';
import { createStandardSchemaValidationPipe } from './common/pipes/validation.pipe.js';
import { DbModule } from './db/db.module.js';
import { EditorModule } from './editor/editor.module.js';
import { validateEnv } from './env.js';
import { HealthModule } from './health/health.module.js';
import { JobsModule } from './jobs/jobs.module.js';
import { MediaModule } from './media/media.module.js';
import { OrdersModule } from './orders/orders.module.js';
import { PublicModule } from './public/public.module.js';
import { PushModule } from './push/push.module.js';
import { SettingsModule } from './settings/settings.module.js';
import { ShopModule } from './shop/shop.module.js';
import { StorefrontCacheModule } from './public/pages-cache.module.js';

// Guards run in this order: our Origin and header check (CSRF), the rate limit, then who is calling.
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    // 120 calls a minute per address by default; sign-in and sign-up routes set stricter limits. The
    // storefront's server reads carry the shared secret and skip it (launch phase 5).
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [{ name: 'default', ttl: 60_000, limit: 120 }],
        skipIf: serverReadSkip(config.get<string>('SERVER_READ_SECRET')),
      }),
    }),
    DbModule,
    JobsModule,
    StorefrontCacheModule,
    AuthModule,
    PushModule,
    HealthModule,
    ShopModule,
    MediaModule,
    SettingsModule,
    EditorModule,
    CatalogModule,
    OrdersModule,
    PublicModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: OriginGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_INTERCEPTOR, useClass: ScopeInterceptor },
    { provide: APP_PIPE, useFactory: createStandardSchemaValidationPipe },
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
  ],
})
export class AppModule {}
