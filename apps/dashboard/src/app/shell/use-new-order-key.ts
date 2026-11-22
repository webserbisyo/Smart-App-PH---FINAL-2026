import * as React from 'react';
import { useNavigate, useRouterState } from '@tanstack/react-router';

/**
 * N opens New order on a laptop or tablet (T111). It waits while the owner types, while a dialog or
 * sheet is open, and when a modifier key is held, so it never steals a letter.
 */
export function useNewOrderKey(enabled: boolean) {
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  React.useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'n' && e.key !== 'N') return;
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat || e.defaultPrevented) return;
      if (!window.matchMedia('(min-width: 768px)').matches) return;
      const target = e.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable || target.closest('input, textarea, select, [role="textbox"]'))
      )
        return;
      if (document.querySelector('[role="dialog"], [role="alertdialog"]')) return;
      if (path.startsWith('/orders/new') || path.endsWith('/edit')) return;
      e.preventDefault();
      void navigate({ to: '/orders/new' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled, navigate, path]);
}
