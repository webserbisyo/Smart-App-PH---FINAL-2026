'use client';

import type { ReactNode } from 'react';
import { editorWords, type EditorSection } from '@smartapp/core';

/**
 * One part of the shop in the Editor's preview: a blue outline when the owner points at it or edits it,
 * and its name in a small tag. A tap is caught by the preview page, which tells the Editor (decision T72).
 */
export function PreviewPart({
  section,
  selected,
  hovered,
  children,
}: {
  section: EditorSection;
  selected: boolean;
  hovered: boolean;
  children: ReactNode;
}) {
  return (
    <div
      data-editor-section={section}
      data-selected={selected ? '' : undefined}
      data-hovered={hovered ? '' : undefined}
      className="group/part relative cursor-pointer rounded-2xl outline-2 outline-offset-4 outline-transparent transition-colors duration-base data-hovered:outline-info/50 data-selected:outline-info motion-reduce:transition-none hover-hover:hover:outline-info/50"
    >
      {children}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-3 left-3 z-10 hidden rounded-full bg-info px-2 py-0.5 text-xs font-semibold text-info-foreground shadow-sm group-data-hovered/part:block group-data-selected/part:block"
      >
        {editorWords.sections[section]}
      </span>
    </div>
  );
}
