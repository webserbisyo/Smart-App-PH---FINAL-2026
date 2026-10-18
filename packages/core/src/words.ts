import type { ShopKind } from './schemas/demo-shop.js';

export interface ShopVocab {
  catalog: string;
  catalogItems: string;
  item: string;
  items: string;
  categories: string;
  addItem: string;
  addCategory: string;
  emptyCatalogTitle: string;
  emptyCatalogDescription: string;
}

const FOOD_VOCAB: ShopVocab = {
  catalog: 'Menu',
  catalogItems: 'Menu items',
  item: 'Dish',
  items: 'Dishes',
  categories: 'Categories',
  addItem: 'Add dish',
  addCategory: 'Add category',
  emptyCatalogTitle: 'No menu items yet',
  emptyCatalogDescription: 'Add your first dishes and drinks so customers can start ordering.',
};

const RETAIL_VOCAB: ShopVocab = {
  catalog: 'Products',
  catalogItems: 'Products',
  item: 'Product',
  items: 'Products',
  categories: 'Categories',
  addItem: 'Add product',
  addCategory: 'Add category',
  emptyCatalogTitle: 'No products yet',
  emptyCatalogDescription: 'Add your first products so customers can start shopping.',
};

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
    pauseShop: 'Pause shop',
    resumeShop: 'Resume shop',
    openState: 'Open now',
    busyState: 'Busy',
    closedState: 'Closed',
  },
  shell: {
    myShop: 'My shop',
  },
  screens: {
    home: {
      title: 'Home',
      description: 'Your shop snapshot for today.',
    },
    orders: {
      title: 'Orders',
      description: 'Track incoming and open customer orders.',
      emptyTitle: 'No orders yet',
      emptyDescription: 'When customers place orders on your storefront, they will appear here.',
      tabBoard: 'Board',
      tabHistory: 'Order history',
    },
    catalog: {
      title: (kind: ShopKind) => vocab(kind).catalog,
      description: (kind: ShopKind) =>
        `Manage your ${vocab(kind).catalog.toLowerCase()} items, categories, and add-on options.`,
      tabItems: (kind: ShopKind) => vocab(kind).catalogItems,
      tabCategories: 'Categories',
      tabAddOns: 'Add-ons',
      emptyItemsTitle: (kind: ShopKind) => vocab(kind).emptyCatalogTitle,
      emptyItemsDescription: (kind: ShopKind) => vocab(kind).emptyCatalogDescription,
      emptyCategoriesTitle: 'No categories yet',
      emptyCategoriesDescription:
        'Group your items into categories to help customers find what they want.',
      emptyAddOnsTitle: 'No add-on groups yet',
      emptyAddOnsDescription: 'Create shared options like sizes, toppings, and choices.',
      addItem: (kind: ShopKind) => vocab(kind).addItem,
      addCategory: 'Add category',
      addGroup: 'Add group',
    },
    members: {
      title: 'Members',
      description: 'Your suki list, stamp history, and loyalty rewards.',
      tabAll: 'All members',
      tabStampCard: 'Stamp card',
      tabClaims: 'Prize claims',
      emptyMembersTitle: 'No members yet',
      emptyMembersDescription:
        'Customers become members when they join your loyalty program on the storefront.',
      emptyClaimsTitle: 'No prize claims yet',
      emptyClaimsDescription:
        'When members complete stamp cards, their prize claims will show up here.',
      stampCardTitle: 'Loyalty stamp card',
      stampCardDescription:
        'Configure stamps required and the reward suki earn when they fill their card.',
    },
    editor: {
      title: 'Storefront Editor',
      description: 'Customise your shop banner, brand colour, and storefront sections.',
      emptyTitle: 'Storefront live editor',
      emptyDescription:
        'Preview and edit your storefront in real time. Customize your colors, banners, and sections.',
      saveDraft: 'Save draft',
      publish: 'Publish changes',
    },
    insights: {
      title: 'Insights',
      description: 'Sales numbers, order volume, and top items.',
      emptyTitle: 'No sales data yet',
      emptyDescription:
        'Insights will appear here once your shop starts receiving and completing orders.',
      range7d: 'Last 7 days',
      range30d: 'Last 30 days',
    },
    settings: {
      title: 'Settings',
      description: 'Shop operations, hours, payments, and ordering options.',
      shopTitle: 'Shop details',
      shopDescription: 'Update your shop name, contact number, and address.',
      hoursTitle: 'Operating hours',
      hoursDescription: 'Set your regular schedule for orders, pickup, and delivery.',
      orderingTitle: 'Ordering rules',
      orderingDescription: 'Set preparation times, minimum orders, and ordering when closed.',
      deliveryTitle: 'Delivery options',
      deliveryDescription: 'Configure your delivery coverage, rates, and rider notes.',
      paymentsTitle: 'Payment methods',
      paymentsDescription: 'Set up GCash, Maya, Bank Transfer, and Cash on Delivery.',
      accountTitle: 'Account settings',
      accountDescription: 'Manage your owner profile, password, and sign-in credentials.',
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
