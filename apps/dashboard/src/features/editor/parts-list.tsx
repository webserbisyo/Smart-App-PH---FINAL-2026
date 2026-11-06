import * as React from 'react';
import { InfoIcon, XIcon } from 'lucide-react';
import {
  editorWords,
  sectionIsOn,
  withSection,
  type EditorSection,
  type PublicShop,
  type StorefrontContent,
} from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import { Switch } from '@smartapp/ui/components/switch';
import { cn } from 'cn';
import { PART_GROUPS, PART_ICONS, partStatus, stampCardOff } from './parts.js';

const L = editorWords.list;
const TIP_KEY = 'smartapp.editor.tipHidden';

function readTipHidden(): boolean {
  try {
    return window.localStorage.getItem(TIP_KEY) === 'true';
  } catch {
    return false;
  }
}

function useTip() {
  const [hidden, setHidden] = React.useState(readTipHidden);
  const hide = () => {
    setHidden(true);
    try {
      window.localStorage.setItem(TIP_KEY, 'true');
    } catch {
      // Storage blocked: the tip stays hidden for this visit only.
    }
  };
  return { hidden, hide };
}

export interface PartsListProps {
  content: StorefrontContent;
  shop: PublicShop | undefined;
  catalogName: string;
  selected: EditorSection | null;
  onSelect: (section: EditorSection) => void;
  onHover: (section: EditorSection | null) => void;
  update: (fn: (content: StorefrontContent) => StorefrontContent, key?: string) => void;
}

/** Every part of the shop page, top to bottom, with its switch (decision T72). */
export function PartsList({
  content,
  shop,
  catalogName,
  selected,
  onSelect,
  onHover,
  update,
}: PartsListProps) {
  const tip = useTip();
  return (
    <nav aria-label={L.title} className="flex flex-col gap-4 p-3">
      {tip.hidden ? null : (
        <div className="flex gap-2.5 rounded-xl border border-dashed border-border p-3 text-sm">
          <InfoIcon className="mt-0.5 size-4 shrink-0 text-info" aria-hidden />
          <p className="min-w-0 flex-1 text-muted-foreground">
            <span className="font-semibold text-foreground">{L.tipTitle}</span> {L.tipBody}
          </p>
          <Button
            variant="ghost"
            size="icon"
            className="-mt-1 -mr-1 size-9 shrink-0"
            aria-label={L.hideTip}
            onClick={tip.hide}
          >
            <XIcon />
          </Button>
        </div>
      )}
      {PART_GROUPS.map((group) => (
        <section key={group.id} className="flex flex-col gap-1">
          <h2 className="px-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {L.groups[group.id]}
          </h2>
          <ul className="flex flex-col gap-1">
            {group.parts.map((section) => {
              const Icon = PART_ICONS[section];
              const on = sectionIsOn(content, section);
              const locked = section === 'rewards' && stampCardOff(shop);
              const name = editorWords.sections[section];
              const isSelected = selected === section;
              return (
                <li
                  key={section}
                  className={cn(
                    'flex items-center gap-1 rounded-xl border pr-3 transition-colors duration-base',
                    isSelected
                      ? 'border-primary/30 bg-primary/5'
                      : 'border-transparent hover-hover:hover:bg-muted',
                  )}
                  onPointerEnter={() => onHover(section)}
                  onPointerLeave={() => onHover(null)}
                >
                  <button
                    type="button"
                    className="flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-xl py-2 pl-2 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                    aria-current={isSelected ? 'true' : undefined}
                    onClick={() => onSelect(section)}
                    onFocus={() => onHover(section)}
                    onBlur={() => onHover(null)}
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-foreground">
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <span
                        className={cn(
                          'truncate text-sm font-medium',
                          on === false ? 'text-muted-foreground' : 'text-foreground',
                        )}
                      >
                        {name}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {on === false && !locked
                          ? editorWords.partStatus.off
                          : partStatus(section, content, shop, catalogName)}
                      </span>
                    </span>
                  </button>
                  {on === null ? null : (
                    <Switch
                      checked={on && !locked}
                      disabled={locked}
                      aria-label={L.show(name)}
                      onCheckedChange={(checked) =>
                        update((c) => withSection(c, section, checked), `switch-${section}`)
                      }
                    />
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </nav>
  );
}
