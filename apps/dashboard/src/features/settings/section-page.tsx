import { EmptyPage } from '@/app/empty-page';
import { SETTINGS_SECTIONS, type SettingsSectionId } from './sections.js';

export function SettingsSectionPage({ id }: { id: SettingsSectionId }) {
  const section = SETTINGS_SECTIONS.find((s) => s.id === id) ?? SETTINGS_SECTIONS[0];
  const Icon = section.icon;
  return <EmptyPage title={section.label} icon={<Icon />} line={section.empty} />;
}
