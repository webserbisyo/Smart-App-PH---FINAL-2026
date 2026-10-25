import { words } from '@smartapp/core';

export function DemoRibbon() {
  return (
    <div className="flex justify-center">
      <div className="rounded-full bg-muted/80 px-3 py-1 text-xs font-medium text-muted-foreground shadow-xs">
        {words.storefrontShell.home.demoRibbon}
      </div>
    </div>
  );
}
