import { newShopContent, StorefrontContentSchema, type StorefrontContent } from '@smartapp/core';
import { describe, expect, it } from 'vitest';
import { createEditorStore, HISTORY_STEPS } from '../src/features/editor/editor-store';

// Rules E2 and E3 (T74) on Zustand and Zundo (R16): one Undo step per run of typing, 50 steps at most.
const start = StorefrontContentSchema.parse(newShopContent(null));
const tagline =
  (text: string) =>
  (content: StorefrontContent): StorefrontContent => ({ ...content, tagline: text });

describe('Editor store', () => {
  it('joins a run of typing in one field into one Undo step', () => {
    const editor = createEditorStore(start);
    editor.change(tagline('B'), 'tagline', 1000);
    editor.change(tagline('Bu'), 'tagline', 1500);
    editor.change(tagline('Buns'), 'tagline', 2000);
    expect(editor.store.getState().content.tagline).toBe('Buns');
    editor.undo();
    expect(editor.store.getState().content.tagline).toBe(start.tagline);
    editor.redo();
    expect(editor.store.getState().content.tagline).toBe('Buns');
  });

  it('starts a new step for another field, after a pause, or after Undo', () => {
    const editor = createEditorStore(start);
    editor.change(tagline('A'), 'tagline', 1000);
    editor.change(tagline('AB'), 'tagline', 5000);
    editor.undo();
    expect(editor.store.getState().content.tagline).toBe('A');
    editor.change(tagline('AC'), 'tagline', 5100);
    editor.undo();
    expect(editor.store.getState().content.tagline).toBe('A');
    expect(editor.store.temporal.getState().futureStates).toHaveLength(1);
  });

  it('keeps no step for a change that changes nothing, and at most 50 steps', () => {
    const editor = createEditorStore(start);
    editor.change((content) => content, 'tagline', 1000);
    expect(editor.store.temporal.getState().pastStates).toHaveLength(0);
    for (let i = 0; i < HISTORY_STEPS + 10; i++) editor.change(tagline(`v${i}`), null, i);
    expect(editor.store.temporal.getState().pastStates).toHaveLength(HISTORY_STEPS);
  });

  it('starts the history again on a fresh draft from the server', () => {
    const editor = createEditorStore(start);
    editor.change(tagline('Mine'), null, 1000);
    editor.reset({ ...start, tagline: 'Theirs' });
    expect(editor.store.getState().content.tagline).toBe('Theirs');
    expect(editor.store.temporal.getState().pastStates).toHaveLength(0);
    expect(editor.store.temporal.getState().futureStates).toHaveLength(0);
  });
});
