import { words } from '@smartapp/core';
import { usePageTitle } from '@/app/use-page-title';
import { AuthFrame } from '../auth-frame.js';
import { LoginForm } from '../login-form.js';

export function LoginScreen() {
  usePageTitle(words.auth.loginTitle);
  return (
    <AuthFrame>
      <LoginForm />
    </AuthFrame>
  );
}
