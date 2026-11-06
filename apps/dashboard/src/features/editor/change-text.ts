import { editorWords, type EditorChange } from '@smartapp/core';
import { colourName } from './parts.js';

const C = editorWords.changes;

/** One line in the Publish list (rule E2). */
export function changeText(change: EditorChange): string {
  switch (change.kind) {
    case 'logo':
      return C.logo[change.how];
    case 'tagline':
      return C.tagline;
    case 'about':
      return C.about;
    case 'brandColor':
      return C.brandColor(colourName(change.to), change.to);
    case 'surface':
      return C.surface(change.from, change.to);
    case 'pageColor':
      return C.pageColor(change.to);
    case 'banners':
      return C.banners(change.from, change.to);
    case 'bannerSeconds':
      return C.bannerSeconds(change.to);
    case 'announcement':
      return C.announcement[change.how];
    case 'section':
      return C.section(change.section, change.on);
  }
}
