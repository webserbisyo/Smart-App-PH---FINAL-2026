import {
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
  Outlet,
} from '@tanstack/react-router';
import { words } from '@smartapp/core';
import { LoginScreen } from '../features/auth/screens/login.js';
import { SignupScreen } from '../features/auth/screens/signup.js';
import { CatalogAddOnsScreen } from '../features/catalog/screens/add-ons.js';
import { CatalogCategoriesScreen } from '../features/catalog/screens/categories.js';
import { CatalogItemScreen } from '../features/catalog/screens/item-detail.js';
import { CatalogItemsScreen } from '../features/catalog/screens/items.js';
import { NewCatalogItemScreen } from '../features/catalog/screens/new-item.js';
import { EditorScreen } from '../features/editor/screens/editor.js';
import { HomeScreen } from '../features/home/screens/home.js';
import { InsightsScreen } from '../features/insights/screens/insights.js';
import { InsightsSearchSchema } from '../features/insights/tabs.js';
import { PrizeClaimsScreen } from '../features/members/screens/claims.js';
import { MemberDetailScreen } from '../features/members/screens/member-detail.js';
import { MembersScreen } from '../features/members/screens/members.js';
import { StampCardScreen } from '../features/members/screens/stamp-card.js';
import { OrderDetailScreen } from '../features/orders/screens/order-detail.js';
import { OrdersScreen } from '../features/orders/screens/orders.js';
import { OrdersSearchSchema } from '../features/orders/tabs.js';
import { AccountSettingsScreen } from '../features/settings/screens/account.js';
import { DeliverySettingsScreen } from '../features/settings/screens/delivery.js';
import { HoursSettingsScreen } from '../features/settings/screens/hours.js';
import { NotificationsSettingsScreen } from '../features/settings/screens/notifications.js';
import { OrderingSettingsScreen } from '../features/settings/screens/ordering.js';
import { PaymentsSettingsScreen } from '../features/settings/screens/payments.js';
import { PlanSettingsScreen } from '../features/settings/screens/plan.js';
import { SettingsIndexScreen } from '../features/settings/screens/settings-index.js';
import { SettingsLayout } from '../features/settings/screens/settings-layout.js';
import { ShopSettingsScreen } from '../features/settings/screens/shop.js';
import { requireAuth, requireGuest, signOut } from './guards.js';
import type { PageMeta } from './page-meta.js';
import { AppShell } from './shell/app-shell.js';
import { resolveShop } from './shop.js';

const s = words.screens;
const page = (title: PageMeta['title'], parent?: PageMeta['parent']) => ({
  page: { title, parent },
});
const orders = { to: '/orders', title: () => s.orders.title } as const;
const catalog = { to: '/catalog', title: s.catalog.title } as const;
const members = { to: '/members', title: () => s.members.title } as const;
const settings = { to: '/settings', title: () => s.settings.title } as const;

const rootRoute = createRootRoute({ component: Outlet });

// Outside the shell.
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  beforeLoad: requireGuest,
  component: LoginScreen,
});

const signupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/signup',
  beforeLoad: requireGuest,
  component: SignupScreen,
});

const logoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/logout',
  beforeLoad: signOut,
  component: () => null,
});

const editorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/editor',
  beforeLoad: requireAuth,
  component: EditorScreen,
});

// The signed-in shell: without a session every page below redirects to /login.
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

function shellPage<TPath extends string>(
  path: TPath,
  component: () => React.JSX.Element,
  meta: { page: PageMeta },
) {
  return createRoute({ getParentRoute: () => shellRoute, path, component, staticData: meta });
}

const homeRoute = shellPage(
  '/',
  HomeScreen,
  page(() => s.home.title),
);

const ordersRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/orders',
  validateSearch: OrdersSearchSchema,
  component: OrdersScreen,
  staticData: page(() => s.orders.title),
});
const orderRoute = shellPage(
  '/orders/$orderId',
  OrderDetailScreen,
  page(() => s.orders.detailTitle, orders),
);

const catalogRoute = shellPage('/catalog', CatalogItemsScreen, page(s.catalog.title));
const catalogCategoriesRoute = shellPage(
  '/catalog/categories',
  CatalogCategoriesScreen,
  page(s.catalog.title),
);
const catalogAddOnsRoute = shellPage(
  '/catalog/add-ons',
  CatalogAddOnsScreen,
  page(s.catalog.title),
);
const catalogNewRoute = shellPage(
  '/catalog/new',
  NewCatalogItemScreen,
  page(s.catalog.newTitle, catalog),
);
const catalogItemRoute = shellPage(
  '/catalog/$itemId',
  CatalogItemScreen,
  page(s.catalog.itemTitle, catalog),
);

const membersRoute = shellPage(
  '/members',
  MembersScreen,
  page(() => s.members.title),
);
const stampCardRoute = shellPage(
  '/members/stamp-card',
  StampCardScreen,
  page(() => s.members.title),
);
const claimsRoute = shellPage(
  '/members/claims',
  PrizeClaimsScreen,
  page(() => s.members.title),
);
const memberRoute = shellPage(
  '/members/$customerId',
  MemberDetailScreen,
  page(() => s.members.detailTitle, members),
);

const insightsRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/insights',
  validateSearch: InsightsSearchSchema,
  component: InsightsScreen,
  staticData: page(() => s.insights.title),
});

const settingsRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/settings',
  component: SettingsLayout,
  staticData: page(() => s.settings.title),
});

function settingsPage<TPath extends string>(
  path: TPath,
  component: () => React.JSX.Element,
  title: string,
) {
  return createRoute({
    getParentRoute: () => settingsRoute,
    path,
    component,
    staticData: page(() => title, settings),
  });
}

const settingsIndexRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: '/',
  component: SettingsIndexScreen,
});

const settingsChildren = [
  settingsIndexRoute,
  settingsPage('/shop', ShopSettingsScreen, s.settings.shop),
  settingsPage('/hours', HoursSettingsScreen, s.settings.hours),
  settingsPage('/ordering', OrderingSettingsScreen, s.settings.ordering),
  settingsPage('/delivery', DeliverySettingsScreen, s.settings.delivery),
  settingsPage('/payments', PaymentsSettingsScreen, s.settings.payments),
  settingsPage('/notifications', NotificationsSettingsScreen, s.settings.notifications),
  settingsPage('/plan', PlanSettingsScreen, s.settings.plan),
  settingsPage('/account', AccountSettingsScreen, s.settings.account),
] as const;

const baseRoutes = [
  loginRoute,
  signupRoute,
  logoutRoute,
  editorRoute,
  shellRoute.addChildren([
    homeRoute,
    ordersRoute,
    orderRoute,
    catalogRoute,
    catalogCategoriesRoute,
    catalogAddOnsRoute,
    catalogNewRoute,
    catalogItemRoute,
    membersRoute,
    stampCardRoute,
    claimsRoute,
    memberRoute,
    insightsRoute,
    settingsRoute.addChildren(settingsChildren),
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
