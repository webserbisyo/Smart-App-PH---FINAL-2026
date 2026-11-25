import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthGuard } from './auth/auth.guard.js';
import { AuthModule } from './auth/auth.module.js';
import { CatalogModule } from './catalog/catalog.module.js';
import { OriginGuard } from './auth/origin.guard.js';
import { ScopeInterceptor } from './auth/scope.interceptor.js';
import { ApiExceptionFilter } from './common/filters/api-exception.filter.js';
import { createStandardSchemaValidationPipe } from './common/pipes/validation.pipe.js';
import { DbModule } from './db/db.module.js';
import { EditorModule } from './editor/editor.module.js';
import { validateEnv } from './env.js';
import { HealthModule } from './health/health.module.js';
import { JobsModule } from './jobs/jobs.module.js';
import { MediaModule } from './media/media.module.js';
import { SettingsModule } from './settings/settings.module.js';
import { ShopModule } from './shop/shop.module.js';
import { StorefrontCacheModule } from './public/pages-cache.module.js';

// Guards run in this order: our Origin and header check (CSRF), the rate limit, then who is calling.
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    // 120 calls a minute per address by default; sign-in and sign-up routes set stricter limits.
    ThrottlerModule.forRoot({ throttlers: [{ name: 'default', ttl: 60_000, limit: 120 }] }),
    DbModule,
    JobsModule,
    StorefrontCacheModule,
    AuthModule,
    HealthModule,
    ShopModule,
    MediaModule,
    SettingsModule,
    EditorModule,
    CatalogModule,
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
