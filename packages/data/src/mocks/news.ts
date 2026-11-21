// The mock back end for Push News (decision T106): same names, inputs, outputs and error codes as docs/api.md
// "News (owner)" and the storefront news rows. Sample news per shop are made from its own menu and stamp card;
// a send "goes out" over a few seconds, then shows sample results. Nothing reaches a real phone.
import {
  NEWS_AUDIENCES,
  NEWS_INBOX_DAYS,
  NEWS_WEEK_LIMIT,
  NewsOverviewSchema,
  OwnerNewsSchema,
  PushSettingsSchema,
  ShopNewsItemSchema,
  isQuietTime,
  newsDayUsed,
  newsNextFree,
  newsPath,
  newsSendBlock,
  newsWeekUsed,
  outOfQuiet,
  type ErrorCode,
  type MembersOverview,
  type NewsAudience,
  type NewsOverview,
  type NewsSlot,
  type OwnerNews,
  type PushSettings,
  type SaveNewsInput,
  type ShopNewsItem,
  addDays,
  manilaDate,
  manilaToDate,
} from '@smartapp/core';
import type { OwnerNewsAdapter } from '../adapters/types';
import type { ShopState } from './state';

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
// A send takes this long in the mock, so the Sending bar can be seen.
const SEND_MS = 6_000;

export interface NewsMockDeps {
  run: <T>(area: 'members', fn: () => T) => Promise<T>;
  requireShop: (slug: string) => ShopState;
  ownerShop: () => Promise<string>;
  membersOverview: (s: ShopState) => MembersOverview;
  now: () => Date;
  empty: () => boolean;
  helping: () => boolean;
  fail: (code: ErrorCode, status?: number) => never;
}

interface ShopNews {
  list: OwnerNews[];
  auto: PushSettings;
  seq: number;
}

const CHOICE_KEY = 'smartapp:mock-news-choice';

function readChoices(): Record<string, boolean> {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(CHOICE_KEY) : null;
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed === 'object') {
      const out: Record<string, boolean> = {};
      for (const [k, v] of Object.entries(parsed)) if (typeof v === 'boolean') out[k] = v;
      return out;
    }
  } catch {
    // Blocked or broken storage: start with nothing chosen.
  }
  return {};
}

function writeChoices(value: Record<string, boolean>): void {
  try {
    if (typeof window !== 'undefined')
      window.localStorage.setItem(CHOICE_KEY, JSON.stringify(value));
  } catch {
    // Blocked storage: the choice lasts until reload.
  }
}

export function createNewsMock(deps: NewsMockDeps) {
  const shops = new Map<string, ShopNews>();
  let choices: Record<string, boolean> | null = null;

  const iso = (t: number) => new Date(t).toISOString();

  /** Phones with news on per audience, from the shop's own member groups. */
  function audienceCounts(s: ShopState): Record<NewsAudience, number> {
    if (deps.empty())
      return { everyone: 0, members: 0, ready: 0, almost: 0, regulars: 0, quiet: 0, new: 0 };
    const counts = deps.membersOverview(s).counts;
    const share = (n: number) => Math.round(n * 0.7);
    const members = share(counts.all ?? 0);
    const guests = Math.round((counts.guests ?? 0) * 0.4);
    return {
      everyone: members + guests,
      members,
      ready: share(counts.ready ?? 0),
      almost: share(counts.almost ?? 0),
      regulars: share(counts.regulars ?? 0),
      quiet: share(counts.quiet ?? 0),
      new: share(counts.new ?? 0),
    };
  }

  function seed(s: ShopState, slug: string): ShopNews {
    const t = deps.now().getTime();
    if (deps.empty()) return { list: [], auto: { stampAdded: true, rewardReady: true }, seq: 1 };
    const items = s.shop.catalog.items.filter((i) => i.status === 'active');
    const withPhoto = items.filter((i) => i.photos.length > 0);
    const first = withPhoto[0] ?? items[0];
    const second = withPhoto[1] ?? items[1] ?? first;
    const reward = s.shop.storefront.stampCard.reward.title;
    const counts = audienceCounts(s);
    const today = manilaDate(new Date(t));
    const at = (daysAgo: number, hour: number) => {
      const hh = String(Math.floor(hour)).padStart(2, '0');
      const mm = String(Math.round((hour % 1) * 60)).padStart(2, '0');
      return manilaToDate(addDays(today, -daysAgo), `${hh}:${mm}`).toISOString();
    };
    const results = (phones: number, price: number) => {
      const sent = Math.max(1, phones - 2);
      const opened = Math.round(sent * 0.38);
      const ordered = Math.max(1, Math.round(sent * 0.09));
      return {
        sent,
        android: Math.round(sent * 0.84),
        ios: sent - Math.round(sent * 0.84),
        opened,
        ordered,
        sales: ordered * price,
        stopped: 1,
      };
    };
    const base = {
      waitReason: null,
      progress: null,
      copiedFromId: null,
    } as const;
    const list: OwnerNews[] = [
      {
        ...base,
        id: `${slug}-news-4`,
        title: 'Holiday hours this week',
        body: 'We open at 10 AM and close at 6 PM until Sunday. Order ahead to skip the line.',
        imageUrl: null,
        link: { kind: 'item', itemId: null },
        itemName: null,
        audience: 'everyone',
        status: 'waiting',
        waitReason: 'link_gone',
        sendAt: at(-1, 10),
        sentAt: null,
        updatedAt: at(1, 15),
        phones: counts.everyone,
        results: null,
      },
      {
        ...base,
        id: `${slug}-news-3`,
        title: `New: ${second?.name ?? 'our newest item'}`.slice(0, 40),
        body: `${second?.description ?? ''} Try it today.`.trim().slice(0, 120),
        imageUrl: second?.photos[0] ?? null,
        link: { kind: 'item', itemId: second?.id ?? null },
        itemName: second?.name ?? null,
        audience: 'everyone',
        status: 'sent',
        sendAt: at(8, 11),
        sentAt: at(8, 11),
        updatedAt: at(8, 11),
        phones: counts.everyone,
        results: results(counts.everyone, second?.basePrice ?? 15_000),
      },
      {
        ...base,
        id: `${slug}-news-2`,
        title: `1 stamp to a ${reward}`.slice(0, 40),
        body: 'Order today and your next stamp gets you the reward.',
        imageUrl: null,
        link: { kind: 'rewards', itemId: null },
        itemName: null,
        audience: 'almost',
        status: 'sent',
        sendAt: at(12, 14.5),
        sentAt: at(12, 14.5),
        updatedAt: at(12, 14.5),
        phones: counts.almost,
        results: results(Math.max(3, counts.almost), first?.basePrice ?? 15_000),
      },
      {
        ...base,
        id: `${slug}-news-1`,
        title: 'Weekend combo is back',
        body: '',
        imageUrl: first?.photos[0] ?? null,
        link: { kind: 'home', itemId: null },
        itemName: null,
        audience: 'everyone',
        status: 'draft',
        sendAt: null,
        sentAt: null,
        updatedAt: at(2, 16),
        phones: counts.everyone,
        results: null,
      },
    ];
    return { list, auto: { stampAdded: true, rewardReady: true }, seq: 5 };
  }

  function stateOf(slug: string): { s: ShopState; n: ShopNews } {
    const s = deps.requireShop(slug);
    let n = shops.get(slug);
    if (!n) {
      n = seed(s, slug);
      shops.set(slug, n);
    }
    // A send finishes after a few seconds; then it shows sample results.
    const t = deps.now().getTime();
    for (const item of n.list) {
      if (item.status === 'scheduled' && item.sendAt && new Date(item.sendAt).getTime() <= t) {
        item.status = 'sending';
        item.progress = 0;
      }
      if (item.status === 'sending' && item.sendAt) {
        const elapsed = t - new Date(item.sendAt).getTime();
        if (elapsed >= SEND_MS) {
          const sent = item.phones;
          const opened = Math.round(sent * 0.3);
          const ordered = sent > 0 ? Math.max(1, Math.round(sent * 0.08)) : 0;
          const item0 = s.shop.catalog.items.find((i) => i.id === item.link.itemId);
          item.status = 'sent';
          item.sentAt = iso(new Date(item.sendAt).getTime() + SEND_MS);
          item.progress = null;
          item.results = {
            sent,
            android: Math.round(sent * 0.84),
            ios: sent - Math.round(sent * 0.84),
            opened,
            ordered,
            sales: ordered * (item0?.basePrice ?? 15_000),
            stopped: 0,
          };
        } else {
          item.progress = Math.min(item.phones, Math.round((item.phones * elapsed) / SEND_MS));
        }
      }
    }
    return { s, n };
  }

  const slots = (n: ShopNews, except: string | null): NewsSlot[] =>
    n.list
      .filter((x) => x.id !== except)
      .map((x) => ({ status: x.status, at: x.sentAt ?? x.sendAt }));

  function overviewOf(slug: string): NewsOverview {
    const { s, n } = stateOf(slug);
    const now = deps.now();
    const counts = audienceCounts(s);
    const t = now.getTime();
    const sentRecent = n.list.filter(
      (x) => x.status === 'sent' && x.sentAt && t - new Date(x.sentAt).getTime() < 30 * DAY,
    );
    const order: Record<OwnerNews['status'], number> = {
      sending: 0,
      waiting: 1,
      scheduled: 2,
      draft: 3,
      sent: 4,
      canceled: 5,
    };
    const news = [...n.list].sort(
      (a, b) =>
        order[a.status] - order[b.status] ||
        (b.sentAt ?? b.sendAt ?? b.updatedAt).localeCompare(a.sentAt ?? a.sendAt ?? a.updatedAt),
    );
    return NewsOverviewSchema.parse({
      phones: counts.everyone,
      memberPhones: counts.members,
      guestPhones: counts.everyone - counts.members,
      newThisWeek: deps.empty() ? 0 : Math.min(5, counts.everyone),
      weekUsed: Math.min(NEWS_WEEK_LIMIT, newsWeekUsed(slots(n, null), now)),
      nextFreeAt: newsNextFree(slots(n, null), now)?.toISOString() ?? null,
      dayUsed: newsDayUsed(slots(n, null), now),
      last30: {
        news: sentRecent.length,
        ordered: sentRecent.reduce((sum, x) => sum + (x.results?.ordered ?? 0), 0),
        sales: sentRecent.reduce((sum, x) => sum + (x.results?.sales ?? 0), 0),
      },
      audiences: NEWS_AUDIENCES.map((audience) => ({ audience, phones: counts[audience] })),
      auto: n.auto,
      bestTimes: ['11:00', '14:30', '17:00'],
      news: news.map((x) => OwnerNewsSchema.parse(x)),
    });
  }

  function find(n: ShopNews, id: string): OwnerNews {
    const item = n.list.find((x) => x.id === id);
    if (!item) deps.fail('not_found', 404);
    return item;
  }

  function save(slug: string, input: SaveNewsInput): OwnerNews {
    const { s, n } = stateOf(slug);
    const now = deps.now();
    const existing = input.id ? find(n, input.id) : null;
    if (existing && (existing.status === 'sent' || existing.status === 'sending'))
      deps.fail('news_already_sent', 409);
    const sending = input.mode !== 'draft';
    if (sending && deps.helping()) deps.fail('support_locked', 403);
    const item =
      input.link.kind === 'item' && input.link.itemId
        ? s.shop.catalog.items.find((i) => i.id === input.link.itemId && i.status === 'active')
        : null;
    if (sending && input.link.kind === 'item' && !item) deps.fail('news_link_gone', 422);
    if (sending && input.body.trim() === '') deps.fail('invalid_input', 422);
    const counts = audienceCounts(s);
    if (sending && counts[input.audience] === 0) deps.fail('news_no_audience', 422);

    let sendAt: Date | null = null;
    if (input.mode === 'now') sendAt = outOfQuiet(now);
    if (input.mode === 'later') {
      if (!input.sendAt) deps.fail('invalid_input', 422);
      sendAt = new Date(input.sendAt);
      if (sendAt.getTime() < now.getTime() - MINUTE) deps.fail('invalid_input', 422);
      if (isQuietTime(sendAt)) deps.fail('news_quiet_hours', 422);
    }
    if (sendAt) {
      const block = newsSendBlock(slots(n, existing?.id ?? null), sendAt);
      if (block === 'week') deps.fail('news_week_limit', 422);
      if (block === 'day') deps.fail('news_day_limit', 422);
    }
    const immediate = input.mode === 'now' && sendAt && sendAt.getTime() <= now.getTime();
    const next: OwnerNews = OwnerNewsSchema.parse({
      id: existing?.id ?? `${slug}-news-${n.seq++}`,
      title: input.title.trim(),
      body: input.body.trim(),
      imageUrl: input.imageUrl,
      link: input.link,
      itemName: item?.name ?? null,
      audience: input.audience,
      status: input.mode === 'draft' ? 'draft' : immediate ? 'sending' : 'scheduled',
      waitReason: null,
      sendAt: sendAt ? sendAt.toISOString() : null,
      sentAt: null,
      updatedAt: now.toISOString(),
      phones: counts[input.audience],
      progress: immediate ? 0 : null,
      results: null,
      copiedFromId: input.copiedFromId ?? existing?.copiedFromId ?? null,
    });
    n.list = existing ? n.list.map((x) => (x.id === existing.id ? next : x)) : [next, ...n.list];
    return next;
  }

  const owner = async <T>(fn: (slug: string) => T): Promise<T> => {
    const slug = await deps.ownerShop();
    return deps.run('members', () => fn(slug));
  };

  const adapter: OwnerNewsAdapter = {
    getNewsOverview: () => owner((slug) => overviewOf(slug)),
    getNews: ({ newsId }) => owner((slug) => OwnerNewsSchema.parse(find(stateOf(slug).n, newsId))),
    saveNews: (input) => owner((slug) => save(slug, input)),
    cancelNews: ({ newsId }) =>
      owner((slug) => {
        const item = find(stateOf(slug).n, newsId);
        if (item.status === 'sent' || item.status === 'sending')
          deps.fail('news_already_sent', 409);
        item.status = 'draft';
        item.waitReason = null;
        item.sendAt = null;
        item.updatedAt = deps.now().toISOString();
        return OwnerNewsSchema.parse(item);
      }),
    deleteNews: ({ newsId }) =>
      owner((slug) => {
        const { n } = stateOf(slug);
        const item = find(n, newsId);
        if (item.status !== 'draft' && item.status !== 'canceled')
          deps.fail('news_already_sent', 409);
        n.list = n.list.filter((x) => x.id !== newsId);
        return { ok: true as const };
      }),
    sendNewsTest: () =>
      owner(() => {
        if (deps.helping()) deps.fail('support_locked', 403);
        return { ok: true as const };
      }),
    savePushSettings: (input) =>
      owner((slug) => {
        const { n } = stateOf(slug);
        n.auto = PushSettingsSchema.parse(input);
        return n.auto;
      }),
  };

  /** The storefront inbox: sent news of the last 30 days, newest first. */
  function inbox(slug: string): ShopNewsItem[] {
    const { n } = stateOf(slug);
    const t = deps.now().getTime();
    return n.list
      .filter(
        (x) =>
          x.status === 'sent' &&
          x.sentAt &&
          t - new Date(x.sentAt).getTime() < NEWS_INBOX_DAYS * DAY,
      )
      .sort((a, b) => (b.sentAt ?? '').localeCompare(a.sentAt ?? ''))
      .map((x) =>
        ShopNewsItemSchema.parse({
          id: x.id,
          title: x.title,
          body: x.body,
          imageUrl: x.imageUrl,
          path: newsPath(slug, x.link),
          sentAt: x.sentAt,
        }),
      );
  }

  function choice(slug: string): boolean {
    choices ??= readChoices();
    return choices[slug] ?? false;
  }

  function setChoice(slug: string, news: boolean): boolean {
    choices ??= readChoices();
    choices = { ...choices, [slug]: news };
    writeChoices(choices);
    return news;
  }

  return {
    adapter,
    inbox,
    choice,
    setChoice,
    reset() {
      shops.clear();
      choices = {};
      writeChoices({});
    },
  };
}
