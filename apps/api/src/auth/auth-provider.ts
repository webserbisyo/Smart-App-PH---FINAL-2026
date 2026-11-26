import type { ErrorCode } from '@smartapp/core';
import type { SessionTokens } from './session-cookies.js';

/** A login session from the auth engine (Supabase Auth behind NestJS, decision T34). */
export interface AuthSession extends SessionTokens {
  user: AuthUser;
}

export interface AuthUser {
  id: string;
  email: string;
  fullName: string | null;
  isAdmin: boolean;
}

/** What went wrong, already in our closed list (the engine's own text never reaches a screen). */
export type AuthFailureCode = Extract<
  ErrorCode,
  | 'invalid_login'
  | 'email_taken'
  | 'weak_password'
  | 'invalid_code'
  | 'code_expired'
  | 'rate_limited'
  | 'not_signed_in'
  | 'unknown'
>;

/** The caller's address, passed on so the engine's own rate limits count each phone, not our server. */
export interface ClientInfo {
  ip: string | null;
}

/**
 * The one door to the auth engine (smartapp-oop: a vendor behind an interface). Every method throws
 * ApiFailure with an AuthFailureCode. Swapping Supabase Auth for another engine touches one file.
 */
export interface AuthProvider {
  signInWithPassword(email: string, password: string, client: ClientInfo): Promise<AuthSession>;
  /** Makes the account and emails the 6-digit code; nothing is signed in until the code is typed. */
  signUp(
    input: { email: string; password: string; fullName: string },
    client: ClientInfo,
  ): Promise<void>;
  verifySignupCode(email: string, code: string, client: ClientInfo): Promise<AuthSession>;
  /**
   * A member's 6-digit sign-in code (launch phase 6, D2): makes the account the first time. The code is
   * checked with verifySignupCode (Supabase's `email` type covers both).
   */
  sendEmailCode(email: string, client: ClientInfo): Promise<void>;
  resendSignupCode(email: string, client: ClientInfo): Promise<void>;
  /** Answers the same whether or not the email has an account (rule 12). */
  sendRecoveryCode(email: string, client: ClientInfo): Promise<void>;
  verifyRecoveryCode(email: string, code: string, client: ClientInfo): Promise<AuthSession>;
  setPassword(userId: string, password: string): Promise<void>;
  /**
   * An owner account the founder makes for a client (T88): confirmed, no password yet. The owner sets one
   * with a 6-digit code (sendRecoveryCode). Answers the new user's id; email_taken when it exists.
   */
  createOwnerAccount(email: string, fullName: string): Promise<string>;
  /** The account's email, for the owner's alerts (launch phase 5); null when the account is gone. */
  getUserEmail(userId: string): Promise<string | null>;
  refresh(refreshToken: string, client: ClientInfo): Promise<AuthSession>;
  /** `local` ends this session, `others` every other one, `global` all of them. */
  signOut(accessToken: string, scope: 'local' | 'others' | 'global'): Promise<void>;
  /** For tokens our own check cannot verify (a project still on a shared JWT secret). */
  getUser(accessToken: string): Promise<AuthUser | null>;
}

export const AUTH_PROVIDER = Symbol('AUTH_PROVIDER');

export type { ErrorCode };
