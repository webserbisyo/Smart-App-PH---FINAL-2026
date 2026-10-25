'use client';

import { useCallback, useRef } from 'react';
import { NOTE_MAX, words } from '@smartapp/core';
import { Field, FieldLabel } from '@smartapp/ui/components/field';
import { Textarea } from '@smartapp/ui/components/textarea';

export interface ItemSheetNoteProps {
  value: string;
  onChange: (value: string) => void;
}

/**
 * Special instructions note adhering to c-textarea-6 pattern:
 * - 120 character limit (NOTE_MAX)
 * - Dynamic character counter
 * - Auto-resizing textarea
 */
export function ItemSheetNote({ value, onChange }: ItemSheetNoteProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      if (newValue.length <= NOTE_MAX) {
        onChange(newValue);
      }

      const textarea = textareaRef.current;
      if (textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
      }
    },
    [onChange],
  );

  const remaining = NOTE_MAX - value.length;
  const isNearLimit = remaining <= 20;
  const isAtLimit = remaining === 0;

  return (
    <Field className="w-full">
      <div className="flex items-center justify-between pb-1">
        <FieldLabel htmlFor="item-note">
          {words.storefrontShell.menu.itemSheet.notesTitle}
        </FieldLabel>
        <span
          className={`text-xs tabular-nums ${
            isAtLimit
              ? 'font-semibold text-destructive'
              : isNearLimit
                ? 'text-warning'
                : 'text-muted-foreground'
          }`}
        >
          {value.length}/{NOTE_MAX}
        </span>
      </div>
      <Textarea
        ref={textareaRef}
        id="item-note"
        value={value}
        onChange={handleChange}
        placeholder={words.storefrontShell.menu.itemSheet.notesPlaceholder}
        rows={2}
        className="resize-none overflow-hidden text-sm"
      />
    </Field>
  );
}
