import type { ShopKind } from './schemas/demo-shop.js';

// Icon keys for the catalog nav item; apps map each key to a lucide icon.
export const CATALOG_ICONS = ['utensils', 'package'] as const;
export type CatalogIcon = (typeof CATALOG_ICONS)[number];

export interface ShopVocab {
  catalog: string;
  catalogIcon: CatalogIcon;
  item: string;
  newItem: string;
  emptyItems: string;
}

const FOOD_VOCAB: ShopVocab = {
  catalog: 'Menu',
  catalogIcon: 'utensils',
  item: 'Menu item',
  newItem: 'New menu item',
  emptyItems: 'No menu items yet. Add your first dish so customers can order.',
};

const RETAIL_VOCAB: ShopVocab = {
  catalog: 'Products',
  catalogIcon: 'package',
  item: 'Product',
  newItem: 'New product',
  emptyItems: 'No products yet. Add your first product so customers can order.',
};

// The only place that looks at the shop kind.
export function vocab(kind: ShopKind): ShopVocab {
  return kind === 'retail' ? RETAIL_VOCAB : FOOD_VOCAB;
}

export const words = {
  appName: 'Smart App PH',
  dashboard: 'dashboard',
  storefront: 'storefront',
  auth: {
    loginTitle: 'Log in',
    loginSubtitle: 'Enter your email and password to open your shop dashboard.',
    signupTitle: 'Create account',
    signupSubtitle: 'Set up your shop owner account in seconds.',
    fullNameLabel: 'Full name',
    fullNamePlaceholder: 'e.g. Maria Santos',
    emailLabel: 'Email address',
    emailPlaceholder: 'owner@example.com',
    passwordLabel: 'Password',
    passwordPlaceholder: 'At least 8 characters',
    loginButton: 'Log in',
    signupButton: 'Create account',
    loggingIn: 'Logging in...',
    signingUp: 'Creating account...',
    noAccount: "Don't have an account?",
    haveAccount: 'Already have an account?',
    signUpLink: 'Sign up',
    logInLink: 'Log in',
    logout: 'Log out',
    offline: "You're offline",
  },
  nav: {
    home: 'Home',
    orders: 'Orders',
    catalog: (kind: ShopKind) => vocab(kind).catalog,
    members: 'Members',
    editor: 'Editor',
    insights: 'Insights',
    settings: 'Settings',
    viewMyShop: 'View my shop',
    shareMyShop: 'Share my shop',
    account: 'Account',
    more: 'More',
  },
  shell: {
    myShop: 'My shop',
    open: 'Open',
    mainNav: 'Main',
    skipToContent: 'Skip to content',
    back: 'Back',
    toggleSidebar: 'Show or hide the menu',
    accountMenu: 'Account menu',
    pageTitle: (page: string) => `${page} · Smart App PH`,
  },
  share: {
    description: 'Customers open this link to see your shop and order.',
    copy: 'Copy link',
    copied: 'Link copied',
    copyFailed: 'Copy did not work. Press and hold the link to copy it.',
  },
  media: {
    banners: 'Shop banners',
    slideOf: (index: number, total: number) => `${index} of ${total}`,
    showBanner: (index: number) => `Show banner ${index}`,
  },
  screens: {
    home: {
      title: 'Home',
      empty: 'New orders and members who need you will show here.',
    },
    orders: {
      title: 'Orders',
      tabBoard: 'Board',
      tabList: 'List',
      empty: 'No orders yet. New orders show here as soon as customers place them.',
      detailTitle: 'Order',
      detailEmpty: 'The order details will show here.',
    },
    catalog: {
      title: (kind: ShopKind) => vocab(kind).catalog,
      tabItems: 'Items',
      tabCategories: 'Categories',
      tabAddOns: 'Add-ons',
      emptyItems: (kind: ShopKind) => vocab(kind).emptyItems,
      emptyCategories: 'No categories yet. Group your items so customers find them fast.',
      emptyAddOns: 'No add-ons yet. Add extras like sizes, sauces or gift wrap.',
      newTitle: (kind: ShopKind) => vocab(kind).newItem,
      newEmpty: 'The form for a new item will show here.',
      itemTitle: (kind: ShopKind) => vocab(kind).item,
      itemEmpty: 'The item details will show here.',
    },
    members: {
      title: 'Members',
      tabMembers: 'Members',
      tabStampCard: 'Stamp card',
      tabClaims: 'Prize claims',
      emptyMembers: 'No members yet. Customers join when they sign up on your shop page.',
      emptyStampCard: 'Your stamp card settings will show here.',
      emptyClaims: 'No prize claims yet. Members claim a prize when their card is full.',
      detailTitle: 'Member',
      detailEmpty: 'The member’s stamps and orders will show here.',
    },
    editor: {
      title: 'Editor',
      empty: 'Change how your shop page looks here: colours, banner and sections.',
    },
    insights: {
      title: 'Insights',
      tab7d: '7 days',
      tab30d: '30 days',
      empty: 'No sales yet. Sales and top items show here once orders come in.',
    },
    settings: {
      title: 'Settings',
      sections: 'Settings sections',
      shop: 'Shop',
      shopEmpty: 'Your shop name, contact number and address will show here.',
      hours: 'Hours',
      hoursEmpty: 'Your opening hours will show here.',
      ordering: 'Ordering',
      orderingEmpty: 'Your pickup, prep time and minimum order rules will show here.',
      delivery: 'Delivery',
      deliveryEmpty: 'Your delivery areas and fees will show here.',
      payments: 'Payments',
      paymentsEmpty: 'Your GCash, Maya, bank and cash options will show here.',
      notifications: 'Notifications',
      notificationsEmpty: 'Choose how you hear about new orders here.',
      plan: 'Plan',
      planEmpty: 'Your plan and billing will show here.',
      account: 'Account',
      accountEmpty: 'Your name, email and password will show here.',
    },
  },
  validation: {
    fullNameRequired: 'Please enter your full name.',
    fullNameTooLong: 'Full name must be 80 characters or fewer.',
    emailRequired: 'Please enter your email address.',
    emailInvalid: 'Please enter a valid email address.',
    passwordRequired: 'Please enter your password.',
    passwordMinLength: 'Password must be at least 8 characters long.',
  },
  errors: {
    invalidLogin: 'Incorrect email or password. Please check your credentials and try again.',
    emailTaken: 'An account with this email already exists. Try logging in instead.',
    weakPassword: 'Password must be at least 8 characters long.',
    invalidCode: 'The code you entered is invalid. Please double check and try again.',
    codeExpired: 'This code has expired. Request a new code to continue.',
    rateLimited: 'Too many attempts. Please wait a few minutes before trying again.',
    notSignedIn: 'Please sign in to view this page.',
    invalidInput: 'Please check the information you entered and try again.',
    unknown: 'Something went wrong on our end. Please try again.',
  },
} as const;
