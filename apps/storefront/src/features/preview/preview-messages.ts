// The preview page's side of the Editor messages (decision T72): only the dashboard's address may send a
// draft, and every message is checked against the shared Zod schema before it is used.
import {
  EDITOR_CHANNEL,
  EditorToPreviewSchema,
  type EditorToPreview,
  type PreviewToEditor,
} from '@smartapp/core';

/** The message, or null when it isn't from the Editor that framed this page. */
export function readEditorMessage(
  event: MessageEvent,
  dashboardOrigin: string,
  parent: Window | null,
): EditorToPreview | null {
  if (event.origin !== dashboardOrigin) return null;
  if (parent === null || event.source !== parent) return null;
  const parsed = EditorToPreviewSchema.safeParse(event.data);
  return parsed.success ? parsed.data : null;
}

/** Sends to the Editor only; a page opened on its own (no frame) sends nothing. */
export function tellEditor(message: PreviewToEditor, dashboardOrigin: string): void {
  if (window.parent === window) return;
  window.parent.postMessage(message, dashboardOrigin);
}

export const editorChannel = EDITOR_CHANNEL;
