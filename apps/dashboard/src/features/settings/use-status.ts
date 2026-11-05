import {
  useNotificationPrefs,
  useNow,
  useOwnerProfile,
  useOwnerSettings,
  usePlan,
  useStorage,
} from '@smartapp/data';
import { useAppearance } from '@/app/appearance';
import { useShop } from '@/app/shop';
import { storefrontUrl } from '@/app/use-nav-items';
import type { SettingsSectionId } from './sections.js';
import { sectionStatus, type SectionStatus } from './status.js';

/** The link without https://, as it reads on a printed QR. */
export function shortLink(url: string): string {
  return url.replace(/^https?:\/\//, '');
}

/** A status line for every section, filled in as each read arrives. */
export function useSectionStatuses(): (id: SettingsSectionId) => SectionStatus | null {
  const shop = useShop();
  const settings = useOwnerSettings();
  const profile = useOwnerProfile();
  const prefs = useNotificationPrefs();
  const plan = usePlan();
  const storage = useStorage();
  const appearance = useAppearance();
  const now = useNow() ?? new Date().toISOString();
  const input = {
    settings: settings.data,
    profile: profile.data,
    prefs: prefs.data,
    plan: plan.data,
    storage: storage.data,
    appearance,
    shopLink: shortLink(storefrontUrl(shop.slug)),
    now,
  };
  return (id) => sectionStatus(id, input);
}
