import { Global, Module } from '@nestjs/common';
import { AUTH_PROVIDER } from './auth-provider.js';
import { AuthController } from './auth.controller.js';
import { MemberAuthController } from './member-auth.controller.js';
import { SessionService } from './session.service.js';
import { SupabaseAuthProvider } from './supabase-auth.provider.js';

@Global()
@Module({
  controllers: [AuthController, MemberAuthController],
  providers: [{ provide: AUTH_PROVIDER, useClass: SupabaseAuthProvider }, SessionService],
  exports: [AUTH_PROVIDER, SessionService],
})
export class AuthModule {}
