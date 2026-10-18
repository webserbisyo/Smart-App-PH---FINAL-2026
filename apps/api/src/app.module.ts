import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { TerminusModule } from '@nestjs/terminus';
import { AppController } from './app.controller.js';
import { AuthGuard } from './auth/auth.guard.js';
import { ApiExceptionFilter } from './common/filters/api-exception.filter.js';
import { createStandardSchemaValidationPipe } from './common/pipes/validation.pipe.js';
import { validateEnv } from './env.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    TerminusModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_PIPE,
      useFactory: createStandardSchemaValidationPipe,
    },
    {
      provide: APP_FILTER,
      useClass: ApiExceptionFilter,
    },
  ],
})
export class AppModule {}
