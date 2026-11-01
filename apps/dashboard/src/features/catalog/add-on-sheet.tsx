import * as React from 'react';
import { GripVerticalIcon, PlusIcon, Trash2Icon, AlertTriangleIcon } from 'lucide-react';
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
import { Badge } from '@smartapp/ui/components/badge';
import { ToggleGroup, ToggleGroupItem } from '@smartapp/ui/components/toggle-group';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@smartapp/ui/components/sheet';
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

export interface AddOnSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group?: OwnerOptionGroup | null | undefined;
}

type RulePreset = 'pick_1_req' | 'pick_1_opt' | 'pick_any' | 'custom';

function isRulePreset(val: string): val is RulePreset {
  return val === 'pick_1_req' || val === 'pick_1_opt' || val === 'pick_any' || val === 'custom';
}

export function AddOnSheet({ open, onOpenChange, group }: AddOnSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {open ? (
        <AddOnSheetForm
          key={group ? group.id : 'new'}
          group={group}
          onClose={() => onOpenChange(false)}
        />
      ) : null}
    </Sheet>
  );
}

function AddOnSheetForm({
  group,
  onClose,
}: {
  group?: OwnerOptionGroup | null | undefined;
  onClose: () => void;
}) {
  const [name, setName] = React.useState(group?.name ?? '');
  const [rulePreset, setRulePreset] = React.useState<RulePreset>(() => {
    if (!group) return 'pick_1_req';
    if (group.min === 1 && group.max === 1) return 'pick_1_req';
    if (group.min === 0 && group.max === 1) return 'pick_1_opt';
    if (group.min === 0 && group.max === group.options.length) return 'pick_any';
    return 'custom';
  });
  const [minPicks, setMinPicks] = React.useState(group?.min ?? 1);
  const [maxPicks, setMaxPicks] = React.useState(group?.max ?? 1);
  const [options, setOptions] = React.useState<OptionDraft[]>(() =>
    group
      ? group.options
      : [
          { id: 'opt_1', name: 'Option 1', priceDelta: 0, isDefault: true, soldOut: false },
          { id: 'opt_2', name: 'Option 2', priceDelta: 0, isDefault: false, soldOut: false },
        ],
  );
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);

  const saveOptionGroup = useSaveOptionGroup();
  const removeOptionGroup = useRemoveOptionGroup();

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
      setMaxPicks(Math.max(1, options.length));
    }
  };

  const handleAddOption = () => {
    if (options.length >= 20) {
      setErrorMsg('Maximum 20 options allowed per group.');
      return;
    }
    const newOpt: OptionDraft = {
      id: `opt_${Date.now()}_${options.length + 1}`,
      name: `Option ${options.length + 1}`,
      priceDelta: 0,
      isDefault: false,
      soldOut: false,
    };
    setOptions([...options, newOpt]);
    if (rulePreset === 'pick_any') {
      setMaxPicks(options.length + 1);
    }
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 1) {
      setErrorMsg('An add-on group must have at least 1 option.');
      return;
    }
    const next = options.filter((_, i) => i !== index);
    setOptions(next);
    if (rulePreset === 'pick_any') {
      setMaxPicks(next.length);
    }
  };

  const updateOption = (index: number, patch: Partial<OptionDraft>) => {
    const next = [...options];
    const current = next[index];
    if (!current) return;
    next[index] = { ...current, ...patch };
    setOptions(next);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setErrorMsg('Add-on group name cannot be empty.');
      return;
    }
    if (options.length === 0) {
      setErrorMsg('Please add at least one option.');
      return;
    }
    if (minPicks > maxPicks) {
      setErrorMsg('Minimum picks cannot exceed maximum picks.');
      return;
    }

    try {
      if (group) {
        await saveOptionGroup.mutateAsync({
          id: group.id,
          name: trimmed,
          min: minPicks,
          max: maxPicks,
          options: options.map((opt) => ({
            name: opt.name.trim() || 'Option',
            priceDelta: Number(opt.priceDelta) || 0,
            isDefault: opt.isDefault,
            soldOut: opt.soldOut,
          })),
        });
      } else {
        await saveOptionGroup.mutateAsync({
          name: trimmed,
          min: minPicks,
          max: maxPicks,
          options: options.map((opt) => ({
            name: opt.name.trim() || 'Option',
            priceDelta: Number(opt.priceDelta) || 0,
            isDefault: opt.isDefault,
            soldOut: opt.soldOut,
          })),
        });
      }
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

  return (
    <>
      <SheetContent className="flex w-full flex-col overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{group ? catalogWords.editGroup : catalogWords.addGroup}</SheetTitle>
          <SheetDescription>
            Create customization options that can be shared across items.
          </SheetDescription>
        </SheetHeader>

        {group && group.usedBy > 0 && (
          <div className="mt-3 flex items-center gap-2.5 rounded-xl border border-warning/20 bg-warning-soft p-3 text-xs text-warning-text">
            <AlertTriangleIcon className="size-4 shrink-0" />
            <span>{catalogWords.groupWarningNotice(group.usedBy)}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="mt-4 flex flex-1 flex-col justify-between space-y-6">
          <div className="space-y-5">
            {errorMsg && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-2.5 text-xs text-destructive">
                {errorMsg}
              </div>
            )}

            {/* Group Name */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="group-name">Add-on name</Label>
                <span className="font-mono text-xs text-muted-foreground">{name.length}/40</span>
              </div>
              <Input
                id="group-name"
                value={name}
                maxLength={40}
                placeholder="e.g. Choose drinks, Extra toppings"
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>

            {/* Rule Presets */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <Label>{catalogWords.ruleLabel}</Label>
                <Badge variant="outline" className="text-xs font-medium">
                  {groupRuleLabel(minPicks, maxPicks)}
                </Badge>
              </div>

              <ToggleGroup
                value={[rulePreset]}
                onValueChange={(vals) => {
                  const next = vals[vals.length - 1];
                  if (next && isRulePreset(next)) {
                    handlePresetChange(next);
                  }
                }}
                className="grid w-full grid-cols-2 gap-1.5"
              >
                <ToggleGroupItem value="pick_1_req" className="h-9 justify-center text-xs">
                  {catalogWords.rulePickOneRequired}
                </ToggleGroupItem>
                <ToggleGroupItem value="pick_1_opt" className="h-9 justify-center text-xs">
                  {catalogWords.rulePickOneOptional}
                </ToggleGroupItem>
                <ToggleGroupItem value="pick_any" className="h-9 justify-center text-xs">
                  {catalogWords.rulePickAny}
                </ToggleGroupItem>
                <ToggleGroupItem value="custom" className="h-9 justify-center text-xs">
                  {catalogWords.ruleCustom}
                </ToggleGroupItem>
              </ToggleGroup>

              {/* Custom Min / Max inputs */}
              {rulePreset === 'custom' && (
                <div className="grid grid-cols-2 gap-3 rounded-xl border border-border/60 bg-muted/20 p-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="min-picks" className="text-xs">
                      {catalogWords.minPicksLabel}
                    </Label>
                    <Input
                      id="min-picks"
                      type="number"
                      min={0}
                      max={maxPicks}
                      value={minPicks}
                      onChange={(e) => setMinPicks(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="max-picks" className="text-xs">
                      {catalogWords.maxPicksLabel}
                    </Label>
                    <Input
                      id="max-picks"
                      type="number"
                      min={minPicks}
                      max={20}
                      value={maxPicks}
                      onChange={(e) =>
                        setMaxPicks(Math.max(minPicks, parseInt(e.target.value, 10) || 1))
                      }
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Options List */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">{catalogWords.optionsLabel}</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1 text-xs font-semibold"
                  onClick={handleAddOption}
                >
                  <PlusIcon className="size-3.5" />
                  {catalogWords.addOption}
                </Button>
              </div>

              <div className="space-y-2">
                {options.map((opt, index) => (
                  <div
                    key={opt.id ?? index}
                    className="flex items-center gap-2 rounded-xl border border-border/70 bg-card p-2.5 shadow-xs"
                  >
                    <GripVerticalIcon className="size-4 shrink-0 cursor-grab text-muted-foreground" />

                    {/* Option Name */}
                    <div className="min-w-0 flex-1">
                      <Input
                        value={opt.name}
                        placeholder={catalogWords.optionName}
                        className="h-8 text-xs"
                        onChange={(e) => updateOption(index, { name: e.target.value })}
                      />
                    </div>

                    {/* Delta Price */}
                    <div className="w-24 shrink-0">
                      <div className="relative">
                        <span className="absolute top-1/2 left-2.5 -translate-y-1/2 font-mono text-xs text-muted-foreground">
                          +₱
                        </span>
                        <Input
                          type="number"
                          min={0}
                          value={opt.priceDelta ? opt.priceDelta / 100 : ''}
                          placeholder="0"
                          className="h-8 pl-7 text-right font-mono text-xs"
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            updateOption(index, { priceDelta: Math.round(val * 100) });
                          }}
                        />
                      </div>
                    </div>

                    {/* Default Checkbox */}
                    <div className="flex shrink-0 items-center gap-1 px-1">
                      <Checkbox
                        id={`opt-default-${index}`}
                        checked={opt.isDefault}
                        onCheckedChange={(checked) =>
                          updateOption(index, { isDefault: Boolean(checked) })
                        }
                      />
                      <Label
                        htmlFor={`opt-default-${index}`}
                        className="cursor-pointer text-xs text-muted-foreground"
                      >
                        Default
                      </Label>
                    </div>

                    {/* Sold Out Switch */}
                    <div className="flex shrink-0 items-center gap-1 px-1">
                      <Switch
                        id={`opt-soldout-${index}`}
                        checked={opt.soldOut}
                        onCheckedChange={(checked) =>
                          updateOption(index, { soldOut: Boolean(checked) })
                        }
                      />
                      <Label
                        htmlFor={`opt-soldout-${index}`}
                        className="cursor-pointer text-xs text-muted-foreground"
                      >
                        Out
                      </Label>
                    </div>

                    {/* Delete Option */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemoveOption(index)}
                      disabled={options.length <= 1}
                    >
                      <Trash2Icon className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Customer Live Preview */}
            <div className="space-y-2 border-t border-border/50 pt-2">
              <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                {catalogWords.previewHeading}
              </span>
              <div className="space-y-2 rounded-xl border border-border/60 bg-muted/10 p-3.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-semibold text-foreground">
                    {name || 'Add-on group'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {groupRuleLabel(minPicks, maxPicks)}
                  </span>
                </div>
                <div className="space-y-1.5 pt-1">
                  {options.map((opt, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg border border-border/40 bg-card px-2 py-1 text-xs"
                    >
                      <span
                        className={
                          opt.soldOut ? 'text-muted-foreground line-through' : 'text-foreground'
                        }
                      >
                        {opt.name || `Option ${i + 1}`}
                      </span>
                      <span className="font-mono text-muted-foreground">
                        {opt.soldOut
                          ? 'Sold out'
                          : opt.priceDelta > 0
                            ? `+${formatPeso(opt.priceDelta)}`
                            : 'Free'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <SheetFooter className="flex flex-row items-center justify-between gap-2 border-t border-border pt-4">
            {group ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="text-xs font-semibold"
                disabled={removeOptionGroup.isPending}
                onClick={() => setDeleteConfirmOpen(true)}
              >
                {catalogWords.delete}
              </Button>
            ) : (
              <span />
            )}

            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                {catalogWords.cancel}
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={saveOptionGroup.isPending}
                className="bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
              >
                {saveOptionGroup.isPending ? catalogWords.saving : catalogWords.save}
              </Button>
            </div>
          </SheetFooter>
        </form>
      </SheetContent>

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this add-on group?</AlertDialogTitle>
            <AlertDialogDescription>
              {group && group.usedBy > 0
                ? `This group is used by ${group.usedBy} item(s). Removing it will detach it from all items.`
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
    </>
  );
}
