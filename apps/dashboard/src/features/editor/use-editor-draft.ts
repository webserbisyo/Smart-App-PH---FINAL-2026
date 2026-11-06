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
import { useOnlineStatus } from '@/app/use-online-status';

// Rules E1 to E5 (decision T74): the draft saves itself, Undo keeps 50 steps, a drag or a run of typing in one
// field is one step, a save from an older version stops and asks.
const HISTORY_STEPS = 50;
const SAVE_DELAY_MS = 800;
const RETRY_MS = 5000;
const MERGE_MS = 1500;

export type SaveStatus = 'live' | 'saving' | 'saved' | 'offline' | 'failed' | 'conflict';

interface History {
  content: StorefrontContent;
  past: StorefrontContent[];
  future: StorefrontContent[];
  // The field the last change came from, so typing or a colour drag merges into one Undo step.
  key: string | null;
  at: number;
}

type HistoryAction =
  | {
      type: 'change';
      update: (content: StorefrontContent) => StorefrontContent;
      key: string | null;
      at: number;
    }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'reset'; content: StorefrontContent };

function historyReducer(state: History, action: HistoryAction): History {
  switch (action.type) {
    case 'change': {
      const next = action.update(state.content);
      if (sameContent(next, state.content)) return state;
      const merge =
        action.key !== null && action.key === state.key && action.at - state.at < MERGE_MS;
      return {
        content: next,
        past: merge ? state.past : [...state.past, state.content].slice(-HISTORY_STEPS),
        future: [],
        key: action.key,
        at: action.at,
      };
    }
    case 'undo': {
      const previous = state.past.at(-1);
      if (!previous) return state;
      return {
        content: previous,
        past: state.past.slice(0, -1),
        future: [state.content, ...state.future],
        key: null,
        at: 0,
      };
    }
    case 'redo': {
      const [next, ...rest] = state.future;
      if (!next) return state;
      return {
        content: next,
        past: [...state.past, state.content],
        future: rest,
        key: null,
        at: 0,
      };
    }
    case 'reset':
      return { content: action.content, past: [], future: [], key: null, at: 0 };
  }
}

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
  const [history, dispatch] = React.useReducer(historyReducer, {
    content: initial.draft,
    past: [],
    future: [],
    key: null,
    at: 0,
  });
  const [server, setServer] = React.useState(initial);
  const [phase, setPhase] = React.useState<Phase>('idle');
  const online = useOnlineStatus();
  // mutateAsync is stable across renders, so the save timer below is not reset by unrelated renders.
  const { mutateAsync: saveDraft } = useSaveStorefrontDraft();
  const { mutateAsync: publishDraft } = usePublishStorefront();
  const { mutateAsync: discardDraft } = useDiscardStorefrontDraft();

  // The latest values for the async steps below, which outlive a render.
  const contentRef = React.useRef(history.content);
  const serverRef = React.useRef(server);
  const inFlight = React.useRef<Promise<StorefrontDraftState> | null>(null);
  React.useEffect(() => {
    contentRef.current = history.content;
  }, [history.content]);

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

  const dirty = !sameContent(history.content, server.draft);

  // Save a moment after the last change; after a failed save, try again a little later.
  React.useEffect(() => {
    if (!dirty || !online || phase === 'conflict' || phase === 'saving') return;
    const timer = window.setTimeout(
      () => void autosave(),
      phase === 'failed' ? RETRY_MS : SAVE_DELAY_MS,
    );
    return () => window.clearTimeout(timer);
  }, [dirty, online, phase, history.content, autosave]);

  // Leaving with a change not saved yet asks first.
  React.useEffect(() => {
    if (!dirty) return;
    const onLeave = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', onLeave);
    return () => window.removeEventListener('beforeunload', onLeave);
  }, [dirty]);

  const changes = React.useMemo(
    () => editorChanges(server.published, history.content),
    [server.published, history.content],
  );

  let status: SaveStatus;
  if (phase === 'conflict') status = 'conflict';
  else if (!online) status = 'offline';
  else if (phase === 'failed') status = 'failed';
  else if (phase === 'saving' || dirty) status = 'saving';
  else status = changes.length === 0 ? 'live' : 'saved';

  const update = React.useCallback(
    (fn: (content: StorefrontContent) => StorefrontContent, key?: string) =>
      dispatch({ type: 'change', update: fn, key: key ?? null, at: Date.now() }),
    [],
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
    dispatch({ type: 'reset', content: fresh.draft });
    setPhase('idle');
  }, [discardDraft, refetch, takeServer]);

  const loadNewer = React.useCallback(async () => {
    const fresh = await refetch();
    takeServer(fresh);
    dispatch({ type: 'reset', content: fresh.draft });
    setPhase('idle');
  }, [refetch, takeServer]);

  // Keep mine: take the newer version number, and the next save writes this draft over it.
  const keepMine = React.useCallback(async () => {
    takeServer(await refetch());
    setPhase('idle');
  }, [refetch, takeServer]);

  return {
    content: history.content,
    published: server.published,
    changes,
    status,
    online,
    update,
    undo: React.useCallback(() => dispatch({ type: 'undo' }), []),
    redo: React.useCallback(() => dispatch({ type: 'redo' }), []),
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    publish,
    discard,
    loadNewer,
    keepMine,
  };
}
