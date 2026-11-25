import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createClient,
  isAuthError,
  type AuthError,
  type Session,
  type SupabaseClient,
  type User,
} from '@supabase/supabase-js';
import { ApiFailure } from '../common/api-failure.js';
import type {
  AuthFailureCode,
  AuthProvider,
  AuthSession,
  AuthUser,
  ClientInfo,
} from './auth-provider.js';

function userOf(user: User): AuthUser {
  const fullName = user.user_metadata['full_name'];
  return {
    id: user.id,
    email: user.email ?? '',
    fullName: typeof fullName === 'string' && fullName.length > 0 ? fullName : null,
    isAdmin: user.app_metadata['platform_admin'] === true,
  };
}

function sessionOf(session: Session | null, user: User | null): AuthSession {
  if (!session || !user) throw new ApiFailure('unknown', 500);
  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresIn: session.expires_in,
    user: userOf(user),
  };
}

const RATE_LIMITS = new Set(['over_request_rate_limit', 'over_email_send_rate_limit']);

function statusOf(code: AuthFailureCode): number {
  switch (code) {
    case 'invalid_login':
    case 'not_signed_in':
      return 401;
    case 'email_taken':
      return 409;
    case 'rate_limited':
      return 429;
    case 'unknown':
      return 500;
    default:
      return 400;
  }
}

function failure(code: AuthFailureCode): ApiFailure {
  const field =
    code === 'email_taken'
      ? 'email'
      : code === 'weak_password'
        ? 'password'
        : code === 'invalid_code' || code === 'code_expired'
          ? 'code'
          : null;
  return new ApiFailure(code, statusOf(code), field ? { [field]: [code] } : undefined);
}

/**
 * Supabase Auth with the project's secret key (R9), never a browser session: persistSession and
 * autoRefreshToken are off, and each call that counts against a rate limit says whose phone it is for
 * (`sb-forwarded-for`, R10). The engine's own error text is mapped to our codes here and nowhere else.
 */
@Injectable()
export class SupabaseAuthProvider implements AuthProvider {
  private readonly logger = new Logger('Auth');
  private readonly url: string;
  private readonly key: string | undefined;

  constructor(@Inject(ConfigService) config: ConfigService) {
    this.url = config.getOrThrow<string>('SUPABASE_URL');
    this.key = config.get<string>('SUPABASE_SECRET_KEY');
  }

  private client(info?: ClientInfo): SupabaseClient {
    if (!this.key) {
      this.logger.error('SUPABASE_SECRET_KEY is not set; sign-in is off.');
      throw new ApiFailure('unknown', 503);
    }
    return createClient(this.url, this.key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { headers: info?.ip ? { 'sb-forwarded-for': info.ip } : {} },
    });
  }

  /** The engine's codes to ours. Anything unexpected is logged by its code only (rule 12). */
  private mapped(error: AuthError | null, fallback: AuthFailureCode): ApiFailure {
    const code = isAuthError(error) ? error.code : undefined;
    if (code && RATE_LIMITS.has(code)) return failure('rate_limited');
    if (code === 'weak_password') return failure('weak_password');
    if (code === 'email_exists' || code === 'user_already_exists') return failure('email_taken');
    // Supabase answers a wrong code and an old code alike ("expired or is invalid"), so both are invalid_code.
    if (code === 'otp_expired') return failure('invalid_code');
    if (fallback === 'unknown' || !code) {
      this.logger.warn(`Auth call failed: ${code ?? error?.name ?? 'no code'}`);
    }
    return failure(fallback);
  }

  async signInWithPassword(
    email: string,
    password: string,
    info: ClientInfo,
  ): Promise<AuthSession> {
    const { data, error } = await this.client(info).auth.signInWithPassword({ email, password });
    // One error for every failed login (rule 12): wrong email, wrong password and an unconfirmed email alike.
    if (error) {
      throw isAuthError(error) && error.code && RATE_LIMITS.has(error.code)
        ? failure('rate_limited')
        : failure('invalid_login');
    }
    return sessionOf(data.session, data.user);
  }

  async signUp(
    input: { email: string; password: string; fullName: string },
    info: ClientInfo,
  ): Promise<void> {
    const { data, error } = await this.client(info).auth.signUp({
      email: input.email,
      password: input.password,
      options: { data: { full_name: input.fullName } },
    });
    if (error) throw this.mapped(error, 'unknown');
    // With confirmations on, Supabase answers an existing address with a user that has no identities
    // instead of an error (it hides who has an account). Our sign-up page says so instead (api.md).
    if (data.user && (data.user.identities ?? []).length === 0) throw failure('email_taken');
  }

  async verifySignupCode(email: string, code: string, info: ClientInfo): Promise<AuthSession> {
    const { data, error } = await this.client(info).auth.verifyOtp({
      email,
      token: code,
      type: 'email',
    });
    if (error) throw this.mapped(error, 'invalid_code');
    return sessionOf(data.session, data.user);
  }

  async resendSignupCode(email: string, info: ClientInfo): Promise<void> {
    const { error } = await this.client(info).auth.resend({ type: 'signup', email });
    if (error) throw this.mapped(error, 'unknown');
  }

  async sendRecoveryCode(email: string, info: ClientInfo): Promise<void> {
    const { error } = await this.client(info).auth.resetPasswordForEmail(email);
    // Only a rate limit shows; anything else answers like a sent code, so nobody can test which emails are owners.
    if (error && isAuthError(error) && error.code && RATE_LIMITS.has(error.code)) {
      throw failure('rate_limited');
    }
    if (error) this.logger.warn(`Recovery code not sent: ${error.code ?? 'no code'}`);
  }

  async verifyRecoveryCode(email: string, code: string, info: ClientInfo): Promise<AuthSession> {
    const { data, error } = await this.client(info).auth.verifyOtp({
      email,
      token: code,
      type: 'recovery',
    });
    if (error) throw this.mapped(error, 'invalid_code');
    return sessionOf(data.session, data.user);
  }

  async setPassword(userId: string, password: string): Promise<void> {
    const { error } = await this.client().auth.admin.updateUserById(userId, { password });
    if (error) throw this.mapped(error, 'unknown');
  }

  async refresh(refreshToken: string, info: ClientInfo): Promise<AuthSession> {
    const { data, error } = await this.client(info).auth.refreshSession({
      refresh_token: refreshToken,
    });
    if (error) throw failure('not_signed_in');
    return sessionOf(data.session, data.user);
  }

  async signOut(accessToken: string, scope: 'local' | 'others' | 'global'): Promise<void> {
    const { error } = await this.client().auth.admin.signOut(accessToken, scope);
    // An already-ended session is fine: the cookies go either way.
    if (error && !(isAuthError(error) && (error.status === 401 || error.status === 404))) {
      this.logger.warn(`Sign out failed: ${isAuthError(error) ? error.code : 'no code'}`);
    }
  }

  async getUser(accessToken: string): Promise<AuthUser | null> {
    const { data, error } = await this.client().auth.getUser(accessToken);
    if (error || !data.user) return null;
    return userOf(data.user);
  }
}
