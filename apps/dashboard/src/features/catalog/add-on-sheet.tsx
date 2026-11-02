import * as React from 'react';
import { AlertTriangleIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import {
  formatPeso,
  catalogWords,
  groupRuleLabel,
  errorWords,
  type OwnerOptionGroup,
  type OptionDraft,
} from '@smartapp/core';
import { useSaveOptionGroup, useRemoveOptionGroup, errorCodeOf } from '@smartapp/data';
import { Button } from '@smartapp/ui/components/button';
import { Input } from '@smartapp/ui/components/input';
import { Label } from '@smartapp/ui/components/label';
import { Switch } from '@smartapp/ui/components/switch';
import { Checkbox } from '@smartapp/ui/components/checkbox';
import { ToggleGroup, ToggleGroupItem } from '@smartapp/ui/components/toggle-group';
import {
  ResponsiveDialog,
  ResponsiveDialogFooter,
} from '@smartapp/ui/compositions/responsive-dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@smartapp/ui/components/alert-dialog';
import { notify } from '@smartapp/ui/compositions/notify';
import { PesoInput } from './components/peso-input.js';

export interface AddOnSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group?: OwnerOptionGroup | null | undefined;
  // Called with the saved group, e.g. so the item editor can tick a group it just made.
  onSaved?: ((group: OwnerOptionGroup) => void) | undefined;
}

const RULE_PRESETS = ['pick_1_req', 'pick_1_opt', 'pick_any', 'custom'] as const;
type RulePreset = (typeof RULE_PRESETS)[number];
const MAX_PICKS = 10;
const MAX_OPTIONS = 20;

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
export function AddOnSheet({ open, onOpenChange, group, onSaved }: AddOnSheetProps) {
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
          onClose={() => onOpenChange(false)}
        />
      ) : null}
    </ResponsiveDialog>
  );
}

function AddOnForm({
  group,
  onSaved,
  onClose,
}: {
  group?: OwnerOptionGroup | null | undefined;
  onSaved?: ((group: OwnerOptionGroup) => void) | undefined;
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

  const saveOptionGroup = useSaveOptionGroup();
  const removeOptionGroup = useRemoveOptionGroup();

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
      const saved = await saveOptionGroup.mutateAsync(group ? { id: group.id, ...draft } : draft);
      notify({ title: catalogWords.savedToast(saved.name), tone: 'success' });
      onSaved?.(saved);
      onClose();
    } catch (err: unknown) {
      setErrorMsg(errorWords(errorCodeOf(err)));
    }
  };

  const handleDelete = async () => {
    if (!group) return;
    try {
      await removeOptionGroup.mutateAsync({ id: group.id });
      setDeleteConfirmOpen(false);
      onClose();
    } catch (err: unknown) {
      setDeleteConfirmOpen(false);
      setErrorMsg(errorWords(errorCodeOf(err)));
    }
  };

  const ruleText = groupRuleLabel(minPicks, maxPicks);

  return (
    <form onSubmit={handleSave} className="space-y-5">
      {group && group.usedBy > 0 ? (
        <div className="flex items-center gap-2.5 rounded-xl border border-warning/20 bg-warning-soft p-3 text-sm text-warning-text">
          <AlertTriangleIcon className="size-4 shrink-0" />
          <span>{catalogWords.groupWarningNotice(group.usedBy)}</span>
        </div>
      ) : null}

      {errorMsg ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {errorMsg}
        </p>
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
        <ToggleGroup
          value={[rulePreset]}
          onValueChange={(vals) => {
            const next = vals[vals.length - 1];
            if (next && isRulePreset(next)) handlePresetChange(next);
          }}
          variant="outline"
          className="grid w-full grid-cols-2 gap-2"
        >
          {RULE_PRESETS.map((preset) => (
            <ToggleGroupItem
              key={preset}
              value={preset}
              className="h-11 justify-center aria-pressed:border-primary aria-pressed:bg-primary/5 aria-pressed:text-primary md:h-9"
            >
              {
                {
                  pick_1_req: catalogWords.rulePickOneRequired,
                  pick_1_opt: catalogWords.rulePickOneOptional,
                  pick_any: catalogWords.rulePickAny,
                  custom: catalogWords.ruleCustom,
                }[preset]
              }
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

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

      <div className="space-y-2">
        <Label>{catalogWords.optionsLabel}</Label>
        <ul className="space-y-2">
          {options.map((opt, index) => (
            <li
              key={opt.id ?? index}
              className="space-y-2 rounded-xl border border-border/70 bg-card p-3 shadow-xs"
            >
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
                  className="w-28 shrink-0"
                  aria-label={catalogWords.optionPriceDelta}
                  value={opt.priceDelta}
                  onChange={(priceDelta) => updateOption(index, { priceDelta })}
                />
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-muted-foreground md:min-h-8">
                  <Checkbox
                    checked={opt.isDefault}
                    onCheckedChange={(checked) =>
                      updateOption(index, { isDefault: Boolean(checked) })
                    }
                  />
                  {catalogWords.optionPreselected}
                </label>
                <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-muted-foreground md:min-h-8">
                  <Switch
                    checked={opt.soldOut}
                    onCheckedChange={(checked) => updateOption(index, { soldOut: checked })}
                  />
                  {catalogWords.optionSoldOut}
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  className="ml-auto h-11 gap-1.5 text-muted-foreground hover:text-destructive md:h-8"
                  onClick={() => handleRemoveOption(index)}
                  disabled={options.length <= 1}
                >
                  <Trash2Icon className="size-4" />
                  {catalogWords.optionRemove}
                </Button>
              </div>
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
            {options.map((opt, i) => (
              <li
                key={opt.id ?? i}
                className="flex items-center justify-between rounded-lg border border-border/40 bg-card px-2.5 py-1.5 text-sm"
              >
                <span
                  className={opt.soldOut ? 'text-muted-foreground line-through' : 'text-foreground'}
                >
                  {opt.name || catalogWords.optionNamePlaceholder(i + 1)}
                </span>
                <span className="text-muted-foreground tabular">
                  {opt.soldOut
                    ? catalogWords.optionSoldOut
                    : opt.priceDelta > 0
                      ? `+${formatPeso(opt.priceDelta)}`
                      : catalogWords.optionFree}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <ResponsiveDialogFooter>
        <div className="flex items-center justify-between gap-2">
          {group ? (
            <Button
              type="button"
              variant="ghost"
              className="h-11 text-destructive hover:bg-destructive/10 hover:text-destructive md:h-9"
              disabled={removeOptionGroup.isPending}
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
            <Button
              type="submit"
              disabled={saveOptionGroup.isPending}
              className="h-11 min-w-24 font-semibold md:h-9"
            >
              {saveOptionGroup.isPending ? catalogWords.saving : catalogWords.save}
            </Button>
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
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive font-semibold text-destructive-foreground hover:bg-destructive/90"
            >
              {catalogWords.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
