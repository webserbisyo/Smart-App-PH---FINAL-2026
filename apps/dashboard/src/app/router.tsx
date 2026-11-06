import {
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
  Outlet,
  redirect,
} from '@tanstack/react-router';
import { membersWords, settingsWords, words } from '@smartapp/core';
import { LoginScreen } from '../features/auth/screens/login.js';
import { SignupScreen } from '../features/auth/screens/signup.js';
import { CatalogAddOnsScreen } from '../features/catalog/screens/add-ons.js';
import { CatalogCategoriesScreen } from '../features/catalog/screens/categories.js';
import { CatalogItemScreen } from '../features/catalog/screens/item-detail.js';
import { CatalogItemsScreen } from '../features/catalog/screens/items.js';
import { CatalogVariantsScreen } from '../features/catalog/screens/variants.js';
import { NewCatalogItemScreen } from '../features/catalog/screens/new-item.js';
import { CatalogSearchSchema, NewItemSearchSchema } from '../features/catalog/tabs.js';
import { EditorScreen } from '../features/editor/screens/editor.js';
import { HomeScreen } from '../features/home/screens/home.js';
import { HomeSearchSchema } from '../features/home/search.js';
// Insights is hidden for launch (decision T69); its screen stays for later.
// import { InsightsScreen } from '../features/insights/screens/insights.js';
import { InsightsSearchSchema } from '../features/insights/tabs.js';
import { PrizeClaimsScreen } from '../features/members/screens/claims.js';
import { FindMemberScreen } from '../features/members/screens/find-member.js';
import { MembersScreen } from '../features/members/screens/members.js';
import { MembersSearchSchema } from '../features/members/search.js';
import { StampCardScreen } from '../features/members/screens/stamp-card.js';
import { OrdersScreen } from '../features/orders/screens/orders.js';
import { OrdersSearchSchema } from '../features/orders/search.js';
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
import { StorageSettingsScreen } from '../features/settings/screens/storage.js';
import { setMockOwnerSlug } from '@smartapp/data';
import { rememberPreviousPath } from './back.js';
import { requireAuth, requireGuest, signOut } from './guards.js';
import type { PageMeta } from './page-meta.js';
import { AppShell } from './shell/app-shell.js';
import { ShopContext, resolveShop } from './shop.js';

const s = words.screens;
const page = (title: PageMeta['title'], parent?: PageMeta['parent'], hideDock?: boolean) => ({
  page: { title, parent, hideDock },
});
const orders = { to: '/orders', title: () => s.orders.title } as const;
const catalog = { to: '/catalog', title: s.catalog.title } as const;
const members = { to: '/members', title: () => s.members.title } as const;
const settings = { to: '/settings', title: () => s.settings.title } as const;
const st = settingsWords.sectionTitles;

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

// Full screen, outside the shell, but for the same signed-in owner and shop.
const editorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/editor',
  beforeLoad: async () => {
    const claims = await requireAuth();
    return { shop: resolveShop(claims) };
  },
  component: EditorPage,
});

function EditorPage() {
  const { shop } = editorRoute.useRouteContext();
  return (
    <ShopContext value={shop}>
      <EditorScreen />
    </ShopContext>
  );
}

// The signed-in shell: without a session every page below redirects to /login.
const shellRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'shell',
  beforeLoad: async () => {
    const claims = await requireAuth();
    const shop = resolveShop(claims);
    if (shop.slug) {
      setMockOwnerSlug(shop.slug);
    }
    return { claims, shop };
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

const homeRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/',
  validateSearch: HomeSearchSchema,
  component: HomeScreen,
  staticData: page(() => s.home.title),
});

const ordersRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/orders',
  validateSearch: OrdersSearchSchema,
  component: OrdersScreen,
  staticData: page(() => s.orders.title),
});
// Old order links (notifications, bookmarks) open the order panel on the Orders page (decision T54).
const orderRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/orders/$orderId',
  beforeLoad: ({ params }) => {
    throw redirect({ to: '/orders', search: { order: params.orderId }, replace: true });
  },
  staticData: page(() => s.orders.title, orders),
});

const catalogRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/catalog',
  validateSearch: CatalogSearchSchema,
  component: CatalogItemsScreen,
  staticData: page(s.catalog.title),
});
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
const catalogVariantsRoute = shellPage(
  '/catalog/variants',
  CatalogVariantsScreen,
  page(s.catalog.title),
);
const catalogNewRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/catalog/new',
  validateSearch: NewItemSearchSchema,
  component: NewCatalogItemScreen,
  staticData: page(s.catalog.newTitle, catalog, true),
});
const catalogItemRoute = shellPage(
  '/catalog/$itemId',
  CatalogItemScreen,
  page(s.catalog.itemTitle, catalog, true),
);

const membersRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/members',
  validateSearch: MembersSearchSchema,
  component: MembersScreen,
  staticData: page(() => s.members.title),
});
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
// Old member links open the member panel on the Members page (decision T57).
const memberRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/members/$customerId',
  beforeLoad: ({ params }) => {
    throw redirect({ to: '/members', search: { member: params.customerId }, replace: true });
  },
  staticData: page(() => s.members.detailTitle, members),
});
// Member and prize QR codes open here (M13).
const findMemberRoute = shellPage(
  '/m/$code',
  FindMemberScreen,
  page(() => membersWords.find.title, members),
);

// Insights is hidden for launch (decision T69): old links and bookmarks open Home's trends with the same range.
const insightsRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/insights',
  validateSearch: InsightsSearchSchema,
  beforeLoad: ({ search }) => {
    throw redirect({
      to: '/',
      search: { range: search.range === '30d' ? '30d' : undefined },
      hash: 'trends',
      replace: true,
    });
  },
  // component: InsightsScreen,
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
  settingsPage('/shop', ShopSettingsScreen, st.shop),
  settingsPage('/hours', HoursSettingsScreen, st.hours),
  settingsPage('/ordering', OrderingSettingsScreen, st.ordering),
  settingsPage('/delivery', DeliverySettingsScreen, st.delivery),
  settingsPage('/payments', PaymentsSettingsScreen, st.payments),
  settingsPage('/account', AccountSettingsScreen, st.account),
  settingsPage('/notifications', NotificationsSettingsScreen, st.notifications),
  settingsPage('/plan', PlanSettingsScreen, st.plan),
  settingsPage('/storage', StorageSettingsScreen, st.storage),
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
    catalogVariantsRoute,
    catalogNewRoute,
    catalogItemRoute,
    membersRoute,
    stampCardRoute,
    claimsRoute,
    memberRoute,
    findMemberRoute,
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
  // Back to a list lands where the owner was, not at the top (decision T47).
  scrollRestoration: true,
});

// Back on a sub-page needs to know where the owner came from (app/back.ts).
router.subscribe('onResolved', ({ fromLocation, toLocation }) => {
  if (fromLocation && fromLocation.pathname !== toLocation.pathname) {
    rememberPreviousPath(fromLocation.pathname);
  }
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
