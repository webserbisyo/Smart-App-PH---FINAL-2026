import type { CSSProperties } from 'react';

export type CssVariableKey = `--${string}`;
export type CssVariableValue = string | number | undefined;

export type CssVarsObject = {
  [K in CssVariableKey]?: CssVariableValue;
};

export function cssVars(variables: CssVarsObject): CSSProperties {
  const result: CSSProperties = {};
  Object.assign(result, variables);
  return result;
}

/** Sets CSS variables on an element (the shop palette on <html>); returns a function that removes them. */
export function setCssVars(element: HTMLElement, variables: CssVarsObject): () => void {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(variables)) {
    if (value === undefined) continue;
    element.style.setProperty(key, String(value));
    keys.push(key);
  }
  return () => {
    for (const key of keys) element.style.removeProperty(key);
  };
}
