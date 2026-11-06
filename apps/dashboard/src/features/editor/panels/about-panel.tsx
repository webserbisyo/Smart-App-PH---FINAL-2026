import { editorWords, type StorefrontContent } from '@smartapp/core';
import { Field, FieldDescription } from '@smartapp/ui/components/field';
import { Textarea } from '@smartapp/ui/components/textarea';
import type { PanelProps } from './types.js';
import { CountedLabel, orNull } from './field-count.js';

const W = editorWords.about;
const MAX = 600;

export function AboutPanel({ content, update }: PanelProps) {
  const text = content.about ?? '';
  return (
    <Field>
      <CountedLabel htmlFor="editor-about" used={text.length} max={MAX}>
        {W.label}
      </CountedLabel>
      <Textarea
        id="editor-about"
        value={text}
        maxLength={MAX}
        rows={8}
        placeholder={W.placeholder}
        onChange={(e) =>
          update((c): StorefrontContent => ({ ...c, about: orNull(e.target.value) }), 'about')
        }
      />
      <FieldDescription>{W.help}</FieldDescription>
    </Field>
  );
}
