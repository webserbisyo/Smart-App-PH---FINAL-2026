import * as React from 'react';
import { CircleAlertIcon, ImageUpIcon, SparklesIcon } from 'lucide-react';
import {
  actionWords,
  catalogWords,
  errorWords,
  guessIconKey,
  ICON_KEYS,
  IconKeyEnum,
  iconPath,
  searchIcons,
  vocab,
  type Category,
  type CategoryIcon as CategoryIconType,
  type CategoryIconStyle,
  type IconKey,
} from '@smartapp/core';
import { useSaveCategory, useOwnerCategories, cropImage, errorCodeOf } from '@smartapp/data';
import { Button } from '@smartapp/ui/components/button';
import { CategoryIcon } from '@smartapp/ui/compositions/category-icon';
import { Input } from '@smartapp/ui/components/input';
import { Label } from '@smartapp/ui/components/label';
import { FieldError } from '@smartapp/ui/components/field';
import { ToggleGroup, ToggleGroupItem } from '@smartapp/ui/components/toggle-group';
import { FileUpload, FileUploadDropzone } from '@smartapp/ui/components/file-upload';
import {
  Cropper,
  CropperArea,
  CropperImage,
  type CropperAreaData,
} from '@smartapp/ui/components/cropper';
import { EmojiPicker, EmojiPickerPanel } from '@smartapp/ui/components/reui/emoji-picker';
import {
  ResponsiveDialog,
  ResponsiveDialogFooter,
} from '@smartapp/ui/compositions/responsive-dialog';
import { notify } from '@smartapp/ui/compositions/notify';
import { useShop } from '@/app/shop';
import { AsyncButton, useAsyncAction } from '@/app/async-button';
import { Notice } from '@/app/notice';
import { SearchField } from '@/app/search-field';
import { env } from '@/app/env';
import { DeleteCategoryDialog } from './delete-category-dialog.js';
import { shopIconStyle } from './icon-style.js';
import { cn } from 'cn';

export interface CategorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Category | null | undefined;
  // Called with the saved category, e.g. so the item editor can pick a category it just made.
  onSaved?: ((category: Category) => void) | undefined;
}

type IconTab = 'icons' | 'emoji' | 'upload';
const ICON_TABS: readonly IconTab[] = ['icons', 'emoji', 'upload'];
const SUGGESTED_COUNT = 12;
const SEARCH_LIMIT = 36;

// Category form: one dialog on desktop, one bottom drawer on phone, with the icon picker inside it
// (decision T42: no second dialog on top of the first).
export function CategorySheet({ open, onOpenChange, category, onSaved }: CategorySheetProps) {
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={category ? catalogWords.editCategory : catalogWords.addCategory}
      description={catalogWords.categorySheetDesc}
      scroll
    >
      {open ? (
        <CategoryForm
          key={category ? category.id : 'new'}
          category={category}
          onSaved={onSaved}
          onClose={() => onOpenChange(false)}
        />
      ) : null}
    </ResponsiveDialog>
  );
}

function initialIcon(
  category: Category | null | undefined,
  style: CategoryIconStyle,
): CategoryIconType {
  if (!category?.icon) return { kind: 'fluent', key: 'other', style };
  if (typeof category.icon === 'string') {
    const parsed = IconKeyEnum.safeParse(category.icon);
    return { kind: 'fluent', key: parsed.success ? parsed.data : 'other', style };
  }
  return category.icon;
}

function CategoryForm({
  category,
  onSaved,
  onClose,
}: {
  category?: Category | null | undefined;
  onSaved?: ((category: Category) => void) | undefined;
  onClose: () => void;
}) {
  const { kind } = useShop();
  const { data: categories } = useOwnerCategories();
  const style = shopIconStyle(categories);
  const [name, setName] = React.useState(category?.name ?? '');
  const [icon, setIcon] = React.useState<CategoryIconType>(() => initialIcon(category, style));
  // A new category picks its icon from the name until the owner picks one by hand.
  const [iconTouched, setIconTouched] = React.useState(Boolean(category));
  const [autoPicked, setAutoPicked] = React.useState(false);
  const [tab, setTab] = React.useState<IconTab>(
    icon.kind === 'emoji' ? 'emoji' : icon.kind === 'image' ? 'upload' : 'icons',
  );
  const [nameError, setNameError] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const saveCategory = useSaveCategory();
  const saveAction = useAsyncAction();

  const handleNameChange = (value: string) => {
    setName(value);
    if (nameError && value.trim()) setNameError(null);
    if (iconTouched) return;
    const key = guessIconKey(value);
    setIcon({ kind: 'fluent', key: key ?? 'other', style });
    setAutoPicked(key !== null);
  };

  const pickIcon = (next: CategoryIconType) => {
    setIcon(next);
    setIconTouched(true);
    setAutoPicked(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError(catalogWords.categoryNameRequired);
      document.getElementById('category-name')?.focus();
      return;
    }
    try {
      const saved = await saveAction.run(() =>
        saveCategory.mutateAsync(
          category ? { id: category.id, name: trimmed, icon } : { name: trimmed, icon },
        ),
      );
      notify({ title: catalogWords.savedToast(saved.name), tone: 'success' });
      onSaved?.(saved);
      onClose();
    } catch (err: unknown) {
      setFormError(errorWords(errorCodeOf(err)));
    }
  };

  const tabLabel: Record<IconTab, string> = {
    icons: catalogWords.iconTabIcons,
    emoji: catalogWords.iconTabEmoji,
    upload: catalogWords.iconTabUpload,
  };

  return (
    <form onSubmit={handleSave} className="space-y-5" noValidate>
      {formError ? (
        <Notice tone="error" icon={<CircleAlertIcon />}>
          {formError}
        </Notice>
      ) : null}

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="category-name">{catalogWords.categoryNameLabel}</Label>
          <span className="text-xs text-muted-foreground tabular">
            {catalogWords.charCount(name.length, 40)}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border/80 bg-card shadow-xs md:size-9"
          >
            <CategoryIcon
              icon={icon}
              size={28}
              assetOrigin={env.VITE_STOREFRONT_URL}
              className="size-7 object-contain md:size-6"
              textClassName="text-2xl leading-none md:text-xl"
            />
          </span>
          <Input
            id="category-name"
            value={name}
            maxLength={40}
            autoComplete="off"
            aria-invalid={nameError ? true : undefined}
            aria-describedby={nameError ? 'category-name-error' : undefined}
            className="h-11 min-w-0 flex-1 md:h-9"
            placeholder={catalogWords.categoryPlaceholderFor(kind)}
            onChange={(e) => handleNameChange(e.target.value)}
          />
        </div>
        {nameError ? (
          <FieldError id="category-name-error">{nameError}</FieldError>
        ) : autoPicked ? (
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <SparklesIcon className="size-3.5 text-primary" />
            {catalogWords.iconPickedFromName}
          </p>
        ) : null}
      </div>

      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-3">
          <Label>{catalogWords.categoryIconLabel}</Label>
          <ToggleGroup
            value={[tab]}
            onValueChange={(value) => {
              const next = ICON_TABS.find((t) => t === value[0]);
              if (next) setTab(next);
            }}
            className="rounded-xl border border-border/80 bg-muted/50 p-0.5"
          >
            {ICON_TABS.map((t) => (
              <ToggleGroupItem
                key={t}
                value={t}
                className="h-10 rounded-lg px-3 text-sm font-medium text-muted-foreground aria-pressed:bg-card aria-pressed:text-foreground aria-pressed:shadow-xs md:h-8"
              >
                {tabLabel[t]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        {tab === 'icons' ? (
          <IconGrid
            selected={icon.kind === 'fluent' ? icon.key : null}
            iconStyle={style}
            suggestions={vocab(kind).iconSuggestions}
            onPick={(key) => pickIcon({ kind: 'fluent', key, style })}
          />
        ) : tab === 'emoji' ? (
          <div className="overflow-hidden rounded-xl border border-border/80">
            <EmojiPicker
              dataUrl="/emojibase"
              categories={[...vocab(kind).emojiCategories]}
              onEmojiSelect={(selection) => pickIcon({ kind: 'emoji', char: selection.value })}
            >
              <EmojiPickerPanel className="w-full" />
            </EmojiPicker>
          </div>
        ) : (
          <IconUpload current={icon.kind === 'image' ? icon.ref : null} onPick={pickIcon} />
        )}
      </div>

      <ResponsiveDialogFooter>
        <div className="flex items-center justify-between gap-2">
          {category ? (
            <Button
              type="button"
              variant="ghost"
              className="h-11 text-destructive hover:bg-destructive/10 hover:text-destructive md:h-9"
              onClick={() => setDeleteOpen(true)}
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

      <DeleteCategoryDialog
        category={deleteOpen && category ? category : null}
        onOpenChange={setDeleteOpen}
        onDeleted={onClose}
      />
    </form>
  );
}

function IconGrid({
  selected,
  iconStyle: style,
  suggestions,
  onPick,
}: {
  selected: IconKey | null;
  iconStyle: CategoryIconStyle;
  suggestions: readonly IconKey[];
  onPick: (key: IconKey) => void;
}) {
  const [query, setQuery] = React.useState('');
  const [showAll, setShowAll] = React.useState(false);
  const trimmed = query.trim();

  const keys = React.useMemo((): readonly IconKey[] => {
    if (trimmed) return searchIcons(trimmed).slice(0, SEARCH_LIMIT);
    if (showAll) return ICON_KEYS;
    // The picked icon stays in view even when it is not one of the suggestions.
    const first =
      selected && selected !== 'other' && !suggestions.includes(selected) ? [selected] : [];
    return [...first, ...suggestions].slice(0, SUGGESTED_COUNT);
  }, [trimmed, showAll, selected, suggestions]);

  const origin = env.VITE_STOREFRONT_URL.replace(/\/+$/, '');

  return (
    <div className="space-y-2.5">
      <SearchField
        value={query}
        onChange={setQuery}
        ariaLabel={catalogWords.iconSearchPlaceholder}
        placeholder={catalogWords.iconSearchPlaceholder}
        clearLabel={catalogWords.clearSearch}
      />

      {keys.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
          {catalogWords.iconNoMatch}
        </p>
      ) : (
        // The installed Toggle Group: one pick, arrow keys move between icons (decision T43).
        <ToggleGroup
          value={selected ? [selected] : []}
          onValueChange={(value) => {
            const next = IconKeyEnum.safeParse(value[0]);
            if (next.success) onPick(next.data);
          }}
          aria-label={catalogWords.categoryIconLabel}
          spacing={0}
          className={cn(
            'grid w-full grid-cols-6 gap-1.5 sm:grid-cols-8',
            (showAll || trimmed) &&
              'max-h-64 overflow-y-auto rounded-xl border border-border/60 bg-muted/20 p-1.5',
          )}
        >
          {keys.map((key) => (
            <ToggleGroupItem
              key={key}
              value={key}
              aria-label={catalogWords.selectIconAria(key.replaceAll('_', ' '))}
              title={key.replaceAll('_', ' ')}
              className="aspect-square h-auto min-h-11 rounded-xl border border-border/50 bg-card p-1.5 hover:bg-muted/60 aria-pressed:border-primary aria-pressed:bg-primary/10 aria-pressed:ring-2 aria-pressed:ring-primary/30"
            >
              <img
                src={`${origin}${iconPath({ kind: 'fluent', key, style }, style)}`}
                alt=""
                className="size-7 object-contain"
                loading="lazy"
              />
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      )}

      {!trimmed ? (
        <Button
          type="button"
          variant="ghost"
          className="h-11 w-full text-primary md:h-9"
          onClick={() => setShowAll((v) => !v)}
        >
          {showAll ? catalogWords.iconShowFewer : catalogWords.iconShowAll}
        </Button>
      ) : null}
    </div>
  );
}

function IconUpload({
  current,
  onPick,
}: {
  current: string | null;
  onPick: (icon: CategoryIconType) => void;
}) {
  const [source, setSource] = React.useState<string | null>(null);
  const [crop, setCrop] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [area, setArea] = React.useState<CropperAreaData | null>(null);
  const applyAction = useAsyncAction();

  React.useEffect(() => {
    return () => {
      if (source) URL.revokeObjectURL(source);
    };
  }, [source]);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    setArea(null);
    setCrop({ x: 0, y: 0 });
    setSource(URL.createObjectURL(file));
  };

  const handleUse = async () => {
    if (!source || !area) return;
    try {
      const ref = await applyAction.run(() => cropImage(source, area, 128));
      onPick({ kind: 'image', ref });
      setSource(null);
    } catch {
      notify({ title: catalogWords.photoProcessFailed, tone: 'error' });
    }
  };

  return (
    <FileUpload
      accept="image/png,image/jpeg,image/webp"
      label={catalogWords.iconUploadChoose}
      onAccept={(files) => handleFile(files[0])}
      onFileReject={() => notify({ title: catalogWords.photoUnsupported, tone: 'error' })}
      className="gap-3"
    >
      {source ? (
        <>
          <div className="relative h-56 overflow-hidden rounded-xl border border-border bg-muted">
            <Cropper
              aspectRatio={1}
              crop={crop}
              onCropChange={setCrop}
              onCropAreaChange={(_, pixels) => setArea(pixels)}
              className="size-full"
            >
              <CropperImage src={source} alt="" />
              <CropperArea />
            </Cropper>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-11 md:h-9"
              onClick={() => setSource(null)}
            >
              {catalogWords.cancel}
            </Button>
            <AsyncButton
              type="button"
              className="h-11 font-semibold md:h-9"
              status={applyAction.status}
              busyLabel={actionWords.applying}
              doneLabel={actionWords.applied}
              disabled={!area}
              onClick={() => void handleUse()}
            >
              {catalogWords.iconUploadUse}
            </AsyncButton>
          </div>
        </>
      ) : (
        <FileUploadDropzone className="cursor-pointer flex-row justify-start gap-3 rounded-xl border-border/80 bg-muted/20 p-4 text-left hover:border-primary/50 data-dragging:border-primary data-dragging:bg-primary/5">
          {current ? (
            <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-card">
              <CategoryIcon
                icon={{ kind: 'image', ref: current }}
                size={40}
                className="size-10 object-cover"
              />
            </span>
          ) : (
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <ImageUpIcon className="size-5" />
            </span>
          )}
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-foreground">
              {catalogWords.iconUploadChoose}
            </span>
            <span className="block text-sm text-muted-foreground">
              {catalogWords.iconUploadHelp}
            </span>
          </span>
        </FileUploadDropzone>
      )}
    </FileUpload>
  );
}
