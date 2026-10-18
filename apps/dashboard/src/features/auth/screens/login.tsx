import { words } from '@smartapp/core';
import { usePageTitle } from '@/app/use-page-title';
import { LoginForm } from '../login-form.js';

export function LoginScreen() {
  usePageTitle(words.auth.loginTitle);
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background p-4 md:p-8">
      <div className="w-full max-w-sm md:max-w-md">
        <LoginForm />
      </div>
    </main>
  );
}
