import * as React from 'react';
import { CircleAlertIcon, ListIcon, PaletteIcon, WifiOffIcon } from 'lucide-react';
import {
  catalogWords,
  editorWords,
  sameContent,
  type EditorSection,
  type StorefrontDraftState,
} from '@smartapp/core';
import { useStorefront, useStorefrontDraft } from '@smartapp/data';
import { Button } from '@smartapp/ui/components/button';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { ResponsiveSheet } from '@smartapp/ui/compositions/responsive-sheet';
import { useFormFactor } from '@smartapp/ui/hooks/use-form-factor';
import { Notice } from '@/app/notice';
import { PageError } from '@/app/page-state';
import { useShop } from '@/app/shop';
import { usePageTitle } from '@/app/use-page-title';
import { storefrontUrl } from '@/app/use-nav-items';
import { DiscardDialog, PublishDialog } from '../editor-dialogs.js';
import { EditorTopBar } from '../editor-top-bar.js';
import { PartPanel } from '../part-panel.js';
import { PartsList } from '../parts-list.js';
import { PreviewFrame, type PreviewDevice } from '../preview-frame.js';
import { useEditorDraft } from '../use-editor-draft.js';

const W = editorWords;

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}

// Ctrl or ⌘ + Z and Shift + Z, outside text boxes (which keep their own Undo).
function useUndoKeys(undo: () => void, redo: () => void) {
  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || isTyping(event.target)) return;
      const key = event.key.toLowerCase();
      if (key === 'z' && !event.shiftKey) {
        event.preventDefault();
        undo();
      } else if ((key === 'z' && event.shiftKey) || key === 'y') {
        event.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);
}

function EditorSkeleton() {
  return (
    <div className="flex h-dvh flex-col bg-background" aria-busy>
      <div className="flex min-h-16 items-center gap-3 border-b border-border px-3">
        <Skeleton className="size-9 rounded-full" />
        <div className="flex flex-1 flex-col gap-1.5">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="h-10 w-24 rounded-lg" />
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="hidden w-72 flex-col gap-2 border-r border-border p-3 md:flex">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
        <div className="flex flex-1 justify-center bg-muted/40 p-4">
          <Skeleton className="h-full w-full max-w-sm rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

/** The Editor (decision T72): the shop's real Home in a frame, the parts list and the picked part's panel. */
export function EditorScreen() {
  const shop = useShop();
  usePageTitle(W.titleFor(shop.name));
  const query = useStorefrontDraft();
  const { refetch } = query;

  const reload = React.useCallback(async (): Promise<StorefrontDraftState> => {
    const result = await refetch();
    if (result.data && !result.isError) return result.data;
    throw result.error ?? new Error('draft_missing');
  }, [refetch]);

  if (query.isPending) return <EditorSkeleton />;
  if (query.isError) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background p-4">
        <PageError
          title={W.load.error}
          message={W.load.error}
          retryLabel={W.load.tryAgain}
          onRetry={() => void refetch()}
        />
      </div>
    );
  }
  return <EditorWorkspace initial={query.data} reload={reload} />;
}

function EditorWorkspace({
  initial,
  reload,
}: {
  initial: StorefrontDraftState;
  reload: () => Promise<StorefrontDraftState>;
}) {
  const shop = useShop();
  const formFactor = useFormFactor();
  const editor = useEditorDraft(initial, reload);
  // The stamp card, categories, best sellers and members count for the list, read like customers see them.
  const shopData = useStorefront(shop.slug).data ?? undefined;
  const catalogName = catalogWords.title(shop.kind);
  const shopLink = storefrontUrl(shop.slug);

  const [selected, setSelected] = React.useState<EditorSection | null>(null);
  const [hovered, setHovered] = React.useState<EditorSection | null>(null);
  const [device, setDevice] = React.useState<PreviewDevice>('phone');
  const [banner, setBanner] = React.useState<{ index: number; at: number } | null>(null);
  const [publishOpen, setPublishOpen] = React.useState(false);
  const [discardOpen, setDiscardOpen] = React.useState(false);
  // Phones: the list and the part open in a bottom sheet over the full-screen preview.
  const [sheet, setSheet] = React.useState<'list' | 'part' | null>(null);

  useUndoKeys(editor.undo, editor.redo);

  const phone = formFactor === 'phone';
  const select = React.useCallback(
    (section: EditorSection) => {
      setSelected(section);
      if (phone) setSheet('part');
    },
    [phone],
  );
  const showBanner = React.useCallback((index: number) => setBanner({ index, at: Date.now() }), []);

  const panelProps = {
    content: editor.content,
    update: editor.update,
    shop: shopData,
    catalogName,
    showBanner,
    onSelect: select,
  };
  const count = editor.changes.length;
  const canPublish = count > 0 && editor.online && editor.status !== 'conflict';

  const preview = (
    <PreviewFrame
      slug={shop.slug}
      device={phone ? 'phone' : device}
      content={editor.content}
      selected={selected}
      hovered={hovered}
      banner={banner}
      onSelect={select}
      bare={phone}
    />
  );

  const list = (
    <PartsList
      content={editor.content}
      shop={shopData}
      catalogName={catalogName}
      selected={selected}
      onSelect={select}
      onHover={setHovered}
      update={editor.update}
    />
  );

  return (
    <div className="flex h-dvh flex-col bg-background">
      <EditorTopBar
        title={phone ? W.title : W.titleFor(shop.name)}
        status={editor.status}
        count={count}
        canUndo={editor.canUndo}
        canRedo={editor.canRedo}
        onUndo={editor.undo}
        onRedo={editor.redo}
        device={device}
        onDevice={setDevice}
        compact={phone}
        shopLink={shopLink}
        canDiscard={!sameContent(editor.content, editor.published)}
        onDiscard={() => setDiscardOpen(true)}
        canPublish={canPublish}
        onPublish={() => setPublishOpen(true)}
      />

      {editor.status === 'conflict' || !editor.online ? (
        <div className="shrink-0 border-b border-border p-2 md:px-3">
          {editor.status === 'conflict' ? (
            <Notice
              tone="warning"
              icon={<CircleAlertIcon className="size-4" />}
              action={
                <div className="flex w-full gap-2 sm:w-auto">
                  <Button
                    variant="outline"
                    className="h-11 flex-1 md:h-8"
                    onClick={() => void editor.keepMine()}
                  >
                    {W.conflict.keepMine}
                  </Button>
                  <Button className="h-11 flex-1 md:h-8" onClick={() => void editor.loadNewer()}>
                    {W.conflict.loadNewer}
                  </Button>
                </div>
              }
            >
              <p className="text-sm">{W.conflict.text}</p>
            </Notice>
          ) : (
            <Notice tone="warning" icon={<WifiOffIcon className="size-4" />}>
              <p className="text-sm">{W.offline}</p>
            </Notice>
          )}
        </div>
      ) : null}

      {phone ? (
        <>
          <main className="min-h-0 flex-1">{preview}</main>
          {/* The picked part docks under the preview, so the page stays in sight while the owner types. */}
          {sheet === 'part' && selected ? (
            <section className="flex h-1/2 shrink-0 flex-col overflow-y-auto overscroll-contain rounded-t-2xl border-t border-border bg-background pb-safe shadow-lg">
              <PartPanel
                {...panelProps}
                section={selected}
                onBack={() => setSheet('list')}
                onClose={() => setSheet(null)}
              />
            </section>
          ) : (
            <nav className="grid shrink-0 grid-cols-3 gap-2 border-t border-border bg-background p-2 pb-safe">
              <Button variant="outline" className="h-12" onClick={() => setSheet('list')}>
                <ListIcon />
                {W.phone.sections}
              </Button>
              <Button variant="outline" className="h-12" onClick={() => select('brand')}>
                <PaletteIcon />
                {W.phone.colours}
              </Button>
              <Button
                className="h-12 font-semibold"
                disabled={!canPublish}
                aria-label={count > 0 ? W.bar.publishCount(count) : W.bar.publish}
                onClick={() => setPublishOpen(true)}
              >
                {W.bar.publish}
                {count > 0 ? (
                  <span
                    className="rounded-full bg-primary-foreground/20 px-1.5 text-xs tabular-nums"
                    aria-hidden
                  >
                    {count}
                  </span>
                ) : null}
              </Button>
            </nav>
          )}
          <ResponsiveSheet
            open={sheet === 'list'}
            onOpenChange={(open) => {
              if (!open) setSheet(null);
            }}
            title={W.list.title}
          >
            {list}
          </ResponsiveSheet>
        </>
      ) : (
        <div className="flex min-h-0 flex-1">
          <aside className="flex w-72 shrink-0 flex-col overflow-y-auto border-r border-border xl:w-80">
            {formFactor === 'tablet' && selected ? (
              <PartPanel {...panelProps} section={selected} onBack={() => setSelected(null)} />
            ) : (
              list
            )}
          </aside>
          <main className="flex min-w-0 flex-1 bg-muted/40 p-4 lg:p-6">{preview}</main>
          {formFactor === 'desktop' ? (
            <aside className="flex w-96 shrink-0 flex-col overflow-y-auto border-l border-border">
              <PartPanel {...panelProps} section={selected} />
            </aside>
          ) : null}
        </div>
      )}

      <PublishDialog
        open={publishOpen}
        onOpenChange={setPublishOpen}
        changes={editor.changes}
        onPublish={editor.publish}
      />
      <DiscardDialog open={discardOpen} onOpenChange={setDiscardOpen} onDiscard={editor.discard} />
    </div>
  );
}
