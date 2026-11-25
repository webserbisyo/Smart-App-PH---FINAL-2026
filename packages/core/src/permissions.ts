// What a route needs (decision T116). Every NestJS route carries @Public() or @Can(one of these); the API
// checks it after it finds the caller's shop in tenant_members (rule 12: never from the URL or body).
import { z } from 'zod';

export const PERMISSIONS = [
  // Signed in; no shop needed (my session, sign-up's last step, my shop or null).
  'account',
  // Read the shop's own pages (Home, Orders, Settings, Editor).
  'shop:view',
  // Change Settings (shop facts, hours, ordering, delivery, payments, storage).
  'settings:manage',
  // Change the storefront's look and publish it.
  'editor:manage',
  // Upload, list and delete the shop's files.
  'files:manage',
  // Change the menu: categories, items, add-ons, variants, samples (launch phase 4, T117).
  'menu:manage',
  // The founder's Super Admin (an app_metadata flag on the account, never a shop role).
  'platform:admin',
] as const;

export const PermissionEnum = z.enum(PERMISSIONS);
export type Permission = z.infer<typeof PermissionEnum>;

// Shop roles mirror the tenant_members.role CHECK. MVP A has owners only; staff come in MVP B.
export const SHOP_ROLES = ['owner'] as const;
export const ShopRoleEnum = z.enum(SHOP_ROLES);
export type ShopRole = z.infer<typeof ShopRoleEnum>;

const SHOP_PERMISSIONS: Record<ShopRole, readonly Permission[]> = {
  owner: [
    'account',
    'shop:view',
    'settings:manage',
    'editor:manage',
    'files:manage',
    'menu:manage',
  ],
};

/** True when a shop role may do this. `platform:admin` never comes from a shop role. */
export function roleAllows(role: ShopRole, permission: Permission): boolean {
  return SHOP_PERMISSIONS[role].includes(permission);
}

/** Permissions that need the caller's shop (everything except `account` and `platform:admin`). */
export function needsShop(permission: Permission): boolean {
  return permission !== 'account' && permission !== 'platform:admin';
}
