import {
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
  Outlet,
} from '@tanstack/react-router';
import { LoginForm } from '../features/auth/screens/login-form.js';
import { SignupForm } from '../features/auth/screens/signup-form.js';
import { HomeScreen } from '../features/home/screens/home.js';
import { OrdersScreen } from '../features/orders/screens/orders.js';
import { CatalogScreen } from '../features/catalog/screens/catalog.js';
import { MembersScreen } from '../features/members/screens/members.js';
import { EditorScreen } from '../features/editor/screens/editor.js';
import { InsightsScreen } from '../features/insights/screens/insights.js';
import { SettingsScreen } from '../features/settings/screens/settings.js';
import { requireAuth, requireGuest, signOut } from './guards.js';
import { AppShell } from './shell/app-shell.js';
import { resolveShop } from './shop.js';

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

const rootRoute = createRootRoute({ component: Outlet });

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  beforeLoad: requireGuest,
  component: LoginPage,
});

const signupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/signup',
  beforeLoad: requireGuest,
  component: SignupPage,
});

const logoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/logout',
  beforeLoad: signOut,
  component: () => null,
});

const shellRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'shell',
  beforeLoad: async () => {
    const claims = await requireAuth();
    return { claims, shop: resolveShop(claims) };
  },
  component: ShellLayout,
});

function ShellLayout() {
  const { claims, shop } = shellRoute.useRouteContext();
  return <AppShell claims={claims} shop={shop} />;
}

const homeRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/',
  component: HomeScreen,
});

const ordersRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/orders',
  component: OrdersScreen,
});

const catalogRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/catalog',
  component: CatalogScreen,
});

const membersRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/members',
  component: MembersScreen,
});

const editorRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/editor',
  component: EditorScreen,
});

const insightsRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/insights',
  component: InsightsScreen,
});

const settingsRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/settings',
  component: SettingsScreen,
});

const baseRoutes = [
  loginRoute,
  signupRoute,
  logoutRoute,
  shellRoute.addChildren([
    homeRoute,
    ordersRoute,
    catalogRoute,
    membersRoute,
    editorRoute,
    insightsRoute,
    settingsRoute,
  ]),
] as const;

const routeTree =
  import.meta.env.DEV || import.meta.env.VITE_SHOW_KIT === 'true'
    ? rootRoute.addChildren([
        ...baseRoutes,
        createRoute({
          getParentRoute: () => rootRoute,
          path: '/kit',
          component: lazyRouteComponent(() => import('../features/kit/screens/kit.js')),
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
