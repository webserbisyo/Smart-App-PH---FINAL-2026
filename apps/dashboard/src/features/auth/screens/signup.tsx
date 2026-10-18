import { words } from '@smartapp/core';
import { usePageTitle } from '@/app/use-page-title';
import { SignupForm } from '../signup-form.js';

export function SignupScreen() {
  usePageTitle(words.auth.signupTitle);
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background p-4 md:p-8">
      <div className="w-full max-w-sm md:max-w-md">
        <SignupForm />
      </div>
    </main>
  );
}
