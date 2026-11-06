import { ChevronLeftIcon, XIcon } from 'lucide-react';
import { editorWords, sectionIsOn, withSection, type EditorSection } from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import { Switch } from '@smartapp/ui/components/switch';
import { AboutPanel } from './panels/about-panel.js';
import { AnnouncementPanel } from './panels/announcement-panel.js';
import { BannersPanel } from './panels/banners-panel.js';
import { BrandPanel } from './panels/brand-panel.js';
import { OwnedPanel, isOwnedSection } from './panels/owned-panel.js';
import type { PanelProps } from './panels/types.js';
import { stampCardOff } from './parts.js';

const L = editorWords.list;

function PanelBody({ section, ...props }: PanelProps & { section: EditorSection }) {
  if (isOwnedSection(section)) return <OwnedPanel section={section} {...props} />;
  switch (section) {
    case 'brand':
      return <BrandPanel {...props} />;
    case 'banners':
      return <BannersPanel {...props} />;
    case 'announcement':
      return <AnnouncementPanel {...props} />;
    case 'about':
      return <AboutPanel {...props} />;
    default:
      return null;
  }
}

/** The picked part's settings: its name and switch on top, then what can change (decision T72). */
export function PartPanel({
  section,
  onBack,
  onClose,
  ...props
}: PanelProps & {
  section: EditorSection | null;
  onBack?: (() => void) | undefined;
  onClose?: (() => void) | undefined;
}) {
  if (!section) {
    return (
      <div className="flex flex-col gap-2 p-4">
        <h2 className="text-lg font-semibold">{L.pickTitle}</h2>
        <p className="text-sm text-muted-foreground">{L.pickBody}</p>
        <p className="text-sm text-muted-foreground">{L.pickColours(props.catalogName)}</p>
      </div>
    );
  }
  const name = editorWords.sections[section];
  const on = sectionIsOn(props.content, section);
  const locked = section === 'rewards' && stampCardOff(props.shop);
  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex min-h-11 items-center gap-2">
        {onBack ? (
          <Button
            variant="ghost"
            size="icon"
            className="-ml-2 size-11 shrink-0"
            aria-label={editorWords.phone.backToList}
            onClick={onBack}
          >
            <ChevronLeftIcon />
          </Button>
        ) : null}
        <h2 className="min-w-0 flex-1 truncate text-lg font-semibold">{name}</h2>
        {on === null ? null : (
          <Switch
            checked={on && !locked}
            disabled={locked}
            aria-label={L.show(name)}
            onCheckedChange={(checked) =>
              props.update((c) => withSection(c, section, checked), `switch-${section}`)
            }
          />
        )}
        {onClose ? (
          <Button
            variant="ghost"
            size="icon"
            className="-mr-2 size-11 shrink-0"
            aria-label={editorWords.phone.close}
            onClick={onClose}
          >
            <XIcon />
          </Button>
        ) : null}
      </div>
      <PanelBody section={section} {...props} />
    </div>
  );
}
