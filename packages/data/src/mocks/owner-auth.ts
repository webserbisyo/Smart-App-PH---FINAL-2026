// Sample-data login (decision T116): development and preview builds only, never a real account. Sign-up
// takes the code 123456; accounts live in this tab (sessionStorage), so a reload keeps the demo going.
import { errorWords, type ErrorCode, type SendCodeResult } from '@smartapp/core';
import { z } from 'zod';
import { ApiRequestError } from '../api-client';
import type { OwnerAuth, UserClaims } from '../owner-auth';

export const MOCK_CODE = '123456';
const RESEND_MS = 60_000;
const KEY = 'smartapp:mock-owner-auth';

const AccountSchema = z.object({
  email: z.string(),
  fullName: z.string(),
  password: z.string(),
  confirmed: z.boolean(),
});
const StateSchema = z.object({
  accounts: z.array(AccountSchema),
  signedIn: z.string().nullable(),
});
type State = z.infer<typeof StateSchema>;

let memory: State = { accounts: [], signedIn: null };

function load(): State {
  try {
    const raw = globalThis.sessionStorage?.getItem(KEY);
    if (raw) {
      const parsed = StateSchema.safeParse(JSON.parse(raw));
      if (parsed.success) memory = parsed.data;
    }
  } catch {
    // Storage blocked: the demo login lasts until the tab closes.
  }
  return memory;
}

function save(next: State): void {
  memory = next;
  try {
    globalThis.sessionStorage?.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage blocked: kept in memory only.
  }
}

function fail(code: ErrorCode, status: number): never {
  throw new ApiRequestError({ status, code, message: errorWords(code) });
}

function sent(): SendCodeResult {
  const now = Date.now();
  return {
    sentAt: new Date(now).toISOString(),
    resendAt: new Date(now + RESEND_MS).toISOString(),
    devCode: MOCK_CODE,
  };
}

function claimsOf(email: string): UserClaims {
  const account = load().accounts.find((a) => a.email === email);
  return { userId: `mock-${email}`, email, fullName: account?.fullName, isAdmin: false };
}

/** The signed-in sample owner, for the mock store (who registers a shop, whose profile). */
export function currentMockOwner(): UserClaims | null {
  const email = load().signedIn;
  return email ? claimsOf(email) : null;
}

const clean = (email: string) => email.trim().toLowerCase();

export const mockOwnerAuth: OwnerAuth = {
  getSession: async () => currentMockOwner(),
  signIn: async ({ email, password }) => {
    const state = load();
    const account = state.accounts.find((a) => a.email === clean(email));
    if (!account || !account.confirmed || account.password !== password) fail('invalid_login', 401);
    save({ ...state, signedIn: account.email });
    return claimsOf(account.email);
  },
  signOut: async () => {
    save({ ...load(), signedIn: null });
  },
  signUp: async ({ email, fullName, password }) => {
    const state = load();
    const address = clean(email);
    const existing = state.accounts.find((a) => a.email === address);
    if (existing?.confirmed) fail('email_taken', 409);
    const others = state.accounts.filter((a) => a.email !== address);
    save({
      ...state,
      accounts: [
        ...others,
        { email: address, fullName: fullName.trim(), password, confirmed: false },
      ],
    });
    return sent();
  },
  verifySignupCode: async ({ email, code }) => {
    const state = load();
    const address = clean(email);
    const account = state.accounts.find((a) => a.email === address);
    if (!account || code.replace(/\s/g, '') !== MOCK_CODE) fail('invalid_code', 400);
    save({
      accounts: state.accounts.map((a) => (a.email === address ? { ...a, confirmed: true } : a)),
      signedIn: address,
    });
    return claimsOf(address);
  },
  resendSignupCode: async () => sent(),
  sendResetCode: async () => sent(),
  resetPassword: async ({ email, code, newPassword }) => {
    const state = load();
    const address = clean(email);
    const account = state.accounts.find((a) => a.email === address && a.confirmed);
    if (!account || code.replace(/\s/g, '') !== MOCK_CODE) fail('invalid_code', 400);
    save({
      accounts: state.accounts.map((a) =>
        a.email === address ? { ...a, password: newPassword } : a,
      ),
      signedIn: address,
    });
    return claimsOf(address);
  },
};
