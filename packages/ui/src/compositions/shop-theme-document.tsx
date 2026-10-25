'use client';

import { useEffect } from 'react';
import { setCssVars, type CssVarsObject } from '../lib/css-vars';

// Portals (sheets, dialogs, toasts) render at the end of <body>, outside the shop wrapper. This copies the
// shop's variables (and the dark class of a dark shop) onto <html> while the shop is open, and undoes it after.
export function ShopThemeDocument({ vars, dark }: { vars: CssVarsObject; dark: boolean }) {
  useEffect(() => {
    const root = document.documentElement;
    const undo = setCssVars(root, vars);
    root.classList.toggle('dark', dark);
    return () => {
      undo();
      root.classList.remove('dark');
    };
  }, [vars, dark]);
  return null;
}
