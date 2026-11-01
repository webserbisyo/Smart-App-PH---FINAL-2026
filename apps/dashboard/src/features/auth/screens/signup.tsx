import { words } from '@smartapp/core';
import { usePageTitle } from '@/app/use-page-title';
import { AuthFrame } from '../auth-frame.js';
import { SignupForm } from '../signup-form.js';

export function SignupScreen() {
  usePageTitle(words.auth.signupTitle);
  return (
    <AuthFrame>
      <SignupForm />
    </AuthFrame>
  );
}
