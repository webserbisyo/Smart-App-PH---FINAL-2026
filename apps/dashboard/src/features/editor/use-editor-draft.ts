import * as React from 'react';
import {
  editorChanges,
  sameContent,
  type EditorChange,
  type StorefrontContent,
  type StorefrontDraftState,
} from '@smartapp/core';
import {
  errorCodeOf,
  useDiscardStorefrontDraft,
  usePublishStorefront,
  useSaveStorefrontDraft,
} from '@smartapp/data';
import { useStore } from 'zustand';
import { useOnlineStatus } from '@/app/use-online-status';
import { createEditorStore } from './editor-store';

// Rules E1 to E5 (decision T74): the draft saves itself, Undo keeps 50 steps (editor-store.ts, on Zustand and
// Zundo), a drag or a run of typing in one field is one step, a save from an older version stops and asks.
const SAVE_DELAY_MS = 800;
const RETRY_MS = 5000;

export type SaveStatus = 'live' | 'saving' | 'saved' | 'offline' | 'failed' | 'conflict';

type Phase = 'idle' | 'saving' | 'failed' | 'conflict';

export interface EditorDraft {
  content: StorefrontContent;
  published: StorefrontContent;
  changes: EditorChange[];
  status: SaveStatus;
  online: boolean;
  /** Changes the draft; changes with the same key close together are one Undo step. */
  update: (update: (content: StorefrontContent) => StorefrontContent, key?: string) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  /** Saves what is left, then makes the draft live. Throws with the error code on failure. */
  publish: () => Promise<void>;
  discard: () => Promise<void>;
  loadNewer: () => Promise<void>;
  keepMine: () => Promise<void>;
}

export function useEditorDraft(
  initial: StorefrontDraftState,
  refetch: () => Promise<StorefrontDraftState>,
): EditorDraft {
  const [editor] = React.useState(() => createEditorStore(initial.draft));
  const { store } = editor;
  const content = useStore(store, (state) => state.content);
  const canUndo = useStore(store.temporal, (state) => state.pastStates.length > 0);
  const canRedo = useStore(store.temporal, (state) => state.futureStates.length > 0);
  const [server, setServer] = React.useState(initial);
  const [phase, setPhase] = React.useState<Phase>('idle');
  const online = useOnlineStatus();
  // mutateAsync is stable across renders, so the save timer below is not reset by unrelated renders.
  const { mutateAsync: saveDraft } = useSaveStorefrontDraft();
  const { mutateAsync: publishDraft } = usePublishStorefront();
  const { mutateAsync: discardDraft } = useDiscardStorefrontDraft();

  // The latest values for the async steps below, which outlive a render.
  const contentRef = React.useRef(content);
  const serverRef = React.useRef(server);
  const inFlight = React.useRef<Promise<StorefrontDraftState> | null>(null);
  React.useEffect(() => {
    contentRef.current = content;
  }, [content]);

  const takeServer = React.useCallback((next: StorefrontDraftState) => {
    serverRef.current = next;
    setServer(next);
  }, []);

  const persist = React.useCallback(async (): Promise<StorefrontDraftState> => {
    if (inFlight.current) await inFlight.current.catch(() => null);
    const content = contentRef.current;
    if (sameContent(content, serverRef.current.draft)) return serverRef.current;
    setPhase('saving');
    const run = saveDraft({ content, baseVersion: serverRef.current.baseVersion });
    inFlight.current = run;
    try {
      const next = await run;
      takeServer(next);
      return next;
    } finally {
      inFlight.current = null;
    }
  }, [saveDraft, takeServer]);

  const autosave = React.useCallback(async () => {
    try {
      await persist();
      setPhase('idle');
    } catch (err: unknown) {
      setPhase(errorCodeOf(err) === 'draft_conflict' ? 'conflict' : 'failed');
    }
  }, [persist]);

  const dirty = !sameContent(content, server.draft);

  // Save a moment after the last change; after a failed save, try again a little later.
  React.useEffect(() => {
    if (!dirty || !online || phase === 'conflict' || phase === 'saving') return;
    const timer = window.setTimeout(
      () => void autosave(),
      phase === 'failed' ? RETRY_MS : SAVE_DELAY_MS,
    );
    return () => window.clearTimeout(timer);
  }, [dirty, online, phase, content, autosave]);

  // Leaving with a change not saved yet asks first.
  React.useEffect(() => {
    if (!dirty) return;
    const onLeave = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', onLeave);
    return () => window.removeEventListener('beforeunload', onLeave);
  }, [dirty]);

  const changes = React.useMemo(
    () => editorChanges(server.published, content),
    [server.published, content],
  );

  let status: SaveStatus;
  if (phase === 'conflict') status = 'conflict';
  else if (!online) status = 'offline';
  else if (phase === 'failed') status = 'failed';
  else if (phase === 'saving' || dirty) status = 'saving';
  else status = changes.length === 0 ? 'live' : 'saved';

  const update = React.useCallback(
    (fn: (content: StorefrontContent) => StorefrontContent, key?: string) =>
      editor.change(fn, key ?? null, Date.now()),
    [editor],
  );

  const publish = React.useCallback(async () => {
    const saved = await persist();
    await publishDraft({ baseVersion: saved.baseVersion });
    takeServer(await refetch());
    setPhase('idle');
  }, [persist, publishDraft, refetch, takeServer]);

  const discard = React.useCallback(async () => {
    if (inFlight.current) await inFlight.current.catch(() => null);
    await discardDraft();
    const fresh = await refetch();
    takeServer(fresh);
    editor.reset(fresh.draft);
    setPhase('idle');
  }, [discardDraft, editor, refetch, takeServer]);

  const loadNewer = React.useCallback(async () => {
    const fresh = await refetch();
    takeServer(fresh);
    editor.reset(fresh.draft);
    setPhase('idle');
  }, [editor, refetch, takeServer]);

  // Keep mine: take the newer version number, and the next save writes this draft over it.
  const keepMine = React.useCallback(async () => {
    takeServer(await refetch());
    setPhase('idle');
  }, [refetch, takeServer]);

  return {
    content,
    published: server.published,
    changes,
    status,
    online,
    update,
    undo: React.useCallback(() => editor.undo(), [editor]),
    redo: React.useCallback(() => editor.redo(), [editor]),
    canUndo,
    canRedo,
    publish,
    discard,
    loadNewer,
    keepMine,
  };
}
