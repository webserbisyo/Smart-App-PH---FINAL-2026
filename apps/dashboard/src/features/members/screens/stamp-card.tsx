import * as React from 'react';
import {
  CircleCheckIcon,
  CircleOffIcon,
  CirclePauseIcon,
  InfoIcon,
  WifiOffIcon,
} from 'lucide-react';
import {
  errorWords,
  formatPeso,
  imageSources,
  membersWords,
  REWARD_KINDS,
  STAMP_CARD_STATUSES,
  STAMP_PERIODS,
  StampCardSettingsSchema,
  variantLabel,
  vocab,
  words,
  type OwnerItem,
  type Reward,
  type RewardKind,
  type StampCardSettings,
  type StampCardStatus,
  type StampRule,
  type ShopLook,
} from '@smartapp/core';
import {
  ApiRequestError,
  errorCodeOf,
  useOwnerItems,
  useSaveStampCard,
  useSetStampCardStatus,
  useStampCard,
  useStampCardPreview,
  useStorefront,
} from '@smartapp/data';
import { ActionBar, ActionBarSelection } from '@smartapp/ui/components/action-bar';
import { Button } from '@smartapp/ui/components/button';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldTitle,
} from '@smartapp/ui/components/field';
import { Input } from '@smartapp/ui/components/input';
import { Label } from '@smartapp/ui/components/label';
import { RadioGroup, RadioGroupItem } from '@smartapp/ui/components/radio-group';
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from '@smartapp/ui/components/reui/number-field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@smartapp/ui/components/select';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { Switch } from '@smartapp/ui/components/switch';
import { Textarea } from '@smartapp/ui/components/textarea';
import { ToggleGroup, ToggleGroupItem } from '@smartapp/ui/components/toggle-group';
import { AsyncButton, useAsyncAction } from '@smartapp/ui/compositions/async-button';
import { notify } from '@smartapp/ui/compositions/notify';
import { PageHeader } from '@smartapp/ui/compositions/page-header';
import { StampCard } from '@smartapp/ui/compositions/stamp-card';
import { env } from '@/app/env';
import { Notice } from '@/app/notice';
import { PageError } from '@/app/page-state';
import { PesoInput } from '@/app/peso-input';
import { ShopLookTheme } from '@/app/shop-look';
import { useShop } from '@/app/shop';
import { useDockClearance } from '@/app/use-dock-clearance';
import { useOnlineStatus } from '@/app/use-online-status';
import { useMembersTabs } from '../tabs.js';

const W = membersWords.card;
const GOAL_MIN = 4;
const GOAL_MAX = 20;
const PIECES_MAX = 9999;
const STATUS_ICON = { on: CircleCheckIcon, paused: CirclePauseIcon, off: CircleOffIcon } as const;
const SECTION = 'flex flex-col gap-4 rounded-xl border bg-card p-4 md:p-5';
const CHIP =
  'h-11 flex-1 gap-1.5 rounded-lg border border-border bg-card text-sm font-semibold text-muted-foreground aria-pressed:border-primary aria-pressed:bg-accent aria-pressed:text-foreground md:h-9';

interface Draft {
  rule: StampRule;
  reward: Reward;
}

/**
 * The Stamp card tab (T60): On, Paused or Off saved at once with Undo; how to earn, the goal and the
 * reward saved together after the owner sees what the change does to members (M9).
 */
export function StampCardScreen() {
  const tabs = useMembersTabs();
  const shop = useShop();
  const cardQuery = useStampCard();
  const storefront = useStorefront(shop.slug);
  const items = useOwnerItems();
  const online = useOnlineStatus();
  const card = cardQuery.data;

  let body: React.ReactNode;
  if (cardQuery.isPending) body = <EditorSkeleton />;
  else if (cardQuery.isError || !card)
    body = (
      <PageError
        title={W.errorTitle}
        message={errorWords(errorCodeOf(cardQuery.error))}
        retryLabel={membersWords.states.tryAgain}
        onRetry={() => void cardQuery.refetch()}
      />
    );
  else
    body = (
      <StampCardEditor
        // A saved card starts a fresh draft; turning the card on or off keeps the draft.
        key={JSON.stringify({ rule: card.rule, reward: card.reward })}
        card={card}
        items={items.data ?? []}
        look={storefront.data?.storefront.look}
        catalog={vocab(shop.kind).catalog}
        online={online}
      />
    );

  return (
    <div className="flex min-h-full flex-col pb-32 md:pb-24">
      <PageHeader title={words.screens.members.title} tabs={tabs} />
      <main className="flex-1 px-4 pt-3 md:px-6 md:pt-4">
        {!online ? (
          <Notice tone="warning" icon={<WifiOffIcon className="size-4" />} className="mb-3">
            {membersWords.states.offline}
          </Notice>
        ) : null}
        {body}
      </main>
    </div>
  );
}

function heldOf(reward: Reward): number {
  return reward.kind === 'custom' && reward.quantityTotal !== null && reward.quantityLeft !== null
    ? reward.quantityTotal - reward.quantityLeft
    : 0;
}

function freeItemReward(item: OwnerItem, variantId: string | null, base: Reward): Reward {
  const variant = item.variants.find((v) => v.id === variantId) ?? item.variants[0];
  const label = variant && item.variants.length > 1 ? variantLabel(variant) : null;
  return {
    ...base,
    kind: 'free_item',
    amount: null,
    itemId: item.id,
    variantId: variant?.id ?? null,
    title: W.freeItemTitle(item.name, label),
    image: item.photos[0] ?? null,
    quantityTotal: null,
    quantityLeft: null,
    onePerCustomer: false,
  };
}

function StampCardEditor({
  card,
  items,
  look,
  catalog,
  online,
}: {
  card: StampCardSettings;
  items: OwnerItem[];
  look: ShopLook | undefined;
  catalog: string;
  online: boolean;
}) {
  const saved: Draft = { rule: card.rule, reward: card.reward };
  const [draft, setDraft] = React.useState<Draft>(saved);
  const [serverErrors, setServerErrors] = React.useState<Record<string, string[]>>({});
  const save = useSaveStampCard();
  const action = useAsyncAction();
  const dockClearance = useDockClearance();

  const { rule, reward } = draft;
  const held = heldOf(card.reward);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const activeItems = items.filter((i) => i.status === 'active');
  const pickedItem = items.find((i) => i.id === reward.itemId);

  const problems = {
    amount: reward.kind === 'discount' && !(reward.amount && reward.amount > 0),
    item: reward.kind === 'free_item' && !pickedItem,
    title: reward.kind === 'custom' && reward.title.trim() === '',
  };
  const next = { status: card.status, ...draft };
  const valid =
    !problems.amount &&
    !problems.item &&
    !problems.title &&
    StampCardSettingsSchema.safeParse(next).success;

  const checking = React.useDeferredValue(dirty && valid ? next : null);
  const impact = useStampCardPreview(checking).data;
  const rewardChanged = JSON.stringify(reward) !== JSON.stringify(card.reward);

  const setRule = (patch: Partial<StampRule>) =>
    setDraft((d) => ({ ...d, rule: { ...d.rule, ...patch } }));
  const setReward = (patch: Partial<Reward>) =>
    setDraft((d) => ({ ...d, reward: { ...d.reward, ...patch } }));

  const pickKind = (kind: RewardKind) => {
    if (kind === reward.kind) return;
    // Going back to the saved kind brings the saved reward back.
    if (kind === card.reward.kind) return setDraft((d) => ({ ...d, reward: card.reward }));
    const base: Reward = {
      ...reward,
      kind,
      amount: null,
      itemId: null,
      variantId: null,
      description: null,
      image: null,
      quantityTotal: null,
      quantityLeft: null,
      onePerCustomer: false,
    };
    if (kind === 'discount') {
      const amount = 10000;
      return setReward({ ...base, amount, title: W.discountTitle(formatPeso(amount)) });
    }
    if (kind === 'free_item') {
      const first = activeItems[0];
      return setReward(
        first ? freeItemReward(first, null, base) : { ...base, title: W.itemPlaceholder },
      );
    }
    setReward({ ...base, title: '' });
  };

  const onSave = async () => {
    setServerErrors({});
    try {
      await action.run(() => save.mutateAsync(next));
      notify({ title: W.savedToast, tone: 'success' });
    } catch (err) {
      if (err instanceof ApiRequestError && err.apiError.fieldErrors)
        setServerErrors(err.apiError.fieldErrors);
      notify({ title: errorWords(errorCodeOf(err)), tone: 'error' });
    }
  };

  const capValue = rule.period ?? 'none';
  const capLabel = (value: unknown): string => {
    const period = STAMP_PERIODS.find((p) => p === value);
    return period ? W.capOption(rule.maxEarned ?? 1, period) : W.capNone;
  };
  const piecesError = serverErrors.quantityTotal?.[0];

  return (
    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-5 lg:items-start lg:gap-6">
      <StatusSection status={card.status} online={online} />

      <aside className="flex flex-col gap-3 lg:sticky lg:top-4 lg:col-span-2 lg:col-start-4 lg:row-span-3 lg:row-start-1">
        <Preview draft={draft} look={look} status={card.status} />
        {impact &&
        (impact.readyNow > 0 ||
          impact.loseReady > 0 ||
          (rewardChanged && impact.pendingClaims > 0)) ? (
          <Notice tone="info" icon={<InfoIcon className="size-4" />}>
            <ul className="flex flex-col gap-1 text-sm">
              {impact.readyNow > 0 ? <li>{W.impactReady(impact.readyNow)}</li> : null}
              {impact.loseReady > 0 ? <li>{W.impactLose(impact.loseReady)}</li> : null}
              {rewardChanged && impact.pendingClaims > 0 ? (
                <li>{W.impactClaims(impact.pendingClaims)}</li>
              ) : null}
            </ul>
          </Notice>
        ) : null}
      </aside>

      <section className={`${SECTION} lg:col-span-3 lg:col-start-1`} aria-labelledby="earn-title">
        <h2 id="earn-title" className="text-base font-bold">
          {W.earnTitle}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="card-min">{W.minOrder}</FieldLabel>
            <PesoInput
              id="card-min"
              value={rule.minOrderTotal}
              placeholder={W.minOrderAny}
              onChange={(minOrderTotal) => setRule({ minOrderTotal })}
            />
            <FieldDescription>{W.minOrderHint}</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="card-cap">{W.cap}</FieldLabel>
            <Select
              value={capValue}
              onValueChange={(value) => {
                const period = STAMP_PERIODS.find((p) => p === value) ?? null;
                setRule(
                  period
                    ? { period, maxEarned: rule.maxEarned ?? 1 }
                    : { period: null, maxEarned: null },
                );
              }}
            >
              <SelectTrigger
                id="card-cap"
                className="w-full bg-card text-base md:text-sm data-size-default:h-11 md:data-size-default:h-9"
              >
                <SelectValue>{capLabel}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {STAMP_PERIODS.map((p) => (
                  <SelectItem key={p} value={p} className="min-h-11 md:min-h-8">
                    {W.capOption(rule.maxEarned ?? 1, p)}
                  </SelectItem>
                ))}
                <SelectItem value="none" className="min-h-11 md:min-h-8">
                  {W.capNone}
                </SelectItem>
              </SelectContent>
            </Select>
            <FieldDescription>{W.capHint}</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="card-goal">{W.goal}</FieldLabel>
            <NumberField
              id="card-goal"
              value={rule.stampsNeeded}
              min={GOAL_MIN}
              max={GOAL_MAX}
              onValueChange={(value) => {
                if (value === null || Number.isNaN(value)) return;
                setRule({ stampsNeeded: Math.min(GOAL_MAX, Math.max(GOAL_MIN, value)) });
              }}
              className="w-40"
            >
              <NumberFieldGroup className="h-11 md:h-9">
                <NumberFieldDecrement className="h-full" />
                <NumberFieldInput className="text-base font-semibold tabular-nums" />
                <NumberFieldIncrement className="h-full" />
              </NumberFieldGroup>
            </NumberField>
            <FieldDescription>{W.goalHint}</FieldDescription>
          </Field>
          <SwitchRow
            id="card-welcome"
            label={W.welcome}
            help={W.welcomeHint}
            checked={rule.welcomeStamps === 1}
            onCheckedChange={(on) => setRule({ welcomeStamps: on ? 1 : 0 })}
          />
        </div>
      </section>

      <section className={`${SECTION} lg:col-span-3 lg:col-start-1`} aria-labelledby="reward-title">
        <h2 id="reward-title" className="text-base font-bold">
          {W.rewardTitle}
        </h2>
        {/* Radio cards, the kit c-radio-group-7 pattern, like the add-on Rule cards. */}
        <RadioGroup
          value={reward.kind}
          onValueChange={(value) => {
            const kind = REWARD_KINDS.find((k) => k === value);
            if (kind) pickKind(kind);
          }}
          aria-label={W.rewardLabel}
          className="grid w-full gap-2 sm:grid-cols-3"
        >
          {REWARD_KINDS.map((kind) => {
            const [title, desc] = W.kind[kind];
            const id = `reward-${kind}`;
            return (
              <FieldLabel key={kind} htmlFor={id}>
                <Field orientation="horizontal">
                  <FieldContent>
                    <FieldTitle>{title}</FieldTitle>
                    <FieldDescription>{desc}</FieldDescription>
                  </FieldContent>
                  <RadioGroupItem value={kind} id={id} />
                </Field>
              </FieldLabel>
            );
          })}
        </RadioGroup>

        {reward.kind === 'discount' ? (
          <Field data-invalid={problems.amount || undefined} className="sm:max-w-60">
            <FieldLabel htmlFor="reward-amount">{W.amount}</FieldLabel>
            <PesoInput
              id="reward-amount"
              value={reward.amount ?? 0}
              onChange={(amount) =>
                setReward({ amount, title: W.discountTitle(formatPeso(amount)) })
              }
            />
            {problems.amount ? <FieldError>{W.amountNeeded}</FieldError> : null}
          </Field>
        ) : null}

        {reward.kind === 'free_item' ? (
          activeItems.length === 0 ? (
            <Notice tone="warning" icon={<InfoIcon className="size-4" />}>
              {W.noItems(catalog)}
            </Notice>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={problems.item || undefined}>
                <FieldLabel htmlFor="reward-item">{W.item(catalog)}</FieldLabel>
                <Select
                  value={reward.itemId}
                  onValueChange={(value) => {
                    const item = activeItems.find((i) => i.id === value);
                    if (item) setReward(freeItemReward(item, null, reward));
                  }}
                >
                  <SelectTrigger
                    id="reward-item"
                    className="w-full bg-card text-base md:text-sm data-size-default:h-11 md:data-size-default:h-9"
                  >
                    <SelectValue placeholder={W.itemPlaceholder}>
                      {(value: unknown) =>
                        items.find((i) => i.id === value)?.name ?? W.itemPlaceholder
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {activeItems.map((item) => (
                      <SelectItem key={item.id} value={item.id} className="min-h-11 md:min-h-8">
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {problems.item ? <FieldError>{W.itemNeeded}</FieldError> : null}
              </Field>
              {pickedItem && pickedItem.variants.length > 1 ? (
                <Field>
                  <FieldLabel htmlFor="reward-variant">{W.variant}</FieldLabel>
                  <Select
                    value={reward.variantId}
                    onValueChange={(value) => {
                      if (typeof value === 'string')
                        setReward(freeItemReward(pickedItem, value, reward));
                    }}
                  >
                    <SelectTrigger
                      id="reward-variant"
                      className="w-full bg-card text-base md:text-sm data-size-default:h-11 md:data-size-default:h-9"
                    >
                      <SelectValue>
                        {(value: unknown) => {
                          const v = pickedItem.variants.find((x) => x.id === value);
                          return v ? variantLabel(v) : '';
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {pickedItem.variants.map((v) => (
                        <SelectItem key={v.id} value={v.id} className="min-h-11 md:min-h-8">
                          {variantLabel(v)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              ) : null}
              <p className="text-sm text-muted-foreground sm:col-span-2">{W.itemGuard(catalog)}</p>
            </div>
          )
        ) : null}

        {reward.kind === 'custom' ? (
          <div className="flex flex-col gap-4">
            <Field data-invalid={problems.title || undefined}>
              <FieldLabel htmlFor="reward-name">{W.prizeName}</FieldLabel>
              <Input
                id="reward-name"
                value={reward.title}
                maxLength={60}
                placeholder={W.prizeNamePlaceholder}
                onChange={(e) => setReward({ title: e.target.value })}
                className="h-11 text-base md:h-9 md:text-sm"
              />
              {problems.title ? <FieldError>{W.prizeNameNeeded}</FieldError> : null}
            </Field>
            <Field>
              <FieldLabel htmlFor="reward-body">{W.prizeBody}</FieldLabel>
              <Textarea
                id="reward-body"
                value={reward.description ?? ''}
                maxLength={200}
                rows={2}
                placeholder={W.prizeBodyPlaceholder}
                onChange={(e) => setReward({ description: e.target.value || null })}
                className="text-base md:text-sm"
              />
            </Field>
            <SwitchRow
              id="reward-limited"
              label={W.limited}
              help={W.limitedHint}
              checked={reward.quantityTotal !== null}
              onCheckedChange={(on) => {
                const total = Math.max(held, card.reward.quantityTotal ?? 20);
                setReward(
                  on
                    ? { quantityTotal: total, quantityLeft: total - held }
                    : { quantityTotal: null, quantityLeft: null },
                );
              }}
            />
            {reward.quantityTotal !== null ? (
              <Field data-invalid={piecesError ? true : undefined}>
                <FieldLabel htmlFor="reward-pieces">{W.pieces}</FieldLabel>
                <NumberField
                  id="reward-pieces"
                  value={reward.quantityTotal}
                  min={Math.max(1, held)}
                  max={PIECES_MAX}
                  onValueChange={(value) => {
                    if (value === null || Number.isNaN(value)) return;
                    const total = Math.min(PIECES_MAX, Math.max(1, held, value));
                    setReward({ quantityTotal: total, quantityLeft: total - held });
                  }}
                  className="w-44"
                >
                  <NumberFieldGroup className="h-11 md:h-9">
                    <NumberFieldDecrement className="h-full" />
                    <NumberFieldInput className="text-base font-semibold tabular-nums" />
                    <NumberFieldIncrement className="h-full" />
                  </NumberFieldGroup>
                </NumberField>
                <FieldDescription>{W.piecesHeld(held)}</FieldDescription>
                {piecesError ? <FieldError>{piecesError}</FieldError> : null}
              </Field>
            ) : null}
            <SwitchRow
              id="reward-one"
              label={W.onePerCustomer}
              help={W.onePerCustomerHint}
              checked={reward.onePerCustomer}
              onCheckedChange={(onePerCustomer) => setReward({ onePerCustomer })}
            />
          </div>
        ) : null}
      </section>

      <ActionBar
        open={dirty}
        onOpenChange={() => undefined}
        side="bottom"
        sideOffset={dockClearance}
        className="w-11/12 max-w-xl items-center gap-2 border-border/80 bg-card px-3 py-2 text-card-foreground shadow-xl"
      >
        <ActionBarSelection className="border-0 px-0 font-semibold whitespace-nowrap">
          {W.unsaved}
        </ActionBarSelection>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="ghost"
            className="h-11 md:h-9"
            onClick={() => {
              setDraft(saved);
              setServerErrors({});
            }}
          >
            {W.discard}
          </Button>
          <AsyncButton
            status={action.status}
            busyLabel={W.saving}
            doneLabel={W.saved}
            disabled={!valid || !online}
            className="h-11 font-semibold md:h-9"
            onClick={() => void onSave()}
          >
            {W.save}
          </AsyncButton>
        </div>
      </ActionBar>
    </div>
  );
}

/** On, Paused, Off: saved as soon as it is picked, with Undo (T60). */
function StatusSection({ status, online }: { status: StampCardStatus; online: boolean }) {
  const setStatus = useSetStampCardStatus();
  const change = (to: StampCardStatus, from: StampCardStatus) => {
    setStatus
      .mutateAsync({ status: to })
      .then(() =>
        notify({
          title: W.statusSaved[to],
          description: W.statusLine[to],
          tone: 'success',
          durationMs: 10_000,
          action: {
            label: membersWords.toast.undo,
            onClick: () => void setStatus.mutateAsync({ status: from }),
          },
        }),
      )
      .catch((err: unknown) => notify({ title: errorWords(errorCodeOf(err)), tone: 'error' }));
  };
  return (
    <section className={`${SECTION} lg:col-span-3 lg:col-start-1`} aria-labelledby="status-title">
      <h2 id="status-title" className="text-base font-bold">
        {W.statusTitle}
      </h2>
      <ToggleGroup
        value={[status]}
        onValueChange={(value) => {
          const to = STAMP_CARD_STATUSES.find((s) => s === value[0]);
          if (to && to !== status) change(to, status);
        }}
        aria-label={W.statusLabel}
        disabled={!online || setStatus.isPending}
        spacing={1.5}
        className="w-full"
      >
        {(['on', 'paused', 'off'] as const).map((s) => {
          const Icon = STATUS_ICON[s];
          return (
            <ToggleGroupItem key={s} value={s} className={CHIP}>
              <Icon aria-hidden="true" />
              {W.status[s]}
            </ToggleGroupItem>
          );
        })}
      </ToggleGroup>
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {W.statusLine[status]}
      </p>
    </section>
  );
}

/** The storefront card as members will see it, in the shop's colours, with a few stamps on it. */
function Preview({
  draft,
  look,
  status,
}: {
  draft: Draft;
  look: ShopLook | undefined;
  status: StampCardStatus;
}) {
  const { rule, reward } = draft;
  const goal = rule.stampsNeeded;
  const stamped = Math.min(3, goal - 1);
  const cap =
    rule.maxEarned !== null && rule.period ? words.rewards.cap(rule.maxEarned, rule.period) : null;
  const ruleLine =
    rule.minOrderTotal > 0
      ? words.rewards.rule(formatPeso(rule.minOrderTotal), cap)
      : words.rewards.ruleNoMin(cap);
  const title = reward.title.trim() || W.prizeNamePlaceholder;
  const card = (
    <StampCard
      needed={goal}
      stamped={stamped}
      title={W.previewToGo(goal - stamped, title)}
      body={ruleLine}
      progressLabel={membersWords.stampsLabel(stamped, goal)}
      prize={{
        title,
        photo: imageSources(reward.image, env.VITE_STOREFRONT_URL),
        label: membersWords.panel.prizeLabel,
      }}
      assetOrigin={env.VITE_STOREFRONT_URL}
    />
  );
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-muted-foreground">{W.previewTitle}</h2>
        {reward.kind === 'custom' && reward.quantityLeft !== null ? (
          <span className="text-sm font-semibold tabular-nums">{W.left(reward.quantityLeft)}</span>
        ) : null}
      </div>
      <div className={status === 'off' ? 'opacity-60' : undefined}>
        <ShopLookTheme look={look}>{card}</ShopLookTheme>
      </div>
    </div>
  );
}

function SwitchRow({
  id,
  label,
  help,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  help: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="space-y-0.5">
        <Label htmlFor={id} className="text-sm font-semibold">
          {label}
        </Label>
        <p className="text-sm text-muted-foreground">{help}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function EditorSkeleton() {
  return (
    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-5 lg:gap-6" aria-hidden="true">
      <div className="flex flex-col gap-4 lg:col-span-3">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-56 w-full rounded-xl" />
      </div>
      <Skeleton className="h-80 w-full rounded-xl lg:col-span-2" />
    </div>
  );
}
