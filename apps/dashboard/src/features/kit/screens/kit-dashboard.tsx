import { Separator } from '@smartapp/ui/components/separator';
import { KitFrame, KitJumpBar } from '../kit-frame.js';
import { CatalogPrimitiveSections } from '../catalog-primitives.js';
import { OrdersPrimitiveSections } from '../orders-primitives.js';
import { OrdersV2Sections } from '../orders-v2-primitives.js';
import { MembersPrimitiveSections } from '../members-primitives.js';
import { HomePrimitiveSections } from '../home-primitives.js';
import { SettingsPrimitiveSections } from '../settings-primitives.js';
import { AdminPrimitiveSections } from '../admin-primitives.js';
import { EditorPrimitiveSections } from '../editor-primitives.js';

// Kit page 2 of 5, Dashboard (decision T98): the owner screens' parts, in the order of the app's nav.
const GROUPS = [
  { id: 'kit-home', label: 'Home' },
  { id: 'kit-orders', label: 'Orders' },
  { id: 'kit-catalog', label: 'Menu' },
  { id: 'kit-members', label: 'Members' },
  { id: 'kit-settings', label: 'Settings' },
  { id: 'kit-admin', label: 'Admin' },
  { id: 'kit-editor', label: 'Editor' },
] as const;

export default function KitDashboardPage() {
  return (
    <KitFrame current="/kit/dashboard">
      <KitJumpBar groups={GROUPS} />

      <div id="kit-home" className="scroll-mt-20" />
      <HomePrimitiveSections />

      <Separator />

      <div id="kit-orders" className="scroll-mt-20" />
      <OrdersV2Sections />
      <OrdersPrimitiveSections />

      <Separator />

      <div id="kit-catalog" className="scroll-mt-20" />
      <CatalogPrimitiveSections />

      <Separator />

      <div id="kit-members" className="scroll-mt-20" />
      <MembersPrimitiveSections />

      <Separator />

      <div id="kit-settings" className="scroll-mt-20" />
      <SettingsPrimitiveSections />

      <div id="kit-admin" className="scroll-mt-20" />
      <AdminPrimitiveSections />

      <Separator />

      <div id="kit-editor" className="scroll-mt-20" />
      <EditorPrimitiveSections />
    </KitFrame>
  );
}
