/**
 * Copies text and says whether it worked. Uses the Clipboard API, and where that is missing or refused
 * (plain http:// links, some in-app browsers) falls back to a hidden text box and the browser's copy
 * command. Callers show "Copied" on true and say how to copy by hand on false (decision T44).
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Refused: try the fallback below.
  }
  return copyWithTextArea(text);
}

function copyWithTextArea(text: string): boolean {
  if (typeof document === 'undefined') return false;
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.className = 'fixed top-0 left-0 opacity-0';
  document.body.append(area);
  const active = document.activeElement;
  area.select();
  area.setSelectionRange(0, text.length);
  let ok: boolean;
  try {
    // Deprecated but still the only way to copy without the Clipboard API.
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  area.remove();
  if (active instanceof HTMLElement) active.focus({ preventScroll: true });
  return ok;
}
