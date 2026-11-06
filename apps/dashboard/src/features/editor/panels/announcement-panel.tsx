import { CheckCircle2Icon, InfoIcon, TriangleAlertIcon, XIcon } from 'lucide-react';
import {
  ANNOUNCEMENT_TONES,
  editorWords,
  manilaDate,
  manilaToDate,
  withSection,
  type Announcement,
  type AnnouncementTone,
  type StorefrontContent,
} from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import { Field, FieldDescription, FieldLabel } from '@smartapp/ui/components/field';
import { Input } from '@smartapp/ui/components/input';
import { Textarea } from '@smartapp/ui/components/textarea';
import { ToggleGroup, ToggleGroupItem } from '@smartapp/ui/components/toggle-group';
import type { PanelProps } from './types.js';
import { CountedLabel } from './field-count.js';

const W = editorWords.announcement;
const MAX = 200;

const TONE_ICONS: Record<AnnouncementTone, typeof InfoIcon> = {
  info: InfoIcon,
  warning: TriangleAlertIcon,
  success: CheckCircle2Icon,
};

function withAnnouncement(c: StorefrontContent, next: Announcement | null): StorefrontContent {
  // Writing a message shows the part; it is the only reason to write one.
  const shown =
    c.look.announcement === null && next !== null ? withSection(c, 'announcement', true) : c;
  return { ...shown, look: { ...shown.look, announcement: next } };
}

export function AnnouncementPanel({ content, update }: PanelProps) {
  const current = content.look.announcement;
  const today = manilaDate(new Date());
  const endDate = current?.endsAt ? manilaDate(current.endsAt) : '';
  const set = (patch: Partial<Announcement>, key: string) =>
    update((c) => {
      const base = c.look.announcement ?? { text: '', tone: 'info', endsAt: null };
      const next = { ...base, ...patch };
      return withAnnouncement(c, next.text.trim() ? next : null);
    }, key);

  return (
    <div className="flex flex-col gap-5">
      <Field>
        <CountedLabel htmlFor="editor-announcement" used={current?.text.length ?? 0} max={MAX}>
          {W.text}
        </CountedLabel>
        <Textarea
          id="editor-announcement"
          value={current?.text ?? ''}
          maxLength={MAX}
          rows={3}
          placeholder={W.placeholder}
          onChange={(e) => set({ text: e.target.value }, 'announcement-text')}
        />
      </Field>
      <Field>
        <FieldLabel>{W.tone}</FieldLabel>
        <ToggleGroup
          value={[current?.tone ?? 'info']}
          disabled={!current}
          onValueChange={(value) => {
            const tone = ANNOUNCEMENT_TONES.find((t) => t === value[0]);
            if (tone) set({ tone }, 'announcement-tone');
          }}
          className="w-full rounded-xl border border-border/80 bg-muted/50 p-0.5"
        >
          {ANNOUNCEMENT_TONES.map((tone) => {
            const Icon = TONE_ICONS[tone];
            return (
              <ToggleGroupItem
                key={tone}
                value={tone}
                className="h-10 flex-1 rounded-lg px-2 text-sm font-medium text-muted-foreground aria-pressed:bg-card aria-pressed:text-foreground aria-pressed:shadow-xs md:h-8"
              >
                <Icon aria-hidden />
                {W.tones[tone]}
              </ToggleGroupItem>
            );
          })}
        </ToggleGroup>
      </Field>
      <Field>
        <FieldLabel htmlFor="editor-announcement-ends">{W.ends}</FieldLabel>
        <div className="flex gap-2">
          <Input
            id="editor-announcement-ends"
            type="date"
            className="h-11 min-w-0 flex-1 md:h-9"
            min={today}
            value={endDate}
            disabled={!current}
            onChange={(e) =>
              set(
                {
                  endsAt: e.target.value
                    ? manilaToDate(e.target.value, '24:00').toISOString()
                    : null,
                },
                'announcement-ends',
              )
            }
          />
          {endDate ? (
            <Button
              variant="outline"
              className="h-11 shrink-0 md:h-9"
              onClick={() => set({ endsAt: null }, 'announcement-ends')}
            >
              {W.noEnd}
            </Button>
          ) : null}
        </div>
        <FieldDescription>{endDate ? W.endsHelp : W.noEnd}</FieldDescription>
      </Field>
      {current ? (
        <Button
          variant="ghost"
          className="h-11 self-start text-destructive md:h-9"
          onClick={() => update((c) => withAnnouncement(c, null), 'announcement-remove')}
        >
          <XIcon />
          {W.remove}
        </Button>
      ) : null}
    </div>
  );
}
