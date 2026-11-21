import * as React from 'react';
import { useBlocker, useNavigate, useSearch } from '@tanstack/react-router';
import {
  BellIcon,
  LifeBuoyIcon,
  TriangleAlertIcon,
  ClockIcon,
  SendIcon,
  WifiOffIcon,
} from 'lucide-react';
import {
  NEWS_AUDIENCES,
  NEWS_BODY_MAX,
  NEWS_LINK_KINDS,
  NEWS_STARTERS,
  NEWS_TITLE_MAX,
  actionWords,
  addDays,
  errorWords,
  formatClock,
  formatManila,
  isQuietTime,
  manilaDate,
  manilaParts,
  manilaToDate,
  membersWords,
  newsNextFree,
  newsSendBlock,
  newsWords,
  outOfQuiet,
  type NewsAudience,
  type NewsLink,
  type NewsOverview,
  type NewsStarter,
  type OwnerItem,
  type OwnerNews,
  type StampCardSettings,
} from '@smartapp/core';
import {
  errorCodeOf,
  useNews,
  useNewsOverview,
  useOwnerItems,
  useSaveNews,
  useSendNewsTest,
  useStampCard,
} from '@smartapp/data';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@smartapp/ui/components/alert-dialog';
import { Button } from '@smartapp/ui/components/button';
import { Field, FieldDescription, FieldLabel } from '@smartapp/ui/components/field';
import { Input } from '@smartapp/ui/components/input';
import { NativeSelect, NativeSelectOption } from '@smartapp/ui/components/native-select';
import { RadioGroup, RadioGroupItem } from '@smartapp/ui/components/radio-group';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { Textarea } from '@smartapp/ui/components/textarea';
import { ToggleGroup, ToggleGroupItem } from '@smartapp/ui/components/toggle-group';
import { AsyncButton, useAsyncAction } from '@smartapp/ui/compositions/async-button';
import { notify } from '@smartapp/ui/compositions/notify';
import { ImageUploadRow } from '@/app/image-upload-row';
import { Notice } from '@/app/notice';
import { PageError } from '@/app/page-state';
import { currentSupport } from '@/app/support';
import { useOnlineStatus } from '@/app/use-online-status';
import { cn } from 'cn';
import { NewsPreview, newsPhotoSrc } from '../news-preview.js';

const W = newsWords.compose;
const NW = newsWords;
const CHIP =
  'h-10 gap-1.5 rounded-full border border-border bg-card px-3 text-sm font-semibold text-muted-foreground aria-pressed:border-primary aria-pressed:bg-accent aria-pressed:text-foreground md:h-9';
const CARD_PICK =
  'flex min-h-16 flex-col items-start gap-0.5 rounded-xl border bg-card p-3 text-left has-data-checked:border-primary has-data-checked:ring-2 has-data-checked:ring-primary/20';

type When = 'now' | 'pick' | `best:${string}`;

interface Form {
  starter: NewsStarter;
  title: string;
  body: string;
  photo: string | null;
  link: NewsLink;
  audience: NewsAudience;
  when: When;
  day: string;
  time: string;
}

function itemsWithPhotoFirst(items: readonly OwnerItem[]): OwnerItem[] {
  const active = items.filter((i) => i.status === 'active');
  return [
    ...active.filter((i) => i.photos.length > 0),
    ...active.filter((i) => i.photos.length === 0),
  ];
}

/** What a starter fills in, from the shop's own menu and stamp card. */
function fillStarter(
  starter: NewsStarter,
  base: Form,
  items: readonly OwnerItem[],
  card: StampCardSettings | undefined,
  itemId: string | null,
): Form {
  const item = items.find((i) => i.id === itemId) ?? items[0];
  const reward = card?.reward.title ?? membersWords.tabs.prizes;
  const goal = card?.rule.stampsNeeded ?? 8;
  const F = W.fill;
  switch (starter) {
    case 'item':
      return {
        ...base,
        starter,
        title: F.itemTitle(item?.name ?? ''),
        body: F.itemBody(item?.name ?? '', (item?.description ?? '').split('.')[0] ?? ''),
        photo: item?.photos[0] ?? null,
        link: { kind: 'item', itemId: item?.id ?? null },
        audience: base.audience,
      };
    case 'open':
      return {
        ...base,
        starter,
        title: F.openTitle,
        body: F.openBody,
        photo: null,
        link: { kind: 'home', itemId: null },
      };
    case 'deal':
      return {
        ...base,
        starter,
        title: F.dealTitle,
        body: F.dealBody,
        photo: null,
        link: { kind: 'home', itemId: null },
      };
    case 'ready':
      return {
        ...base,
        starter,
        title: F.readyTitle(reward),
        body: F.readyBody(goal),
        photo: null,
        link: { kind: 'rewards', itemId: null },
        audience: 'ready',
      };
    case 'almost':
      return {
        ...base,
        starter,
        title: F.almostTitle(reward),
        body: F.almostBody,
        photo: null,
        link: { kind: 'rewards', itemId: null },
        audience: 'almost',
      };
    case 'own':
      return {
        ...base,
        starter,
        title: '',
        body: '',
        photo: null,
        link: { kind: 'home', itemId: null },
      };
  }
}

/** The next time a best-time clock comes round today, or tomorrow when it has passed. */
function bestAt(clock: string, now: Date): Date {
  const today = manilaToDate(manilaDate(now), clock);
  return today.getTime() > now.getTime() + 5 * 60_000
    ? today
    : manilaToDate(addDays(manilaDate(now), 1), clock);
}

function bestTag(clock: string): string {
  const hour = Number(clock.slice(0, 2));
  return hour < 13 ? W.best.lunch : hour < 17 ? W.best.merienda : W.best.dinner;
}

/**
 * Write news (/members/news/new, decision T106): a starter, title and message with counters, a photo, where a
 * tap opens, who gets it with live phone counts, when, a test to the owner's phone, and a live Android and
 * iPhone preview. Opens filled in from Menu (?item=), a member group (?audience=), a draft (?id=) or a copy.
 */
export function NewsComposeScreen() {
  const search: { item?: string; audience?: NewsAudience; id?: string; copy?: string } = useSearch({
    strict: false,
  });
  const sourceId = search.id ?? search.copy ?? null;
  const source = useNews(sourceId);
  const overview = useNewsOverview();
  const itemsQuery = useOwnerItems();
  const card = useStampCard();

  if (
    (sourceId && source.isPending) ||
    overview.isPending ||
    itemsQuery.isPending ||
    card.isPending
  ) {
    return (
      <div
        className="mx-auto grid w-full max-w-6xl gap-4 p-4 md:p-6 lg:grid-cols-3"
        aria-hidden="true"
      >
        <div className="flex flex-col gap-3 lg:col-span-2">
          <Skeleton className="h-8 w-48 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-56 rounded-xl" />
        </div>
        <Skeleton className="hidden h-80 rounded-4xl lg:block" />
      </div>
    );
  }
  if ((sourceId && source.isError) || overview.isError || !overview.data) {
    return (
      <PageError
        title={NW.empty.errorTitle}
        message={sourceId && source.isError ? W.notFound : errorWords(errorCodeOf(overview.error))}
        retryLabel={membersWords.states.tryAgain}
        onRetry={() => {
          void overview.refetch();
          if (sourceId) void source.refetch();
        }}
      />
    );
  }
  const items = itemsWithPhotoFirst(itemsQuery.data ?? []);
  return (
    <Composer
      key={sourceId ?? 'new'}
      overview={overview.data}
      items={items}
      card={card.data}
      editing={search.id && source.data ? source.data : null}
      copying={search.copy && source.data ? source.data : null}
      startItem={search.item ?? null}
      startAudience={search.audience ?? null}
    />
  );
}

function Composer({
  overview,
  items,
  card,
  editing,
  copying,
  startItem,
  startAudience,
}: {
  overview: NewsOverview;
  items: OwnerItem[];
  card: StampCardSettings | undefined;
  editing: OwnerNews | null;
  copying: OwnerNews | null;
  startItem: string | null;
  startAudience: NewsAudience | null;
}) {
  const navigate = useNavigate();
  const online = useOnlineStatus();
  const helping = currentSupport() !== null;
  const save = useSaveNews();
  const test = useSendNewsTest();
  const saveAction = useAsyncAction();
  const sendAction = useAsyncAction();
  const [now] = React.useState(() => new Date());
  const [view, setView] = React.useState<'write' | 'preview'>('write');
  const [confirming, setConfirming] = React.useState(false);
  const leaving = React.useRef(false);

  const initial = React.useMemo<Form>(() => {
    const from = editing ?? copying;
    const blank: Form = {
      starter: 'own',
      title: '',
      body: '',
      photo: null,
      link: { kind: 'home', itemId: null },
      audience: startAudience ?? 'everyone',
      when: 'now',
      day: addDays(manilaDate(now), 1),
      time: '11:00',
    };
    if (from) {
      const sendAt = editing?.sendAt ? new Date(editing.sendAt) : null;
      return {
        ...blank,
        title: from.title,
        body: from.body,
        photo: from.imageUrl,
        link: from.link,
        audience: from.audience,
        when: sendAt ? 'pick' : 'now',
        day: sendAt ? manilaDate(sendAt) : blank.day,
        time: sendAt ? toClock(sendAt) : blank.time,
      };
    }
    if (startItem) return fillStarter('item', blank, items, card, startItem);
    if (startAudience === 'ready') return fillStarter('ready', blank, items, card, null);
    if (startAudience === 'almost') return fillStarter('almost', blank, items, card, null);
    if (startAudience) return blank;
    return fillStarter('item', blank, items, card, null);
  }, [editing, copying, startItem, startAudience, items, card, now]);

  const [form, setForm] = React.useState<Form>(initial);
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const blocker = useBlocker({
    shouldBlockFn: () => dirty && !leaving.current,
    enableBeforeUnload: () => dirty && !leaving.current,
    withResolver: true,
  });
  const set = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }));

  const phonesFor = (a: NewsAudience) =>
    overview.audiences.find((x) => x.audience === a)?.phones ?? 0;
  const phones = phonesFor(form.audience);
  const slots = overview.news
    .filter((n) => n.id !== editing?.id)
    .map((n) => ({ status: n.status, at: n.sentAt ?? n.sendAt }));

  // When it would go, and what stops it.
  const at: Date | null =
    form.when === 'now'
      ? outOfQuiet(now)
      : form.when === 'pick'
        ? /^\d{4}-\d{2}-\d{2}$/.test(form.day) && /^\d{2}:\d{2}$/.test(form.time)
          ? manilaToDate(form.day, form.time)
          : null
        : bestAt(form.when.slice(5), now);
  const quietNow = form.when === 'now' && isQuietTime(now);
  let whenProblem: string | null = null;
  if (!at) whenProblem = W.pastPicked;
  else if (form.when !== 'now' && at.getTime() < now.getTime()) whenProblem = W.pastPicked;
  else if (form.when !== 'now' && isQuietTime(at)) whenProblem = W.quietPicked;
  else {
    const block = newsSendBlock(slots, at);
    if (block === 'week') {
      const free = newsNextFree(slots, at);
      whenProblem = W.weekFull(free ? formatManila(free, 'date') : '');
    } else if (block === 'day') whenProblem = W.dayFull;
  }
  const later = form.when !== 'now' || quietNow;

  const titleLen = form.title.length;
  const bodyLen = form.body.length;
  const linkOk = form.link.kind !== 'item' || items.some((i) => i.id === form.link.itemId);
  const canSend =
    online &&
    !helping &&
    form.title.trim().length > 0 &&
    form.body.trim().length > 0 &&
    titleLen <= NEWS_TITLE_MAX &&
    bodyLen <= NEWS_BODY_MAX &&
    linkOk &&
    phones > 0 &&
    whenProblem === null;
  const canDraft = online && form.title.trim().length > 0;

  const input = (mode: 'draft' | 'now' | 'later') => ({
    id: editing?.id ?? null,
    title: form.title.trim().slice(0, NEWS_TITLE_MAX),
    body: form.body.trim().slice(0, NEWS_BODY_MAX),
    imageUrl: form.photo,
    link: form.link.kind === 'item' ? form.link : { kind: form.link.kind, itemId: null },
    audience: form.audience,
    mode,
    sendAt: mode === 'later' && at ? at.toISOString() : null,
    copiedFromId: copying?.id ?? null,
  });

  const onDraft = async () => {
    try {
      leaving.current = true;
      await saveAction.run(() => save.mutateAsync(input('draft')));
      notify({ title: W.saved, tone: 'success' });
      void navigate({ to: '/members/news' });
    } catch (err) {
      leaving.current = false;
      notify({ title: errorWords(errorCodeOf(err)), tone: 'error' });
    }
  };

  const onSend = async () => {
    try {
      leaving.current = true;
      const saved = await sendAction.run(() => save.mutateAsync(input(later ? 'later' : 'now')));
      setConfirming(false);
      notify({
        title:
          saved.status === 'sending'
            ? W.sentToast(NW.phones(saved.phones))
            : W.scheduledToast(saved.sendAt ? formatManila(saved.sendAt) : ''),
        tone: 'success',
      });
      void navigate({ to: '/members/news/$newsId', params: { newsId: saved.id }, replace: true });
    } catch (err) {
      leaving.current = false;
      setConfirming(false);
      notify({ title: errorWords(errorCodeOf(err)), tone: 'error' });
    }
  };

  const onTest = () => {
    test.mutate(
      { title: form.title.trim() || W.previewTitle, body: form.body.trim(), imageUrl: form.photo },
      {
        onSuccess: () => notify({ title: W.testSent, description: W.testNote, tone: 'success' }),
        onError: (err) => notify({ title: errorWords(errorCodeOf(err)), tone: 'error' }),
      },
    );
  };

  const preview = <NewsPreview title={form.title} body={form.body} photo={form.photo} />;
  const left = overview.audiences.length > 0 ? Math.max(0, 2 - overview.weekUsed) : 0;
  const sendLabel = later ? W.schedule : W.sendNow(NW.phones(phones));

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex flex-wrap items-baseline justify-between gap-2 px-4 pt-3 md:px-6">
        <h1 className="sr-only text-lg font-bold md:not-sr-only">
          {editing ? W.editTitle : W.title}
        </h1>
        <span className="text-sm text-muted-foreground">
          {NW.phones(phones)} · {NW.audience[form.audience]}
        </span>
      </div>

      <div className="px-4 pt-3 lg:hidden">
        <ToggleGroup
          value={[view]}
          onValueChange={(next) => {
            if (next[0] === 'write' || next[0] === 'preview') setView(next[0]);
          }}
          aria-label={W.preview}
          spacing={1.5}
        >
          <ToggleGroupItem value="write" className={CHIP}>
            {W.writeTab}
          </ToggleGroupItem>
          <ToggleGroupItem value="preview" className={CHIP}>
            {W.previewTab}
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="mx-auto grid w-full max-w-6xl flex-1 items-start gap-6 px-4 pt-4 pb-32 md:px-6 lg:grid-cols-3 lg:pb-8">
        <div
          className={cn(
            'flex min-w-0 flex-col gap-5 lg:col-span-2',
            view === 'preview' && 'hidden lg:flex',
          )}
        >
          {helping ? (
            <Notice tone="brand" icon={<LifeBuoyIcon className="size-4" />}>
              {W.helpMode}
            </Notice>
          ) : null}
          {!online ? (
            <Notice tone="warning" icon={<WifiOffIcon className="size-4" />}>
              {W.offline}
            </Notice>
          ) : null}

          <section className="flex flex-col gap-2" aria-labelledby="news-about">
            <h2 id="news-about" className="text-sm font-semibold">
              {W.about}
            </h2>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
              {NEWS_STARTERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={form.starter === s}
                  onClick={() =>
                    setForm(fillStarter(s, { ...form }, items, card, form.link.itemId))
                  }
                  className="flex min-h-16 flex-col items-start gap-0.5 rounded-xl border bg-card p-3 text-left hover:bg-muted/50 aria-pressed:border-primary aria-pressed:ring-2 aria-pressed:ring-primary/20"
                >
                  <span className="text-sm font-semibold">{W.starters[s]}</span>
                  <span className="text-xs text-muted-foreground">{W.starterHelp[s]}</span>
                </button>
              ))}
            </div>
          </section>

          <Field>
            <FieldLabel htmlFor="news-title">{W.titleLabel}</FieldLabel>
            <Input
              id="news-title"
              value={form.title}
              maxLength={NEWS_TITLE_MAX + 20}
              placeholder={W.titlePlaceholder}
              aria-invalid={titleLen > NEWS_TITLE_MAX}
              onChange={(e) => set({ title: e.target.value })}
              className="h-11 text-base md:h-9 md:text-sm"
            />
            <FieldDescription className="flex justify-between gap-3">
              <span>{W.titleHelp}</span>
              <span
                className={cn('tabular-nums', titleLen > NEWS_TITLE_MAX && 'text-destructive-text')}
              >
                {W.count(titleLen, NEWS_TITLE_MAX)}
              </span>
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="news-body">{W.bodyLabel}</FieldLabel>
            <Textarea
              id="news-body"
              value={form.body}
              maxLength={NEWS_BODY_MAX + 40}
              placeholder={W.bodyPlaceholder}
              aria-invalid={bodyLen > NEWS_BODY_MAX}
              onChange={(e) => set({ body: e.target.value })}
              className="min-h-20 text-base md:text-sm"
            />
            <FieldDescription className="flex justify-between gap-3">
              <span>{bodyLen > 90 ? W.bodyLong : W.bodyHelp}</span>
              <span
                className={cn('tabular-nums', bodyLen > NEWS_BODY_MAX && 'text-destructive-text')}
              >
                {W.count(bodyLen, NEWS_BODY_MAX)}
              </span>
            </FieldDescription>
          </Field>

          <ImageUploadRow
            id="news-photo"
            kind="news_photo"
            maxSide={1200}
            label={W.photoLabel}
            help={W.photoHelp}
            src={newsPhotoSrc(form.photo, 640)}
            onUploaded={(upload) => set({ photo: upload.preview })}
            onRemove={() => set({ photo: null })}
            shape="rounded"
            disabled={!online}
          />

          <Field>
            <FieldLabel htmlFor="news-link">{W.linkLabel}</FieldLabel>
            <div className="flex flex-col gap-2 sm:flex-row">
              <NativeSelect
                id="news-link"
                className="w-full sm:w-48"
                value={form.link.kind}
                onChange={(e) => {
                  const kind = NEWS_LINK_KINDS.find((k) => k === e.target.value);
                  if (kind)
                    set({
                      link: {
                        kind,
                        itemId: kind === 'item' ? (form.link.itemId ?? items[0]?.id ?? null) : null,
                      },
                    });
                }}
              >
                {NEWS_LINK_KINDS.map((k) => (
                  <NativeSelectOption key={k} value={k}>
                    {W.link[k]}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              {form.link.kind === 'item' ? (
                <NativeSelect
                  aria-label={W.itemLabel}
                  className="w-full sm:flex-1"
                  value={form.link.itemId ?? ''}
                  onChange={(e) => set({ link: { kind: 'item', itemId: e.target.value || null } })}
                >
                  <NativeSelectOption value="">{W.itemNone}</NativeSelectOption>
                  {items.map((i) => (
                    <NativeSelectOption key={i.id} value={i.id}>
                      {i.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              ) : null}
            </div>
            {!linkOk ? (
              <FieldDescription className="text-destructive-text">
                {errorWords('news_link_gone')}
              </FieldDescription>
            ) : null}
          </Field>

          <section className="flex flex-col gap-2" aria-labelledby="news-audience">
            <h2 id="news-audience" className="text-sm font-semibold">
              {W.audienceLabel}
            </h2>
            <RadioGroup
              value={form.audience}
              onValueChange={(next) => {
                const picked = NEWS_AUDIENCES.find((a) => a === next);
                if (picked) set({ audience: picked });
              }}
              className="grid grid-cols-2 gap-2 xl:grid-cols-3"
              aria-labelledby="news-audience"
            >
              {NEWS_AUDIENCES.map((a) => (
                <label key={a} className={CARD_PICK}>
                  <span className="flex w-full items-center gap-2">
                    <RadioGroupItem value={a} />
                    <span className="flex-1 text-sm font-semibold">{NW.audience[a]}</span>
                    <span className="text-sm font-bold tabular-nums">
                      {phonesFor(a).toLocaleString('en-PH')}
                    </span>
                  </span>
                  <span className="pl-6 text-xs text-muted-foreground">{NW.audienceHelp[a]}</span>
                </label>
              ))}
            </RadioGroup>
            <p className="text-xs text-muted-foreground">{W.audienceNote}</p>
          </section>

          <section className="flex flex-col gap-2" aria-labelledby="news-when">
            <h2 id="news-when" className="text-sm font-semibold">
              {W.whenLabel}
            </h2>
            <ToggleGroup
              value={[form.when]}
              onValueChange={(next) => {
                const v = next[0];
                if (v === 'now' || v === 'pick' || (typeof v === 'string' && v.startsWith('best:')))
                  set({ when: v === 'now' || v === 'pick' ? v : `best:${v.slice(5)}` });
              }}
              aria-labelledby="news-when"
              spacing={1.5}
              className="flex-wrap"
            >
              <ToggleGroupItem value="now" className={CHIP}>
                {quietNow ? formatClock(outOfQuiet(now)) : W.now}
              </ToggleGroupItem>
              {overview.bestTimes.map((clock) => (
                <ToggleGroupItem key={clock} value={`best:${clock}`} className={CHIP}>
                  {formatClock(bestAt(clock, now))}
                  <span className="font-normal">{bestTag(clock)}</span>
                </ToggleGroupItem>
              ))}
              <ToggleGroupItem value="pick" className={CHIP}>
                {W.pick}
              </ToggleGroupItem>
            </ToggleGroup>
            {form.when === 'pick' ? (
              <div className="flex flex-wrap gap-2">
                <Field className="w-auto">
                  <FieldLabel htmlFor="news-day">{W.day}</FieldLabel>
                  <Input
                    id="news-day"
                    type="date"
                    value={form.day}
                    min={manilaDate(now)}
                    onChange={(e) => set({ day: e.target.value })}
                    className="h-11 text-base md:h-9 md:text-sm"
                  />
                </Field>
                <Field className="w-auto">
                  <FieldLabel htmlFor="news-time">{W.time}</FieldLabel>
                  <Input
                    id="news-time"
                    type="time"
                    step={900}
                    value={form.time}
                    onChange={(e) => set({ time: e.target.value })}
                    className="h-11 text-base md:h-9 md:text-sm"
                  />
                </Field>
              </div>
            ) : null}
            {quietNow ? (
              <Notice tone="info" icon={<ClockIcon className="size-4" />}>
                {W.quietNow}
              </Notice>
            ) : null}
            {whenProblem ? (
              <Notice tone="warning" icon={<TriangleAlertIcon className="size-4" />}>
                {whenProblem}
              </Notice>
            ) : null}
            <p className="text-xs text-muted-foreground">{W.bestNote}</p>
          </section>

          <div>
            <Button
              variant="outline"
              className="h-11 gap-1.5 md:h-9"
              disabled={!online || helping || test.isPending}
              onClick={onTest}
            >
              <BellIcon aria-hidden="true" />
              {W.test}
            </Button>
          </div>
        </div>

        <aside
          className={cn(
            'flex min-w-0 flex-col gap-2 lg:sticky lg:top-4',
            view === 'write' && 'hidden lg:flex',
          )}
          aria-label={W.preview}
        >
          <h2 className="text-sm font-semibold">{W.preview}</h2>
          {preview}
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 px-4 py-3 backdrop-blur-sm lg:static lg:mx-auto lg:w-full lg:max-w-6xl lg:border-t lg:bg-transparent lg:px-6 lg:backdrop-blur-none">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="mr-auto hidden text-xs text-muted-foreground md:inline">
            {NW.stats.weekLeft(left, 2)}
          </span>
          <AsyncButton
            variant="outline"
            className="h-11 flex-1 sm:flex-none md:h-9"
            status={saveAction.status}
            busyLabel={actionWords.saving}
            doneLabel={actionWords.saved}
            disabled={!canDraft}
            onClick={() => void onDraft()}
          >
            {W.save}
          </AsyncButton>
          <Button
            className="h-11 flex-1 gap-1.5 sm:flex-none md:h-9"
            disabled={!canSend}
            onClick={() => setConfirming(true)}
          >
            {later ? <ClockIcon aria-hidden="true" /> : <SendIcon aria-hidden="true" />}
            {sendLabel}
          </Button>
        </div>
      </div>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {later && at
                ? W.confirmLaterTitle(formatManila(at))
                : W.confirmNowTitle(NW.phones(phones))}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {later ? W.confirmLaterBody : W.confirmNowBody} {W.confirmUses(left)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11 md:h-9">{W.confirmBack}</AlertDialogCancel>
            <AsyncButton
              className="h-11 font-semibold md:h-9"
              status={sendAction.status}
              busyLabel={W.sending}
              doneLabel={later ? NW.status.scheduled : NW.status.sent}
              onClick={() => void onSend()}
            >
              {later ? W.schedule : W.sendNow(NW.phones(phones))}
            </AsyncButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={blocker.status === 'blocked'}
        onOpenChange={(open) => {
          if (!open && blocker.status === 'blocked') blocker.reset();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{W.leaveTitle}</AlertDialogTitle>
            <AlertDialogDescription>{W.leaveBody}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11 md:h-9" onClick={() => blocker.reset?.()}>
              {W.stay}
            </AlertDialogCancel>
            <Button
              variant="destructive"
              className="h-11 md:h-9"
              onClick={() => blocker.proceed?.()}
            >
              {W.leave}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/** "HH:MM" in Manila time, for the time field. */
function toClock(at: Date): string {
  const p = manilaParts(at);
  return `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`;
}
