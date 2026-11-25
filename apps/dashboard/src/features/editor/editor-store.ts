import { sameContent, type StorefrontContent } from '@smartapp/core';
import { temporal } from 'zundo';
import { createStore } from 'zustand';

// Rules E2 and E3 (decision T74), on Zustand and Zundo (T103, plan R16): Undo keeps 50 steps, and a run of
// typing or a colour drag in one field is one step. Only the draft content goes into the history.
export const HISTORY_STEPS = 50;
const MERGE_MS = 1500;

interface DraftContent {
  content: StorefrontContent;
}

export function createEditorStore(initial: StorefrontContent) {
  const store = createStore<DraftContent>()(
    temporal(() => ({ content: initial }), {
      limit: HISTORY_STEPS,
      equality: (past, current) => sameContent(past.content, current.content),
    }),
  );
  // The field and time of the last change, outside the history so Undo never brings them back.
  let lastKey: string | null = null;
  let lastAt = 0;

  return {
    store,
    /** Changes the draft; a change with the same key soon after the last one joins its Undo step. */
    change(
      update: (content: StorefrontContent) => StorefrontContent,
      key: string | null,
      at: number,
    ) {
      const current = store.getState().content;
      const next = update(current);
      if (sameContent(next, current)) return;
      const merge = key !== null && key === lastKey && at - lastAt < MERGE_MS;
      lastKey = key;
      lastAt = at;
      const history = store.temporal.getState();
      // A merged change keeps the step its run started with; that first change already cleared Redo.
      if (merge) history.pause();
      store.setState({ content: next });
      if (merge) history.resume();
    },
    undo() {
      lastKey = null;
      store.temporal.getState().undo();
    },
    redo() {
      lastKey = null;
      store.temporal.getState().redo();
    },
    /** A fresh draft from the server (Discard, Load newer): the history starts again. */
    reset(content: StorefrontContent) {
      lastKey = null;
      const history = store.temporal.getState();
      history.pause();
      store.setState({ content });
      history.resume();
      history.clear();
    },
  };
}

export type EditorStore = ReturnType<typeof createEditorStore>;
