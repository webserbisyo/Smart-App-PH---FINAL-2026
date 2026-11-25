// The owner's login (decision T116): every call goes to NestJS, which talks to Supabase Auth and keeps the
// session in httpOnly cookies. The browser never holds a token or a Supabase key (T34). On sample data
// (development and preview builds) a small mock stands in, so the demo links keep working.
import type {
  LoginInput,
  ResetPasswordInput,
  SendCodeResult,
  SignUpInput,
  VerifyCodeInput,
} from '@smartapp/core';

export interface UserClaims {
  userId: string;
  email: string;
  fullName?: string | undefined;
  // A sample shop's owner (preview sign-in and sample data only).
  demoShop?: string | undefined;
  // The platform admin (Super Admin, T88): set on the account by Smart App PH, never by the user.
  isAdmin?: boolean | undefined;
}

export interface OwnerAuth {
  /** The signed-in owner, or null. Never throws: no answer counts as signed out. */
  getSession(): Promise<UserClaims | null>;
  signIn(input: LoginInput): Promise<UserClaims>;
  signOut(): Promise<void>;
  /** Makes the account and emails the 6-digit code (T89). */
  signUp(input: SignUpInput): Promise<SendCodeResult>;
  verifySignupCode(input: VerifyCodeInput): Promise<UserClaims>;
  resendSignupCode(input: { email: string }): Promise<SendCodeResult>;
  /** Forgot password (T108): the same answer for every email; only rate_limited shows. */
  sendResetCode(input: { email: string }): Promise<SendCodeResult>;
  resetPassword(input: ResetPasswordInput): Promise<UserClaims>;
}
