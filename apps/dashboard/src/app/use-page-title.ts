import { useEffect } from 'react';
import { words } from '@smartapp/core';

export function usePageTitle(title: string): void {
  useEffect(() => {
    document.title = words.shell.pageTitle(title);
  }, [title]);
}
