import {
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
  Outlet,
  redirect,
} from '@tanstack/react-router';
import { getClaims } from '@smartapp/data';
import { words } from '@smartapp/core';
import { LoginForm } from './components/blocks/login-form.js';
import { SignupForm } from './components/blocks/signup-form.js';
import { supabase } from './lib/supabase.js';

function RootComponent() {
  return <Outlet />;
}

function DashboardIndexPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-4">
      <div className="rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground">
        {words.dashboard}
      </div>
      <a href="/logout" className="sr-only">
        {words.auth.logout}
      </a>
    </main>
  );
}

function LoginPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background p-4 md:p-8">
      <div className="w-full max-w-sm md:max-w-md">
        <LoginForm />
      </div>
    </main>
  );
}

function SignupPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background p-4 md:p-8">
      <div className="w-full max-w-sm md:max-w-md">
        <SignupForm />
      </div>
    </main>
  );
}

const rootRoute = createRootRoute({
  component: RootComponent,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: async () => {
    const claims = await getClaims(supabase);
    if (!claims) {
      throw redirect({ to: '/login' });
    }
  },
  component: DashboardIndexPage,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  beforeLoad: async () => {
    const claims = await getClaims(supabase);
    if (claims) {
      throw redirect({ to: '/' });
    }
  },
  component: LoginPage,
});

const signupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/signup',
  beforeLoad: async () => {
    const claims = await getClaims(supabase);
    if (claims) {
      throw redirect({ to: '/' });
    }
  },
  component: SignupPage,
});

const logoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/logout',
  beforeLoad: async () => {
    await supabase.auth.signOut();
    throw redirect({ to: '/login' });
  },
  component: () => null,
});

const baseRoutes = [indexRoute, loginRoute, signupRoute, logoutRoute] as const;

const routeTree =
  import.meta.env.DEV || import.meta.env.VITE_SHOW_KIT === 'true'
    ? rootRoute.addChildren([
        ...baseRoutes,
        createRoute({
          getParentRoute: () => rootRoute,
          path: '/kit',
          component: lazyRouteComponent(() => import('./pages/kit.js')),
        }),
      ])
    : rootRoute.addChildren(baseRoutes);

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
