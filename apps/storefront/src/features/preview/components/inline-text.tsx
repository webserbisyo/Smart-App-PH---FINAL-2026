'use client';

import { useEffect, useRef, useState } from 'react';

// Pasted or typed line breaks become spaces: a banner's words are one line each.
function oneLine(text: string): string {
  return text.replace(/\s*\n\s*/g, ' ');
}

function caretToEnd(element: HTMLElement) {
  const selection = window.getSelection();
  if (!selection) return;
  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

/**
 * A banner's words, typed straight onto the Editor's preview (T78, the approved hand-written bridge). Plain
 * text only, one line, cut at the banner's limit; each change goes to the Editor, which saves the draft and
 * sends it back. While the box has focus the owner's typing wins over the draft coming back.
 */
export function InlineText({
  value,
  placeholder,
  label,
  max,
  onText,
}: {
  value: string;
  placeholder: string;
  label: string;
  max: number;
  onText: (text: string) => void;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [empty, setEmpty] = useState(value === '');

  useEffect(() => {
    const element = ref.current;
    if (!element || document.activeElement === element) return;
    if (element.textContent !== value) element.textContent = value;
    setEmpty(value === '');
  }, [value]);

  return (
    <span className="relative block">
      <span
        ref={ref}
        contentEditable="plaintext-only"
        suppressContentEditableWarning
        role="textbox"
        aria-label={label}
        aria-placeholder={placeholder}
        tabIndex={0}
        className="block min-h-lh min-w-32 cursor-text rounded-sm bg-on-scrim/10 px-1 outline-1 -outline-offset-1 outline-on-scrim/70 outline-dashed focus:bg-on-scrim/15 focus:outline-solid"
        onInput={(event) => {
          const element = event.currentTarget;
          const raw = oneLine(element.textContent ?? '');
          const text = raw.slice(0, max);
          if (text !== element.textContent) {
            element.textContent = text;
            caretToEnd(element);
          }
          setEmpty(text === '');
          onText(text);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === 'Escape') {
            event.preventDefault();
            event.currentTarget.blur();
          }
        }}
      />
      {empty ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 px-1 text-on-scrim/70"
        >
          {placeholder}
        </span>
      ) : null}
    </span>
  );
}
