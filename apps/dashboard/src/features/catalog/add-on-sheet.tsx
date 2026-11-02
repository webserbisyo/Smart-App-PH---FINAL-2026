import * as React from 'react';
import {
  AlertTriangleIcon,
  CircleAlertIcon,
  BanIcon,
  CheckIcon,
  MoreHorizontalIcon,
  PlusIcon,
  Trash2Icon,
} from 'lucide-react';
import {
  actionWords,
  formatPeso,
  catalogWords,
  groupRuleLabel,
  errorWords,
  type OwnerItem,
  type OwnerOptionGroup,
  type OptionDraft,
} from '@smartapp/core';
import {
  useOwnerItems,
  useSaveItem,
  useSaveOptionGroup,
  useRemoveOptionGroup,
  errorCodeOf,
} from '@smartapp/data';
import { Button } from '@smartapp/ui/components/button';
import { Input } from '@smartapp/ui/components/input';
import { Label } from '@smartapp/ui/components/label';
import { Badge } from '@smartapp/ui/components/badge';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@smartapp/ui/components/dropdown-menu';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from '@smartapp/ui/components/field';
import { RadioGroup, RadioGroupItem } from '@smartapp/ui/components/radio-group';
import {
  ResponsiveDialog,
  ResponsiveDialogFooter,
} from '@smartapp/ui/compositions/responsive-dialog';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@smartapp/ui/components/alert-dialog';
import { notify } from '@smartapp/ui/compositions/notify';
import { PesoInput } from './components/peso-input.js';
import { PickedChip, PickRow } from './pick-list.js';
import { AsyncButton, useAsyncAction } from '@smartapp/ui/compositions/async-button';
import { Notice } from '@/app/notice';
import { SearchField } from '@/app/search-field';
import { CatalogPhoto } from './catalog-photo.js';

export interface AddOnSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group?: OwnerOptionGroup | null | undefined;
  // Called with the saved group, e.g. so the item editor can tick a group it just made.
  onSaved?: ((group: OwnerOptionGroup) => void) | undefined;
  // Opened from inside the item editor, where the result shows in place: no success toast (ux.md s8).
  quiet?: boolean | undefined;
}

const RULE_PRESETS = ['pick_1_req', 'pick_1_opt', 'pick_any', 'custom'] as const;
type RulePreset = (typeof RULE_PRESETS)[number];
const MAX_PICKS = 10;
const MAX_OPTIONS = 20;
// The preview near the top stays short; the full list is right below it.
const PREVIEW_OPTIONS = 3;

function isRulePreset(val: string): val is RulePreset {
  return RULE_PRESETS.some((preset) => preset === val);
}

function presetOf(group: OwnerOptionGroup | null | undefined): RulePreset {
  if (!group) return 'pick_1_req';
  if (group.min === 1 && group.max === 1) return 'pick_1_req';
  if (group.min === 0 && group.max === 1) return 'pick_1_opt';
  if (group.min === 0 && group.max === Math.min(MAX_PICKS, group.options.length)) return 'pick_any';
  return 'custom';
}

let optionSeq = 0;
function blankOption(): OptionDraft {
  optionSeq += 1;
  return {
    id: `opt_new_${optionSeq}`,
    name: '',
    priceDelta: 0,
    isDefault: false,
    soldOut: false,
  };
}

// Add-on group form: a dialog on tablet and desktop, a bottom drawer on phone.
export function AddOnSheet({ open, onOpenChange, group, onSaved, quiet = false }: AddOnSheetProps) {
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={group ? catalogWords.editGroup : catalogWords.addGroup}
      description={catalogWords.groupSheetDesc}
      scroll
    >
      {open ? (
        <AddOnForm
          key={group ? group.id : 'new'}
          group={group}
          onSaved={onSaved}
          quiet={quiet}
          onClose={() => onOpenChange(false)}
        />
      ) : null}
    </ResponsiveDialog>
  );
}

function AddOnForm({
  group,
  onSaved,
  quiet,
  onClose,
}: {
  group?: OwnerOptionGroup | null | undefined;
  onSaved?: ((group: OwnerOptionGroup) => void) | undefined;
  quiet: boolean;
  onClose: () => void;
}) {
  const [name, setName] = React.useState(group?.name ?? '');
  const [rulePreset, setRulePreset] = React.useState<RulePreset>(() => presetOf(group));
  const [minPicks, setMinPicks] = React.useState(group?.min ?? 1);
  const [maxPicks, setMaxPicks] = React.useState(group?.max ?? 1);
  const [options, setOptions] = React.useState<OptionDraft[]>(() =>
    group ? group.options : [blankOption(), blankOption()],
  );
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const { data: allItems = [] } = useOwnerItems();
  const items = allItems.filter((item) => item.status !== 'archived');
  const [usedOn, setUsedOn] = React.useState<string[] | null>(null);
  const usedOnIds =
    usedOn ??
    (group ? items.filter((i) => i.optionGroupIds.includes(group.id)).map((i) => i.id) : []);

  const saveOptionGroup = useSaveOptionGroup();
  const removeOptionGroup = useRemoveOptionGroup();
  const saveAction = useAsyncAction();
  const deleteAction = useAsyncAction();
  const saveItem = useSaveItem();

  const pickAnyMax = (count: number) => Math.max(1, Math.min(MAX_PICKS, count));

  const handlePresetChange = (p: RulePreset) => {
    setRulePreset(p);
    if (p === 'pick_1_req') {
      setMinPicks(1);
      setMaxPicks(1);
    } else if (p === 'pick_1_opt') {
      setMinPicks(0);
      setMaxPicks(1);
    } else if (p === 'pick_any') {
      setMinPicks(0);
      setMaxPicks(pickAnyMax(options.length));
    }
  };

  const handleAddOption = () => {
    if (options.length >= MAX_OPTIONS) {
      setErrorMsg(catalogWords.groupMaxOptions);
      return;
    }
    const next = [...options, blankOption()];
    setOptions(next);
    if (rulePreset === 'pick_any') setMaxPicks(pickAnyMax(next.length));
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 1) {
      setErrorMsg(catalogWords.groupMinOneOption);
      return;
    }
    const next = options.filter((_, i) => i !== index);
    setOptions(next);
    if (rulePreset === 'pick_any') setMaxPicks(pickAnyMax(next.length));
  };

  const updateOption = (index: number, patch: Partial<OptionDraft>) => {
    setOptions((prev) =>
      prev.map((opt, i) => {
        if (i === index) return { ...opt, ...patch };
        // A pick-1 group can pre-select only one option.
        if (patch.isDefault === true && maxPicks === 1) return { ...opt, isDefault: false };
        return opt;
      }),
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    const kept = options
      .map((opt) => ({ ...opt, name: opt.name.trim() }))
      .filter((opt) => opt.name !== '');
    const problem = !trimmed
      ? catalogWords.groupNameRequired
      : kept.length === 0
        ? catalogWords.groupMinOneOption
        : minPicks > maxPicks
          ? catalogWords.groupMinOverMax
          : minPicks > kept.length
            ? catalogWords.groupMinOverOptions
            : null;
    if (problem) {
      setErrorMsg(problem);
      return;
    }

    const draft = {
      name: trimmed,
      min: minPicks,
      max: rulePreset === 'pick_any' ? pickAnyMax(kept.length) : maxPicks,
      options: kept.map((opt) => ({
        name: opt.name,
        priceDelta: opt.priceDelta,
        isDefault: opt.isDefault,
        soldOut: opt.soldOut,
      })),
    };
    try {
      const saved = await saveAction.run(async () => {
        const result = await saveOptionGroup.mutateAsync(
          group ? { id: group.id, ...draft } : draft,
        );
        await syncUsedOn(result);
        return result;
      });
      if (!quiet) notify({ title: catalogWords.savedToast(saved.name), tone: 'success' });
      onSaved?.(saved);
      onClose();
    } catch (err: unknown) {
      setErrorMsg(errorWords(errorCodeOf(err)));
    }
  };

  // "Used on": add the group to newly picked items and take it off unpicked ones.
  const syncUsedOn = async (saved: OwnerOptionGroup) => {
    if (usedOn === null) return;
    const picked = new Set(usedOn);
    const changed = items.filter(
      (item) => item.optionGroupIds.includes(saved.id) !== picked.has(item.id),
    );
    await Promise.all(
      changed.map((item) =>
        saveItem.mutateAsync({
          id: item.id,
          draft: {
            categoryId: item.categoryId,
            name: item.name,
            description: item.description,
            photos: item.photos,
            basePrice: item.basePrice,
            axes: item.axes,
            variants: item.variants,
            optionGroupIds: picked.has(item.id)
              ? [...item.optionGroupIds, saved.id]
              : item.optionGroupIds.filter((id) => id !== saved.id),
            pairingIds: item.pairingIds,
            featured: item.featured,
            isNew: item.isNew,
            status: item.status,
          },
        }),
      ),
    );
  };

  const handleDelete = async () => {
    if (!group) return;
    try {
      await deleteAction.run(() => removeOptionGroup.mutateAsync({ id: group.id }));
      notify({ title: catalogWords.groupDeleted(group.name), tone: 'success' });
      setDeleteConfirmOpen(false);
      onClose();
    } catch (err: unknown) {
      setDeleteConfirmOpen(false);
      setErrorMsg(errorWords(errorCodeOf(err)));
    }
  };

  const namedCount = options.filter((opt) => opt.name.trim()).length;
  const ruleText = groupRuleLabel(
    minPicks,
    rulePreset === 'pick_any' ? pickAnyMax(namedCount) : maxPicks,
    rulePreset === 'pick_any' ? namedCount : undefined,
  );

  const preview = (
    <div className="space-y-2">
      <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {catalogWords.customerPreview}
      </span>
      <div className="space-y-2 rounded-xl border border-border/60 bg-muted/20 p-3">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-sm font-semibold text-foreground">
            {name || catalogWords.addGroup}
          </span>
          <span className="shrink-0 text-xs text-muted-foreground">{ruleText}</span>
        </div>
        <ul className="space-y-1.5">
          {options.slice(0, PREVIEW_OPTIONS).map((opt, i) => (
            <li
              key={opt.id ?? i}
              className="flex items-center justify-between gap-2 rounded-lg border border-border/40 bg-card px-2.5 py-1.5 text-sm"
            >
              <span
                className={
                  opt.soldOut
                    ? 'truncate text-muted-foreground line-through'
                    : 'truncate text-foreground'
                }
              >
                {opt.name || catalogWords.optionNamePlaceholder(i + 1)}
              </span>
              <span className="shrink-0 text-muted-foreground tabular">
                {opt.soldOut
                  ? catalogWords.optionSoldOut
                  : opt.priceDelta > 0
                    ? `+${formatPeso(opt.priceDelta)}`
                    : catalogWords.optionFree}
              </span>
            </li>
          ))}
        </ul>
        {options.length > PREVIEW_OPTIONS ? (
          <p className="text-xs text-muted-foreground">
            {catalogWords.moreOptions(options.length - PREVIEW_OPTIONS)}
          </p>
        ) : null}
      </div>
    </div>
  );

  return (
    <form onSubmit={handleSave} className="space-y-5">
      {group && group.usedBy > 0 ? (
        <Notice tone="warning" icon={<AlertTriangleIcon />}>
          {catalogWords.groupWarningNotice(group.usedBy)}
        </Notice>
      ) : null}

      {errorMsg ? (
        <Notice tone="error" icon={<CircleAlertIcon />}>
          {errorMsg}
        </Notice>
      ) : null}

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="group-name">{catalogWords.groupNameLabel}</Label>
          <span className="text-xs text-muted-foreground tabular">
            {catalogWords.charCount(name.length, 40)}
          </span>
        </div>
        <Input
          id="group-name"
          value={name}
          maxLength={40}
          className="h-11 md:h-9"
          placeholder={catalogWords.groupNamePlaceholder}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <div className="space-y-0.5">
          <Label>{catalogWords.ruleLabel}</Label>
          <p className="text-sm text-muted-foreground">{catalogWords.groupRuleHelp}</p>
        </div>
        {/* Radio cards, the kit c-radio-group-7 pattern: each rule with one line on what customers see
            (decision T45). */}
        <RadioGroup
          value={rulePreset}
          onValueChange={(next) => {
            if (typeof next === 'string' && isRulePreset(next)) handlePresetChange(next);
          }}
          aria-label={catalogWords.ruleLabel}
          className="grid w-full gap-2 sm:grid-cols-2"
        >
          {RULE_PRESETS.map((preset) => {
            const [title, desc] = {
              pick_1_req: [catalogWords.rulePickOneRequired, catalogWords.rulePickOneRequiredDesc],
              pick_1_opt: [catalogWords.rulePickOneOptional, catalogWords.rulePickOneOptionalDesc],
              pick_any: [catalogWords.rulePickAny, catalogWords.rulePickAnyDesc],
              custom: [catalogWords.ruleCustom, catalogWords.ruleCustomDesc],
            }[preset];
            const id = `rule-${preset}`;
            return (
              <FieldLabel key={preset} htmlFor={id}>
                <Field orientation="horizontal">
                  <FieldContent>
                    <FieldTitle>{title}</FieldTitle>
                    <FieldDescription>{desc}</FieldDescription>
                  </FieldContent>
                  <RadioGroupItem value={preset} id={id} />
                </Field>
              </FieldLabel>
            );
          })}
        </RadioGroup>

        {rulePreset === 'custom' ? (
          <div className="grid grid-cols-2 gap-3 rounded-xl border border-border/60 bg-muted/20 p-3">
            <div className="space-y-1.5">
              <Label htmlFor="min-picks">{catalogWords.groupAtLeast}</Label>
              <Input
                id="min-picks"
                type="number"
                inputMode="numeric"
                min={0}
                max={maxPicks}
                value={minPicks}
                className="h-11 md:h-9"
                onChange={(e) => setMinPicks(Math.max(0, parseInt(e.target.value, 10) || 0))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="max-picks">{catalogWords.groupAtMost}</Label>
              <Input
                id="max-picks"
                type="number"
                inputMode="numeric"
                min={1}
                max={MAX_PICKS}
                value={maxPicks}
                className="h-11 md:h-9"
                onChange={(e) =>
                  setMaxPicks(Math.min(MAX_PICKS, Math.max(1, parseInt(e.target.value, 10) || 1)))
                }
              />
            </div>
          </div>
        ) : null}
      </div>

      {preview}

      <div className="space-y-2">
        <Label>{catalogWords.optionsLabel}</Label>
        <ul className="space-y-2">
          {options.map((opt, index) => (
            <li key={opt.id ?? index} className="space-y-1">
              <div className="flex items-center gap-2">
                <Input
                  value={opt.name}
                  maxLength={60}
                  aria-label={catalogWords.optionName}
                  placeholder={catalogWords.optionNamePlaceholder(index + 1)}
                  className="h-11 min-w-0 flex-1 md:h-9"
                  onChange={(e) => updateOption(index, { name: e.target.value })}
                />
                <PesoInput
                  className="w-24 shrink-0 sm:w-28"
                  aria-label={catalogWords.optionPriceDelta}
                  value={opt.priceDelta}
                  onChange={(priceDelta) => updateOption(index, { priceDelta })}
                />
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-11 shrink-0 text-muted-foreground md:size-9"
                        aria-label={catalogWords.optionMoreAria(
                          opt.name || catalogWords.optionNamePlaceholder(index + 1),
                        )}
                      />
                    }
                  >
                    <MoreHorizontalIcon className="size-5" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuCheckboxItem
                      className="min-h-11 md:min-h-8"
                      checked={opt.isDefault}
                      onCheckedChange={(checked) => updateOption(index, { isDefault: checked })}
                    >
                      {catalogWords.optionPreselected}
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      className="min-h-11 md:min-h-8"
                      checked={opt.soldOut}
                      onCheckedChange={(checked) => updateOption(index, { soldOut: checked })}
                    >
                      {catalogWords.optionSoldOut}
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      className="min-h-11 md:min-h-8"
                      disabled={options.length <= 1}
                      onClick={() => handleRemoveOption(index)}
                    >
                      <Trash2Icon className="size-4" />
                      {catalogWords.optionRemove}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {opt.isDefault || opt.soldOut ? (
                <div className="flex flex-wrap gap-1.5">
                  {opt.isDefault ? (
                    <Badge variant="secondary" className="gap-1">
                      <CheckIcon className="size-3" />
                      {catalogWords.optionPreselected}
                    </Badge>
                  ) : null}
                  {opt.soldOut ? (
                    <Badge
                      variant="outline"
                      className="gap-1 border-warning/40 bg-warning-soft text-warning-text"
                    >
                      <BanIcon className="size-3" />
                      {catalogWords.optionSoldOut}
                    </Badge>
                  ) : null}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full gap-1.5 border-dashed md:h-9"
          onClick={handleAddOption}
        >
          <PlusIcon className="size-4" />
          {catalogWords.addOption}
        </Button>
      </div>

      <UsedOnPicker items={items} pickedIds={usedOnIds} onChange={setUsedOn} />

      <ResponsiveDialogFooter>
        <div className="flex items-center justify-between gap-2">
          {group ? (
            <Button
              type="button"
              variant="ghost"
              className="h-11 text-destructive hover:bg-destructive/10 hover:text-destructive md:h-9"
              disabled={deleteAction.busy}
              onClick={() => setDeleteConfirmOpen(true)}
            >
              {catalogWords.delete}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" className="h-11 md:h-9" onClick={onClose}>
              {catalogWords.cancel}
            </Button>
            <AsyncButton
              type="submit"
              status={saveAction.status}
              busyLabel={actionWords.saving}
              doneLabel={actionWords.saved}
              className="h-11 font-semibold md:h-9"
            >
              {catalogWords.save}
            </AsyncButton>
          </div>
        </div>
      </ResponsiveDialogFooter>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{catalogWords.deleteGroupTitle(group?.name ?? '')}</AlertDialogTitle>
            <AlertDialogDescription>
              {group && group.usedBy > 0
                ? catalogWords.deleteGroupUsed(group.usedBy)
                : catalogWords.confirmDeleteDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{catalogWords.cancel}</AlertDialogCancel>
            <AsyncButton
              variant="destructive"
              status={deleteAction.status}
              busyLabel={actionWords.deleting}
              doneLabel={actionWords.deleted}
              className="font-semibold"
              onClick={() => void handleDelete()}
            >
              {catalogWords.delete}
            </AsyncButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}

function UsedOnPicker({
  items,
  pickedIds,
  onChange,
}: {
  items: readonly OwnerItem[];
  pickedIds: readonly string[];
  onChange: (ids: string[]) => void;
}) {
  const [query, setQuery] = React.useState('');
  const picked = items.filter((item) => pickedIds.includes(item.id));
  const q = query.trim().toLowerCase();
  const matches = items
    .filter((item) => !pickedIds.includes(item.id))
    .filter((item) => !q || item.name.toLowerCase().includes(q))
    .slice(0, 6);

  return (
    <div className="space-y-2">
      <div className="space-y-0.5">
        <Label htmlFor="used-on-search">{catalogWords.usedOnLabel}</Label>
        <p className="text-sm text-muted-foreground">{catalogWords.usedOnHelp}</p>
      </div>
      {picked.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {picked.map((item) => (
            <PickedChip
              key={item.id}
              media={<CatalogPhoto photoRef={item.photos[0]} alt="" size="sm" className="size-7" />}
              name={item.name}
              removeLabel={catalogWords.removePairingAria(item.name)}
              onRemove={() => onChange(pickedIds.filter((id) => id !== item.id))}
            />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{catalogWords.usedOnNone}</p>
      )}
      <SearchField
        id="used-on-search"
        value={query}
        onChange={setQuery}
        placeholder={catalogWords.usedOnSearch}
        clearLabel={catalogWords.clearSearch}
      />
      {matches.length > 0 ? (
        <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {matches.map((item) => (
            <li key={item.id}>
              <PickRow
                media={
                  <CatalogPhoto photoRef={item.photos[0]} alt="" size="sm" className="size-8" />
                }
                title={item.name}
                onPick={() => {
                  onChange([...pickedIds, item.id]);
                  setQuery('');
                }}
              />
            </li>
          ))}
        </ul>
      ) : q ? (
        <p className="text-sm text-muted-foreground">{catalogWords.pairingsNoMatch}</p>
      ) : null}
    </div>
  );
}
